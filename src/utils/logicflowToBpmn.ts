/**
 * LogicFlow 图数据 -> 标准 BPMN 2.0 XML 转换器（独立封装）
 *
 * 将设计器画布图数据转换为标准 BPMN 2.0 XML，供 Java 后端（Flowable）部署流程实例：
 *   1. 前端通过该转换器生成 bpmnXml；
 *   2. 随部署接口提交后端；
 *   3. 后端调用 Flowable RepositoryService 完成部署。
 *
 * 使用方式：
 *   import { logicflowToBpmn20 } from "@/utils/logicflowToBpmn";
 *   const bpmnXml = logicflowToBpmn20(graphData, {
 *     processKey: "leaveProcess",
 *     processName: "请假流程",
 *   });
 */

import type { FlowGraphData, FlowNode, FlowEdge, NodeType } from "@/api/logicflow";

/** LogicFlow 节点类型 -> BPMN 元素名与默认尺寸 */
const NODE_TYPE_MAP: Record<NodeType, { element: string; width: number; height: number }> = {
  startEvent: { element: "startEvent", width: 36, height: 36 },
  userTask: { element: "userTask", width: 140, height: 80 },
  serviceTask: { element: "serviceTask", width: 140, height: 80 },
  scriptTask: { element: "scriptTask", width: 140, height: 80 },
  businessRuleTask: { element: "businessRuleTask", width: 140, height: 80 },
  manualTask: { element: "manualTask", width: 140, height: 80 },
  receiveTask: { element: "receiveTask", width: 140, height: 80 },
  sendTask: { element: "sendTask", width: 140, height: 80 },
  callActivity: { element: "callActivity", width: 140, height: 80 },
  subProcess: { element: "subProcess", width: 140, height: 80 },
  exclusiveGateway: { element: "exclusiveGateway", width: 80, height: 80 },
  parallelGateway: { element: "parallelGateway", width: 80, height: 80 },
  inclusiveGateway: { element: "inclusiveGateway", width: 80, height: 80 },
  eventBasedGateway: { element: "eventBasedGateway", width: 80, height: 80 },
  complexGateway: { element: "complexGateway", width: 80, height: 80 },
  endEvent: { element: "endEvent", width: 36, height: 36 },
  customNode: { element: "userTask", width: 140, height: 80 },
};

/** 转换选项 */
export interface LogicflowToBpmnOptions {
  /** 流程定义 Key（BPMN process id） */
  processKey: string;
  /** 流程名称 */
  processName: string;
  /** 流程描述（可选，输出到 documentation） */
  processDescription?: string;
  /** 是否输出 BPMN DI 图形信息（坐标），默认 true */
  includeDiagram?: boolean;
}

/** 转义 XML 特殊字符 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 将文本放入 CDATA，并安全处理内部的 ]]> 序列 */
function toCData(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** 兼容节点文本的两种存储形态：字符串 或 { value } 对象 */
function getNodeText(node: FlowNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.text as { value?: string } | undefined)?.value ?? node.id;
}

/** 获取节点尺寸（优先节点自带，其次类型默认） */
function getNodeSize(node: FlowNode): { width: number; height: number } {
  const def = NODE_TYPE_MAP[node.type];
  return {
    width: node.width || def?.width || 140,
    height: node.height || def?.height || 80,
  };
}

/** 主入口：LogicFlow 图数据 -> 标准 BPMN 2.0 XML */
export function logicflowToBpmn20(
  graphData: FlowGraphData,
  options: LogicflowToBpmnOptions
): string {
  const { processKey, processName, processDescription, includeDiagram = true } = options;
  const { nodes = [], edges = [] } = graphData;

  const out: string[] = [];

  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"');
  out.push('             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  out.push('             xmlns:flowable="http://flowable.org/bpmn"');
  out.push('             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
  out.push('             xmlns:omgdc="http://www.omg.org/spec/DD/20050524/DC"');
  out.push('             xmlns:omgdi="http://www.omg.org/spec/DD/20050524/DI"');
  out.push('             targetNamespace="http://flowable.org/bpmn20"');
  out.push('             exporter="LogicFlow Designer"');
  out.push('             exporterVersion="1.0">');
  out.push("");

  // 流程定义
  out.push(
    `  <process id="${escapeXml(processKey)}" name="${escapeXml(processName)}" isExecutable="true">`
  );
  if (processDescription) {
    out.push(`    <documentation>${escapeXml(processDescription)}</documentation>`);
  }

  for (const node of nodes) {
    out.push(buildNodeXml(node, edges));
  }
  for (const edge of edges) {
    out.push(buildEdgeXml(edge));
  }

  out.push("  </process>");
  out.push("");

  // BPMN DI（图形坐标，供 Flowable/工作流引擎展示流程图）
  if (includeDiagram && nodes.length) {
    const bounds = calculateBounds(nodes);
    out.push('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">');
    out.push(`    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${escapeXml(processKey)}">`);
    for (const node of nodes) {
      out.push(buildShapeXml(node, bounds));
    }
    for (const edge of edges) {
      out.push(buildEdgeDiagramXml(edge, nodes, bounds));
    }
    out.push("    </bpmndi:BPMNPlane>");
    out.push("  </bpmndi:BPMNDiagram>");
  }

  out.push("</definitions>");
  return out.join("\n");
}

/** 生成节点（BPMN 流程元素） */
function buildNodeXml(node: FlowNode, edges: FlowEdge[]): string {
  const element = NODE_TYPE_MAP[node.type]?.element || "userTask";
  const name = escapeXml(getNodeText(node));
  const props = (node.properties ?? {}) as Record<string, unknown>;
  const indent = "    ";

  switch (element) {
    case "startEvent":
      return `${indent}<startEvent id="${node.id}" name="${name}"/>`;
    case "endEvent":
      return `${indent}<endEvent id="${node.id}" name="${name}"/>`;

    case "userTask": {
      const lines = [`${indent}<userTask id="${node.id}" name="${name}">`];
      pushOptionalText(lines, `${indent}  `, props.assignee, "flowable:assignee");
      pushOptionalText(lines, `${indent}  `, props.candidateUsers, "flowable:candidateUsers");
      pushOptionalText(lines, `${indent}  `, props.candidateGroups, "flowable:candidateGroups");
      pushOptionalText(lines, `${indent}  `, props.formKey, "flowable:formKey");
      lines.push(`${indent}</userTask>`);
      return lines.join("\n");
    }

    case "serviceTask": {
      const lines = [`${indent}<serviceTask id="${node.id}" name="${name}">`];
      pushOptionalText(
        lines,
        `${indent}  `,
        props.delegateExpression,
        "flowable:delegateExpression"
      );
      pushOptionalText(lines, `${indent}  `, props.expression, "flowable:expression");
      pushOptionalText(lines, `${indent}  `, props.class, "flowable:class");
      lines.push(`${indent}</serviceTask>`);
      return lines.join("\n");
    }

    case "scriptTask": {
      const scriptFormat = props.scriptFormat
        ? ` scriptFormat="${escapeXml(String(props.scriptFormat))}"`
        : "";
      const lines = [`${indent}<scriptTask id="${node.id}" name="${name}"${scriptFormat}>`];
      if (props.script) {
        lines.push(`${indent}  <script>${toCData(String(props.script))}</script>`);
      }
      lines.push(`${indent}</scriptTask>`);
      return lines.join("\n");
    }

    case "businessRuleTask": {
      const lines = [`${indent}<businessRuleTask id="${node.id}" name="${name}">`];
      pushOptionalText(
        lines,
        `${indent}  `,
        props.decisionTableReference,
        "flowable:decisionTableReference"
      );
      pushOptionalText(
        lines,
        `${indent}  `,
        props.resultVariableName,
        "flowable:resultVariableName"
      );
      lines.push(`${indent}</businessRuleTask>`);
      return lines.join("\n");
    }

    case "manualTask":
      return `${indent}<manualTask id="${node.id}" name="${name}"/>`;

    case "receiveTask": {
      const lines = [`${indent}<receiveTask id="${node.id}" name="${name}">`];
      pushOptionalText(lines, `${indent}  `, props.messageRef, "flowable:messageRef");
      lines.push(`${indent}</receiveTask>`);
      return lines.join("\n");
    }

    case "sendTask": {
      const lines = [`${indent}<sendTask id="${node.id}" name="${name}">`];
      pushOptionalText(lines, `${indent}  `, props.messageRef, "flowable:messageRef");
      lines.push(`${indent}</sendTask>`);
      return lines.join("\n");
    }

    case "callActivity": {
      const calledElement = props.calledElement
        ? ` calledElement="${escapeXml(String(props.calledElement))}"`
        : "";
      const inheritVariables =
        props.inheritVariables === "true" ? ` flowable:inheritVariables="true"` : "";
      return `${indent}<callActivity id="${node.id}" name="${name}"${calledElement}${inheritVariables}/>`;
    }

    case "subProcess": {
      const triggeredByEvent = props.triggeredByEvent === "true" ? ` triggeredByEvent="true"` : "";
      return `${indent}<subProcess id="${node.id}" name="${name}"${triggeredByEvent}/>`;
    }

    case "exclusiveGateway": {
      // 排他网关：若存在默认出口连线，输出 default 属性
      const defaultFlow = edges.find(
        (e) => e.sourceNodeId === node.id && e.properties?.default === true
      );
      const defaultAttr = defaultFlow ? ` default="${escapeXml(defaultFlow.id)}"` : "";
      return `${indent}<exclusiveGateway id="${node.id}" name="${name}"${defaultAttr}/>`;
    }

    case "parallelGateway":
      return `${indent}<parallelGateway id="${node.id}" name="${name}"/>`;

    case "inclusiveGateway": {
      // 包含网关：若存在默认出口连线，输出 default 属性
      const defaultFlow = edges.find(
        (e) => e.sourceNodeId === node.id && e.properties?.default === true
      );
      const defaultAttr = defaultFlow ? ` default="${escapeXml(defaultFlow.id)}"` : "";
      return `${indent}<inclusiveGateway id="${node.id}" name="${name}"${defaultAttr}/>`;
    }

    case "eventBasedGateway":
      return `${indent}<eventBasedGateway id="${node.id}" name="${name}"/>`;

    case "complexGateway": {
      // 复杂网关：若存在默认出口连线，输出 default 属性
      const defaultFlow = edges.find(
        (e) => e.sourceNodeId === node.id && e.properties?.default === true
      );
      const defaultAttr = defaultFlow ? ` default="${escapeXml(defaultFlow.id)}"` : "";
      return `${indent}<complexGateway id="${node.id}" name="${name}"${defaultAttr}/>`;
    }

    default:
      return `${indent}<userTask id="${node.id}" name="${name}"/>`;
  }
}

/** 向行数组追加一个可选的 flowable 扩展子元素 */
function pushOptionalText(lines: string[], indent: string, value: unknown, tagName: string): void {
  if (value === undefined || value === null || value === "") return;
  lines.push(`${indent}<${tagName}>${escapeXml(String(value))}</${tagName}>`);
}

/** 生成连线（sequenceFlow），含条件表达式 */
function buildEdgeXml(edge: FlowEdge): string {
  const condition = edge.properties?.conditionExpression;
  if (condition) {
    return `    <sequenceFlow id="${edge.id}" sourceRef="${edge.sourceNodeId}" targetRef="${edge.targetNodeId}">
      <conditionExpression xsi:type="tFormalExpression">${toCData(String(condition))}</conditionExpression>
    </sequenceFlow>`;
  }
  return `    <sequenceFlow id="${edge.id}" sourceRef="${edge.sourceNodeId}" targetRef="${edge.targetNodeId}"/>`;
}

/** 计算画布整体边界（BPMN DI 坐标以 0,0 为起点偏移） */
function calculateBounds(nodes: FlowNode[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  if (!nodes.length) return { minX: 0, minY: 0, width: 0, height: 0 };

  const boxes = nodes.map((n) => {
    const size = getNodeSize(n);
    return {
      left: n.x - size.width / 2,
      top: n.y - size.height / 2,
      right: n.x + size.width / 2,
      bottom: n.y + size.height / 2,
    };
  });

  const minX = Math.min(...boxes.map((b) => b.left)) - 50;
  const minY = Math.min(...boxes.map((b) => b.top)) - 50;
  const maxX = Math.max(...boxes.map((b) => b.right)) + 50;
  const maxY = Math.max(...boxes.map((b) => b.bottom)) + 50;

  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** 生成 BPMN Shape（节点图形） */
function buildShapeXml(node: FlowNode, bounds: { minX: number; minY: number }): string {
  const size = getNodeSize(node);
  const x = node.x - bounds.minX - size.width / 2;
  const y = node.y - bounds.minY - size.height / 2;

  return `      <bpmndi:BPMNShape id="BPMNShape_${node.id}" bpmnElement="${node.id}">
        <omgdc:Bounds x="${Math.round(x)}" y="${Math.round(y)}" width="${size.width}" height="${size.height}"/>
      </bpmndi:BPMNShape>`;
}

/** 生成 BPMN Edge（连线图形，起止点取节点边缘中点） */
function buildEdgeDiagramXml(
  edge: FlowEdge,
  nodes: FlowNode[],
  bounds: { minX: number; minY: number }
): string {
  const source = nodes.find((n) => n.id === edge.sourceNodeId);
  const target = nodes.find((n) => n.id === edge.targetNodeId);
  if (!source || !target) {
    return `      <bpmndi:BPMNEdge id="BPMNEdge_${edge.id}" bpmnElement="${edge.id}"/>`;
  }

  const sourceSize = getNodeSize(source);
  const targetSize = getNodeSize(target);

  // 简化连线：从源节点右侧中点连到目标节点左侧中点
  const sourceX = source.x - bounds.minX + sourceSize.width / 2;
  const sourceY = source.y - bounds.minY;
  const targetX = target.x - bounds.minX - targetSize.width / 2;
  const targetY = target.y - bounds.minY;

  return `      <bpmndi:BPMNEdge id="BPMNEdge_${edge.id}" bpmnElement="${edge.id}">
        <omgdi:waypoint x="${Math.round(sourceX)}" y="${Math.round(sourceY)}"/>
        <omgdi:waypoint x="${Math.round(targetX)}" y="${Math.round(targetY)}"/>
      </bpmndi:BPMNEdge>`;
}
