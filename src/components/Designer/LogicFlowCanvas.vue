<template>
  <div
    ref="canvasRef"
    class="logic-flow-canvas"
    @dragover.prevent="handleDragOver"
    @drop="handleDrop"
    @pointerover="handlePointerOver"
    @pointerout="handlePointerOut"
    @pointerleave="handlePointerLeave"
  >
    <!-- LogicFlow 挂载点 -->
    <div ref="lfContainer" class="lf-wrapper"></div>

    <!-- 连接点悬浮快捷新增弹框：新增任务/网关节点 或 连接到已有节点 -->
    <div
      v-if="quickAddMenu.visible"
      ref="quickAddMenuRef"
      class="lf-quick-add"
      :style="{ left: quickAddMenu.x + 'px', top: quickAddMenu.y + 'px' }"
      @pointerdown.stop
      @click.stop
    >
      <!-- 事件节点分组 -->
      <template v-if="getTargetsByCategory('event').length">
        <div class="lf-quick-add__group-title">事件节点</div>
        <div class="lf-quick-add__grid">
          <div
            v-for="target in getTargetsByCategory('event')"
            :key="target.type"
            class="lf-quick-add__item"
            @click="handleQuickAdd(target.type)"
          >
            <span class="lf-quick-add__icon" :class="target.iconClass"></span>
            <span class="lf-quick-add__label">{{ target.label }}</span>
          </div>
        </div>
      </template>

      <!-- 任务节点分组 -->
      <template v-if="getTargetsByCategory('task').length">
        <div class="lf-quick-add__group-title">任务节点</div>
        <div class="lf-quick-add__grid">
          <div
            v-for="target in getTargetsByCategory('task')"
            :key="target.type"
            class="lf-quick-add__item"
            @click="handleQuickAdd(target.type)"
          >
            <span class="lf-quick-add__icon" :class="target.iconClass"></span>
            <span class="lf-quick-add__label">{{ target.label }}</span>
          </div>
        </div>
      </template>

      <!-- 网关节点分组 -->
      <template v-if="getTargetsByCategory('gateway').length">
        <div class="lf-quick-add__group-title">网关节点</div>
        <div class="lf-quick-add__grid">
          <div
            v-for="target in getTargetsByCategory('gateway')"
            :key="target.type"
            class="lf-quick-add__item"
            @click="handleQuickAdd(target.type)"
          >
            <span class="lf-quick-add__icon" :class="target.iconClass"></span>
            <span class="lf-quick-add__label">{{ target.label }}</span>
          </div>
        </div>
      </template>

      <!-- 创建连线到 -->
      <template v-if="quickAddMenu.connectTargets.length">
        <div class="lf-quick-add__group-title">创建连线到</div>
        <ul class="lf-quick-menu__list">
          <li
            v-for="target in quickAddMenu.connectTargets"
            :key="target.id"
            class="lf-quick-menu__item"
            @click="handleQuickConnect(target.id)"
          >
            <span class="lf-quick-menu__icon" :class="target.iconClass"></span>
            <span class="lf-quick-menu__label">{{ target.text }}</span>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch, shallowRef } from "vue";
import LogicFlow, {
  BezierEdge,
  BezierEdgeModel,
  PolylineEdge,
  PolylineEdgeModel,
  LineEdge,
  LineEdgeModel,
} from "@logicflow/core";
import "@logicflow/core/dist/index.css";
import "@logicflow/extension/lib/style/index.css";
import { ElMessage } from "element-plus";
import { useFlowDesignerStore } from "@/stores/flow-designer";
import {
  CustomNodes,
  createFlowNode,
  getNodeLabel,
  getNodeColor,
  getNodeIconClass,
  getNodeCategory,
  type FlowGraphData,
  type FlowNode,
  type FlowEdge,
  type NodeType,
} from "@/api/logicflow";

const props = defineProps<{
  graphData: FlowGraphData;
  mode: "edit" | "preview";
}>();

const emit = defineEmits<{
  (e: "node-selected", node: FlowNode): void;
  (e: "edge-selected", edge: FlowEdge): void;
  (e: "node-added", node: FlowNode): void;
  (e: "edge-added", edge: FlowEdge): void;
}>();

const store = useFlowDesignerStore();

const canvasRef = ref<HTMLElement | null>(null);
const lfContainer = ref<HTMLElement | null>(null);
const lfInstance = shallowRef<LogicFlow | null>(null);

// 文本编辑防抖：画布内双击编辑文本时 text:update 会随输入高频触发，
// 防抖后只在停止输入时同步一次 store，避免历史记录爆炸
let textSyncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTextSync: { id: string; text: string } | null = null;

// 弹框“创建连线到”候选目标类型：任务节点 + 网关节点
const QUICK_CONNECT_TARGET_TYPES: NodeType[] = [
  "userTask",
  "serviceTask",
  "scriptTask",
  "businessRuleTask",
  "manualTask",
  "receiveTask",
  "sendTask",
  "callActivity",
  "subProcess",
  "customNode",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "eventBasedGateway",
  "complexGateway",
];

interface QuickMenuTarget {
  id: string;
  text: string;
  color: string;
  iconClass: string;
}

// 连接点弹框：可作为源节点的类型（开始/任务/网关，均可有出口连线）
const QUICK_ADD_SOURCE_TYPES: NodeType[] = [
  "startEvent",
  "userTask",
  "serviceTask",
  "scriptTask",
  "businessRuleTask",
  "manualTask",
  "receiveTask",
  "sendTask",
  "callActivity",
  "subProcess",
  "customNode",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "eventBasedGateway",
  "complexGateway",
];
// 快捷新增弹框可选节点类型：事件节点 + 任务节点 + 网关节点
const QUICK_ADD_TARGET_TYPES: NodeType[] = [
  "endEvent",
  "userTask",
  "serviceTask",
  "scriptTask",
  "businessRuleTask",
  "manualTask",
  "receiveTask",
  "sendTask",
  "callActivity",
  "subProcess",
  "customNode",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "eventBasedGateway",
  "complexGateway",
];

interface QuickAddTarget {
  type: NodeType;
  label: string;
  color: string;
  iconClass: string;
  category: "event" | "task" | "gateway";
}

interface QuickAddMenuState {
  visible: boolean;
  x: number;
  y: number;
  sourceNodeId: string;
  targets: QuickAddTarget[];
  connectTargets: QuickMenuTarget[];
}

const quickAddMenuRef = ref<HTMLElement | null>(null);
const quickAddMenu = reactive<QuickAddMenuState>({
  visible: false,
  x: 0,
  y: 0,
  sourceNodeId: "",
  targets: [],
  connectTargets: [],
});
let quickAddCloseTimer: ReturnType<typeof setTimeout> | null = null;
// 程序化缩放标记：适应画布等操作期间不把中间态同步回 store.zoomLevel
let programmaticZoom = false;

// 弹框图标配置（按节点类型配置生成一次）
const QUICK_ADD_TARGETS: QuickAddTarget[] = QUICK_ADD_TARGET_TYPES.map((type) => ({
  type,
  label: getNodeLabel(type),
  color: getNodeColor(type),
  iconClass: getNodeIconClass(type),
  category: getNodeCategory(type),
}));

// ==================== 悬浮出边高亮（电流传递效果） ====================
// 悬浮节点时，为每条出边分配一个不同颜色，配合 LogicFlow 的虚线流动动画，
// 呈现“电流从该节点流向各分支”的效果
const FLOW_COLORS = [
  "#409eff",
  "#67c23a",
  "#e6a23c",
  "#f56c6c",
  "#9b59b6",
  "#00bcd4",
  "#ff9800",
  "#8bc34a",
  "#3f51b5",
  "#e91e63",
];

/**
 * 自定义 bezier 边模型：当边携带 properties.flowColor 时，
 * 电流动画（isAnimation）使用该颜色渲染，实现每条出边颜色区分。
 */
class FlowBezierEdgeModel extends BezierEdgeModel {
  getEdgeStyle() {
    const style = super.getEdgeStyle();
    const flowColor = (this.properties as Record<string, unknown>).flowColor as string | undefined;
    if (flowColor) {
      style.stroke = flowColor;
      style.strokeWidth = (style.strokeWidth ?? 2) + 1;
    }
    return style;
  }
  getEdgeAnimationStyle() {
    const style = super.getEdgeAnimationStyle();
    const flowColor = (this.properties as Record<string, unknown>).flowColor as string | undefined;
    if (flowColor) {
      style.stroke = flowColor;
    }
    return style;
  }
}

// 当前已高亮的出边 id 集合
const highlightedEdges = new Set<string>();

// 当前悬浮的节点 id：用于撤销/重做后重新应用电泳高亮效果。
// 节点删除时不清除此值（保留以便撤销恢复后重新高亮），
// 仅在用户真正移出画布或切换模式时清除。
const hoveredNodeId = ref<string | null>(null);

/** 高亮节点的所有出边：每条边分配不同颜色并开启电流动画 */
function highlightOutgoingEdges(nodeId: string) {
  clearOutgoingEdgeHighlight();
  const lf = lfInstance.value;
  if (!lf) return;
  const graphData = (lf.getGraphData() as FlowGraphData) ?? { nodes: [], edges: [] };
  const outgoing = graphData.edges.filter((e) => e.sourceNodeId === nodeId);

  outgoing.forEach((edge, i) => {
    const model = lf.getEdgeModelById(edge.id);
    if (!model) return;
    model.setProperties({ flowColor: FLOW_COLORS[i % FLOW_COLORS.length] });
    lf.openEdgeAnimation(edge.id);
    highlightedEdges.add(edge.id);
  });
}

/** 清除所有出边高亮 */
function clearOutgoingEdgeHighlight() {
  if (!highlightedEdges.size) return;
  const lf = lfInstance.value;
  if (lf) {
    highlightedEdges.forEach((id) => {
      const model = lf.getEdgeModelById(id);
      if (model) {
        model.setProperties({ flowColor: null });
        lf.closeEdgeAnimation(id);
      }
    });
  }
  highlightedEdges.clear();
}

/**
 * 清理 highlightedEdges 中已不存在于画布的边 id。
 * 在 node:delete/edge:delete 时调用，防止删除操作后 highlightedEdges 残留过期 id。
 */
function cleanupStaleHighlightedEdges() {
  const lf = lfInstance.value;
  if (!lf || !highlightedEdges.size) return;
  for (const id of Array.from(highlightedEdges)) {
    if (!lf.getEdgeModelById(id)) {
      highlightedEdges.delete(id);
    }
  }
}

onMounted(() => {
  if (!lfContainer.value) return;

  // 初始化 LogicFlow 实例
  lfInstance.value = new LogicFlow({
    container: lfContainer.value,
    grid: {
      size: 20,
      type: "dot",
      config: {
        color: "#dcdfe6",
        thickness: 1,
      },
    },
    background: {
      color: "#fafafa",
    },
    keyboard: {
      enabled: true,
      shortcuts: [
        {
          keys: ["Delete", "Backspace"],
          callback: () => {
            // 删除当前选中的节点或连线
            if (store.selectedType === "node" && store.selectedElement) {
              store.removeNode((store.selectedElement as { id: string }).id);
            } else if (store.selectedType === "edge" && store.selectedElement) {
              store.removeEdge((store.selectedElement as { id: string }).id);
            }
          },
        },
      ],
    },
    edgeTextDraggable: true,
    nodeTextDraggable: true,
  });

  // 缩放范围与 store.zoomLevel 的 [0.1, 3] 保持一致
  lfInstance.value.setZoomMiniSize(0.1);
  lfInstance.value.setZoomMaxSize(3);

  // 主题：放大连接点并增强悬浮效果，便于鼠标命中触发连接点快捷菜单
  lfInstance.value.setTheme({
    anchor: {
      r: 8,
      stroke: "#409eff",
      strokeWidth: 2,
      hover: {
        r: 14,
        fill: "#409eff",
        fillOpacity: 0.2,
        stroke: "transparent",
      },
    },
  });

  // 注册自定义节点
  Object.entries(CustomNodes).forEach(([name, config]) => {
    lfInstance.value?.register({
      type: name,
      view: config.view,
      model: config.model,
    });
  });

  // 注册所有边类型：支持 bezier（圆弧）、polyline（折线）、line（直线）
  lfInstance.value.register({
    type: "bezier",
    view: BezierEdge,
    model: FlowBezierEdgeModel,
  });
  lfInstance.value.register({
    type: "polyline",
    view: PolylineEdge,
    model: PolylineEdgeModel,
  });
  lfInstance.value.register({
    type: "line",
    view: LineEdge,
    model: LineEdgeModel,
  });

  // 初始化渲染：即使空画布也必须调用 render，否则画布/网格/节点视图不会挂载，
  // 后续 addNode 只能写入数据模型而无法显示在画布上
  lfInstance.value.render(props.graphData);

  // 设置模式
  updateMode();

  // 事件监听：点击节点时显示右侧属性面板
  lfInstance.value.on("node:click", ({ data }) => {
    const nodeData = data as FlowNode;
    emit("node-selected", nodeData);
    store.setSelection(nodeData, "node");
  });

  lfInstance.value.on("edge:click", ({ data }) => {
    const edgeData = data as FlowEdge;
    emit("edge-selected", edgeData);
    store.setSelection(edgeData, "edge");
  });

  // 节点添加：统一通过 node:add 事件同步到 store 并通知父组件
  // 注意：当节点是由 store -> 画布方向同步（如左侧面板快捷添加、撤销/重做）时，
  // 画布 addNode 也会触发 node:add，这里通过 id 去重，避免重复写入 store
  lfInstance.value.on("node:add", ({ data }) => {
    const nodeData = data as FlowNode;
    if (!store.graphData.nodes.some((n) => n.id === nodeData.id)) {
      // node:add 携带的 text 是带绝对坐标的对象 {x,y,value}，若原样存入 store，
      // 拖动节点后文字坐标不会随节点更新，重新加载/重建时文字会脱离节点。
      // 这里统一转为纯字符串文本，由 LogicFlow 按节点中心重新渲染文字。
      const result = store.addNode({ ...nodeData, text: getNodeText(nodeData) });
      if (!result.success) {
        // 若 store 拒绝添加（如重复的开始/结束节点），从画布移除该节点
        lfInstance.value?.deleteNode(nodeData.id);
      }
    }
    emit("node-added", nodeData);
  });

  // 连线添加：统一通过 edge:add 事件同步到 store 并通知父组件
  // 同样通过 id 去重，避免 store -> 画布方向同步连线时重复写入
  lfInstance.value.on("edge:add", ({ data }) => {
    const source = data as FlowEdge;
    // 使用传入的类型，如果没有则使用 store 中的类型
    const edgeType = source.type || store.edgeType;
    const newEdge: FlowEdge = {
      id: source.id || `edge_${Date.now()}`,
      type: edgeType,
      sourceNodeId: source.sourceNodeId,
      targetNodeId: source.targetNodeId,
      properties: source.properties || {},
    };
    // 检查是否已存在
    const existingIndex = store.graphData.edges.findIndex((e) => e.id === newEdge.id);
    if (existingIndex === -1) {
      store.addEdge(newEdge);
    }
    emit("edge-added", newEdge);
  });

  // 画布内删除节点/连线时同步 store，避免 store 残留已删除元素
  lfInstance.value.on("node:delete", ({ data }) => {
    const nodeData = data as FlowNode;
    if (store.graphData.nodes.some((n) => n.id === nodeData.id)) {
      store.removeNode(nodeData.id);
    }
    // 若删除的是弹框源节点，关闭弹框
    if (quickAddMenu.sourceNodeId === nodeData.id) {
      closeQuickAddMenu();
    }
    // 清除已删除连线的电泳高亮状态（删除节点会连带删除其连线）
    cleanupStaleHighlightedEdges();
  });

  lfInstance.value.on("edge:delete", ({ data }) => {
    const edgeData = data as FlowEdge;
    if (store.graphData.edges.some((e) => e.id === edgeData.id)) {
      store.removeEdge(edgeData.id);
    }
    // 清除已删除连线的电泳高亮状态
    highlightedEdges.delete(edgeData.id);
  });

  // 节点移动：LogicFlow 2.x 不再触发 node:moved 事件，拖拽结束会触发 node:drop。
  // 这里把节点的最新位置同步回 store，保证 store 始终持有节点真实位置，
  // 否则新增节点触发画布重渲染时会使用旧位置导致已拖动节点全部回跳、布局错乱。
  lfInstance.value.on("node:drop", ({ data }) => {
    const nodeData = data as FlowNode;
    const existing = store.graphData.nodes.find((n) => n.id === nodeData.id);
    if (existing && (existing.x !== nodeData.x || existing.y !== nodeData.y)) {
      store.updateNode(nodeData.id, { x: nodeData.x, y: nodeData.y });
    }
  });

  // 画布内双击编辑节点/连线文本：同步回 store，避免后续增量同步把文本改回旧值
  lfInstance.value.on("text:update", ({ data }) => {
    const { id, text } = data as { id: string; text: string };
    if (!id || text === undefined) return;
    pendingTextSync = { id, text };
    if (textSyncTimer) clearTimeout(textSyncTimer);
    textSyncTimer = setTimeout(() => {
      if (pendingTextSync) {
        if (store.graphData.nodes.some((n) => n.id === pendingTextSync!.id)) {
          store.updateNode(pendingTextSync.id, { text: pendingTextSync.text });
        } else if (store.graphData.edges.some((e) => e.id === pendingTextSync!.id)) {
          store.updateEdge(pendingTextSync.id, { text: pendingTextSync.text });
        }
        pendingTextSync = null;
      }
      textSyncTimer = null;
    }, 300);
  });

  // 点击空白处或画布缩放/平移时关闭弹框，避免菜单位置残留
  lfInstance.value.on("blank:click", () => {
    closeQuickAddMenu();
  });
  lfInstance.value.on("graph:transform", () => {
    closeQuickAddMenu();
    // 用户通过滚轮/手势缩放画布时，将实际缩放比例同步回 store（程序化缩放除外）
    if (!programmaticZoom) {
      const scale = lfInstance.value?.getTransform().SCALE_X ?? 1;
      if (Math.abs(scale - store.zoomLevel) > 0.001) {
        store.setZoomLevel(scale);
      }
    }
  });
});

onBeforeUnmount(() => {
  if (textSyncTimer) {
    clearTimeout(textSyncTimer);
    textSyncTimer = null;
  }
  pendingTextSync = null;
  cancelQuickAddClose();
  closeQuickAddMenu();
  lfInstance.value?.destroy?.();
  lfInstance.value = null;
});

// 监听模式变化
watch(
  () => props.mode,
  () => {
    updateMode();
    closeQuickAddMenu();
    clearOutgoingEdgeHighlight();
    hoveredNodeId.value = null;
  }
);

// 监听 store 缩放级别并应用到画布（放大/缩小/适应画布按钮均通过 store 驱动）
watch(
  () => store.zoomLevel,
  (level) => {
    const lf = lfInstance.value;
    if (!lf) return;
    const current = lf.getTransform().SCALE_X;
    if (Math.abs(current - level) > 0.001) {
      const center: [number, number] = [
        lfContainer.value?.clientWidth ? lfContainer.value.clientWidth / 2 : 0,
        lfContainer.value?.clientHeight ? lfContainer.value.clientHeight / 2 : 0,
      ];
      lf.zoom(level, center);
    }
  }
);

function updateMode() {
  const lf = lfInstance.value;
  if (!lf) return;

  // 预览模式：启用 LogicFlow 静默模式（节点不可拖动、隐藏连接点、禁止文本编辑/连线/缩放节点），
  // 但仍可平移、缩放画布进行查看；编辑模式恢复交互。
  if (props.mode === "preview") {
    lf.updateEditConfig({ isSilentMode: true });
  } else {
    lf.updateEditConfig({ isSilentMode: false });
  }
}

// 监听数据变化：将 store 的图数据增量同步到画布。
// 不再整图 render，避免新增/删除节点时重建所有节点导致已有节点位置跳动、连线重排。
watch(
  () => props.graphData,
  (newData) => {
    if (!lfInstance.value) return;
    syncGraphFromStore(newData);
  },
  { deep: true }
);

/** 兼容节点文本的两种存储形态：字符串 或 { value } 对象 */
function getNodeText(node: FlowNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.text as { value?: string } | undefined)?.value ?? "";
}

/**
 * 将 store 的图数据增量同步到画布：
 * - 删除画布上已不存在的节点/连线
 * - 新增画布上缺失的节点/连线
 * - 已有节点仅同步位置/文本/属性，不重建
 * 相比整图 render，不会重建已有节点，从而保证布局不被打乱。
 */
function syncGraphFromStore(newData: FlowGraphData) {
  const lf = lfInstance.value;
  if (!lf) return;

  // LogicFlow 的 getGraphData 声明为 GraphData | unknown，这里按 FlowGraphData 使用
  const currentData = (lf.getGraphData() as FlowGraphData) ?? { nodes: [], edges: [] };
  const nextNodes = new Map(newData.nodes.map((n) => [n.id, n]));
  const nextEdges = new Map(newData.edges.map((e) => [e.id, e]));

  // 1. 删除画布中已不存在的节点（其关联连线会一并删除）
  for (const node of currentData.nodes) {
    if (!nextNodes.has(node.id)) {
      lf.deleteNode(node.id);
    }
  }

  // 2. 删除画布中已不存在的连线
  for (const edge of currentData.edges) {
    if (!nextEdges.has(edge.id)) {
      lf.deleteEdge(edge.id);
    }
  }

  // 3. 新增缺失节点；已有节点仅同步位置/文本/属性
  for (const node of newData.nodes) {
    const model = lf.getNodeModelById(node.id);
    if (!model) {
      // 以纯字符串文本重建节点，避免历史遗留的 {x,y,value} 文本坐标导致文字脱离节点
      lf.addNode({ ...node, text: getNodeText(node) });
      continue;
    }
    if (model.x !== node.x || model.y !== node.y) {
      // 使用 moveNode2Coordinate 移动节点：会同步更新相连连接线的端点，
      // 避免排版后连线悬空、不在节点连接点上
      lf.graphModel.moveNode2Coordinate(node.id, node.x, node.y);
    }
    const nextText = getNodeText(node);
    if (model.text?.value !== nextText) {
      model.updateText(nextText);
    }
    if (JSON.stringify(model.getProperties()) !== JSON.stringify(node.properties ?? {})) {
      model.setProperties(node.properties ?? {});
    }
  }

  // 4. 同步连线：新增缺失连线，更新类型变化的连线
  // （步骤2已删除画布中不存在的连线，此处仅需新增/更新）
  for (const edge of newData.edges) {
    const edgeModel = lf.getEdgeModelById(edge.id);
    if (!edgeModel) {
      // 新连线：直接添加
      lf.addEdge(edge);
    } else {
      // 已有连线：检查类型是否需要更新
      const canvasEdgeData = lf.getEdgeById(edge.id);
      const canvasType = canvasEdgeData?.type || "bezier";
      if (canvasType !== edge.type) {
        // 类型变化：删除旧连线，用新类型重建
        lf.deleteEdge(edge.id);
        lf.addEdge(edge);
      }
    }
  }

  // 撤销/重做后，若仍在悬浮某节点，重新应用出边电泳高亮。
  // 撤销会通过 lf.addEdge 重建边，新边模型 isAnimation=false 且无 flowColor，
  // 需要手动重新应用高亮以恢复电泳效果。
  if (hoveredNodeId.value) {
    const nodeExists = newData.nodes.some((n) => n.id === hoveredNodeId.value);
    if (nodeExists) {
      // 仅在需要时重新应用：highlightedEdges 为空（已被清除）或某些边丢失了动画
      const needsReapply =
        !highlightedEdges.size ||
        Array.from(highlightedEdges).some((id) => {
          const model = lf.getEdgeModelById(id);
          return !model || !(model as { isAnimation: boolean }).isAnimation;
        });
      if (needsReapply) {
        highlightOutgoingEdges(hoveredNodeId.value);
      }
    } else {
      hoveredNodeId.value = null;
      highlightedEdges.clear();
    }
  }
}

// ==================== 连接点悬浮快捷新增弹框 ====================

/** 生成“创建连线到”候选目标：任务节点 + 网关节点，排除自身与已直连节点 */
function buildQuickConnectTargets(sourceId: string): QuickMenuTarget[] {
  const connectedTargetIds = new Set(
    store.graphData.edges.filter((e) => e.sourceNodeId === sourceId).map((e) => e.targetNodeId)
  );

  return store.graphData.nodes
    .filter((n) => n.id !== sourceId)
    .filter((n) => QUICK_CONNECT_TARGET_TYPES.includes(n.type))
    .filter((n) => !connectedTargetIds.has(n.id))
    .map((n) => ({
      id: n.id,
      text: getNodeText(n) || getNodeLabel(n.type),
      color: getNodeColor(n.type),
      iconClass: getNodeIconClass(n.type),
    }));
}

/** 关闭新增弹框 */
function closeQuickAddMenu() {
  quickAddMenu.visible = false;
  quickAddMenu.sourceNodeId = "";
  quickAddMenu.connectTargets = [];
}

/** 延迟关闭：鼠标从连接点移向弹框的过程中短暂经过其他区域时不立即关闭 */
function scheduleQuickAddClose() {
  if (quickAddCloseTimer) clearTimeout(quickAddCloseTimer);
  quickAddCloseTimer = setTimeout(() => {
    quickAddCloseTimer = null;
    closeQuickAddMenu();
  }, 350);
}

/** 取消延迟关闭（鼠标已进入弹框/连接点） */
function cancelQuickAddClose() {
  if (quickAddCloseTimer) {
    clearTimeout(quickAddCloseTimer);
    quickAddCloseTimer = null;
  }
}

/** 在连接点附近打开新增弹框：新增任务/网关节点 + 创建连线到已有节点 */
function openQuickAddMenu(sourceId: string, anchorEl: SVGElement) {
  const canvasRect = canvasRef.value?.getBoundingClientRect();
  if (!canvasRect) return;

  const anchorRect = anchorEl.getBoundingClientRect();
  const x = anchorRect.left - canvasRect.left + anchorRect.width / 2 + 12;
  const y = anchorRect.top - canvasRect.top + anchorRect.height / 2 + 12;

  quickAddMenu.visible = true;
  quickAddMenu.sourceNodeId = sourceId;
  quickAddMenu.targets = QUICK_ADD_TARGETS;
  quickAddMenu.connectTargets = buildQuickConnectTargets(sourceId);
  // 弹框位置限制在画布范围内，避免溢出
  quickAddMenu.x = Math.max(0, Math.min(x, Math.max(0, canvasRect.width - 192)));
  quickAddMenu.y = Math.max(0, Math.min(y, Math.max(0, canvasRect.height - 104)));
}

/**
 * 画布 pointerover：
 * - 命中连接点 -> 打开“新增节点”弹框（任务/网关图标 + 创建连线到已有节点）
 * - 命中节点主体 -> 仅高亮出边（电流效果），不打开弹框
 * - 进入弹框内部 -> 保持打开
 */
function handlePointerOver(event: PointerEvent) {
  if (props.mode !== "edit") return;

  const target = event.target as Element | null;
  if (!target) return;

  // 鼠标进入新增弹框内部：保持打开
  if (target.closest?.(".lf-quick-add")) {
    cancelQuickAddClose();
    return;
  }

  // 命中连接点：打开“新增节点”弹框
  const anchorEl = target.closest?.(".lf-anchor") as SVGElement | null;
  if (anchorEl) {
    const nodeEl = anchorEl.closest(".lf-node") as SVGElement | null;
    const sourceId = nodeEl?.getAttribute("data-id") ?? "";
    const sourceNode = sourceId ? store.graphData.nodes.find((n) => n.id === sourceId) : undefined;
    if (!sourceId || !sourceNode) return;

    // 弹框已打开且属于当前节点：保持打开
    if (quickAddMenu.visible && quickAddMenu.sourceNodeId === sourceId) {
      cancelQuickAddClose();
      return;
    }

    cancelQuickAddClose();
    if (QUICK_ADD_SOURCE_TYPES.includes(sourceNode.type)) {
      openQuickAddMenu(sourceId, anchorEl);
    } else {
      closeQuickAddMenu();
    }
    return;
  }

  // 命中节点主体：仅高亮出边（电流效果）。
  // 弹框只由连接点唤起，这里仅处理弹框归属切换：属于其它节点时关闭，属于当前节点时保持打开
  const nodeEl = target.closest?.(".lf-node") as SVGElement | null;
  if (nodeEl) {
    const sourceId = nodeEl.getAttribute("data-id");
    const sourceNode = sourceId ? store.graphData.nodes.find((n) => n.id === sourceId) : undefined;
    if (sourceNode) {
      hoveredNodeId.value = sourceId!;
      highlightOutgoingEdges(sourceId!);
      if (quickAddMenu.visible && quickAddMenu.sourceNodeId !== sourceId) {
        closeQuickAddMenu();
      } else if (quickAddMenu.visible && quickAddMenu.sourceNodeId === sourceId) {
        cancelQuickAddClose();
      }
    }
  }
}

/** 判断点是否位于矩形内（含向外扩展的容差） */
function isPointInRect(x: number, y: number, rect: DOMRect, pad: number): boolean {
  return (
    x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad
  );
}

/**
 * 判断指针是否仍处于弹框“保活区域”：
 * 源节点 + 弹框 的外接区域向外扩展 24px，覆盖连接点与两者之间的间隙。
 * 鼠标从连接点移向弹框（即使移动较慢、经过节点主体或间隙）时不关闭弹框。
 */
function isPointerInKeepAliveZone(event: PointerEvent): boolean {
  const { clientX, clientY } = event;
  const pad = 24;

  if (quickAddMenu.visible && quickAddMenu.sourceNodeId) {
    const nodeEl = document.querySelector(`.lf-node[data-id="${quickAddMenu.sourceNodeId}"]`);
    if (nodeEl && isPointInRect(clientX, clientY, nodeEl.getBoundingClientRect(), pad)) return true;
    if (
      quickAddMenuRef.value &&
      isPointInRect(clientX, clientY, quickAddMenuRef.value.getBoundingClientRect(), pad)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 画布 pointerout：指针仍处于保活区域（节点/连接点/弹框及间隙）时不关闭，
 * 彻底移出后才延迟关闭，避免鼠标移向弹框时菜单消失。
 */
function handlePointerOut(event: PointerEvent) {
  if (isPointerInKeepAliveZone(event)) {
    cancelQuickAddClose();
    return;
  }

  if (quickAddMenu.visible) scheduleQuickAddClose();
  // 鼠标真正离开节点/弹框区域，清除出边电流高亮
  clearOutgoingEdgeHighlight();

  // 若悬浮节点仍存在于画布上，说明是用户主动移出，清除悬浮记录。
  // 若节点已被删除（如删除节点时 DOM 移除触发的 pointerout），保留悬浮记录，
  // 以便撤销恢复后由 syncGraphFromStore 重新应用电泳高亮。
  if (hoveredNodeId.value && lfInstance.value?.getNodeModelById(hoveredNodeId.value)) {
    hoveredNodeId.value = null;
  }
}

/**
 * 指针完全离开画布区域时清除所有悬浮状态。
 * pointerleave 仅在指针离开元素本身（含子元素）时触发，不会在子元素间移动时触发。
 */
function handlePointerLeave() {
  hoveredNodeId.value = null;
  clearOutgoingEdgeHighlight();
}

/** 按分类筛选弹框目标节点 */
function getTargetsByCategory(category: "event" | "task" | "gateway"): QuickAddTarget[] {
  return quickAddMenu.targets.filter((t) => t.category === category);
}

/** 点击弹框图标：新增对应类型节点并创建 source -> 新节点 的连线 */
function handleQuickAdd(type: NodeType) {
  const lf = lfInstance.value;
  const sourceId = quickAddMenu.sourceNodeId;
  const source = store.graphData.nodes.find((n) => n.id === sourceId);
  closeQuickAddMenu();

  if (!lf || !source || !QUICK_ADD_TARGET_TYPES.includes(type)) return;
  if (!canAddNodeType(type)) return;

  // 新节点放在源节点右侧；按源节点已有出口连线数量轻微纵向错开，避免连续新增时重叠
  const outgoingCount = store.graphData.edges.filter((e) => e.sourceNodeId === source.id).length;
  const node = createFlowNode(type, source.x + 240, source.y + ((outgoingCount % 3) - 1) * 60);

  lf.addNode(node);
  // node:add 事件监听器会自动同步到 store
  lf.addEdge({
    id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: store.edgeType,
    sourceNodeId: source.id,
    targetNodeId: node.id,
    properties: {},
  });
  // edge:add 事件监听器会自动同步到 store 并 emit edge-added
}

/** 点击菜单项：创建 source -> target 连线 */
function handleQuickConnect(targetId: string) {
  const lf = lfInstance.value;
  const sourceId = quickAddMenu.sourceNodeId;
  closeQuickAddMenu();

  if (!lf || !sourceId || sourceId === targetId) return;

  const exists = store.graphData.edges.some(
    (e) => e.sourceNodeId === sourceId && e.targetNodeId === targetId
  );
  if (exists) return;

  lf.addEdge({
    id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: store.edgeType,
    sourceNodeId: sourceId,
    targetNodeId: targetId,
    properties: {},
  });
  // edge:add 事件监听器会自动同步到 store 并 emit edge-added
}

/**
 * 适应画布：计算全部节点的包围盒，将画布缩放并平移至内容居中展示。
 * 空画布时重置为默认缩放。
 */
function zoomToFit() {
  const lf = lfInstance.value;
  if (!lf) return;

  programmaticZoom = true;
  try {
    const graphData = (lf.getGraphData() as FlowGraphData) ?? { nodes: [], edges: [] };
    if (!graphData.nodes.length) {
      lf.resetZoom();
      store.setZoomLevel(1);
      return;
    }

    // 计算节点包围盒（画布坐标）
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of graphData.nodes) {
      const model = lf.getNodeModelById(node.id);
      const width = model?.width ?? node.width ?? 140;
      const height = model?.height ?? node.height ?? 80;
      minX = Math.min(minX, node.x - width / 2);
      minY = Math.min(minY, node.y - height / 2);
      maxX = Math.max(maxX, node.x + width / 2);
      maxY = Math.max(maxY, node.y + height / 2);
    }

    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);
    const viewportWidth = lfContainer.value?.clientWidth || 800;
    const viewportHeight = lfContainer.value?.clientHeight || 600;
    const padding = 60;

    // 缩放比例：使内容完整显示在视口内，限制在 [0.2, 1.5]
    const scale = Math.min(
      (viewportWidth - padding) / contentWidth,
      (viewportHeight - padding) / contentHeight
    );
    const zoom = Math.max(0.2, Math.min(scale, 1.5));

    const tm = lf.graphModel.transformModel;
    tm.SCALE_X = 1;
    tm.SCALE_Y = 1;
    tm.TRANSLATE_X = 0;
    tm.TRANSLATE_Y = 0;
    tm.zoom(zoom, [0, 0]);
    tm.focusOn((minX + maxX) / 2, (minY + maxY) / 2, viewportWidth, viewportHeight);

    store.setZoomLevel(zoom);
  } finally {
    programmaticZoom = false;
  }
}

/**
 * 拖拽悬停：仅设置 dropEffect，允许 drop 事件触发
 */
function handleDragOver(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
}

/**
 * 拖拽放置：从节点面板拖入节点时，根据放置位置创建节点并加入画布与 store
 * 闭环 NodePalette -> LogicFlowCanvas 的拖拽流程
 */
/** 检查是否可以添加指定类型的节点（开始/结束节点只能存在一个） */
function canAddNodeType(type: NodeType): boolean {
  if (type === "startEvent") {
    if (store.hasNodeType("startEvent")) {
      ElMessage.warning("画布中已存在开始节点，不能重复添加");
      return false;
    }
  } else if (type === "endEvent") {
    if (store.hasNodeType("endEvent")) {
      ElMessage.warning("画布中已存在结束节点，不能重复添加");
      return false;
    }
  }
  return true;
}

function handleDrop(event: DragEvent) {
  if (props.mode !== "edit") return;
  const type = event.dataTransfer?.getData("application/logicflow-node") as NodeType;
  if (!type || !lfInstance.value) return;

  event.preventDefault();

  // 将浏览器客户端坐标转换为 LogicFlow 画布坐标
  const point = lfInstance.value.getPointByClient(event.clientX, event.clientY);
  const { x, y } = point.canvasOverlayPosition;

  // 检查开始/结束节点是否已存在
  if (!canAddNodeType(type)) return;

  // 使用统一工厂创建节点，确保默认属性/尺寸一致
  const node = createFlowNode(type, x, y);
  lfInstance.value.addNode(node);
  // node:add 事件监听器会自动同步到 store 并 emit node-added
}

/**
 * 重新计算所有连线的锚点
 *
 * 自动排版会把节点大范围移动，导致连线创建时的锚点方向失效
 * （例如原来目标在左侧、排版后目标在右侧），连线会从节点错误的一侧进出、相互交叉。
 * 这里清除旧锚点后按当前相对位置重新计算，使连线正确吸附到连接点。
 */
function refreshEdgeAnchors() {
  const lf = lfInstance.value;
  if (!lf) return;
  const graphData = (lf.getGraphData() as FlowGraphData) ?? { nodes: [], edges: [] };

  for (const edge of graphData.edges) {
    const edgeModel = lf.getEdgeModelById(edge.id);
    const sourceNode = lf.getNodeModelById(edge.sourceNodeId);
    const targetNode = lf.getNodeModelById(edge.targetNodeId);
    if (!edgeModel || !sourceNode || !targetNode) continue;

    const model = edgeModel as unknown as {
      sourceAnchorId: string | null;
      targetAnchorId: string | null;
      getBeginAnchor?: (
        source: unknown,
        target: unknown,
        anchorId: string | null
      ) => { id: string; x: number; y: number } | undefined;
      getEndAnchor?: (
        target: unknown,
        anchorId: string | null
      ) => { id: string; x: number; y: number } | undefined;
      updateStartPoint?: (anchor: { x: number; y: number }) => void;
      updateEndPoint?: (anchor: { x: number; y: number }) => void;
    };

    // 按节点当前相对位置重新计算起止锚点（不指定锚点 id 时取朝向对方节点的锚点）
    const beginAnchor = model.getBeginAnchor?.(sourceNode, targetNode, null);
    if (!beginAnchor) continue;
    model.sourceAnchorId = beginAnchor.id;
    // 先更新起点，使 getEndAnchor 基于新起点选择目标侧锚点
    model.updateStartPoint?.({ x: beginAnchor.x, y: beginAnchor.y });

    const endAnchor = model.getEndAnchor?.(targetNode, null);
    if (!endAnchor) continue;
    model.targetAnchorId = endAnchor.id;
    // updateStartPoint/updateEndPoint（Bezier 版）会重算曲线路径，使连线吸附到新锚点
    model.updateEndPoint?.({ x: endAnchor.x, y: endAnchor.y });
  }
}

// 暴露方法给父组件
defineExpose({
  getInstance: () => lfInstance.value,
  addNode: (node: FlowNode) => {
    lfInstance.value?.addNode(node);
  },
  updateNode: (node: FlowNode) => {
    const lf = lfInstance.value;
    const model = lf?.getNodeModelById(node.id);
    if (lf && model) {
      lf.graphModel.moveNode2Coordinate(node.id, node.x, node.y);
    }
  },
  zoomToFit,
  refreshEdgeAnchors,
});
</script>

<style scoped lang="scss">
.logic-flow-canvas {
  position: relative;
  width: 100%;
  height: 100%;

  .lf-wrapper {
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  // 连接点悬浮快捷菜单
  .lf-quick-menu {
    position: absolute;
    z-index: 20;
    min-width: 220px;
    padding: 6px;
    user-select: none;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

    &__title {
      padding: 4px 8px;
      font-size: 12px;
      color: #909399;
    }

    &__list {
      max-height: 240px;
      padding: 0;
      margin: 0;
      overflow-y: auto;
      list-style: none;
    }

    &__item {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 6px 8px;
      font-size: 13px;
      color: #303133;
      cursor: pointer;
      border-radius: 4px;

      &:hover {
        color: #409eff;
        background: #ecf5ff;
      }
    }

    &__icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border-radius: 3px;

      &.start-event {
        background: linear-gradient(135deg, #67c23a, #85ce61);
        border-radius: 50%;
      }

      &.end-event {
        background: linear-gradient(135deg, #f56c6c, #f78989);
        border-radius: 50%;
      }

      &.user-task {
        background: linear-gradient(135deg, #409eff, #66b1ff);
      }

      &.service-task {
        background: linear-gradient(135deg, #e6a23c, #ebb563);
      }

      &.script-task {
        background: linear-gradient(135deg, #9b59b6, #bb7bd6);
      }

      &.business-rule-task {
        background: linear-gradient(135deg, #00bcd4, #4dd0e1);
      }

      &.manual-task {
        background: linear-gradient(135deg, #607d8b, #78909c);
      }

      &.receive-task {
        background: linear-gradient(135deg, #ffc107, #ffd54f);
      }

      &.send-task {
        background: linear-gradient(135deg, #3f51b5, #5c6bc0);
      }

      &.call-activity {
        background: linear-gradient(135deg, #009688, #26a69a);
        border: 2px solid #00695c;
      }

      &.sub-process {
        background: linear-gradient(135deg, #795548, #8d6e63);
        border: 2px solid #4e342e;
      }

      &.exclusive-gateway {
        background: linear-gradient(135deg, #e6a23c, #f0c78a);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.parallel-gateway {
        background: linear-gradient(135deg, #909399, #b1b3b8);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.inclusive-gateway {
        background: linear-gradient(135deg, #9c27b0, #ba68c8);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.event-based-gateway {
        background: linear-gradient(135deg, #673ab7, #7e57c2);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.complex-gateway {
        background: linear-gradient(135deg, #f44336, #ef5350);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.custom-node {
        background: linear-gradient(135deg, #9b59b6, #bb7bd6);
      }
    }

    &__label {
      flex: 1;
      min-width: 0;
      word-break: break-all;
    }
  }

  // 节点悬浮快捷新增弹框
  .lf-quick-add {
    position: absolute;
    z-index: 21;
    width: 260px;
    padding: 8px;
    user-select: none;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

    &__group-title {
      padding: 4px 6px;
      margin-top: 2px;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #606266;
      border-bottom: 1px solid #f0f2f5;

      &:first-child {
        margin-top: 0;
      }
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      margin-bottom: 4px;
    }

    &__item {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 6px 8px;
      font-size: 12px;
      color: #303133;
      cursor: pointer;
      border: 1px solid transparent;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        color: #409eff;
        background: #ecf5ff;
        border-color: #d9ecff;
      }
    }

    // 与 NodePalette 一致的节点图标样式
    &__icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 3px;

      &.start-event {
        background: linear-gradient(135deg, #67c23a, #85ce61);
        border-radius: 50%;
      }

      &.end-event {
        background: linear-gradient(135deg, #f56c6c, #f78989);
        border-radius: 50%;
      }

      &.user-task {
        background: linear-gradient(135deg, #409eff, #66b1ff);
      }

      &.service-task {
        background: linear-gradient(135deg, #e6a23c, #ebb563);
      }

      &.script-task {
        background: linear-gradient(135deg, #9b59b6, #bb7bd6);
      }

      &.business-rule-task {
        background: linear-gradient(135deg, #00bcd4, #4dd0e1);
      }

      &.manual-task {
        background: linear-gradient(135deg, #607d8b, #78909c);
      }

      &.receive-task {
        background: linear-gradient(135deg, #ffc107, #ffd54f);
      }

      &.send-task {
        background: linear-gradient(135deg, #3f51b5, #5c6bc0);
      }

      &.call-activity {
        background: linear-gradient(135deg, #009688, #26a69a);
        border: 2px solid #00695c;
      }

      &.sub-process {
        background: linear-gradient(135deg, #795548, #8d6e63);
        border: 2px solid #4e342e;
      }

      &.exclusive-gateway {
        background: linear-gradient(135deg, #e6a23c, #f0c78a);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.parallel-gateway {
        background: linear-gradient(135deg, #909399, #b1b3b8);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.inclusive-gateway {
        background: linear-gradient(135deg, #9c27b0, #ba68c8);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.event-based-gateway {
        background: linear-gradient(135deg, #673ab7, #7e57c2);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.complex-gateway {
        background: linear-gradient(135deg, #f44336, #ef5350);
        border-radius: 3px;
        transform: rotate(45deg);
      }

      &.custom-node {
        background: linear-gradient(135deg, #9b59b6, #bb7bd6);
      }
    }

    &__label {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      word-break: break-all;
    }
  }
}
</style>
