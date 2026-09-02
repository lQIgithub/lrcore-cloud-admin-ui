/**
 * 节点图标配置 - 领域层常量与工具
 *
 * NodeIconConfig 类型定义于 types.d.ts，此处提供共享常量与校验工具，
 * 供设计器模块（渲染/配置 UI）与 store 复用，避免重复定义。
 */

import type { NodeIconConfig } from "./types.d";

export type { NodeIconConfig };

/** 图标来源 */
export type NodeIconSource = "preset" | "custom" | "none";

/** 默认图标尺寸（px） */
export const DEFAULT_ICON_SIZE = 24;

/** 图标尺寸可调范围（px） */
export const ICON_SIZE_RANGE = { min: 16, max: 48 };

/** 徽标距节点右上角顶点的默认间隙（px，向外为正） */
export const DEFAULT_ICON_GAP = 0;

/**
 * 判断图标配置是否有效（来源非 none 且值非空）
 */
export function isValidIconConfig(config?: NodeIconConfig | null): config is NodeIconConfig {
  return !!config && config.iconType !== "none" && !!config.iconValue;
}
