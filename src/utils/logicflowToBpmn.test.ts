/**
 * logicflowToBpmn 单元测试
 * 覆盖 logicflowToBpmn20 的核心转换逻辑：节点/连线/扩展属性/BPMN DI
 */

import { describe, it, expect } from "vitest";
import { logicflowToBpmn20 } from "@/utils/logicflowToBpmn";
import type { FlowGraphData, FlowNode, FlowEdge } from "@/api/logicflow";

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

function convert(graphData: FlowGraphData, key = "test_process", name = "测试流程"): string {
  return logicflowToBpmn20(graphData, { processKey: key, processName: name });
}

describe("logicflowToBpmn20", () => {
  it("空图仍生成合法的 BPMN 2.0 XML 骨架", () => {
    const xml = convert({ nodes: [], edges: [] }, "empty_process", "空流程");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"');
    expect(xml).toContain('xmlns:flowable="http://flowable.org/bpmn"');
    expect(xml).toContain('xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
    expect(xml).toContain('<process id="empty_process" name="空流程" isExecutable="true">');
    expect(xml).toContain("</definitions>");
  });

  it("生成各类型节点的标准 BPMN 元素", () => {
    const graphData: FlowGraphData = {
      nodes: [
        makeNode({ id: "n_start", type: "startEvent", text: "开始" }),
        makeNode({ id: "n_user", type: "userTask", text: "审批" }),
        makeNode({ id: "n_service", type: "serviceTask", text: "调用服务" }),
        makeNode({
          id: "n_script",
          type: "scriptTask",
          text: "脚本",
          properties: { scriptFormat: "javascript", script: "execution.setVariable('ok', true)" },
        }),
        makeNode({ id: "n_gw", type: "exclusiveGateway", text: "判断" }),
        makeNode({ id: "n_parallel", type: "parallelGateway", text: "并行" }),
        makeNode({ id: "n_end", type: "endEvent", text: "结束" }),
      ],
      edges: [],
    };
    const xml = convert(graphData);

    expect(xml).toContain('<startEvent id="n_start" name="开始"/>');
    expect(xml).toContain('<userTask id="n_user" name="审批">');
    expect(xml).toContain('<serviceTask id="n_service" name="调用服务">');
    expect(xml).toContain('<scriptTask id="n_script" name="脚本" scriptFormat="javascript">');
    expect(xml).toContain("<script><![CDATA[execution.setVariable('ok', true)]]></script>");
    expect(xml).toContain('<exclusiveGateway id="n_gw" name="判断"');
    expect(xml).toContain('<parallelGateway id="n_parallel" name="并行"/>');
    expect(xml).toContain('<endEvent id="n_end" name="结束"/>');
  });

  it("用户任务输出 flowable 扩展属性", () => {
    const xml = convert({
      nodes: [
        makeNode({
          id: "n_user",
          properties: {
            assignee: "${applyUser}",
            candidateUsers: "u1,u2",
            candidateGroups: "manager",
            formKey: "leaveForm",
          },
        }),
      ],
      edges: [],
    });
    expect(xml).toContain("<flowable:assignee>${applyUser}</flowable:assignee>");
    expect(xml).toContain("<flowable:candidateUsers>u1,u2</flowable:candidateUsers>");
    expect(xml).toContain("<flowable:candidateGroups>manager</flowable:candidateGroups>");
    expect(xml).toContain("<flowable:formKey>leaveForm</flowable:formKey>");
  });

  it("条件连线输出 conditionExpression，排他网关输出 default 默认流", () => {
    const graphData: FlowGraphData = {
      nodes: [
        makeNode({ id: "n_gw", type: "exclusiveGateway" }),
        makeNode({ id: "n_a", type: "userTask" }),
        makeNode({ id: "n_b", type: "userTask" }),
      ],
      edges: [
        makeEdge({
          id: "e_cond",
          sourceNodeId: "n_gw",
          targetNodeId: "n_a",
          properties: { conditionExpression: "${amount > 100}" },
        }),
        makeEdge({
          id: "e_default",
          sourceNodeId: "n_gw",
          targetNodeId: "n_b",
          properties: { default: true },
        }),
      ],
    };
    const xml = convert(graphData);

    // 排他网关输出 default 属性指向默认流
    expect(xml).toMatch(/<exclusiveGateway id="n_gw"[^>]*default="e_default"\/>/);
    // 条件流输出 xsi:type + CDATA
    expect(xml).toContain('<sequenceFlow id="e_cond" sourceRef="n_gw" targetRef="n_a">');
    expect(xml).toContain(
      '<conditionExpression xsi:type="tFormalExpression"><![CDATA[${amount > 100}]]></conditionExpression>'
    );
    // 默认流不带条件
    expect(xml).toContain('<sequenceFlow id="e_default" sourceRef="n_gw" targetRef="n_b"/>');
  });

  it("输出 BPMN DI 图形坐标", () => {
    const xml = convert({
      nodes: [makeNode({ id: "n_start", type: "startEvent", x: 100, y: 100 })],
      edges: [],
    });
    expect(xml).toContain('<bpmndi:BPMNDiagram id="BPMNDiagram_1">');
    expect(xml).toContain('<bpmndi:BPMNShape id="BPMNShape_n_start" bpmnElement="n_start">');
    expect(xml).toContain('<omgdc:Bounds x="');
  });

  it("includeDiagram=false 时不输出 BPMN DI", () => {
    const xml = logicflowToBpmn20(
      { nodes: [makeNode({ id: "n_start", type: "startEvent" })], edges: [] },
      { processKey: "p", processName: "P", includeDiagram: false }
    );
    expect(xml).not.toContain("BPMNDiagram");
  });

  it("节点文本为 { value } 对象时兼容处理", () => {
    const xml = convert({
      nodes: [makeNode({ id: "n_user", text: { value: "对象文本" } as unknown as string })],
      edges: [],
    });
    expect(xml).toContain('name="对象文本"');
  });

  it("流程描述输出到 documentation", () => {
    const xml = logicflowToBpmn20(
      { nodes: [], edges: [] },
      { processKey: "p", processName: "P", processDescription: "测试描述" }
    );
    expect(xml).toContain("<documentation>测试描述</documentation>");
  });
});
