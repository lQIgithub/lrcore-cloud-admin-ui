/**
 * iconResolver 单元测试
 *
 * 验证「新增节点自动继承类型级默认图标」的核心链路：
 * - createFlowNode 新建节点不带实例覆盖，配置类型级默认后 resolveNodeIcon 返回默认图标
 *   （画布徽标据此渲染，即拖入画布的节点自动跟随类型图标，无需逐个自定义）
 * - 实例覆盖优先于类型默认；显式 none 可隐藏类型默认
 * - 类型级默认变化时通知订阅者（画布节点视图订阅后重渲染徽标）
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createFlowNode } from "@/api/logicflow";
import {
  setFlowIconConfig,
  getFlowIconConfig,
  subscribeFlowIconConfig,
  resolveNodeIcon,
} from "./iconResolver";
import type { NodeIconConfig } from "./types";

const presetConfig: NodeIconConfig = {
  iconType: "preset",
  iconValue: "user",
  iconSize: 24,
};

const customConfig: NodeIconConfig = {
  iconType: "custom",
  iconValue: "https://example.com/icon.png",
};

beforeEach(() => {
  // 重置模块级类型默认注册表，避免用例间串扰
  setFlowIconConfig({});
});

describe("resolveNodeIcon - 类型级默认图标自动跟随", () => {
  it("新建节点（无实例覆盖）自动继承类型级默认图标", () => {
    setFlowIconConfig({ userTask: presetConfig });
    // 模拟左侧面板拖入画布：createFlowNode 生成的节点 properties 不含 iconConfig
    const node = createFlowNode("userTask", 100, 100);
    expect(node.properties?.iconConfig).toBeUndefined();
    expect(resolveNodeIcon(node.type, node.properties)).toEqual(presetConfig);
  });

  it("未配置类型默认且无实例覆盖时回退内置类型默认图标", () => {
    const node = createFlowNode("userTask", 100, 100);
    // userTask 内置默认图标为预设「小人」
    expect(resolveNodeIcon(node.type, node.properties)).toEqual({
      iconType: "preset",
      iconValue: "user",
    });
  });

  it("流程级显式 none 可隐藏内置类型默认图标", () => {
    const noneConfig: NodeIconConfig = { iconType: "none", iconValue: "" };
    setFlowIconConfig({ userTask: noneConfig });
    expect(resolveNodeIcon("userTask", {})).toBeNull();
  });

  it("实例覆盖优先于类型级默认", () => {
    setFlowIconConfig({ userTask: presetConfig });
    const node = createFlowNode("userTask", 100, 100);
    node.properties = { ...node.properties, iconConfig: customConfig };
    expect(resolveNodeIcon(node.type, node.properties)).toEqual(customConfig);
  });

  it("实例显式 none 可隐藏类型级默认", () => {
    setFlowIconConfig({ userTask: presetConfig });
    const noneConfig: NodeIconConfig = { iconType: "none", iconValue: "" };
    expect(resolveNodeIcon("userTask", { iconConfig: noneConfig })).toBeNull();
  });

  it("无效实例覆盖（空值）回退到类型级默认", () => {
    setFlowIconConfig({ userTask: presetConfig });
    const invalid: NodeIconConfig = { iconType: "custom", iconValue: "" };
    expect(resolveNodeIcon("userTask", { iconConfig: invalid })).toEqual(presetConfig);
  });
});

describe("setFlowIconConfig / subscribeFlowIconConfig - 默认值变更通知", () => {
  it("类型级默认变化时通知订阅者", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFlowIconConfig(listener);

    setFlowIconConfig({ userTask: presetConfig });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getFlowIconConfig().userTask).toEqual(presetConfig);

    setFlowIconConfig(null);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getFlowIconConfig()).toEqual({});

    unsubscribe();
    setFlowIconConfig({ userTask: presetConfig });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
