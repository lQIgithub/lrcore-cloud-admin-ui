/**
 * 节点图标模块 - 图标配置解析
 *
 * 维护当前流程的类型级图标默认值（graphData.iconConfig），
 * 并按「实例覆盖 -> 类型级默认 -> 无」的优先级解析节点实际生效的图标。
 */

import type { NodeType } from "@/api/logicflow";
import type { NodeIconConfig } from "./types";
import { isValidIconConfig } from "./types";

/**
 * 流程级类型图标默认值注册表。
 * 由 LogicFlowCanvas 在 graphData 变化时同步（setFlowIconConfig），
 * 节点视图通过订阅（subscribeFlowIconConfig）感知变化并重渲染徽标。
 */
let flowIconConfig: Record<string, NodeIconConfig> = {};

/** 版本号监听：类型级默认值变化时通知所有节点视图 */
const versionListeners = new Set<() => void>();

/** 同步流程级类型图标默认值 */
export function setFlowIconConfig(config: Record<string, NodeIconConfig> | null | undefined): void {
  flowIconConfig = config ?? {};
  versionListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* 单个订阅者异常不影响其它订阅者 */
    }
  });
}

/** 订阅流程级类型图标默认值变化，返回取消订阅函数 */
export function subscribeFlowIconConfig(listener: () => void): () => void {
  versionListeners.add(listener);
  return () => versionListeners.delete(listener);
}

/** 获取流程级类型图标默认值（只读） */
export function getFlowIconConfig(): Record<string, NodeIconConfig> {
  return flowIconConfig;
}

/**
 * 解析节点实际生效的图标配置。
 *
 * 优先级：
 *   1. 实例覆盖：properties.iconConfig 显式存在时，
 *      - iconType=none 表示显式无图标（覆盖类型默认）
 *      - 有效配置直接采用
 *   2. 类型级默认：graphData.iconConfig[nodeType]
 *   3. 无图标
 *
 * @param nodeType 节点类型
 * @param properties 节点属性（含可能的实例覆盖 iconConfig）
 * @returns 生效的图标配置；无图标时返回 null
 */
export function resolveNodeIcon(
  nodeType: NodeType,
  properties?: Record<string, unknown> | null
): NodeIconConfig | null {
  // 1. 实例覆盖
  const instance = properties?.iconConfig as NodeIconConfig | undefined;
  if (instance) {
    if (instance.iconType === "none") return null;
    if (isValidIconConfig(instance)) return instance;
  }

  // 2. 类型级默认
  const typeDefault = flowIconConfig[nodeType];
  if (isValidIconConfig(typeDefault)) return typeDefault;

  // 3. 无图标
  return null;
}
