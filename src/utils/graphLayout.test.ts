/**
 * graphLayout 单元测试
 * 覆盖独立分支链模型的链分解、车道独立、x 区间错开与坐标输出
 */

import { describe, it, expect } from "vitest";
import { layoutFlowGraph } from "@/utils/graphLayout";
import type { FlowGraphData, FlowNode, FlowEdge } from "@/api/logicflow";

function makeNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: "n1",
    type: "userTask",
    x: 0,
    y: 0,
    width: 140,
    height: 80,
    text: "节点",
    properties: {},
    ...overrides,
  };
}

function makeEdge(
  sourceNodeId: string,
  targetNodeId: string,
  id = `e_${sourceNodeId}_${targetNodeId}`
): FlowEdge {
  return { id, type: "polyline", sourceNodeId, targetNodeId, properties: {} };
}

describe("layoutFlowGraph", () => {
  it("空图返回空结果", () => {
    expect(layoutFlowGraph({ nodes: [], edges: [] })).toEqual([]);
  });

  it("线性流程 A->B->C 单链从左到右、同一车道", () => {
    const graph: FlowGraphData = {
      nodes: [
        makeNode({ id: "A", type: "startEvent", width: 36, height: 36 }),
        makeNode({ id: "B", type: "userTask" }),
        makeNode({ id: "C", type: "endEvent", width: 36, height: 36 }),
      ],
      edges: [makeEdge("A", "B"), makeEdge("B", "C")],
    };
    const pos = layoutFlowGraph(graph);
    const p = Object.fromEntries(pos.map((n) => [n.id, n]));
    expect(p.A.x).toBeLessThan(p.B.x);
    expect(p.B.x).toBeLessThan(p.C.x);
    // 同一条链位于同一车道（节点高度不同，中心可能有高度差，但都在同一车道带内）
    expect(Math.abs(p.A.y - p.B.y)).toBeLessThan(40);
    expect(Math.abs(p.B.y - p.C.y)).toBeLessThan(40);
    // 在画布内
    expect(p.A.x).toBeGreaterThanOrEqual(80);
    expect(p.A.y).toBeGreaterThanOrEqual(80);
  });

  it("画布新增节点（宽高在 properties 中）能正确识别尺寸", () => {
    const graph: FlowGraphData = {
      nodes: [
        makeNode({
          id: "S",
          type: "startEvent",
          width: undefined,
          properties: { width: 36, height: 36 },
        }),
        makeNode({
          id: "E",
          type: "endEvent",
          width: undefined,
          properties: { width: 36, height: 36 },
        }),
      ],
      edges: [makeEdge("S", "E")],
    };
    const pos = layoutFlowGraph(graph, { gapX: 120, margin: 60 });
    const p = Object.fromEntries(pos.map((n) => [n.id, n]));
    expect(p.E.x - p.S.x).toBeCloseTo(36 + 120, 0);
  });

  it("分歧后每条分支独立成车道、各自独立到自己的结束节点", () => {
    const graph: FlowGraphData = {
      nodes: [
        makeNode({ id: "S", type: "startEvent", width: 36, height: 36 }),
        makeNode({ id: "G", type: "exclusiveGateway", width: 80, height: 80 }),
        makeNode({ id: "A", type: "userTask" }),
        makeNode({ id: "B", type: "userTask" }),
        makeNode({ id: "E1", type: "endEvent", width: 36, height: 36 }),
        makeNode({ id: "C", type: "userTask" }),
        makeNode({ id: "E2", type: "endEvent", width: 36, height: 36 }),
      ],
      edges: [
        makeEdge("S", "G"),
        makeEdge("G", "A"),
        makeEdge("G", "C"),
        makeEdge("A", "B"),
        makeEdge("B", "E1"),
        makeEdge("C", "E2"),
      ],
    };
    const pos = layoutFlowGraph(graph);
    const p = Object.fromEntries(pos.map((n) => [n.id, n]));

    // 分支1 A->B->E1 同一车道；分支2 C->E2 另一车道
    expect(Math.abs(p.A.y - p.B.y)).toBeLessThan(40);
    expect(Math.abs(p.B.y - p.E1.y)).toBeLessThan(40);
    expect(Math.abs(p.C.y - p.E2.y)).toBeLessThan(40);
    // 两条分支在不同车道
    expect(Math.abs(p.A.y - p.C.y)).toBeGreaterThan(60);
    // 每条分支各自到自己的结束节点，不在中间汇合（E1 与 E2 在不同车道）
    expect(Math.abs(p.E1.y - p.E2.y)).toBeGreaterThan(60);
    // 分支链内从左到右
    expect(p.A.x).toBeLessThan(p.B.x);
    expect(p.B.x).toBeLessThan(p.E1.x);
    expect(p.C.x).toBeLessThan(p.E2.x);
  });

  it("分支汇合到汇聚节点（正常合并），汇聚位于各分支车道中间", () => {
    const graph: FlowGraphData = {
      nodes: [
        makeNode({ id: "S", type: "startEvent", width: 36, height: 36 }),
        makeNode({ id: "G", type: "exclusiveGateway", width: 80, height: 80 }),
        makeNode({ id: "A", type: "userTask", y: 100 }),
        makeNode({ id: "C", type: "userTask", y: 300 }),
        makeNode({ id: "M", type: "exclusiveGateway", width: 80, height: 80 }),
        makeNode({ id: "E", type: "endEvent", width: 36, height: 36 }),
      ],
      edges: [
        makeEdge("S", "G"),
        makeEdge("G", "A"),
        makeEdge("G", "C"),
        makeEdge("A", "M"),
        makeEdge("C", "M"),
        makeEdge("M", "E"),
      ],
    };
    const pos = layoutFlowGraph(graph);
    const p = Object.fromEntries(pos.map((n) => [n.id, n]));
    // A、C 在两条独立车道
    expect(Math.abs(p.A.y - p.C.y)).toBeGreaterThan(60);
    // 汇聚节点位于 A、C 两车道的中间，正常汇合
    const mid = (p.A.y + p.C.y) / 2;
    expect(p.M.y).toBeCloseTo(mid, 0);
    // M 在最右侧列，E 跟随 M
    expect(p.M.x).toBeGreaterThan(p.C.x);
    expect(p.E.y).toBeCloseTo(p.M.y, 0);
  });

  it("孤立节点放到最右侧，不影响主流程", () => {
    const graph: FlowGraphData = {
      nodes: [
        makeNode({ id: "S", type: "startEvent", width: 36, height: 36 }),
        makeNode({ id: "E", type: "endEvent", width: 36, height: 36 }),
        makeNode({ id: "LONE", type: "userTask" }),
      ],
      edges: [makeEdge("S", "E")],
    };
    const pos = layoutFlowGraph(graph);
    const p = Object.fromEntries(pos.map((n) => [n.id, n]));
    expect(p.LONE.x).toBeGreaterThan(p.E.x);
  });

  it("存在环时不会死循环，且所有节点都有坐标", () => {
    const graph: FlowGraphData = {
      nodes: [makeNode({ id: "A", type: "userTask" }), makeNode({ id: "B", type: "userTask" })],
      edges: [makeEdge("A", "B"), makeEdge("B", "A")],
    };
    const pos = layoutFlowGraph(graph);
    expect(pos).toHaveLength(2);
    pos.forEach((n) => {
      expect(typeof n.x).toBe("number");
      expect(typeof n.y).toBe("number");
    });
  });

  it("自定义间距与边距生效", () => {
    const graph: FlowGraphData = {
      nodes: [makeNode({ id: "A" }), makeNode({ id: "B" })],
      edges: [makeEdge("A", "B")],
    };
    const tight = layoutFlowGraph(graph, { gapX: 40, margin: 10 });
    const wide = layoutFlowGraph(graph, { gapX: 300, margin: 100 });
    const pTight = Object.fromEntries(tight.map((n) => [n.id, n]));
    const pWide = Object.fromEntries(wide.map((n) => [n.id, n]));
    expect(pWide.B.x - pWide.A.x).toBeGreaterThan(pTight.B.x - pTight.A.x);
    expect(pTight.A.x).toBeGreaterThanOrEqual(10);
    expect(pWide.A.x).toBeGreaterThanOrEqual(100);
  });
});
