/**
 * 节点图标模块 - SVG 徽标渲染
 *
 * 在节点视图的 getShape() 内生成「右上角图标徽标」VNode：
 * - 徽标位于节点自身坐标系（画布绝对坐标），随节点移动/缩放/重渲染自动保持相对位置
 * - 预设图标以内联 SVG 渲染（任何缩放均清晰、无网络依赖）
 * - 自定义上传图标按加载状态渲染：加载中占位 / 成功图片 / 失败占位
 * - 通过 graphModel.eventCenter 派发 tooltip 与配置面板事件
 */

import { h } from "@logicflow/core";
import { ICON_VIEWBOX, getPresetIcon } from "./presetIcons";
import { getIconLoadState } from "./iconLoader";
import { resolveNodeIcon } from "./iconResolver";
import type { NodeIconConfig } from "./types";
import { DEFAULT_ICON_GAP, DEFAULT_ICON_SIZE } from "./types";

/** 徽标所需的节点模型字段（结构化，避免依赖 BaseNodeModel 的完整类型） */
export interface IconBadgeModelLike {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isHovered: boolean;
  properties: Record<string, unknown>;
}

/** 徽标所需的图模型字段 */
interface IconBadgeGraphModelLike {
  eventCenter: { emit: (event: string, payload?: unknown) => void };
}

/** 徽标内图标占用比例（占徽标尺寸的比例） */
const ICON_INNER_RATIO = 0.72;

/**
 * 计算徽标在画布绝对坐标中的位置与尺寸
 */
function computeBadgeRect(
  model: IconBadgeModelLike,
  size: number
): {
  x: number;
  y: number;
  size: number;
} {
  const w = model.width || 100;
  const hgt = model.height || 80;
  const gap = DEFAULT_ICON_GAP;
  // 徽标中心位于节点右上角顶点（跨在角上），gap 控制向外偏移
  const cx = model.x + w / 2 - size / 2 + gap;
  const cy = model.y - hgt / 2 + size / 2 - gap;
  return { x: cx - size / 2, y: cy - size / 2, size };
}

/**
 * 生成预设图标的内联 SVG 内容（viewBox 24x24，按徽标尺寸缩放）
 */
function renderPresetIcon(
  config: NodeIconConfig,
  cx: number,
  cy: number,
  size: number
): ReturnType<typeof h> {
  const icon = getPresetIcon(config.iconValue);
  if (!icon) return renderErrorIcon(cx, cy, size);

  const scale = size / 24;
  const elements = icon.elements.map((el) => h(el.tag, { ...el.attrs }));
  return h(
    "g",
    {
      className: "lf-node-icon-badge__icon lf-node-icon-badge__icon--preset",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.8,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      // 图标元素位于 0..24 坐标系，先平移 (-12,-12) 使内容以徽标中心为原点，实现精确居中
      transform: `translate(${cx},${cy}) scale(${scale}) translate(-12,-12)`,
    },
    elements
  ) as ReturnType<typeof h>;
}

/**
 * 图片加载中占位
 *
 * 旋转动画作用于内层 <g>（.lf-node-icon-badge__icon-spin），
 * 外层 <g> 的 SVG transform 属性仅用于定位/缩放，避免 CSS 动画覆盖定位 transform。
 */
function renderLoadingIcon(cx: number, cy: number, size: number): ReturnType<typeof h> {
  return h(
    "g",
    {
      className: "lf-node-icon-badge__icon lf-node-icon-badge__icon--loading",
      transform: `translate(${cx},${cy}) scale(${size / 24}) translate(-12,-12)`,
    },
    [
      h("g", { className: "lf-node-icon-badge__icon-spin" }, [
        h("circle", {
          cx: 12,
          cy: 12,
          r: 8,
          fill: "none",
          stroke: "currentColor",
          "stroke-width": 2.4,
          "stroke-linecap": "round",
          "stroke-dasharray": 38,
          "stroke-dashoffset": 10,
        }),
      ]),
    ]
  ) as ReturnType<typeof h>;
}

/** 图片加载失败占位（image-off 风格） */
function renderErrorIcon(cx: number, cy: number, size: number): ReturnType<typeof h> {
  return h(
    "g",
    {
      className: "lf-node-icon-badge__icon lf-node-icon-badge__icon--error",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.8,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      transform: `translate(${cx},${cy}) scale(${size / 24}) translate(-12,-12)`,
    },
    [
      h("path", {
        d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z",
      }),
      h("path", { d: "M2 14l4.5-4.5a2 2 0 0 1 2.83 0L22 22" }),
      h("line", { x1: 8, y1: 9.5, x2: 8.01, y2: 9.5 }),
    ]
  ) as ReturnType<typeof h>;
}

/** 自定义上传图标（已加载） */
function renderImageIcon(url: string, x: number, y: number, size: number): ReturnType<typeof h> {
  const pad = (size * (1 - ICON_INNER_RATIO)) / 2;
  return h("image", {
    className: "lf-node-icon-badge__img",
    x: x + pad,
    y: y + pad,
    width: size - pad * 2,
    height: size - pad * 2,
    href: url,
    preserveAspectRatio: "xMidYMid meet",
  }) as ReturnType<typeof h>;
}

/**
 * 构建节点右上角图标徽标 VNode
 *
 * @param model 节点模型
 * @param graphModel 图模型（用于派发 tooltip / 配置面板事件）
 * @returns 徽标 VNode；无有效图标配置时返回 null
 */
export function buildNodeIconBadge(model: IconBadgeModelLike, graphModel: IconBadgeGraphModelLike) {
  const config = resolveNodeIcon(model.type as never, model.properties);
  if (!config) return null;

  const size = config.iconSize ?? DEFAULT_ICON_SIZE;
  const { x, y } = computeBadgeRect(model, size);

  // 悬停提示内容：预设图标显示名称与说明，自定义图片显示 URL 来源
  const preset = config.iconType === "preset" ? getPresetIcon(config.iconValue) : undefined;
  const tooltipTitle = preset ? `${preset.name} · ${preset.description}` : "自定义图标";

  const stateClass = model.isSelected
    ? "lf-node-icon-badge--selected"
    : model.isHovered
      ? "lf-node-icon-badge--hovered"
      : "";

  // 图标主体内容
  let content: ReturnType<typeof h>;
  if (config.iconType === "preset") {
    content = renderPresetIcon(config, x + size / 2, y + size / 2, size);
  } else {
    // 自定义上传图片：按加载状态渲染
    const state = getIconLoadState(config.iconValue);
    if (state === "loaded") {
      content = renderImageIcon(config.iconValue, x, y, size);
    } else if (state === "error") {
      content = renderErrorIcon(x + size / 2, y + size / 2, size);
    } else {
      content = renderLoadingIcon(x + size / 2, y + size / 2, size);
    }
  }

  const nodeId = model.id;

  return h(
    "g",
    {
      className: `lf-node-icon-badge ${stateClass}`,
      "data-icon-node": nodeId,
      onPointerDown: (ev: Event) => ev.stopPropagation(),
      onPointerEnter: (ev: PointerEvent) => {
        graphModel.eventCenter.emit("node:icon-tooltip", {
          nodeId,
          title: tooltipTitle,
          x: ev.clientX,
          y: ev.clientY,
          visible: true,
        });
      },
      onPointerLeave: () => {
        graphModel.eventCenter.emit("node:icon-tooltip", {
          nodeId,
          visible: false,
        });
      },
      onClick: (ev: MouseEvent) => {
        ev.stopPropagation();
        graphModel.eventCenter.emit("node:icon-config", { nodeId });
      },
    },
    [
      h("rect", {
        className: "lf-node-icon-badge__bg",
        x,
        y,
        width: size,
        height: size,
        rx: size * 0.26,
      }),
      content,
    ]
  );
}

/** 供 Vue 组件复用：按配置渲染图标（用于配置面板/图标库预览） */
export { ICON_VIEWBOX };
