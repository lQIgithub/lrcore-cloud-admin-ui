import LogicFlow, { RectNodeModel } from "@logicflow/core";
import "@logicflow/core/dist/index.css";
import { IconRectNode } from "@/components/Designer/nodeIcon/iconNodeViews";
import { setFlowIconConfig } from "@/components/Designer/nodeIcon/iconResolver";
import "@/components/Designer/nodeIcon/nodeIcon.css";

class TestNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.width = 160;
    this.height = 80;
    this.text.value = "测试节点";
  }
}

const container = document.getElementById("app") as HTMLElement;

const lf = new LogicFlow({
  container,
  grid: { size: 20, type: "dot" },
  background: { color: "#fafafa" },
  // 复刻真实应用的锚点主题（放大 + 蓝色）
});

lf.register({
  type: "userTask",
  view: IconRectNode,
  model: TestNodeModel,
});

lf.render({
  nodes: [
    // n1: 预设图标（用户）
    {
      id: "n1",
      type: "userTask",
      x: 220,
      y: 120,
      properties: { iconConfig: { iconType: "preset", iconValue: "user" } },
    },
    // n2: 预设图标（审批）
    {
      id: "n2",
      type: "userTask",
      x: 220,
      y: 280,
      properties: { iconConfig: { iconType: "preset", iconValue: "approval" } },
    },
    // n3: 自定义图标（必然加载失败 -> error 占位）
    {
      id: "n3",
      type: "userTask",
      x: 520,
      y: 120,
      properties: {
        iconConfig: { iconType: "custom", iconValue: "http://127.0.0.1:1/not-exist.png" },
      },
    },
    // n4: 自定义图标（data URI 立即成功 -> loaded 图片）
    {
      id: "n4",
      type: "userTask",
      x: 520,
      y: 280,
      properties: {
        iconConfig: {
          iconType: "custom",
          iconValue:
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiM0MDllZmYiLz48L3N2Zz4=",
        },
      },
    },
  ],
  edges: [],
});

// 复刻真实应用锚点主题
lf.setTheme({
  anchor: {
    r: 8,
    stroke: "#409eff",
    strokeWidth: 2,
    hover: { r: 14, fill: "#409eff", fillOpacity: 0.2, stroke: "transparent" },
  },
});

// 便于外部调试
(window as any).__lf = lf;
