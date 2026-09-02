<template>
  <div class="property-panel">
    <!-- 无选中元素时显示提示 -->
    <div v-if="!hasSelection" class="property-panel__empty">
      <el-empty description="请选择一个节点或连线" />
    </div>

    <!-- 节点属性 -->
    <template v-else-if="store.currentNode">
      <div class="property-panel__section">
        <div class="property-panel__title">
          <el-icon><Setting /></el-icon>
          <span>基本属性</span>
        </div>
        <div class="property-panel__form">
          <div class="property-panel__form-item">
            <label>节点ID</label>
            <el-input :model-value="nodeForm.id" disabled />
          </div>
          <div class="property-panel__form-item">
            <label>节点类型</label>
            <el-input :value="getNodeLabel(nodeForm.type)" disabled />
          </div>
          <div class="property-panel__form-item">
            <label>节点名称</label>
            <el-input v-model="nodeForm.text" @change="commitNode" />
          </div>
        </div>
      </div>

      <!-- 节点图标配置：类型默认 + 实例覆盖 -->
      <div class="property-panel__section">
        <div class="property-panel__title">
          <el-icon><Picture /></el-icon>
          <span>节点图标</span>
        </div>
        <NodeIconEditor
          :model-value="editorIconConfig"
          :node-type="nodeForm.type"
          @update:model-value="onIconConfigChange"
        />
        <div class="property-panel__icon-footer">
          <el-button
            size="small"
            text
            type="primary"
            :disabled="!hasInstanceIconOverride"
            @click="resetNodeIcon"
          >
            恢复类型默认
          </el-button>
          <span class="property-panel__icon-tip">{{ iconOriginTip }}</span>
        </div>
      </div>

      <!-- 用户任务属性 -->
      <template v-if="nodeForm.type === 'userTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><User /></el-icon>
            <span>任务分配</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>处理人</label>
              <el-input
                v-model="nodeForm.properties.assignee"
                placeholder="指定单个处理人"
                @change="commitNode"
              />
            </div>
            <div class="property-panel__form-item">
              <label>候选用户</label>
              <el-input
                v-model="nodeForm.properties.candidateUsers"
                placeholder="多个用户用逗号分隔"
                @change="commitNode"
              />
            </div>
            <div class="property-panel__form-item">
              <label>候选组</label>
              <el-input
                v-model="nodeForm.properties.candidateGroups"
                placeholder="多个组用逗号分隔"
                @change="commitNode"
              />
            </div>
            <div class="property-panel__form-item">
              <label>表单Key</label>
              <el-input
                v-model="nodeForm.properties.formKey"
                placeholder="关联的表单标识"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 服务任务属性 -->
      <template v-else-if="nodeForm.type === 'serviceTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Connection /></el-icon>
            <span>服务配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>委托表达式</label>
              <el-input
                v-model="nodeForm.properties.delegateExpression"
                placeholder="如：${myServiceDelegate}"
                @change="commitNode"
              />
            </div>
            <div class="property-panel__form-item">
              <label>调用表达式</label>
              <el-input
                v-model="nodeForm.properties.expression"
                placeholder="如：${myService.execute(input)}"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 脚本任务属性 -->
      <template v-else-if="nodeForm.type === 'scriptTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><EditPen /></el-icon>
            <span>脚本配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>脚本格式</label>
              <el-select v-model="nodeForm.properties.scriptFormat" @change="commitNode">
                <el-option label="JavaScript" value="javascript" />
                <el-option label="Groovy" value="groovy" />
                <el-option label="Python" value="python" />
              </el-select>
            </div>
            <div class="property-panel__form-item">
              <label>脚本内容</label>
              <el-input
                v-model="nodeForm.properties.script"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 10 }"
                placeholder="请输入脚本内容"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 排他网关属性 -->
      <template v-else-if="nodeForm.type === 'exclusiveGateway'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Share /></el-icon>
            <span>网关配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>默认出口</label>
              <el-input
                v-model="nodeForm.properties.default"
                placeholder="默认出口连线ID"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 业务规则任务属性 -->
      <template v-else-if="nodeForm.type === 'businessRuleTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Connection /></el-icon>
            <span>规则配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>决策表引用</label>
              <el-input
                v-model="nodeForm.properties.decisionTableReference"
                placeholder="如：orderDecisionTable"
                @change="commitNode"
              />
            </div>
            <div class="property-panel__form-item">
              <label>结果变量名</label>
              <el-input
                v-model="nodeForm.properties.resultVariableName"
                placeholder="如：result"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 手动任务属性（无特殊属性，仅提示） -->
      <template v-else-if="nodeForm.type === 'manualTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><User /></el-icon>
            <span>任务说明</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>说明</label>
              <el-input
                v-model="nodeForm.properties.description"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 5 }"
                placeholder="手动任务无需系统参与，由人工自行完成"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 接受任务属性 -->
      <template v-else-if="nodeForm.type === 'receiveTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Message /></el-icon>
            <span>消息配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>消息引用</label>
              <el-input
                v-model="nodeForm.properties.messageRef"
                placeholder="如：orderCreatedMessage"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 发送任务属性 -->
      <template v-else-if="nodeForm.type === 'sendTask'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Promotion /></el-icon>
            <span>消息配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>消息引用</label>
              <el-input
                v-model="nodeForm.properties.messageRef"
                placeholder="如：orderShippedMessage"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 调用活动属性 -->
      <template v-else-if="nodeForm.type === 'callActivity'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Connection /></el-icon>
            <span>调用配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>调用流程Key</label>
              <el-input
                v-model="nodeForm.properties.calledElement"
                placeholder="被调用的流程定义Key"
                @change="commitNode"
              />
            </div>
            <div class="property-panel__form-item">
              <label>继承变量</label>
              <el-switch
                v-model="nodeForm.properties.inheritVariables"
                active-value="true"
                inactive-value="false"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 子流程属性 -->
      <template v-else-if="nodeForm.type === 'subProcess'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Connection /></el-icon>
            <span>子流程配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>事件触发</label>
              <el-switch
                v-model="nodeForm.properties.triggeredByEvent"
                active-value="true"
                inactive-value="false"
                active-text="事件子流程"
                inactive-text="普通子流程"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 包含网关属性 -->
      <template v-else-if="nodeForm.type === 'inclusiveGateway'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Share /></el-icon>
            <span>网关配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>默认出口</label>
              <el-input
                v-model="nodeForm.properties.default"
                placeholder="默认出口连线ID"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 基于事件的网关属性 -->
      <template v-else-if="nodeForm.type === 'eventBasedGateway'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Share /></el-icon>
            <span>网关配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>说明</label>
              <el-input
                v-model="nodeForm.properties.description"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="基于事件的网关，后续连接事件节点"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 复杂网关属性 -->
      <template v-else-if="nodeForm.type === 'complexGateway'">
        <div class="property-panel__section">
          <div class="property-panel__title">
            <el-icon><Share /></el-icon>
            <span>网关配置</span>
          </div>
          <div class="property-panel__form">
            <div class="property-panel__form-item">
              <label>默认出口</label>
              <el-input
                v-model="nodeForm.properties.default"
                placeholder="默认出口连线ID"
                @change="commitNode"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 位置信息 -->
      <div class="property-panel__section">
        <div class="property-panel__title">
          <el-icon><Location /></el-icon>
          <span>位置信息</span>
        </div>
        <div class="property-panel__form">
          <div class="property-panel__form-item">
            <label>X坐标</label>
            <el-input-number v-model="nodeForm.x" @change="commitNode" />
          </div>
          <div class="property-panel__form-item">
            <label>Y坐标</label>
            <el-input-number v-model="nodeForm.y" @change="commitNode" />
          </div>
        </div>
      </div>

      <!-- 删除按钮 -->
      <div class="property-panel__section">
        <el-button type="danger" block @click="handleDeleteNode">
          <el-icon><Delete /></el-icon>
          删除节点
        </el-button>
      </div>
    </template>

    <!-- 连线属性 -->
    <template v-else-if="store.currentEdge">
      <div class="property-panel__section">
        <div class="property-panel__title">
          <el-icon><SetUp /></el-icon>
          <span>连线属性</span>
        </div>
        <div class="property-panel__form">
          <div class="property-panel__form-item">
            <label>连线ID</label>
            <el-input :model-value="edgeForm.id" disabled />
          </div>
          <div class="property-panel__form-item">
            <label>源节点</label>
            <el-input :model-value="edgeForm.sourceNodeId" disabled />
          </div>
          <div class="property-panel__form-item">
            <label>目标节点</label>
            <el-input :model-value="edgeForm.targetNodeId" disabled />
          </div>
        </div>
      </div>

      <div class="property-panel__section">
        <div class="property-panel__title">
          <el-icon><EditPen /></el-icon>
          <span>条件配置</span>
        </div>
        <div class="property-panel__form">
          <div class="property-panel__form-item">
            <label>条件表达式</label>
            <el-input
              v-model="edgeForm.properties.conditionExpression"
              type="textarea"
              :rows="3"
              placeholder="如：${amount > 100}"
              @change="commitEdge"
            />
          </div>
          <div class="property-panel__form-item">
            <el-switch
              v-model="edgeForm.properties.default"
              active-text="默认连线"
              @change="commitEdge"
            />
          </div>
        </div>
      </div>

      <div class="property-panel__section">
        <el-button type="danger" block @click="handleDeleteEdge">
          <el-icon><Delete /></el-icon>
          删除连线
        </el-button>
      </div>
    </template>

    <!-- 全局属性 -->
    <div class="property-panel__section property-panel__global">
      <div class="property-panel__title">
        <el-icon><InfoFilled /></el-icon>
        <span>流程信息</span>
      </div>
      <div class="property-panel__form">
        <div class="property-panel__form-item">
          <label>节点数量</label>
          <span class="property-panel__value">{{ store.graphData.nodes.length }}</span>
        </div>
        <div class="property-panel__form-item">
          <label>连线数量</label>
          <span class="property-panel__value">{{ store.graphData.edges.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import { Picture } from "@element-plus/icons-vue";
import { useFlowDesignerStore } from "@/stores/flow-designer";
import type { NodeIconConfig } from "@/api/logicflow";
import { getNodeLabel, type FlowNode, type FlowEdge, type NodeType } from "@/api/logicflow";
import NodeIconEditor from "./nodeIcon/NodeIconEditor.vue";

const store = useFlowDesignerStore();

const hasSelection = computed(() => store.selectedElement !== null);

// 节点表单的本地可变结构
interface NodeForm {
  id: string;
  type: NodeType;
  text: string;
  x: number;
  y: number;
  properties: Record<string, string>;
}

// 连线表单的本地可变结构
interface EdgeForm {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: {
    conditionExpression?: string;
    default?: boolean;
  };
}

// 本地表单状态：所有 v-model 绑定到此处，避免直接修改 store 的选中元素
const nodeForm = reactive<NodeForm>({
  id: "",
  type: "userTask",
  text: "",
  x: 0,
  y: 0,
  properties: {},
});

const edgeForm = reactive<EdgeForm>({
  id: "",
  sourceNodeId: "",
  targetNodeId: "",
  properties: {},
});

/**
 * 从 store 选中节点同步到本地表单（单向：store -> 表单）
 */
function syncNodeForm(node: FlowNode | null) {
  if (!node) return;
  nodeForm.id = node.id;
  nodeForm.type = node.type;
  nodeForm.text = node.text || "";
  nodeForm.x = node.x;
  nodeForm.y = node.y;
  nodeForm.properties = { ...(node.properties as Record<string, string>) };
}

function syncEdgeForm(edge: FlowEdge | null) {
  if (!edge) return;
  edgeForm.id = edge.id;
  edgeForm.sourceNodeId = edge.sourceNodeId;
  edgeForm.targetNodeId = edge.targetNodeId;
  edgeForm.properties = {
    conditionExpression: edge.properties?.conditionExpression,
    default: edge.properties?.default,
  };
}

// 监听 store 选中元素变化，单向同步到本地表单
watch(
  () => store.currentNode,
  (node) => syncNodeForm(node),
  { immediate: true }
);

watch(
  () => store.currentEdge,
  (edge) => syncEdgeForm(edge),
  { immediate: true }
);

/**
 * 提交节点修改到 store（单向：表单 -> store action）
 * 所有状态变更都通过 store action 完成，遵守单向数据流
 */
function commitNode() {
  if (!store.currentNode) return;
  store.updateNode(nodeForm.id, {
    text: nodeForm.text,
    x: nodeForm.x,
    y: nodeForm.y,
    properties: { ...nodeForm.properties },
  });
}

function commitEdge() {
  if (!store.currentEdge) return;
  store.updateEdge(edgeForm.id, {
    properties: {
      conditionExpression: edgeForm.properties.conditionExpression,
      default: edgeForm.properties.default,
    },
  });
}

function handleDeleteNode() {
  if (store.currentNode) {
    store.removeNode(store.currentNode.id);
  }
}

function handleDeleteEdge() {
  if (store.currentEdge) {
    store.removeEdge(store.currentEdge.id);
  }
}

// ==================== 节点图标配置 ====================

/**
 * 编辑器绑定值：优先取实例覆盖（保留显式 none），否则回退类型级默认。
 * 与 getEffectiveNodeIcon 的区别在于不丢弃显式 none，保证「无图标」状态可编辑。
 */
const editorIconConfig = computed<NodeIconConfig | null>(() => {
  const node = store.currentNode;
  if (!node) return null;
  const instance = node.properties?.iconConfig as NodeIconConfig | undefined;
  if (instance) return instance;
  return store.graphData.iconConfig?.[nodeForm.type] ?? null;
});

/** 当前节点是否配置了实例覆盖 */
const hasInstanceIconOverride = computed(() => !!store.currentNode?.properties?.iconConfig);

/** 图标来源提示：说明当前生效配置的来源层级 */
const iconOriginTip = computed(() => {
  if (!store.currentNode) return "";
  if (hasInstanceIconOverride.value) return "当前为节点独立配置";
  const typeDefault = store.graphData.iconConfig?.[nodeForm.type];
  return typeDefault && typeDefault.iconType !== "none" ? "沿用该类型默认图标" : "未配置图标";
});

/** 编辑器变更：写入实例覆盖 */
function onIconConfigChange(config: NodeIconConfig | null) {
  if (!store.currentNode) return;
  store.updateNodeIcon(store.currentNode.id, config);
}

/** 恢复类型默认：清除实例覆盖，回退到类型级默认 */
function resetNodeIcon() {
  if (!store.currentNode) return;
  store.updateNodeIcon(store.currentNode.id, null);
}
</script>

<style scoped lang="scss">
.property-panel {
  flex-shrink: 0;
  width: 320px;
  height: 100%;
  padding: 0;
  overflow-y: auto;
  background: #fff;
  border-left: 1px solid #e4e7ed;

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
  }

  &__section {
    padding: 12px 16px;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    &.property-panel__global {
      background: #fafafa;
    }
  }

  &__title {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #303133;

    .el-icon {
      color: #409eff;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__form-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 12px;
      color: #606266;
    }
  }

  &__value {
    font-size: 13px;
    color: #303133;
  }

  // 节点图标配置底部：恢复默认按钮 + 来源提示
  &__icon-footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }

  &__icon-tip {
    font-size: 12px;
    color: #909399;
  }
}
</style>
