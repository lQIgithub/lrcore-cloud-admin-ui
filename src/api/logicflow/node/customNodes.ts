/**
 * LogicFlow自定义节点配置
 * 定义各种BPMN节点的自定义渲染样式
 * 基于LogicFlow 2.1.3 API
 */

import type LogicFlow from "@logicflow/core";
import { CircleNodeModel, RectNodeModel, PolygonNodeModel } from "@logicflow/core";
import {
  IconCircleNode,
  IconRectNode,
  IconPolygonNode,
} from "@/components/Designer/nodeIcon/iconNodeViews";

/**
 * 对象合并：保留 target 类型，将 source 的属性覆盖到副本上
 * 使用 Object.assign 并以 target 类型返回，保证与基类样式主题类型兼容
 */
function merge<T extends object>(target: T, source: object): T {
  return Object.assign({}, target, source) as T;
}

// 开始节点 - 圆形绿色
class StartNodeModel extends CircleNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#67c23a",
      stroke: properties.stroke || "#5daf34",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
      fontWeight: "bold",
    });
  }
}

// 结束节点 - 圆形红色
class EndNodeModel extends CircleNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#f56c6c",
      stroke: properties.stroke || "#c45656",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
      fontWeight: "bold",
    });
  }
}

// 用户任务节点 - 矩形蓝色
class UserTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#409eff",
      stroke: properties.stroke || "#337ecc",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 服务任务节点 - 矩形橙色
class ServiceTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#e6a23c",
      stroke: properties.stroke || "#b88230",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 脚本任务节点 - 矩形紫色
class ScriptTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#9b59b6",
      stroke: properties.stroke || "#6c3483",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 业务规则任务节点 - 矩形青色
class BusinessRuleTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#00bcd4",
      stroke: properties.stroke || "#00838f",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 手动任务节点 - 矩形蓝灰色
class ManualTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#607d8b",
      stroke: properties.stroke || "#455a64",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 接受任务节点 - 矩形琥珀色
class ReceiveTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#ffc107",
      stroke: properties.stroke || "#ff8f00",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 发送任务节点 - 矩形靛蓝色
class SendTaskNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#3f51b5",
      stroke: properties.stroke || "#283593",
      strokeWidth: 1,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 调用活动节点 - 矩形青绿色（加粗边框，区别于普通任务）
class CallActivityNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#009688",
      stroke: properties.stroke || "#00695c",
      strokeWidth: 3,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 子流程节点 - 矩形棕色（加粗边框，带折叠标记）
class SubProcessNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#795548",
      stroke: properties.stroke || "#4e342e",
      strokeWidth: 2,
      radius: 4,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

// 排他网关节点 - 菱形橙色
// 注意：PolygonNodeModel 的 width/height 是由 points 计算得出的只读属性，
// 不能直接赋值，节点尺寸通过 points 坐标控制。
class ExclusiveGatewayNodeModel extends PolygonNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.points = [
      [40, 0],
      [80, 40],
      [40, 80],
      [0, 40],
    ];
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#e6a23c",
      stroke: properties.stroke || "#b88230",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#333",
      fontSize: 11,
    });
  }
}

// 并行网关节点 - 菱形灰色
class ParallelGatewayNodeModel extends PolygonNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.points = [
      [40, 0],
      [80, 40],
      [40, 80],
      [0, 40],
    ];
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#909399",
      stroke: properties.stroke || "#606266",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 11,
    });
  }
}

// 包含网关节点 - 菱形紫色
class InclusiveGatewayNodeModel extends PolygonNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.points = [
      [40, 0],
      [80, 40],
      [40, 80],
      [0, 40],
    ];
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#9c27b0",
      stroke: properties.stroke || "#6a1b9a",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 11,
    });
  }
}

// 基于事件的网关节点 - 菱形深紫色
class EventBasedGatewayNodeModel extends PolygonNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.points = [
      [40, 0],
      [80, 40],
      [40, 80],
      [0, 40],
    ];
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#673ab7",
      stroke: properties.stroke || "#4527a0",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 11,
    });
  }
}

// 复杂网关节点 - 菱形红色
class ComplexGatewayNodeModel extends PolygonNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.points = [
      [40, 0],
      [80, 40],
      [40, 80],
      [0, 40],
    ];
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#f44336",
      stroke: properties.stroke || "#c62828",
      strokeWidth: 2,
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 11,
    });
  }
}

// 自定义节点 - 矩形紫色虚线
class CustomNodeModel extends RectNodeModel {
  initNodeData(data: unknown) {
    super.initNodeData(data as LogicFlow.NodeConfig);
    this.text.draggable = false;
    this.width = 160;
    this.height = 80;
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const { properties } = this;
    return merge(style, {
      fill: properties.fill || "#9b59b6",
      stroke: properties.stroke || "#6c3483",
      strokeWidth: 1,
      radius: 4,
      strokeDasharray: "5,5",
    });
  }
  getTextStyle() {
    const style = super.getTextStyle();
    return merge(style, {
      color: "#fff",
      fontSize: 12,
    });
  }
}

/**
 * 为节点最外层 <g> 元素补充 data-id 属性
 *
 * 连接点悬浮快捷菜单等画布 DOM 事件需要根据 DOM 元素定位其所属节点，
 * 这里通过重写模型 getOuterGAttributes 将节点 id 写入外层 <g> 的 data-id 属性。
 */
function withNodeDataId(ModelClass: { prototype: object }): void {
  const proto = ModelClass.prototype as {
    id?: string;
    getOuterGAttributes?: () => Record<string, unknown>;
  };
  const origin = proto.getOuterGAttributes;
  proto.getOuterGAttributes = function (this: { id: string }) {
    return {
      ...(origin ? origin.call(this) : {}),
      "data-id": this.id,
    };
  };
}

/**
 * 导出自定义节点配置
 * LogicFlow 2.1.3 使用 register 方法注册，传入 model 和 view
 * 结构与 RegisterConfig 对齐：{ view, model }
 */
export const CustomNodes = {
  startEvent: {
    view: IconCircleNode,
    model: StartNodeModel,
  },
  endEvent: {
    view: IconCircleNode,
    model: EndNodeModel,
  },
  userTask: {
    view: IconRectNode,
    model: UserTaskNodeModel,
  },
  serviceTask: {
    view: IconRectNode,
    model: ServiceTaskNodeModel,
  },
  scriptTask: {
    view: IconRectNode,
    model: ScriptTaskNodeModel,
  },
  businessRuleTask: {
    view: IconRectNode,
    model: BusinessRuleTaskNodeModel,
  },
  manualTask: {
    view: IconRectNode,
    model: ManualTaskNodeModel,
  },
  receiveTask: {
    view: IconRectNode,
    model: ReceiveTaskNodeModel,
  },
  sendTask: {
    view: IconRectNode,
    model: SendTaskNodeModel,
  },
  callActivity: {
    view: IconRectNode,
    model: CallActivityNodeModel,
  },
  subProcess: {
    view: IconRectNode,
    model: SubProcessNodeModel,
  },
  exclusiveGateway: {
    view: IconPolygonNode,
    model: ExclusiveGatewayNodeModel,
  },
  parallelGateway: {
    view: IconPolygonNode,
    model: ParallelGatewayNodeModel,
  },
  inclusiveGateway: {
    view: IconPolygonNode,
    model: InclusiveGatewayNodeModel,
  },
  eventBasedGateway: {
    view: IconPolygonNode,
    model: EventBasedGatewayNodeModel,
  },
  complexGateway: {
    view: IconPolygonNode,
    model: ComplexGatewayNodeModel,
  },
  customNode: {
    view: IconRectNode,
    model: CustomNodeModel,
  },
};

// 为所有自定义节点补充 data-id 外层属性（连接点快捷菜单依赖）
Object.values(CustomNodes).forEach(({ model }) => withNodeDataId(model));

/**
 * 节点类型配置映射表
 * @deprecated 已迁移至 nodeConfig.ts 的 NODE_TYPE_CONFIG，此处仅做兼容重导出
 */
export { NODE_TYPE_CONFIG as nodeTypeConfig } from "./nodeConfig";
