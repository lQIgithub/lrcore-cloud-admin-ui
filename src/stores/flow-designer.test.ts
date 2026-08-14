/**
 * flow-designer store 单元测试
 * 覆盖 validateGraph 校验逻辑及历史记录（undo/redo）核心流程
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Mock API 模块，避免触发 axios/settings 等重度依赖链
vi.mock("@/api/logicflow", () => ({
  processDefinitionApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    saveGraph: vi.fn(),
    deploy: vi.fn(),
    remove: vi.fn(),
    versions: vi.fn(),
  },
}));

import { useFlowDesignerStore } from "@/stores/flow-designer";
import type { FlowNode, FlowEdge } from "@/api/logicflow";

// ---------- 测试数据工厂 ----------

function makeNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: "node_1",
    type: "userTask",
    x: 200,
    y: 150,
    text: "任务",
    properties: {},
    ...overrides,
  };
}

function makeEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id: "edge_1",
    type: "polyline",
    sourceNodeId: "node_1",
    targetNodeId: "node_2",
    properties: {},
    ...overrides,
  };
}

/** 构造一条完整流程：start -> task -> end */
function buildValidGraph() {
  const nodes: FlowNode[] = [
    makeNode({ id: "start", type: "startEvent", text: "开始", x: 100, y: 200 }),
    makeNode({ id: "task1", type: "userTask", text: "审批", x: 300, y: 200 }),
    makeNode({ id: "end", type: "endEvent", text: "结束", x: 500, y: 200 }),
  ];
  const edges: FlowEdge[] = [
    makeEdge({ id: "e1", sourceNodeId: "start", targetNodeId: "task1" }),
    makeEdge({ id: "e2", sourceNodeId: "task1", targetNodeId: "end" }),
  ];
  return { nodes, edges };
}

// ---------- 测试前置 ----------

beforeEach(() => {
  setActivePinia(createPinia());
});

// ---------- validateGraph ----------

describe("validateGraph", () => {
  it("空画布验证失败：缺少开始和结束节点", () => {
    const store = useFlowDesignerStore();
    const result = store.validateGraph();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("流程必须包含至少一个开始节点");
    expect(result.errors).toContain("流程必须包含至少一个结束节点");
  });

  it("仅有开始节点、缺少结束节点验证失败", () => {
    const store = useFlowDesignerStore();
    store.graphData.nodes = [makeNode({ id: "start", type: "startEvent" })];
    const result = store.validateGraph();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("流程必须包含至少一个结束节点");
  });

  it("有开始和结束但中间节点未连线验证失败", () => {
    const store = useFlowDesignerStore();
    store.graphData.nodes = [
      makeNode({ id: "start", type: "startEvent" }),
      makeNode({ id: "task1", type: "userTask", text: "孤立任务" }),
      makeNode({ id: "end", type: "endEvent" }),
    ];
    // 只连 start -> end，task1 孤立
    store.graphData.edges = [makeEdge({ id: "e1", sourceNodeId: "start", targetNodeId: "end" })];
    const result = store.validateGraph();
    expect(result.valid).toBe(false);
    // 孤立的 userTask 既缺入口也缺出口
    expect(result.errors.some((e) => e.includes("孤立任务"))).toBe(true);
  });

  it("完整的 start -> task -> end 流程验证通过", () => {
    const store = useFlowDesignerStore();
    const graph = buildValidGraph();
    store.graphData.nodes = graph.nodes;
    store.graphData.edges = graph.edges;
    const result = store.validateGraph();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("排他网关有多条出口但缺少条件表达式验证失败", () => {
    const store = useFlowDesignerStore();
    store.graphData.nodes = [
      makeNode({ id: "start", type: "startEvent" }),
      makeNode({ id: "gw", type: "exclusiveGateway", text: "条件网关" }),
      makeNode({ id: "end1", type: "endEvent", x: 500 }),
      makeNode({ id: "end2", type: "endEvent", x: 500, y: 200 }),
    ];
    store.graphData.edges = [
      makeEdge({ id: "e1", sourceNodeId: "start", targetNodeId: "gw" }),
      makeEdge({ id: "e2", sourceNodeId: "gw", targetNodeId: "end1" }),
      makeEdge({ id: "e3", sourceNodeId: "gw", targetNodeId: "end2" }),
    ];
    const result = store.validateGraph();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("条件网关") && e.includes("条件表达式"))).toBe(
      true
    );
  });

  it("排他网关出口带有条件表达式验证通过", () => {
    const store = useFlowDesignerStore();
    store.graphData.nodes = [
      makeNode({ id: "start", type: "startEvent" }),
      makeNode({ id: "gw", type: "exclusiveGateway", text: "条件网关" }),
      makeNode({ id: "end1", type: "endEvent", x: 500 }),
      makeNode({ id: "end2", type: "endEvent", x: 500, y: 200 }),
    ];
    store.graphData.edges = [
      makeEdge({ id: "e1", sourceNodeId: "start", targetNodeId: "gw" }),
      makeEdge({
        id: "e2",
        sourceNodeId: "gw",
        targetNodeId: "end1",
        properties: { conditionExpression: "${amount > 100}" },
      }),
      makeEdge({
        id: "e3",
        sourceNodeId: "gw",
        targetNodeId: "end2",
        properties: { conditionExpression: "${amount <= 100}" },
      }),
    ];
    const result = store.validateGraph();
    expect(result.valid).toBe(true);
  });

  it("排他网关仅一条出口时无需条件也能通过", () => {
    const store = useFlowDesignerStore();
    store.graphData.nodes = [
      makeNode({ id: "start", type: "startEvent" }),
      makeNode({ id: "gw", type: "exclusiveGateway", text: "单出口网关" }),
      makeNode({ id: "end", type: "endEvent", x: 500 }),
    ];
    store.graphData.edges = [
      makeEdge({ id: "e1", sourceNodeId: "start", targetNodeId: "gw" }),
      makeEdge({ id: "e2", sourceNodeId: "gw", targetNodeId: "end" }),
    ];
    const result = store.validateGraph();
    expect(result.valid).toBe(true);
  });
});

// ---------- 历史记录 undo/redo ----------

describe("历史记录 undo/redo", () => {
  it("addNode 后 undo 能撤销到空画布", () => {
    const store = useFlowDesignerStore();
    store.addNode(makeNode({ id: "n1", type: "startEvent" }));
    expect(store.graphData.nodes).toHaveLength(1);

    store.undo();
    expect(store.graphData.nodes).toHaveLength(0);
  });

  it("undo 后 redo 能恢复", () => {
    const store = useFlowDesignerStore();
    store.addNode(makeNode({ id: "n1", type: "startEvent" }));
    store.undo();
    expect(store.graphData.nodes).toHaveLength(0);

    store.redo();
    expect(store.graphData.nodes).toHaveLength(1);
    expect(store.graphData.nodes[0].id).toBe("n1");
  });

  it("多次操作后 undo 逐回退，新操作截断 redo 链", () => {
    const store = useFlowDesignerStore();
    store.addNode(makeNode({ id: "n1", type: "startEvent" }));
    store.addNode(makeNode({ id: "n2", type: "endEvent" }));
    expect(store.graphData.nodes).toHaveLength(2);

    store.undo();
    expect(store.graphData.nodes).toHaveLength(1);
    expect(store.graphData.nodes[0].id).toBe("n1");

    // 新操作会截断 redo 链
    store.addNode(makeNode({ id: "n3", type: "userTask" }));
    store.redo(); // redo 链已被截断，不应有变化
    expect(store.graphData.nodes).toHaveLength(2);
    expect(store.graphData.nodes.map((n) => n.id)).toContain("n3");
  });

  it("undo/redo 深拷贝：操作后不引用历史快照对象", () => {
    const store = useFlowDesignerStore();
    store.addNode(makeNode({ id: "n1", type: "startEvent", text: "原文本" }));
    store.updateNode("n1", { text: "改后文本" });

    // undo 回到 addNode 时的状态
    store.undo();
    expect(store.graphData.nodes[0].text).toBe("原文本");

    // 修改当前状态不应影响历史记录
    store.graphData.nodes[0].text = "直接改的";
    store.undo(); // 回到空
    store.redo(); // 回到 addNode 状态
    expect(store.graphData.nodes[0].text).toBe("原文本");
  });
});

// ---------- 节点/连线增删改 ----------

describe("节点/连线增删改", () => {
  it("addNode/removeNode 正确维护数据", () => {
    const store = useFlowDesignerStore();
    const node = makeNode({ id: "n1", type: "startEvent" });
    store.addNode(node);
    expect(store.graphData.nodes).toHaveLength(1);

    store.removeNode("n1");
    expect(store.graphData.nodes).toHaveLength(0);
  });

  it("removeNode 同时删除关联连线", () => {
    const store = useFlowDesignerStore();
    store.graphData.nodes = [
      makeNode({ id: "n1", type: "startEvent" }),
      makeNode({ id: "n2", type: "endEvent", x: 400 }),
    ];
    store.graphData.edges = [makeEdge({ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" })];
    // pushHistory 需手动触发以记录状态
    store.removeNode("n1");
    expect(store.graphData.nodes).toHaveLength(1);
    expect(store.graphData.edges).toHaveLength(0);
  });

  it("updateNode 同步更新选中元素", () => {
    const store = useFlowDesignerStore();
    const node = makeNode({ id: "n1", type: "userTask", text: "原名" });
    store.addNode(node);
    store.setSelection(node, "node");

    store.updateNode("n1", { text: "新名" });
    expect(store.graphData.nodes[0].text).toBe("新名");
    expect((store.selectedElement as FlowNode).text).toBe("新名");
  });

  it("updateEdge 更新连线属性", () => {
    const store = useFlowDesignerStore();
    store.graphData.edges = [makeEdge({ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" })];
    store.updateEdge("e1", { properties: { conditionExpression: "${x>0}" } });
    expect(store.graphData.edges[0].properties?.conditionExpression).toBe("${x>0}");
  });

  it("clearCanvas 后可以添加开始节点（修复新建画布提示已存在开始节点的bug）", () => {
    const store = useFlowDesignerStore();
    // 先添加一个开始节点模拟旧画布状态
    store.addNode(makeNode({ id: "start_old", type: "startEvent" }));
    expect(store.graphData.nodes).toHaveLength(1);

    // 模拟新建画布流程
    store.clearCanvas();
    expect(store.graphData.nodes).toHaveLength(0);
    expect(store.graphData.edges).toHaveLength(0);

    // 此时检查是否存在开始节点，应该为 false
    const hasStartNode = store.graphData.nodes.some((n) => n.type === "startEvent");
    expect(hasStartNode).toBe(false);

    // 再次添加开始节点应该成功
    const startNode = makeNode({ id: "start_new", type: "startEvent" });
    store.addNode(startNode);
    expect(store.graphData.nodes).toHaveLength(1);
    expect(store.graphData.nodes[0].type).toBe("startEvent");
  });

  it("连续两次 clearCanvas 后仍可添加开始节点", () => {
    const store = useFlowDesignerStore();
    store.clearCanvas();
    store.clearCanvas();
    const hasStartNode = store.graphData.nodes.some((n) => n.type === "startEvent");
    expect(hasStartNode).toBe(false);
    store.addNode(makeNode({ id: "start_1", type: "startEvent" }));
    expect(store.graphData.nodes).toHaveLength(1);
  });

  it("hasNodeType 正确检测节点类型", () => {
    const store = useFlowDesignerStore();
    expect(store.hasNodeType("startEvent")).toBe(false);
    expect(store.hasNodeType("endEvent")).toBe(false);
    expect(store.hasNodeType("userTask")).toBe(false);

    store.addNode(makeNode({ id: "n1", type: "startEvent" }));
    expect(store.hasNodeType("startEvent")).toBe(true);
    expect(store.hasNodeType("endEvent")).toBe(false);
    expect(store.hasNodeType("userTask")).toBe(false);
  });

  it("addNode 拒绝重复添加开始节点", () => {
    const store = useFlowDesignerStore();
    const first = makeNode({ id: "start_1", type: "startEvent" });
    const result1 = store.addNode(first);
    expect(result1.success).toBe(true);
    expect(store.graphData.nodes).toHaveLength(1);

    // 再添加一个 startEvent 应被拒绝
    const second = makeNode({ id: "start_2", type: "startEvent" });
    const result2 = store.addNode(second);
    expect(result2.success).toBe(false);
    expect(result2.reason).toBe("duplicate");
    expect(store.graphData.nodes).toHaveLength(1); // 不应增加
  });

  it("addNode 拒绝重复添加结束节点", () => {
    const store = useFlowDesignerStore();
    store.addNode(makeNode({ id: "end_1", type: "endEvent" }));
    const result = store.addNode(makeNode({ id: "end_2", type: "endEvent" }));
    expect(result.success).toBe(false);
    expect(store.graphData.nodes).toHaveLength(1);
  });

  it("addNode 允许添加多个相同类型的非开始/结束节点", () => {
    const store = useFlowDesignerStore();
    store.addNode(makeNode({ id: "task_1", type: "userTask" }));
    const result = store.addNode(makeNode({ id: "task_2", type: "userTask" }));
    expect(result.success).toBe(true);
    expect(store.graphData.nodes).toHaveLength(2);
  });
});
