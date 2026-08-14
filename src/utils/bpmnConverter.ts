/**
 * LogicFlow图数据转BPMN XML转换器
 * 负责将前端编辑的流程图形数据转换为Flowable可部署的BPMN 2.0 XML格式
 */

import type { FlowGraphData, FlowNode, FlowEdge, NodeType } from "@/api/logicflow";

/**
 * 节点类型到BPMN元素的映射
 */
const NODE_TYPE_MAP: Record<
  NodeType,
  { element: string; defaultWidth: number; defaultHeight: number }
> = {
  startEvent: { element: "startEvent", defaultWidth: 36, defaultHeight: 36 },
  userTask: { element: "userTask", defaultWidth: 140, defaultHeight: 80 },
  serviceTask: { element: "serviceTask", defaultWidth: 140, defaultHeight: 80 },
  scriptTask: { element: "scriptTask", defaultWidth: 140, defaultHeight: 80 },
  businessRuleTask: { element: "businessRuleTask", defaultWidth: 140, defaultHeight: 80 },
  manualTask: { element: "manualTask", defaultWidth: 140, defaultHeight: 80 },
  receiveTask: { element: "receiveTask", defaultWidth: 140, defaultHeight: 80 },
  sendTask: { element: "sendTask", defaultWidth: 140, defaultHeight: 80 },
  callActivity: { element: "callActivity", defaultWidth: 140, defaultHeight: 80 },
  subProcess: { element: "subProcess", defaultWidth: 140, defaultHeight: 80 },
  exclusiveGateway: { element: "exclusiveGateway", defaultWidth: 80, defaultHeight: 80 },
  parallelGateway: { element: "parallelGateway", defaultWidth: 80, defaultHeight: 80 },
  inclusiveGateway: { element: "inclusiveGateway", defaultWidth: 80, defaultHeight: 80 },
  eventBasedGateway: { element: "eventBasedGateway", defaultWidth: 80, defaultHeight: 80 },
  complexGateway: { element: "complexGateway", defaultWidth: 80, defaultHeight: 80 },
  endEvent: { element: "endEvent", defaultWidth: 36, defaultHeight: 36 },
  customNode: { element: "userTask", defaultWidth: 140, defaultHeight: 80 },
};

/**
 * 获取BPMN元素类型
 */
export function getBpmnElementType(nodeType: NodeType): string {
  return NODE_TYPE_MAP[nodeType]?.element || "userTask";
}

/**
 * 转义XML特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 生成BPMN XML
 */
export function graphToBpmn(
  graphData: FlowGraphData,
  processKey: string = "process",
  processName: string = "Process"
): string {
  const { nodes, edges } = graphData;

  // 计算画布边界
  const bounds = calculateBounds(nodes);

  // 构建XML内容
  const xmlParts: string[] = [];

  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"');
  xmlParts.push('             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  xmlParts.push('             xmlns:flowable="http://flowable.org/bpmn"');
  xmlParts.push('             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
  xmlParts.push('             targetNamespace="http://flowable.org/test">');
  xmlParts.push("");

  // 流程定义
  xmlParts.push(
    `  <process id="${processKey}" name="${escapeXml(processName)}" isExecutable="true">`
  );

  // 节点元素
  for (const node of nodes) {
    xmlParts.push(generateNodeXml(node));
  }

  // 连线（SequenceFlow）
  for (const edge of edges) {
    xmlParts.push(generateEdgeXml(edge));
  }

  xmlParts.push("  </process>");
  xmlParts.push("");

  // BPMN DI信息（用于图形化展示）
  xmlParts.push('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">');
  xmlParts.push('    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="' + processKey + '">');

  for (const node of nodes) {
    xmlParts.push(generateShapeXml(node, bounds));
  }

  for (const edge of edges) {
    xmlParts.push(generateEdgeDiagramXml(edge, nodes, bounds));
  }

  xmlParts.push("    </bpmndi:BPMNPlane>");
  xmlParts.push("  </bpmndi:BPMNDiagram>");
  xmlParts.push("</definitions>");

  return xmlParts.join("\n");
}

/**
 * 计算画布边界
 */
function calculateBounds(nodes: FlowNode[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, width: 0, height: 0 };
  }

  const positions = nodes.map((n) => ({
    x: n.x - (n.width || 140) / 2,
    y: n.y - (n.height || 80) / 2,
    w: n.width || 140,
    h: n.height || 80,
  }));

  const minX = Math.min(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxX = Math.max(...positions.map((p) => p.x + p.w));
  const maxY = Math.max(...positions.map((p) => p.y + p.h));

  return {
    minX: minX - 50,
    minY: minY - 50,
    width: maxX - minX + 100,
    height: maxY - minY + 100,
  };
}

/**
 * 生成节点XML元素
 */
function generateNodeXml(node: FlowNode): string {
  const bpmnType = getBpmnElementType(node.type);
  const name = escapeXml(node.text || node.id);
  const props = node.properties || {};
  const parts: string[] = [];

  switch (bpmnType) {
    case "startEvent":
      parts.push(`    <startEvent id="${node.id}" name="${name}"/>`);
      break;

    case "endEvent":
      parts.push(`    <endEvent id="${node.id}" name="${name}"/>`);
      break;

    case "userTask":
      parts.push(`    <userTask id="${node.id}" name="${name}">`);
      if (props.assignee) {
        parts.push(
          `      <flowable:assignee>${escapeXml(props.assignee as string)}</flowable:assignee>`
        );
      }
      if (props.candidateUsers) {
        parts.push(
          `      <flowable:candidateUsers>${escapeXml(props.candidateUsers as string)}</flowable:candidateUsers>`
        );
      }
      if (props.candidateGroups) {
        parts.push(
          `      <flowable:candidateGroups>${escapeXml(props.candidateGroups as string)}</flowable:candidateGroups>`
        );
      }
      if (props.formKey) {
        parts.push(
          `      <flowable:formKey>${escapeXml(props.formKey as string)}</flowable:formKey>`
        );
      }
      parts.push(`    </userTask>`);
      break;

    case "serviceTask":
      parts.push(`    <serviceTask id="${node.id}" name="${name}">`);
      if (props.delegateExpression) {
        parts.push(
          `      <flowable:delegateExpression>${escapeXml(props.delegateExpression as string)}</flowable:delegateExpression>`
        );
      }
      if (props.expression) {
        parts.push(
          `      <flowable:expression>${escapeXml(props.expression as string)}</flowable:expression>`
        );
      }
      parts.push(`    </serviceTask>`);
      break;

    case "scriptTask":
      parts.push(`    <scriptTask id="${node.id}" name="${name}">`);
      if (props.scriptFormat) {
        parts.push(`      <scriptFormat>${escapeXml(props.scriptFormat as string)}</scriptFormat>`);
      }
      if (props.script) {
        parts.push(`      <script>${escapeXml(props.script as string)}</script>`);
      }
      parts.push(`    </scriptTask>`);
      break;

    case "businessRuleTask":
      parts.push(`    <businessRuleTask id="${node.id}" name="${name}">`);
      if (props.decisionTableReference) {
        parts.push(
          `      <flowable:decisionTableReference>${escapeXml(props.decisionTableReference as string)}</flowable:decisionTableReference>`
        );
      }
      if (props.resultVariableName) {
        parts.push(
          `      <flowable:resultVariableName>${escapeXml(props.resultVariableName as string)}</flowable:resultVariableName>`
        );
      }
      parts.push(`    </businessRuleTask>`);
      break;

    case "manualTask":
      parts.push(`    <manualTask id="${node.id}" name="${name}"/>`);
      break;

    case "receiveTask":
      parts.push(`    <receiveTask id="${node.id}" name="${name}">`);
      if (props.messageRef) {
        parts.push(
          `      <flowable:messageRef>${escapeXml(props.messageRef as string)}</flowable:messageRef>`
        );
      }
      parts.push(`    </receiveTask>`);
      break;

    case "sendTask":
      parts.push(`    <sendTask id="${node.id}" name="${name}">`);
      if (props.messageRef) {
        parts.push(
          `      <flowable:messageRef>${escapeXml(props.messageRef as string)}</flowable:messageRef>`
        );
      }
      parts.push(`    </sendTask>`);
      break;

    case "callActivity": {
      const calledElement = props.calledElement
        ? ` calledElement="${escapeXml(props.calledElement as string)}"`
        : "";
      const inheritVariables =
        props.inheritVariables === "true" ? ` flowable:inheritVariables="true"` : "";
      parts.push(
        `    <callActivity id="${node.id}" name="${name}"${calledElement}${inheritVariables}/>`
      );
      break;
    }

    case "subProcess": {
      const triggeredByEvent = props.triggeredByEvent === "true" ? ` triggeredByEvent="true"` : "";
      parts.push(`    <subProcess id="${node.id}" name="${name}"${triggeredByEvent}/>`);
      break;
    }

    case "exclusiveGateway":
      parts.push(`    <exclusiveGateway id="${node.id}" name="${name}"/>`);
      break;

    case "parallelGateway":
      parts.push(`    <parallelGateway id="${node.id}" name="${name}"/>`);
      break;

    case "inclusiveGateway":
      parts.push(`    <inclusiveGateway id="${node.id}" name="${name}"/>`);
      break;

    case "eventBasedGateway":
      parts.push(`    <eventBasedGateway id="${node.id}" name="${name}"/>`);
      break;

    case "complexGateway":
      parts.push(`    <complexGateway id="${node.id}" name="${name}"/>`);
      break;

    default:
      parts.push(`    <userTask id="${node.id}" name="${name}"/>`);
  }

  return parts.join("\n");
}

/**
 * 生成连线XML元素
 * 仅当存在条件表达式时生成 <conditionExpression> 子元素；
 * 其余情况（含默认连线）生成空的 sequenceFlow 自闭合标签。
 */
function generateEdgeXml(edge: FlowEdge): string {
  const conditionExpr = edge.properties?.conditionExpression;

  if (conditionExpr) {
    return `    <sequenceFlow id="${edge.id}" sourceRef="${edge.sourceNodeId}" targetRef="${edge.targetNodeId}">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[${conditionExpr}]]></conditionExpression>
    </sequenceFlow>`;
  }
  return `    <sequenceFlow id="${edge.id}" sourceRef="${edge.sourceNodeId}" targetRef="${edge.targetNodeId}"/>`;
}

/**
 * 生成BPMN Shape XML
 */
function generateShapeXml(node: FlowNode, bounds: { minX: number; minY: number }): string {
  const bpmnType = getBpmnElementType(node.type);
  const width = node.width || NODE_TYPE_MAP[node.type]?.defaultWidth || 140;
  const height = node.height || NODE_TYPE_MAP[node.type]?.defaultHeight || 80;

  const x = node.x - bounds.minX - width / 2;
  const y = node.y - bounds.minY - height / 2;

  return `      <bpmndi:BPMNShape id="BPMNShape_${node.id}" bpmnElement="${node.id}">
        <omgdc:Bounds x="${Math.round(x)}" y="${Math.round(y)}" width="${width}" height="${height}" xmlns:omgdc="http://www.omg.org/spec/DD/20050524/DC"/>
      </bpmndi:BPMNShape>`;
}

/**
 * 生成BPMN Edge XML
 */
function generateEdgeDiagramXml(
  edge: FlowEdge,
  nodes: FlowNode[],
  bounds: { minX: number; minY: number }
): string {
  const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
  const targetNode = nodes.find((n) => n.id === edge.targetNodeId);

  if (!sourceNode || !targetNode) {
    return `      <bpmndi:BPMNEdge id="BPMNEdge_${edge.id}" bpmnElement="${edge.id}"/>`;
  }

  // 计算起止点（简化处理，使用节点中心）
  const sourceWidth = sourceNode.width || 140;
  const sourceHeight = sourceNode.height || 80;
  const targetWidth = targetNode.width || 140;
  const targetHeight = targetNode.height || 80;

  // 默认从右边连到左边
  const sourceX = sourceNode.x - bounds.minX + sourceWidth / 2;
  const sourceY = sourceNode.y - bounds.minY;
  const targetX = targetNode.x - bounds.minX - targetWidth / 2;
  const targetY = targetNode.y - bounds.minY;

  return `      <bpmndi:BPMNEdge id="BPMNEdge_${edge.id}" bpmnElement="${edge.id}">
        <omgdi:waypoint x="${Math.round(sourceX)}" y="${Math.round(sourceY)}" xmlns:omgdi="http://www.omg.org/spec/DD/20050524/DI"/>
        <omgdi:waypoint x="${Math.round(targetX)}" y="${Math.round(targetY)}" xmlns:omgdi="http://www.omg.org/spec/DD/20050524/DI"/>
      </bpmndi:BPMNEdge>`;
}

/**
 * BPMN XML转LogicFlow图数据（反向转换）
 *
 * 使用 getElementsByTagName / getElementsByTagNameNS 进行元素查找，
 * 兼容浏览器与 jsdom 环境（querySelector 对命名空间前缀支持不一致）。
 */
export function bpmnToGraph(bpmnXml: string): FlowGraphData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(bpmnXml, "text/xml");

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // 定义节点类型映射
  const typeMapping: Record<string, NodeType> = {
    startEvent: "startEvent",
    userTask: "userTask",
    serviceTask: "serviceTask",
    scriptTask: "scriptTask",
    businessRuleTask: "businessRuleTask",
    manualTask: "manualTask",
    receiveTask: "receiveTask",
    sendTask: "sendTask",
    callActivity: "callActivity",
    subProcess: "subProcess",
    exclusiveGateway: "exclusiveGateway",
    parallelGateway: "parallelGateway",
    inclusiveGateway: "inclusiveGateway",
    eventBasedGateway: "eventBasedGateway",
    complexGateway: "complexGateway",
    endEvent: "endEvent",
  };

  // BPMN DI 命名空间
  const BPMNDI_NS = "http://www.omg.org/spec/BPMN/20100524/DI";
  const OMGDC_NS = "http://www.omg.org/spec/DD/20050524/DC";

  // 收集所有 BPMNShape 元素，建立 bpmnElement -> shape 的映射
  const shapeMap = new Map<string, Element>();
  const shapeElements = xmlDoc.getElementsByTagNameNS(BPMNDI_NS, "BPMNShape");
  for (let i = 0; i < shapeElements.length; i++) {
    const el = shapeElements[i];
    const bpmnElement = el.getAttribute("bpmnElement");
    if (bpmnElement) {
      shapeMap.set(bpmnElement, el);
    }
  }

  // 需要解析的节点标签名（BPMN 默认命名空间，无前缀）
  const nodeTagNames = [
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
    "exclusiveGateway",
    "parallelGateway",
    "inclusiveGateway",
    "eventBasedGateway",
    "complexGateway",
    "endEvent",
  ];

  // 解析所有节点
  for (const tagName of nodeTagNames) {
    const elements = xmlDoc.getElementsByTagName(tagName);
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      // 排除嵌套在 sequenceFlow 等内部的同名元素（BPMN 中不太可能，但防御性处理）
      if (element.parentNode && element.parentNode.nodeName === "sequenceFlow") continue;

      const id = element.getAttribute("id") || "";
      const name = element.getAttribute("name") || "";
      const type = typeMapping[tagName] || "userTask";

      // 从 shapeMap 获取位置信息
      const bpmnShape = shapeMap.get(id);
      let x = 0;
      let y = 0;
      let width = 140;
      let height = 80;

      if (bpmnShape) {
        const bounds = bpmnShape.getElementsByTagNameNS(OMGDC_NS, "Bounds")[0];
        if (bounds) {
          x = parseFloat(bounds.getAttribute("x") || "0");
          y = parseFloat(bounds.getAttribute("y") || "0");
          width = parseFloat(bounds.getAttribute("width") || "140");
          height = parseFloat(bounds.getAttribute("height") || "80");
        }
      }

      // 偏移位置（BPMN XML坐标是相对的，转为中心坐标）
      x += width / 2;
      y += height / 2;

      // 解析扩展属性：遍历直接子元素，提取 flowable 命名空间下的属性
      const properties: Record<string, unknown> = {};
      for (let j = 0; j < element.children.length; j++) {
        const child = element.children[j];
        const localName = child.tagName.includes(":")
          ? child.tagName.split(":").pop() || child.tagName
          : child.tagName;
        // 仅提取 flowable 扩展属性（assignee, candidateUsers 等）
        if (
          [
            "assignee",
            "candidateUsers",
            "candidateGroups",
            "formKey",
            "delegateExpression",
            "expression",
            "scriptFormat",
            "script",
            "decisionTableReference",
            "resultVariableName",
            "messageRef",
          ].includes(localName)
        ) {
          properties[localName] = child.textContent || "";
        }
      }

      nodes.push({
        id,
        type,
        x,
        y,
        width,
        height,
        text: name,
        properties,
      });
    }
  }

  // 解析连线
  const sequenceFlows = xmlDoc.getElementsByTagName("sequenceFlow");
  for (let i = 0; i < sequenceFlows.length; i++) {
    const element = sequenceFlows[i];
    const id = element.getAttribute("id") || "";
    const sourceRef = element.getAttribute("sourceRef") || "";
    const targetRef = element.getAttribute("targetRef") || "";

    // 解析条件表达式
    const conditionExprElements = element.getElementsByTagName("conditionExpression");
    const conditionExpression =
      conditionExprElements.length > 0
        ? conditionExprElements[0].textContent || undefined
        : undefined;
    const properties: Record<string, unknown> = {};
    if (conditionExpression) {
      properties.conditionExpression = conditionExpression;
    }

    edges.push({
      id,
      type: "bezier",
      sourceNodeId: sourceRef,
      targetNodeId: targetRef,
      properties,
    });
  }

  return { nodes, edges };
}
