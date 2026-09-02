import LogicFlow, { RectNodeModel, PolygonNodeModel } from "@logicflow/core";
import "@logicflow/core/dist/index.css";
import { IconRectNode, IconPolygonNode } from "@/components/Designer/nodeIcon/iconNodeViews";
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

class TestGatewayModel extends PolygonNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.points = [
      [40, 0],
      [80, 40],
      [40, 80],
      [0, 40],
    ];
    this.text.value = "网关";
  }
}

const container = document.getElementById("app") as HTMLElement;

const lf = new LogicFlow({
  container,
  grid: { size: 20, type: "dot" },
  background: { color: "#fafafa" },
});

lf.register({
  type: "userTask",
  view: IconRectNode,
  model: TestNodeModel,
});
lf.register({
  type: "exclusiveGateway",
  view: IconPolygonNode,
  model: TestGatewayModel,
});

lf.render({
  nodes: [
    // n1: 用户任务（无显式图标）-> 内置默认：小人(user)
    { id: "n1", type: "userTask", x: 220, y: 120 },
    // n2: 用户任务（显式预设 user）-> 小人
    {
      id: "n2",
      type: "userTask",
      x: 220,
      y: 280,
      properties: { iconConfig: { iconType: "preset", iconValue: "user" } },
    },
    // n3: 排他网关（无显式图标）-> 内置默认：左右分枝(gateway)
    { id: "n3", type: "exclusiveGateway", x: 520, y: 120 },
    // n4: 排他网关（显式预设 gateway）-> 左右分枝
    {
      id: "n4",
      type: "exclusiveGateway",
      x: 520,
      y: 280,
      properties: { iconConfig: { iconType: "preset", iconValue: "gateway" } },
    },
  ],
  edges: [],
});

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
