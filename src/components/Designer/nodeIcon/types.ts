/**
 * 节点图标模块 - 类型与常量（从领域层统一导出，避免重复定义）
 *
 * 图标配置采用「类型级默认 + 实例覆盖」两级粒度：
 * - 类型级默认：存储于流程 graphData.iconConfig[NodeType]，随流程持久化
 * - 实例覆盖：存储于节点 node.properties.iconConfig
 * 生效优先级：实例覆盖 -> 类型级默认 -> 无图标
 */

export {
  DEFAULT_ICON_SIZE,
  DEFAULT_ICON_GAP,
  ICON_SIZE_RANGE,
  isValidIconConfig,
} from "@/api/logicflow/node/iconConfig";
export type { NodeIconConfig, NodeIconSource } from "@/api/logicflow/node/iconConfig";
