<template>
  <div class="node-palette">
    <div v-for="group in PALETTE_GROUPS" :key="group.title" class="node-palette__group">
      <div class="node-palette__title">{{ group.title }}</div>
      <div class="node-palette__items">
        <div
          v-for="item in group.items"
          :key="`${item.type}-${item.label}`"
          class="node-palette__item"
          :draggable="!item.action"
          @dragstart="handleDragStart(item.type, $event)"
          @click="handleQuickAction(item)"
        >
          <div class="node-palette__item-icon-wrap">
            <div class="node-palette__item-icon" :class="item.iconClass">
              <!-- 色块内嵌图形：与画布徽标共用预设图标源，风格/尺寸统一；网关菱形内反向旋转保持水平 -->
              <svg
                v-if="paletteIcon(item.type)"
                class="node-palette__item-icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <component
                  :is="el.tag"
                  v-for="(el, i) in paletteIcon(item.type)!.elements"
                  :key="i"
                  v-bind="el.attrs"
                />
              </svg>
            </div>
            <!-- 节点图标（流程级默认或内置类型默认）：右上角小徽标，拖入画布后自动跟随节点 -->
            <NodeIconPreview
              v-if="typeDefaultIcon(item.type)"
              class="node-palette__item-icon-badge"
              :config="typeDefaultIcon(item.type)"
              :size="18"
            />
          </div>
          <span class="node-palette__item-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFlowDesignerStore } from "@/stores/flow-designer";
import { ElMessage } from "element-plus";
import {
  createFlowNode,
  isValidIconConfig,
  type NodeIconConfig,
  type NodeType,
} from "@/api/logicflow";
import NodeIconPreview from "./nodeIcon/NodeIconPreview.vue";
import { getBuiltinTypeIcon } from "./nodeIcon/builtinIcons";
import { getPresetIcon } from "./nodeIcon/presetIcons";

const store = useFlowDesignerStore();

interface PaletteItem {
  type: NodeType;
  label: string;
  iconClass: string;
  /** 快捷操作：点击直接添加节点（不可拖拽） */
  action?: "addStart" | "addEnd";
}

/** 面板分组（与 LogicFlowCanvas 快捷新增/图标库分类一致） */
const PALETTE_GROUPS: { title: string; items: PaletteItem[] }[] = [
  {
    title: "开始/结束",
    items: [
      { type: "startEvent", label: "开始节点", iconClass: "start-event" },
      { type: "endEvent", label: "结束节点", iconClass: "end-event" },
    ],
  },
  {
    title: "任务节点",
    items: [
      { type: "userTask", label: "用户任务", iconClass: "user-task" },
      { type: "serviceTask", label: "服务任务", iconClass: "service-task" },
      { type: "scriptTask", label: "脚本任务", iconClass: "script-task" },
      { type: "businessRuleTask", label: "业务规则任务", iconClass: "business-rule-task" },
      { type: "manualTask", label: "手动任务", iconClass: "manual-task" },
      { type: "receiveTask", label: "接受任务", iconClass: "receive-task" },
      { type: "sendTask", label: "发送任务", iconClass: "send-task" },
      { type: "callActivity", label: "调用活动", iconClass: "call-activity" },
      { type: "subProcess", label: "子流程", iconClass: "sub-process" },
      { type: "customNode", label: "自定义节点", iconClass: "custom-node" },
    ],
  },
  {
    title: "网关节点",
    items: [
      { type: "exclusiveGateway", label: "排他网关", iconClass: "exclusive-gateway" },
      { type: "parallelGateway", label: "并行网关", iconClass: "parallel-gateway" },
      { type: "inclusiveGateway", label: "包含网关", iconClass: "inclusive-gateway" },
      { type: "eventBasedGateway", label: "事件网关", iconClass: "event-based-gateway" },
      { type: "complexGateway", label: "复杂网关", iconClass: "complex-gateway" },
    ],
  },
  {
    title: "快捷操作",
    items: [
      { type: "startEvent", label: "添加开始", iconClass: "start-event", action: "addStart" },
      { type: "endEvent", label: "添加结束", iconClass: "end-event", action: "addEnd" },
    ],
  },
];

function handleDragStart(type: NodeType, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/logicflow-node", type);
    event.dataTransfer.effectAllowed = "copy";
  }
}

function handleQuickAction(item: PaletteItem) {
  if (item.action === "addStart") addStartNode();
  else if (item.action === "addEnd") addEndNode();
}

function addStartNode() {
  // 检查是否已存在开始节点
  if (store.hasNodeType("startEvent")) {
    ElMessage.warning("画布中已存在开始节点，不能重复添加");
    return;
  }
  const node = createFlowNode("startEvent", 100, 200);
  store.addNode(node);
}

function addEndNode() {
  // 检查是否已存在结束节点
  if (store.hasNodeType("endEvent")) {
    ElMessage.warning("画布中已存在结束节点，不能重复添加");
    return;
  }
  const node = createFlowNode("endEvent", 400, 200);
  store.addNode(node);
}

/**
 * 面板色块内嵌图形：取类型内置默认的预设图标（与画布徽标同一套图标源，风格统一）。
 * 用户任务 -> 小人(user)，网关 -> 左右分枝(gateway)。
 */
function paletteIcon(type: NodeType) {
  const cfg = getBuiltinTypeIcon(type);
  return cfg?.iconType === "preset" ? getPresetIcon(cfg.iconValue) : undefined;
}

/**
 * 节点图标：优先取流程级类型默认（图标库配置，存于 graphData.iconConfig），
 * 未配置时回退内置类型默认；面板项右上角显示徽标，拖入画布的新节点自动携带，无需逐个自定义。
 */
function typeDefaultIcon(type: NodeType): NodeIconConfig | null {
  const config = store.graphData.iconConfig?.[type];
  if (config) {
    if (config.iconType === "none") return null;
    if (isValidIconConfig(config)) return config;
  }
  return getBuiltinTypeIcon(type);
}
</script>

<style scoped lang="scss">
.node-palette {
  flex-shrink: 0;
  width: 220px;
  padding: 12px;
  overflow-y: auto;
  background: #fff;
  border-right: 1px solid #e4e7ed;

  &__group {
    margin-bottom: 20px;
  }

  &__title {
    padding-left: 8px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #909399;
    border-left: 3px solid #409eff;
  }

  &__items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 4px;
    cursor: grab;
    background: #fafafa;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    transition: all 0.3s;

    &:hover {
      background: #ecf5ff;
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
    }

    &:active {
      cursor: grabbing;
    }
  }

  &__item-icon-wrap {
    position: relative;
  }

  &__item-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-bottom: 4px;
    color: #fff;
    border-radius: 4px;

    /* 色块内嵌图形：保持视觉居中、尺寸统一 */
    &-svg {
      width: 20px;
      height: 20px;
    }

    &.start-event {
      background: linear-gradient(135deg, #67c23a, #85ce61);
      border-radius: 50%;
    }

    &.end-event {
      background: linear-gradient(135deg, #f56c6c, #f78989);
      border-radius: 50%;
    }

    &.user-task {
      background: linear-gradient(135deg, #409eff, #66b1ff);
    }

    &.service-task {
      background: linear-gradient(135deg, #e6a23c, #ebb563);
    }

    &.script-task {
      background: linear-gradient(135deg, #9b59b6, #bb7bd6);
    }

    &.business-rule-task {
      background: linear-gradient(135deg, #00bcd4, #4dd0e1);
    }

    &.manual-task {
      background: linear-gradient(135deg, #607d8b, #78909c);
    }

    &.receive-task {
      background: linear-gradient(135deg, #ffc107, #ffd54f);
    }

    &.send-task {
      background: linear-gradient(135deg, #3f51b5, #5c6bc0);
    }

    &.call-activity {
      background: linear-gradient(135deg, #009688, #26a69a);
      border: 2px solid #00695c;
    }

    &.sub-process {
      background: linear-gradient(135deg, #795548, #8d6e63);
      border: 2px solid #4e342e;
    }

    &.exclusive-gateway {
      background: linear-gradient(135deg, #e6a23c, #f0c78a);
      transform: rotate(45deg);
    }

    &.parallel-gateway {
      background: linear-gradient(135deg, #909399, #b1b3b8);
      transform: rotate(45deg);
    }

    &.inclusive-gateway {
      background: linear-gradient(135deg, #9c27b0, #ba68c8);
      transform: rotate(45deg);
    }

    &.event-based-gateway {
      background: linear-gradient(135deg, #673ab7, #7e57c2);
      transform: rotate(45deg);
    }

    &.complex-gateway {
      background: linear-gradient(135deg, #f44336, #ef5350);
      transform: rotate(45deg);
    }

    &.custom-node {
      background: linear-gradient(135deg, #9b59b6, #bb7bd6);
    }

    /* 网关菱形容器内图形反向旋转，保持水平/垂直，避免跟随菱形倾斜 */
    &.exclusive-gateway,
    &.parallel-gateway,
    &.inclusive-gateway,
    &.event-based-gateway,
    &.complex-gateway {
      .node-palette__item-icon-svg {
        transform: rotate(-45deg);
      }
    }
  }

  /* 类型级默认图标徽标：悬浮于类型色块右上角，不拦截拖拽/点击 */
  &__item-icon-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    z-index: 1;
    pointer-events: none;
  }

  &__item-label {
    font-size: 11px;
    color: #606266;
    text-align: center;
  }
}
</style>
