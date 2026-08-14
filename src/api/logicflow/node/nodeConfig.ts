/**
 * 流程节点统一配置
 * 集中管理各节点类型的标签、尺寸、颜色、默认属性等，消除多文件重复定义
 */

import type { FlowNode, NodeType } from "./types.d";

export interface NodeTypeConfig {
  /** 显示名称 */
  label: string;
  /** 图标标识（用于节点面板） */
  icon: string;
  /** 默认节点文本 */
  defaultText: string;
  /** 主题色 */
  color: string;
  /** 默认宽度 */
  width: number;
  /** 默认高度 */
  height: number;
  /** 连线规则 */
  allowEdge: { outgoing: boolean; incoming: boolean };
  /** 默认属性 */
  defaultProperties: Record<string, string>;
}

/** 全部节点类型配置 */
export const NODE_TYPE_CONFIG: Record<NodeType, NodeTypeConfig> = {
  startEvent: {
    label: "开始节点",
    icon: "start",
    defaultText: "开始",
    color: "#67c23a",
    width: 50,
    height: 50,
    allowEdge: { outgoing: true, incoming: false },
    defaultProperties: {},
  },
  endEvent: {
    label: "结束节点",
    icon: "end",
    defaultText: "结束",
    color: "#f56c6c",
    width: 50,
    height: 50,
    allowEdge: { outgoing: false, incoming: true },
    defaultProperties: {},
  },
  userTask: {
    label: "用户任务",
    icon: "user",
    defaultText: "用户任务",
    color: "#409eff",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { assignee: "", candidateUsers: "", candidateGroups: "", formKey: "" },
  },
  serviceTask: {
    label: "服务任务",
    icon: "service",
    defaultText: "服务任务",
    color: "#e6a23c",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { delegateExpression: "", expression: "" },
  },
  scriptTask: {
    label: "脚本任务",
    icon: "script",
    defaultText: "脚本任务",
    color: "#9b59b6",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { scriptFormat: "javascript", script: "" },
  },
  businessRuleTask: {
    label: "业务规则任务",
    icon: "business-rule",
    defaultText: "业务规则任务",
    color: "#00bcd4",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { decisionTableReference: "", resultVariableName: "" },
  },
  manualTask: {
    label: "手动任务",
    icon: "manual",
    defaultText: "手动任务",
    color: "#607d8b",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: {},
  },
  receiveTask: {
    label: "接受任务",
    icon: "receive",
    defaultText: "接受任务",
    color: "#ffc107",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { messageRef: "" },
  },
  sendTask: {
    label: "发送任务",
    icon: "send",
    defaultText: "发送任务",
    color: "#3f51b5",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { messageRef: "" },
  },
  callActivity: {
    label: "调用活动",
    icon: "call-activity",
    defaultText: "调用活动",
    color: "#009688",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { calledElement: "", inheritVariables: "false" },
  },
  subProcess: {
    label: "子流程",
    icon: "sub-process",
    defaultText: "子流程",
    color: "#795548",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { triggeredByEvent: "false" },
  },
  exclusiveGateway: {
    label: "排他网关",
    icon: "gateway",
    defaultText: "条件判断",
    color: "#e6a23c",
    width: 80,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { default: "" },
  },
  parallelGateway: {
    label: "并行网关",
    icon: "gateway",
    defaultText: "并行执行",
    color: "#909399",
    width: 80,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: {},
  },
  inclusiveGateway: {
    label: "包含网关",
    icon: "gateway",
    defaultText: "包含判断",
    color: "#9c27b0",
    width: 80,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { default: "" },
  },
  eventBasedGateway: {
    label: "事件网关",
    icon: "gateway",
    defaultText: "事件网关",
    color: "#673ab7",
    width: 80,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: {},
  },
  complexGateway: {
    label: "复杂网关",
    icon: "gateway",
    defaultText: "复杂判断",
    color: "#f44336",
    width: 80,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: { default: "" },
  },
  customNode: {
    label: "自定义节点",
    icon: "custom",
    defaultText: "自定义节点",
    color: "#9b59b6",
    width: 160,
    height: 80,
    allowEdge: { outgoing: true, incoming: true },
    defaultProperties: {},
  },
};

/** 获取节点显示标签 */
export function getNodeLabel(type: NodeType): string {
  return NODE_TYPE_CONFIG[type]?.label || "节点";
}

/** 获取节点主题色 */
export function getNodeColor(type: NodeType): string {
  return NODE_TYPE_CONFIG[type]?.color || "#409eff";
}

/** 获取节点图标 CSS 类名（与 NodePalette 视觉一致） */
export function getNodeIconClass(type: NodeType): string {
  const map: Record<string, string> = {
    startEvent: "start-event",
    endEvent: "end-event",
    userTask: "user-task",
    serviceTask: "service-task",
    scriptTask: "script-task",
    businessRuleTask: "business-rule-task",
    manualTask: "manual-task",
    receiveTask: "receive-task",
    sendTask: "send-task",
    callActivity: "call-activity",
    subProcess: "sub-process",
    exclusiveGateway: "exclusive-gateway",
    parallelGateway: "parallel-gateway",
    inclusiveGateway: "inclusive-gateway",
    eventBasedGateway: "event-based-gateway",
    complexGateway: "complex-gateway",
    customNode: "custom-node",
  };
  return map[type] || "custom-node";
}

/** 获取节点分类（task / gateway / event） */
export function getNodeCategory(type: NodeType): "event" | "task" | "gateway" {
  if (type === "startEvent" || type === "endEvent") return "event";
  if (
    type === "exclusiveGateway" ||
    type === "parallelGateway" ||
    type === "inclusiveGateway" ||
    type === "eventBasedGateway" ||
    type === "complexGateway"
  )
    return "gateway";
  return "task";
}

/** 获取节点默认尺寸 */
export function getNodeSize(type: NodeType): { width: number; height: number } {
  const cfg = NODE_TYPE_CONFIG[type];
  return { width: cfg.width, height: cfg.height };
}

/** 获取节点默认属性（返回副本，避免污染常量） */
export function getDefaultProperties(type: NodeType): Record<string, string> {
  return { ...NODE_TYPE_CONFIG[type].defaultProperties };
}

/** 工厂方法：创建新节点 */
export function createFlowNode(type: NodeType, x = 200, y = 150): FlowNode {
  const cfg = NODE_TYPE_CONFIG[type];
  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    x,
    y,
    width: cfg.width,
    height: cfg.height,
    text: cfg.defaultText,
    properties: { ...cfg.defaultProperties },
  };
}
