/**
 * bpmnConverter 单元测试
 * 覆盖 graphToBpmn / bpmnToGraph / getBpmnElementType 的核心转换逻辑
 */

import { describe, it, expect } from "vitest";
import { graphToBpmn, bpmnToGraph, getBpmnElementType } from "@/utils/bpmnConverter";
import type { FlowGraphData, FlowNode, FlowEdge } from "@/api/logicflow";

// ---------- 测试数据工厂 ----------

function makeNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: "node_1",
    type: "userTask",
    x: 200,
    y: 150,
    width: 140,
    height: 80,
    text: "测试节点",
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

// ---------- getBpmnElementType ----------

describe("getBpmnElementType", () => {
  it("将 LogicFlow 节点类型映射为 BPMN 元素名", () => {
    expect(getBpmnElementType("startEvent")).toBe("startEvent");
    expect(getBpmnElementType("endEvent")).toBe("endEvent");
    expect(getBpmnElementType("userTask")).toBe("userTask");
    expect(getBpmnElementType("serviceTask")).toBe("serviceTask");
    expect(getBpmnElementType("scriptTask")).toBe("scriptTask");
    expect(getBpmnElementType("exclusiveGateway")).toBe("exclusiveGateway");
    expect(getBpmnElementType("parallelGateway")).toBe("parallelGateway");
  });

  it("customNode 回退为 userTask", () => {
    expect(getBpmnElementType("customNode")).toBe("userTask");
  });
});

// ---------- graphToBpmn ----------

describe("graphToBpmn", () => {
  it("空图仍生成合法的 BPMN XML 骨架", () => {
    const xml = graphToBpmn({ nodes: [], edges: [] }, "empty_process", "空流程");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<process id="empty_process" name="空流程"');
    expect(xml).toContain("</process>");
    expect(xml).toContain("</definitions>");
  });

  it("生成的 XML 包含 process 的 id 和 name", () => {
    const xml = graphToBpmn({ nodes: [], edges: [] }, "my_key", "我的流程");
    expect(xml).toContain('id="my_key"');
    expect(xml).toContain('name="我的流程"');
  });

  it("开始/结束节点生成自闭合标签", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({ id: "start_1", type: "startEvent", text: "开始" }),
        makeNode({ id: "end_1", type: "endEvent", text: "结束" }),
      ],
      edges: [],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain('<startEvent id="start_1" name="开始"/>');
    expect(xml).toContain('<endEvent id="end_1" name="结束"/>');
  });

  it("用户任务节点包含 assignee/candidateUsers 等扩展属性", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({
          id: "task_1",
          type: "userTask",
          text: "审批",
          properties: {
            assignee: "admin",
            candidateUsers: "user1,user2",
            candidateGroups: "group1",
            formKey: "form_001",
          },
        }),
      ],
      edges: [],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain("<flowable:assignee>admin</flowable:assignee>");
    expect(xml).toContain("<flowable:candidateUsers>user1,user2</flowable:candidateUsers>");
    expect(xml).toContain("<flowable:candidateGroups>group1</flowable:candidateGroups>");
    expect(xml).toContain("<flowable:formKey>form_001</flowable:formKey>");
  });

  it("服务任务节点包含 delegateExpression/expression", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({
          id: "svc_1",
          type: "serviceTask",
          text: "服务",
          properties: {
            delegateExpression: "${myDelegate}",
            expression: "${svc.exec()}",
          },
        }),
      ],
      edges: [],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain(
      "<flowable:delegateExpression>${myDelegate}</flowable:delegateExpression>"
    );
    expect(xml).toContain("<flowable:expression>${svc.exec()}</flowable:expression>");
  });

  it("脚本任务节点包含 scriptFormat 和 script", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({
          id: "script_1",
          type: "scriptTask",
          text: "脚本",
          properties: { scriptFormat: "javascript", script: "var x = 1;" },
        }),
      ],
      edges: [],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain("<scriptFormat>javascript</scriptFormat>");
    expect(xml).toContain("<script>var x = 1;</script>");
  });

  it("带条件的连线生成 conditionExpression 子元素", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({ id: "n1", type: "startEvent" }),
        makeNode({ id: "n2", type: "endEvent", x: 400 }),
      ],
      edges: [
        makeEdge({
          id: "e1",
          sourceNodeId: "n1",
          targetNodeId: "n2",
          properties: { conditionExpression: "${amount > 100}" },
        }),
      ],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain("<sequenceFlow");
    expect(xml).toContain("<conditionExpression");
    expect(xml).toContain("<![CDATA[${amount > 100}]]>");
  });

  it("无条件的连线生成自闭合 sequenceFlow 标签", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({ id: "n1", type: "startEvent" }),
        makeNode({ id: "n2", type: "endEvent", x: 400 }),
      ],
      edges: [makeEdge({ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" })],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain('<sequenceFlow id="e1" sourceRef="n1" targetRef="n2"/>');
    expect(xml).not.toContain("conditionExpression");
  });

  it("对节点名称中的 XML 特殊字符进行转义", () => {
    const data: FlowGraphData = {
      nodes: [makeNode({ id: "n1", type: "startEvent", text: "<script>\"&'</script>" })],
      edges: [],
    };
    const xml = graphToBpmn(data);
    // 特殊字符应被转义，不应出现未转义的 <script> 标签
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).toContain("&quot;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&apos;");
    expect(xml).not.toMatch(/<script>.*<\/script>/);
  });

  it("生成 BPMN DI 图形信息（BPMNShape / BPMNEdge）", () => {
    const data: FlowGraphData = {
      nodes: [
        makeNode({ id: "n1", type: "startEvent" }),
        makeNode({ id: "n2", type: "endEvent", x: 400 }),
      ],
      edges: [makeEdge({ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" })],
    };
    const xml = graphToBpmn(data);
    expect(xml).toContain("BPMNDiagram");
    expect(xml).toContain("BPMNPlane");
    expect(xml).toContain('BPMNShape id="BPMNShape_n1"');
    expect(xml).toContain('BPMNEdge id="BPMNEdge_e1"');
  });
});

// ---------- bpmnToGraph ----------

describe("bpmnToGraph", () => {
  it("能从 BPMN XML 解析出节点和连线", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:omgdc="http://www.omg.org/spec/DD/20050524/DC">
  <process id="test" name="测试">
    <startEvent id="start_1" name="开始"/>
    <endEvent id="end_1" name="结束"/>
    <sequenceFlow id="flow_1" sourceRef="start_1" targetRef="end_1"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="test">
      <bpmndi:BPMNShape id="Shape_start_1" bpmnElement="start_1">
        <omgdc:Bounds x="100" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_end_1" bpmnElement="end_1">
        <omgdc:Bounds x="400" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

    const graph = bpmnToGraph(xml);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);

    const start = graph.nodes.find((n) => n.id === "start_1");
    expect(start).toBeDefined();
    expect(start!.type).toBe("startEvent");
    expect(start!.text).toBe("开始");
    // 位置应为中心坐标（bounds x + width/2）
    expect(start!.x).toBe(100 + 36 / 2);
    expect(start!.y).toBe(200 + 36 / 2);

    const edge = graph.edges[0];
    expect(edge.id).toBe("flow_1");
    expect(edge.sourceNodeId).toBe("start_1");
    expect(edge.targetNodeId).toBe("end_1");
  });

  it("能解析连线上的条件表达式", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="test" name="测试">
    <startEvent id="s1" name="开始"/>
    <endEvent id="e1" name="结束"/>
    <sequenceFlow id="f1" sourceRef="s1" targetRef="e1">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[\${amount > 50}]]></conditionExpression>
    </sequenceFlow>
  </process>
</definitions>`;

    const graph = bpmnToGraph(xml);
    expect(graph.edges[0].properties?.conditionExpression).toContain("amount > 50");
  });

  it("graphToBpmn -> bpmnToGraph 往返转换保持核心数据一致", () => {
    const original: FlowGraphData = {
      nodes: [
        makeNode({ id: "start_1", type: "startEvent", text: "开始", x: 100, y: 200 }),
        makeNode({ id: "end_1", type: "endEvent", text: "结束", x: 400, y: 200 }),
      ],
      edges: [makeEdge({ id: "flow_1", sourceNodeId: "start_1", targetNodeId: "end_1" })],
    };

    const xml = graphToBpmn(original, "round_trip", "往返测试");
    const restored = bpmnToGraph(xml);

    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(1);
    expect(restored.nodes.find((n) => n.id === "start_1")?.type).toBe("startEvent");
    expect(restored.nodes.find((n) => n.id === "end_1")?.type).toBe("endEvent");
    expect(restored.edges[0].sourceNodeId).toBe("start_1");
    expect(restored.edges[0].targetNodeId).toBe("end_1");
  });
});
