/**
 * 流程图自动排版（分层布局 + 分支车道）
 *
 * 标准思路：
 * 1. 按最长路径分层（Kahn 拓扑排序），流程自左向右
 * 2. 层内 barycenter 迭代排序，减少连线交叉
 * 3. 垂直坐标“跟随前驱链路”：同一条分支链路保持在同一条水平车道，
 *    分支各自独立、不与其它分支交错
 * 4. 汇聚节点（网关等）正常汇合各分支，位于各入链车道之间
 *
 * 排版完成后（外部）会重算连线锚点，保证连线吸附连接点、不穿透节点。
 *
 * 使用方式：
 *   import { layoutFlowGraph } from "@/utils/graphLayout";
 *   const positions = layoutFlowGraph(graphData);
 *   store.applyNodePositions(positions);
 */

import type { FlowGraphData, FlowNode } from "@/api/logicflow";

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export interface LayoutOptions {
  /** 列间距（px） */
  gapX?: number;
  /** 车道间距（px） */
  gapY?: number;
  /** 画布外边距（px） */
  margin?: number;
}

/** 节点类型默认尺寸（兼容 store 中无 width/height 的节点） */
const TYPE_DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  startEvent: { w: 36, h: 36 },
  endEvent: { w: 36, h: 36 },
  exclusiveGateway: { w: 80, h: 80 },
  parallelGateway: { w: 80, h: 80 },
  // userTask/serviceTask/scriptTask/customNode 等默认 140x80
};

/** 获取节点尺寸：优先顶层 width/height，其次 properties.width/height，最后按类型默认 */
function getSize(node: FlowNode): { w: number; h: number } {
  const props = (node.properties ?? {}) as Record<string, unknown>;
  const width = node.width ?? (typeof props.width === "number" ? props.width : undefined);
  const height = node.height ?? (typeof props.height === "number" ? props.height : undefined);
  const def = TYPE_DEFAULT_SIZES[node.type] ?? { w: 140, h: 80 };
  return { w: width ?? def.w, h: height ?? def.h };
}

/** 邻居节点行号均值，用于层内排序减少交叉 */
function barycenter(
  id: string,
  neighborIds: string[] | undefined,
  rowIndex: Map<string, number>
): number {
  const values = (neighborIds ?? [])
    .map((nid) => rowIndex.get(nid))
    .filter((v): v is number => v !== undefined);
  if (!values.length) return Number.POSITIVE_INFINITY;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 计算自动排版后的节点坐标（中心坐标）
 */
export function layoutFlowGraph(
  graphData: FlowGraphData,
  options: LayoutOptions = {}
): NodePosition[] {
  const nodes = graphData.nodes ?? [];
  const edges = graphData.edges ?? [];
  if (!nodes.length) return [];

  const gapX = options.gapX ?? 160;
  const gapY = options.gapY ?? 120;
  const margin = options.margin ?? 80;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((n) => {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  });
  edges.forEach((e) => {
    if (!nodeMap.has(e.sourceNodeId) || !nodeMap.has(e.targetNodeId)) return;
    outgoing.get(e.sourceNodeId)!.push(e.targetNodeId);
    incoming.get(e.targetNodeId)!.push(e.sourceNodeId);
  });

  // ---------- 1. 最长路径分层（Kahn 拓扑排序） ----------
  const layer = new Map<string, number>();
  const indegree = new Map<string, number>();
  nodes.forEach((n) => {
    layer.set(n.id, 0);
    indegree.set(n.id, incoming.get(n.id)!.length);
  });

  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of outgoing.get(u)!) {
      layer.set(v, Math.max(layer.get(v)!, layer.get(u)! + 1));
      indegree.set(v, indegree.get(v)! - 1);
      if (indegree.get(v) === 0) queue.push(v);
    }
  }

  // 环内节点（仍有入度未清零）与完全孤立节点（无任何连线）：
  // 统一放到最右侧新的一层，避免占用起始列或影响主流程
  const maxLayer = Math.max(...nodes.map((n) => layer.get(n.id)!));
  nodes.forEach((n) => {
    const isIsolated = incoming.get(n.id)!.length === 0 && outgoing.get(n.id)!.length === 0;
    if (indegree.get(n.id)! > 0 || isIsolated) {
      layer.set(n.id, maxLayer + 1);
    }
  });

  // ---------- 2. 按层分组 + barycenter 迭代排序（减少连线交叉） ----------
  const layerNodes = new Map<number, string[]>();
  nodes.forEach((n) => {
    const l = layer.get(n.id)!;
    if (!layerNodes.has(l)) layerNodes.set(l, []);
    layerNodes.get(l)!.push(n.id);
  });
  // 初始顺序：按原 y 坐标
  layerNodes.forEach((ids) => {
    ids.sort((a, b) => (nodeMap.get(a)!.y ?? 0) - (nodeMap.get(b)!.y ?? 0));
  });

  const layersSorted = [...layerNodes.keys()].sort((a, b) => a - b);
  for (let iter = 0; iter < 4; iter++) {
    const rowIndex = new Map<string, number>();
    layerNodes.forEach((ids) => ids.forEach((id, idx) => rowIndex.set(id, idx)));

    if (iter % 2 === 0) {
      // 左 -> 右：按前驱所在行号均值排序
      for (const l of layersSorted) {
        const ids = layerNodes.get(l)!;
        ids.sort(
          (a, b) =>
            barycenter(a, incoming.get(a), rowIndex) - barycenter(b, incoming.get(b), rowIndex) ||
            (rowIndex.get(a) ?? 0) - (rowIndex.get(b) ?? 0)
        );
      }
    } else {
      // 右 -> 左：按后继所在行号均值排序
      for (const l of [...layersSorted].reverse()) {
        const ids = layerNodes.get(l)!;
        ids.sort(
          (a, b) =>
            barycenter(a, outgoing.get(a), rowIndex) - barycenter(b, outgoing.get(b), rowIndex) ||
            (rowIndex.get(a) ?? 0) - (rowIndex.get(b) ?? 0)
        );
      }
    }
  }

  // ---------- 3. 坐标计算 ----------
  const sizes = new Map(nodes.map((n) => [n.id, getSize(n)]));
  const maxNodeW = Math.max(...nodes.map((n) => sizes.get(n.id)!.w));
  const maxNodeH = Math.max(...nodes.map((n) => sizes.get(n.id)!.h));
  const columnPitch = maxNodeW + gapX;
  const rowPitch = maxNodeH + gapY;

  // 节点在其层内的行号（无前驱节点时的默认位置）
  const rowIndexOf = new Map<string, number>();
  layerNodes.forEach((ids) => ids.forEach((id, idx) => rowIndexOf.set(id, idx)));

  // 垂直坐标：自顶向下“跟随前驱链路”，使不同分支链路保持各自的车道；
  // 汇聚节点取各入链车道的中间，正常汇合各分支。
  const nodeY = new Map<string, number>();

  // 第一层（源节点）：按行堆叠
  const firstLayer = layersSorted[0];
  let cursorY = margin;
  (layerNodes.get(firstLayer) ?? []).forEach((id) => {
    nodeY.set(id, cursorY + sizes.get(id)!.h / 2);
    cursorY += rowPitch;
  });

  for (let li = 1; li < layersSorted.length; li++) {
    const l = layersSorted[li];
    const ids = layerNodes.get(l)!;

    // 目标 y：前驱节点平均 y（跟随链路）；无前驱时用行位置
    const targets = ids.map((id) => {
      const predYs = (incoming.get(id) ?? [])
        .map((p) => nodeY.get(p))
        .filter((v): v is number => v !== undefined);
      if (predYs.length) {
        return predYs.reduce((sum, v) => sum + v, 0) / predYs.length;
      }
      return margin + (rowIndexOf.get(id) ?? 0) * rowPitch + sizes.get(id)!.h / 2;
    });

    // 按目标 y 稳定排序（同层兄弟节点按原顺序），保证同链路连续
    const sorted = ids
      .map((id, idx) => ({ id, t: targets[idx] }))
      .sort((a, b) => a.t - b.t || (rowIndexOf.get(a.id) ?? 0) - (rowIndexOf.get(b.id) ?? 0));

    // 节点中心取“目标位置”与“不重叠上一兄弟节点”的较大值：
    // 单节点层可跟随前驱对齐（同链路直线），兄弟节点向下展开不重叠
    let prevBottom = Number.NEGATIVE_INFINITY;
    sorted.forEach(({ id, t }) => {
      const h = sizes.get(id)!.h;
      const center = Math.max(t, prevBottom + gapY + h / 2);
      nodeY.set(id, center);
      prevBottom = center + h / 2;
    });
  }

  // 整体垂直归一化：图形顶部对齐到 margin
  const minTop = Math.min(...nodes.map((n) => nodeY.get(n.id)! - sizes.get(n.id)!.h / 2));
  const shiftY = margin - minTop;

  const positions: NodePosition[] = [];
  layersSorted.forEach((l) => {
    const x = margin + l * columnPitch + maxNodeW / 2;
    layerNodes.get(l)!.forEach((id) => {
      positions.push({
        id,
        x,
        y: nodeY.get(id)! + shiftY,
      });
    });
  });

  return positions;
}
