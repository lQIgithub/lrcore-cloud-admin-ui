/**
 * 流程节点类型定义
 * 与BPMN/Flowable元素映射关系：
 * - startEvent: 开始事件
 * - userTask: 用户任务
 * - serviceTask: 服务任务
 * - scriptTask: 脚本任务
 * - businessRuleTask: 业务规则任务
 * - manualTask: 手动任务
 * - receiveTask: 接受任务
 * - sendTask: 发送任务
 * - callActivity: 调用活动
 * - subProcess: 子流程
 * - exclusiveGateway: 排他网关
 * - parallelGateway: 并行网关
 * - inclusiveGateway: 包含网关
 * - eventBasedGateway: 基于事件的网关
 * - complexGateway: 复杂网关
 * - endEvent: 结束事件
 */
export type NodeType =
  | "startEvent"
  | "userTask"
  | "serviceTask"
  | "scriptTask"
  | "businessRuleTask"
  | "manualTask"
  | "receiveTask"
  | "sendTask"
  | "callActivity"
  | "subProcess"
  | "exclusiveGateway"
  | "parallelGateway"
  | "inclusiveGateway"
  | "eventBasedGateway"
  | "complexGateway"
  | "endEvent"
  | "customNode";

/**
 * 节点图标配置（类型级默认与实例覆盖共用）
 *
 * - 类型级默认：存于 graphData.iconConfig[NodeType]，随流程持久化
 * - 实例覆盖：存于 node.properties.iconConfig
 * - 生效优先级：实例覆盖 -> 类型级默认 -> 无图标
 */
export interface NodeIconConfig {
  /** 图标来源 */
  iconType: "preset" | "custom" | "none";
  /** 图标值：preset 时为预设图标 key，custom 时为上传图片 URL */
  iconValue: string;
  /** 图标尺寸（px），可选，默认 24 */
  iconSize?: number;
}

/**
 * LogicFlow节点数据结构
 */
export interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  properties?: Record<string, unknown>;
}

/**
 * LogicFlow边数据结构
 */
export interface FlowEdge {
  id: string;
  type: "polyline" | "bezier" | "line";
  sourceNodeId: string;
  targetNodeId: string;
  text?: string;
  properties?: {
    conditionExpression?: string;
    default?: boolean;
  };
}
