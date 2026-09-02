/**
 * 节点图标模块 - 内置类型默认图标
 *
 * 为每个节点类型提供内置默认图标（取自预设图标库）：
 * - 新增节点拖入画布后自动携带该类型图标，无需逐个配置
 * - 流程级类型默认（图标库配置）可覆盖内置默认
 * - 显式「无图标」(iconType=none) 可隐藏内置默认
 */

import type { NodeIconConfig, NodeType } from "@/api/logicflow";

function preset(key: string): NodeIconConfig {
  return { iconType: "preset", iconValue: key };
}

/** 节点类型内置默认图标（与预设图标库 recommended 推荐一致） */
export const BUILTIN_TYPE_ICONS: Partial<Record<NodeType, NodeIconConfig>> = {
  startEvent: preset("start"),
  endEvent: preset("end"),
  userTask: preset("user"),
  serviceTask: preset("service"),
  scriptTask: preset("script"),
  businessRuleTask: preset("rule"),
  manualTask: preset("manual"),
  receiveTask: preset("receive"),
  sendTask: preset("send"),
  callActivity: preset("call"),
  subProcess: preset("sub-process"),
  customNode: preset("custom"),
  exclusiveGateway: preset("gateway"),
  parallelGateway: preset("gateway"),
  inclusiveGateway: preset("gateway"),
  eventBasedGateway: preset("gateway"),
  complexGateway: preset("gateway"),
};

/** 获取节点类型的内置默认图标（无则返回 null） */
export function getBuiltinTypeIcon(nodeType: NodeType): NodeIconConfig | null {
  return BUILTIN_TYPE_ICONS[nodeType] ?? null;
}
