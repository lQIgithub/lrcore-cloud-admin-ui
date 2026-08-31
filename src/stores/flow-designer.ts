import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  FlowGraphData,
  FlowNode,
  FlowEdge,
  ProcessDefinitionVO,
  NodeType,
} from "@/api/logicflow";
import { logicflowToBpmn20 } from "@/utils/logicflowToBpmn";
import { processDefinitionApi } from "@/api/logicflow";

/**
 * 深拷贝 FlowGraphData
 *
 * 注意：不能直接使用 structuredClone，因为 Pinia 的 state 是 Vue 响应式 Proxy，
 * structuredClone 无法克隆 Proxy 对象。JSON 序列化会自动穿透 Proxy 读取底层值，
 * 对于仅包含 JSON 可序列化类型（string/number/array/object）的 FlowGraphData 而言
 * 这是安全且高效的深拷贝方式。
 */
function cloneGraphData(data: FlowGraphData): FlowGraphData {
  return JSON.parse(JSON.stringify(data));
}

/**
 * 流程设计器状态管理Store
 */
export const useFlowDesignerStore = defineStore("flowDesigner", () => {
  // 当前流程定义
  const processDefinition = ref<ProcessDefinitionVO | null>(null);

  // 草稿流程信息：未保存/新建流程时用于 BPMN 预览与导出
  const draftProcessKey = ref("process");
  const draftProcessName = ref("未命名流程");

  // 流程图形数据
  const graphData = ref<FlowGraphData>({
    nodes: [],
    edges: [],
  });

  // 当前选中的节点/边
  const selectedElement = ref<FlowNode | FlowEdge | null>(null);
  const selectedType = ref<"node" | "edge" | null>(null);
  const edgeType = ref<"polyline" | "bezier" | "line">("bezier");

  // 画布状态
  const canvasReady = ref(false);
  const zoomLevel = ref(1);

  // 历史记录（用于撤销/重做）
  const history = ref<FlowGraphData[]>([]);
  const historyIndex = ref(-1);

  // 初始化历史记录：保存初始空画布状态，使首次操作后可以撤销回空画布
  pushHistory();

  // 计算属性
  const currentNode = computed(() => {
    if (selectedType.value === "node") {
      return selectedElement.value as FlowNode;
    }
    return null;
  });

  const currentEdge = computed(() => {
    if (selectedType.value === "edge") {
      return selectedElement.value as FlowEdge;
    }
    return null;
  });

  const historyLength = computed(() => history.value.length);

  /** 获取是否可撤销（直接访问响应式源，确保模板能正确追踪） */
  function getCanUndo(): boolean {
    return historyIndex.value > 0;
  }

  /** 获取是否可重做（直接访问响应式源，确保模板能正确追踪） */
  function getCanRedo(): boolean {
    return historyIndex.value < historyLength.value - 1;
  }

  // BPMN XML：使用独立转换器生成标准 BPMN 2.0，用于“查看BPMN”预览与 Java 后端部署。
  // 已保存时以 processDefinition 为准，未保存时使用标题栏草稿流程信息，保证预览始终可用。
  const bpmnXml = computed(() => {
    return logicflowToBpmn20(graphData.value, {
      processKey: processDefinition.value?.key || draftProcessKey.value,
      processName: processDefinition.value?.name || draftProcessName.value,
      processDescription: processDefinition.value?.description,
    });
  });

  /**
   * 检查是否已存在指定类型的节点
   * 用于 UI 层在添加开始/结束节点前进行前置校验，避免触发警告
   */
  function hasNodeType(type: NodeType): boolean {
    return graphData.value.nodes.some((n) => n.type === type);
  }

  /**
   * 添加节点
   *
   * 注意：开始节点(startEvent)和结束节点(endEvent)全流程唯一，
   * 若已存在同类型节点则返回 { success: false, reason: "duplicate" }。
   */
  function addNode(node: FlowNode): { success: boolean; reason?: string } {
    // 开始/结束节点唯一性校验：避免在 store 层面出现重复节点
    if (node.type === "startEvent" || node.type === "endEvent") {
      if (hasNodeType(node.type)) {
        return { success: false, reason: "duplicate" };
      }
    }
    graphData.value.nodes.push(node);
    pushHistory();
    return { success: true };
  }

  /**
   * 更新节点
   */
  function updateNode(id: string, updates: Partial<FlowNode>): void {
    const index = graphData.value.nodes.findIndex((n) => n.id === id);
    if (index !== -1) {
      graphData.value.nodes[index] = { ...graphData.value.nodes[index], ...updates };
      pushHistory();

      // 如果当前选中的是该节点，更新选中元素
      if (selectedElement.value && (selectedElement.value as FlowNode).id === id) {
        selectedElement.value = { ...graphData.value.nodes[index] };
      }
    }
  }

  /**
   * 批量更新节点坐标（自动排版使用）
   *
   * @param positions 节点位置数组
   * @param recordHistory 是否记录历史记录（优化排版时传 false，由调用方统一处理）
   */
  function applyNodePositions(
    positions: Array<{ id: string; x: number; y: number }>,
    recordHistory: boolean = true
  ): void {
    if (!positions.length) return;
    const positionMap = new Map(positions.map((p) => [p.id, p]));
    let changed = false;

    // 确保所有边类型为当前选择的类型
    graphData.value.edges = graphData.value.edges.map((e) => {
      if (e.type !== edgeType.value) {
        changed = true;
        return { ...e, type: edgeType.value };
      }
      return e;
    });

    graphData.value.nodes = graphData.value.nodes.map((n) => {
      const p = positionMap.get(n.id);
      if (p && (p.x !== n.x || p.y !== n.y)) {
        changed = true;
        return { ...n, x: p.x, y: p.y };
      }
      return n;
    });

    if (changed) {
      if (recordHistory) {
        pushHistory();
      }
      // 同步选中的节点
      if (
        selectedElement.value &&
        selectedType.value === "node" &&
        positionMap.has((selectedElement.value as FlowNode).id)
      ) {
        const pos = positionMap.get((selectedElement.value as FlowNode).id)!;
        selectedElement.value = {
          ...(selectedElement.value as FlowNode),
          x: pos.x,
          y: pos.y,
        };
      }
    }
  }

  /**
   * 删除节点
   *
   * 同时删除与该节点关联的所有连线。若当前选中的是被删除的节点或其关联连线，
   * 一并清除选中状态，避免属性面板引用已删除的元素。
   */
  function removeNode(id: string): void {
    // 记录被删除的关联连线 id，用于判断选中元素是否需要清除
    const removedEdgeIds = new Set(
      graphData.value.edges
        .filter((e) => e.sourceNodeId === id || e.targetNodeId === id)
        .map((e) => e.id)
    );
    graphData.value.nodes = graphData.value.nodes.filter((n) => n.id !== id);
    // 删除相关连线
    graphData.value.edges = graphData.value.edges.filter(
      (e) => e.sourceNodeId !== id && e.targetNodeId !== id
    );
    pushHistory();
    // 若选中的是被删除的节点或其关联连线，清除选中
    if (selectedElement.value) {
      const selectedId = (selectedElement.value as { id: string }).id;
      if (selectedId === id || removedEdgeIds.has(selectedId)) {
        clearSelection();
      }
    }
  }

  /**
   * 添加连线
   */
  function addEdge(edge: FlowEdge): void {
    graphData.value.edges.push(edge);
    pushHistory();
  }

  /**
   * 更新连线
   */
  function updateEdge(id: string, updates: Partial<FlowEdge>): void {
    const index = graphData.value.edges.findIndex((e) => e.id === id);
    if (index !== -1) {
      graphData.value.edges[index] = { ...graphData.value.edges[index], ...updates };
      pushHistory();

      if (selectedElement.value && (selectedElement.value as FlowEdge).id === id) {
        selectedElement.value = { ...graphData.value.edges[index] };
      }
    }
  }

  /**
   * 删除连线
   */
  function removeEdge(id: string): void {
    graphData.value.edges = graphData.value.edges.filter((e) => e.id !== id);
    pushHistory();
    if (selectedElement.value && (selectedElement.value as FlowEdge).id === id) {
      clearSelection();
    }
  }

  /**
   * 设置选中元素
   */
  function setEdgeType(type: "polyline" | "bezier" | "line"): void {
    edgeType.value = type;
  }

  /** 将画布中所有连线转换为指定类型 */
  function convertAllEdgesType(type: "polyline" | "bezier" | "line"): void {
    graphData.value.edges = graphData.value.edges.map((e) => ({
      ...e,
      type,
    }));
    pushHistory();
  }

  /** 批量更新所有连线 */
  function updateAllEdges(edges: FlowEdge[]): void {
    graphData.value.edges = edges;
    pushHistory();
  }

  function setSelection(element: FlowNode | FlowEdge | null, type: "node" | "edge" | null): void {
    selectedElement.value = element;
    selectedType.value = type;
  }

  /**
   * 清除选中
   */
  function clearSelection(): void {
    selectedElement.value = null;
    selectedType.value = null;
  }

  /**
   * 推送历史记录
   * 使用 cloneGraphData 深拷贝当前图形数据，确保历史快照与后续修改完全隔离。
   */
  function pushHistory(): void {
    history.value = history.value.slice(0, historyIndex.value + 1);
    history.value.push(cloneGraphData(graphData.value));
    historyIndex.value = history.value.length - 1;

    // 限制历史记录数量
    if (history.value.length > 50) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  /**
   * 覆盖最后一条历史记录（用于优化排版等需要更新当前操作状态的场景）
   */
  function overwriteLastHistory(): void {
    if (history.value.length === 0) {
      pushHistory();
      return;
    }
    // 直接替换当前历史索引位置的记录，不改变 historyIndex
    history.value[historyIndex.value] = cloneGraphData(graphData.value);
  }

  /**
   * 撤销
   */
  function undo(): void {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      const restored = cloneGraphData(history.value[historyIndex.value]);
      // 确保恢复的连线使用当前边类型
      restored.edges = restored.edges.map((e) => ({
        ...e,
        type: edgeType.value,
      }));
      graphData.value = restored;
      clearSelection();
    }
  }

  /**
   * 重做
   */
  function redo(): void {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      const restored = cloneGraphData(history.value[historyIndex.value]);
      // 确保恢复的连线使用当前边类型
      restored.edges = restored.edges.map((e) => ({
        ...e,
        type: edgeType.value,
      }));
      graphData.value = restored;
      clearSelection();
    }
  }

  /**
   * 清空画布
   */
  function clearCanvas(): void {
    graphData.value = { nodes: [], edges: [] };
    pushHistory();
    clearSelection();
  }

  /**
   * 设置草稿流程信息（由流程设计器标题栏同步，未保存时用于 BPMN 预览/导出）
   */
  function setDraftProcessInfo(key: string, name: string): void {
    draftProcessKey.value = key || "process";
    draftProcessName.value = name || "未命名流程";
  }

  /**
   * 加载流程定义
   *
   * @returns 加载成功的流程定义；失败（接口报错/数据为空）时返回 null
   */
  async function loadProcessDefinition(id: string): Promise<ProcessDefinitionVO | null> {
    // request 拦截器已拆壳，解析值即流程定义对象（后端未实现时可能为 null）
    const definition = await processDefinitionApi.getById(id);
    if (definition) {
      processDefinition.value = definition;
      if (definition.graphData) {
        graphData.value = definition.graphData;
      }
      pushHistory();
      return definition;
    }
    return null;
  }

  /**
   * 保存流程
   */
  async function saveProcess(): Promise<void> {
    if (!processDefinition.value || !processDefinition.value.id) {
      throw new Error("流程定义不存在");
    }
    await processDefinitionApi.saveGraph(graphData.value);
  }

  /**
   * 导出BPMN XML
   */
  function exportBpmn(): string {
    return bpmnXml.value;
  }

  /**
   * 设置缩放级别
   */
  function setZoomLevel(level: number): void {
    zoomLevel.value = Math.max(0.1, Math.min(3, level));
  }

  /**
   * 验证流程图完整性
   */
  function validateGraph(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const nodes = graphData.value.nodes;
    const edges = graphData.value.edges;

    // 检查是否有开始节点
    const hasStart = nodes.some((n) => n.type === "startEvent");
    if (!hasStart) {
      errors.push("流程必须包含至少一个开始节点");
    }

    // 检查是否有结束节点
    const hasEnd = nodes.some((n) => n.type === "endEvent");
    if (!hasEnd) {
      errors.push("流程必须包含至少一个结束节点");
    }

    // 检查孤立节点
    nodes.forEach((node) => {
      const hasIncoming = edges.some((e) => e.targetNodeId === node.id);
      const hasOutgoing = edges.some((e) => e.sourceNodeId === node.id);

      if (node.type !== "startEvent" && !hasIncoming && node.type !== "endEvent") {
        errors.push(`节点"${node.text || node.id}"缺少入口连线`);
      }
      if (node.type !== "endEvent" && !hasOutgoing && node.type !== "startEvent") {
        errors.push(`节点"${node.text || node.id}"缺少出口连线`);
      }
    });

    // 检查排他/包含/复杂网关是否有条件分支
    const conditionalGateways = nodes.filter((n) =>
      ["exclusiveGateway", "inclusiveGateway", "complexGateway"].includes(n.type)
    );
    const gatewayLabels: Record<string, string> = {
      exclusiveGateway: "排他网关",
      inclusiveGateway: "包含网关",
      complexGateway: "复杂网关",
    };
    conditionalGateways.forEach((gateway) => {
      const outgoingEdges = edges.filter((e) => e.sourceNodeId === gateway.id);
      const hasCondition = outgoingEdges.some((e) => e.properties?.conditionExpression);
      const hasDefault = outgoingEdges.some((e) => e.properties?.default === true);
      if (!hasCondition && !hasDefault && outgoingEdges.length > 1) {
        errors.push(`${gatewayLabels[gateway.type]}"${gateway.text || gateway.id}"缺少条件表达式`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  return {
    // 状态
    processDefinition,
    draftProcessKey,
    draftProcessName,
    graphData,
    selectedElement,
    selectedType,
    edgeType,
    canvasReady,
    zoomLevel,
    history,
    historyIndex,
    historyLength,
    getCanUndo,
    getCanRedo,
    currentNode,
    currentEdge,
    bpmnXml,

    // 操作方法
    hasNodeType,
    addNode,
    updateNode,
    applyNodePositions,
    removeNode,
    addEdge,
    updateEdge,
    removeEdge,
    setEdgeType,
    convertAllEdgesType,
    updateAllEdges,
    setSelection,
    clearSelection,
    setDraftProcessInfo,
    pushHistory,
    overwriteLastHistory,
    undo,
    redo,
    clearCanvas,
    loadProcessDefinition,
    saveProcess,
    exportBpmn,
    setZoomLevel,
    validateGraph,
  };
});
