<template>
  <div class="node-palette">
    <div class="node-palette__group">
      <div class="node-palette__title">开始/结束</div>
      <div class="node-palette__items">
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('startEvent', $event)"
        >
          <div class="node-palette__item-icon start-event"></div>
          <span class="node-palette__item-label">开始节点</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('endEvent', $event)"
        >
          <div class="node-palette__item-icon end-event"></div>
          <span class="node-palette__item-label">结束节点</span>
        </div>
      </div>
    </div>

    <div class="node-palette__group">
      <div class="node-palette__title">任务节点</div>
      <div class="node-palette__items">
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('userTask', $event)"
        >
          <div class="node-palette__item-icon user-task"></div>
          <span class="node-palette__item-label">用户任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('serviceTask', $event)"
        >
          <div class="node-palette__item-icon service-task"></div>
          <span class="node-palette__item-label">服务任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('scriptTask', $event)"
        >
          <div class="node-palette__item-icon script-task"></div>
          <span class="node-palette__item-label">脚本任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('businessRuleTask', $event)"
        >
          <div class="node-palette__item-icon business-rule-task"></div>
          <span class="node-palette__item-label">业务规则任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('manualTask', $event)"
        >
          <div class="node-palette__item-icon manual-task"></div>
          <span class="node-palette__item-label">手动任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('receiveTask', $event)"
        >
          <div class="node-palette__item-icon receive-task"></div>
          <span class="node-palette__item-label">接受任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('sendTask', $event)"
        >
          <div class="node-palette__item-icon send-task"></div>
          <span class="node-palette__item-label">发送任务</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('callActivity', $event)"
        >
          <div class="node-palette__item-icon call-activity"></div>
          <span class="node-palette__item-label">调用活动</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('subProcess', $event)"
        >
          <div class="node-palette__item-icon sub-process"></div>
          <span class="node-palette__item-label">子流程</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('customNode', $event)"
        >
          <div class="node-palette__item-icon custom-node"></div>
          <span class="node-palette__item-label">自定义节点</span>
        </div>
      </div>
    </div>

    <div class="node-palette__group">
      <div class="node-palette__title">网关节点</div>
      <div class="node-palette__items">
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('exclusiveGateway', $event)"
        >
          <div class="node-palette__item-icon exclusive-gateway"></div>
          <span class="node-palette__item-label">排他网关</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('parallelGateway', $event)"
        >
          <div class="node-palette__item-icon parallel-gateway"></div>
          <span class="node-palette__item-label">并行网关</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('inclusiveGateway', $event)"
        >
          <div class="node-palette__item-icon inclusive-gateway"></div>
          <span class="node-palette__item-label">包含网关</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('eventBasedGateway', $event)"
        >
          <div class="node-palette__item-icon event-based-gateway"></div>
          <span class="node-palette__item-label">事件网关</span>
        </div>
        <div
          class="node-palette__item"
          draggable="true"
          @dragstart="handleDragStart('complexGateway', $event)"
        >
          <div class="node-palette__item-icon complex-gateway"></div>
          <span class="node-palette__item-label">复杂网关</span>
        </div>
      </div>
    </div>

    <div class="node-palette__group">
      <div class="node-palette__title">快捷操作</div>
      <div class="node-palette__items">
        <div class="node-palette__item" @click="addStartNode">
          <div class="node-palette__item-icon start-event"></div>
          <span class="node-palette__item-label">添加开始</span>
        </div>
        <div class="node-palette__item" @click="addEndNode">
          <div class="node-palette__item-icon end-event"></div>
          <span class="node-palette__item-label">添加结束</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFlowDesignerStore } from "@/stores/flow-designer";
import { ElMessage } from "element-plus";
import { createFlowNode, type NodeType } from "@/api/logicflow";

const store = useFlowDesignerStore();

function handleDragStart(type: NodeType, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/logicflow-node", type);
    event.dataTransfer.effectAllowed = "copy";
  }
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

  &__item-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 4px;
    border-radius: 4px;

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
  }

  &__item-label {
    font-size: 11px;
    color: #606266;
    text-align: center;
  }
}
</style>
