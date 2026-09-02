/**
 * 节点图标模块 - 预设图标库
 *
 * 内置一组线框风格（Feather 风格）SVG 图标，随前端打包，无网络依赖。
 * 图标以 SVG 基本元素描述，渲染时填充 currentColor，可随主题自动适配。
 */

import type { NodeType } from "@/api/logicflow";

/** 预设图标的 SVG 基本元素 */
export interface PresetIconElement {
  tag: "path" | "line" | "circle" | "polyline" | "polygon" | "ellipse" | "rect";
  attrs: Record<string, string | number>;
}

/** 预设图标定义 */
export interface PresetIcon {
  /** 唯一标识（存于 iconValue） */
  key: string;
  /** 显示名称 */
  name: string;
  /** 说明（用于悬停提示） */
  description: string;
  /** 分类 */
  category: "task" | "gateway" | "event" | "general";
  /** 图形元素 */
  elements: PresetIconElement[];
  /** 推荐的节点类型 */
  recommended?: NodeType[];
}

/** 图标 viewBox 尺寸 */
export const ICON_VIEWBOX = "0 0 24 24";

/** 便捷构造器：stroke 线框元素 */
function el(
  tag: PresetIconElement["tag"],
  attrs: Record<string, string | number>
): PresetIconElement {
  return { tag, attrs };
}

/**
 * 预设图标库
 */
export const PRESET_ICONS: PresetIcon[] = [
  {
    key: "user",
    name: "用户",
    description: "用户任务/人工处理",
    category: "task",
    recommended: ["userTask", "manualTask"],
    elements: [
      el("circle", { cx: 12, cy: 8, r: 4 }),
      el("path", { d: "M4 21c0-4 3.6-6 8-6s8 2 8 6" }),
    ],
  },
  {
    key: "approval",
    name: "审批",
    description: "审批/审核通过",
    category: "task",
    recommended: ["userTask"],
    elements: [
      el("polyline", { points: "9 11 12 14 22 4" }),
      el("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" }),
    ],
  },
  {
    key: "service",
    name: "服务",
    description: "服务调用/系统任务",
    category: "task",
    recommended: ["serviceTask"],
    elements: [
      el("circle", { cx: 12, cy: 12, r: 3 }),
      el("path", {
        d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
      }),
    ],
  },
  {
    key: "api",
    name: "接口",
    description: "接口调用/集成",
    category: "task",
    recommended: ["serviceTask", "sendTask"],
    elements: [
      el("polyline", { points: "16 18 22 12 16 6" }),
      el("polyline", { points: "8 6 2 12 8 18" }),
    ],
  },
  {
    key: "script",
    name: "脚本",
    description: "脚本执行",
    category: "task",
    recommended: ["scriptTask"],
    elements: [el("path", { d: "M8 6l-5 6 5 6" }), el("path", { d: "M16 6l5 6-5 6" })],
  },
  {
    key: "rule",
    name: "规则",
    description: "业务规则/决策",
    category: "task",
    recommended: ["businessRuleTask"],
    elements: [
      el("path", {
        d: "M12 2a7 7 0 0 0-4 12.7V21l1.5-1.2L11 21l1.5-1.2L14 21l1.5-1.2L17 21v-6.3A7 7 0 0 0 12 2z",
      }),
      el("path", { d: "M9.5 11l1.7 1.7L15 9" }),
    ],
  },
  {
    key: "manual",
    name: "手动",
    description: "人工手动完成",
    category: "task",
    recommended: ["manualTask"],
    elements: [
      el("path", { d: "M18 11V6a2 2 0 0 0-4 0v5" }),
      el("path", { d: "M14 10V4a2 2 0 0 0-4 0v6" }),
      el("path", { d: "M10 10.5V6a2 2 0 0 0-4 0v8" }),
      el("path", {
        d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
      }),
    ],
  },
  {
    key: "receive",
    name: "接收",
    description: "接收消息",
    category: "task",
    recommended: ["receiveTask"],
    elements: [
      el("polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12" }),
      el("path", {
        d: "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      }),
    ],
  },
  {
    key: "send",
    name: "发送",
    description: "发送消息",
    category: "task",
    recommended: ["sendTask"],
    elements: [
      el("line", { x1: 22, y1: 2, x2: 11, y2: 13 }),
      el("polygon", { points: "22 2 15 22 11 13 2 9 22 2" }),
    ],
  },
  {
    key: "mail",
    name: "邮件",
    description: "邮件通知",
    category: "task",
    recommended: ["sendTask", "receiveTask"],
    elements: [
      el("path", {
        d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
      }),
      el("polyline", { points: "22,6 12,13 2,6" }),
    ],
  },
  {
    key: "call",
    name: "调用",
    description: "调用子流程/外部系统",
    category: "task",
    recommended: ["callActivity"],
    elements: [
      el("circle", { cx: 18, cy: 5, r: 3 }),
      el("circle", { cx: 6, cy: 12, r: 3 }),
      el("circle", { cx: 18, cy: 19, r: 3 }),
      el("line", { x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 }),
      el("line", { x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 }),
    ],
  },
  {
    key: "sub-process",
    name: "子流程",
    description: "子流程/嵌套流程",
    category: "task",
    recommended: ["subProcess"],
    elements: [
      el("polygon", { points: "12 2 2 7 12 12 22 7 12 2" }),
      el("polyline", { points: "2 17 12 22 22 17" }),
      el("polyline", { points: "2 12 12 17 22 12" }),
    ],
  },
  {
    key: "doc",
    name: "文档",
    description: "文档/表单处理",
    category: "task",
    elements: [
      el("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
      el("polyline", { points: "14 2 14 8 20 8" }),
      el("line", { x1: 16, y1: 13, x2: 8, y2: 13 }),
      el("line", { x1: 16, y1: 17, x2: 8, y2: 17 }),
      el("polyline", { points: "10 9 9 9 8 9" }),
    ],
  },
  {
    key: "money",
    name: "金额",
    description: "金额/费用审批",
    category: "task",
    elements: [
      el("line", { x1: 12, y1: 1, x2: 12, y2: 23 }),
      el("path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }),
    ],
  },
  {
    key: "database",
    name: "数据",
    description: "数据处理/存储",
    category: "task",
    elements: [
      el("ellipse", { cx: 12, cy: 5, rx: 9, ry: 3 }),
      el("path", { d: "M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" }),
      el("path", { d: "M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" }),
    ],
  },
  {
    key: "notification",
    name: "通知",
    description: "通知/提醒",
    category: "general",
    elements: [
      el("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }),
      el("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" }),
    ],
  },
  {
    key: "timer",
    name: "定时",
    description: "定时/超时",
    category: "general",
    elements: [
      el("circle", { cx: 12, cy: 12, r: 10 }),
      el("polyline", { points: "12 6 12 12 16 14" }),
    ],
  },
  {
    key: "gateway",
    name: "网关",
    description: "条件分支",
    category: "gateway",
    recommended: [
      "exclusiveGateway",
      "parallelGateway",
      "inclusiveGateway",
      "eventBasedGateway",
      "complexGateway",
    ],
    elements: [
      el("line", { x1: 6, y1: 3, x2: 6, y2: 15 }),
      el("circle", { cx: 18, cy: 6, r: 3 }),
      el("circle", { cx: 6, cy: 18, r: 3 }),
      el("path", { d: "M18 9a9 9 0 0 1-9 9" }),
    ],
  },
  {
    key: "start",
    name: "开始",
    description: "流程开始",
    category: "event",
    recommended: ["startEvent"],
    elements: [
      el("circle", { cx: 12, cy: 12, r: 10 }),
      el("polygon", { points: "10 8 16 12 10 16 10 8" }),
    ],
  },
  {
    key: "end",
    name: "结束",
    description: "流程结束",
    category: "event",
    recommended: ["endEvent"],
    elements: [
      el("circle", { cx: 12, cy: 12, r: 10 }),
      el("rect", { x: 9, y: 9, width: 6, height: 6 }),
    ],
  },
  {
    key: "custom",
    name: "自定义",
    description: "自定义节点",
    category: "general",
    recommended: ["customNode"],
    elements: [
      el("circle", { cx: 12, cy: 12, r: 4 }),
      el("path", {
        d: "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1",
      }),
    ],
  },
];

/** 按 key 获取预设图标 */
export function getPresetIcon(key: string): PresetIcon | undefined {
  return PRESET_ICONS.find((icon) => icon.key === key);
}

/** 获取某节点类型的推荐图标 key 列表 */
export function getRecommendedIconKeys(type: NodeType): string[] {
  return PRESET_ICONS.filter((icon) => icon.recommended?.includes(type)).map((i) => i.key);
}
