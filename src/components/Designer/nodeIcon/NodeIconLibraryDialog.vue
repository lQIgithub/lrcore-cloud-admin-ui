<template>
  <el-dialog
    :model-value="visible"
    title="节点图标库"
    width="760px"
    :append-to-body="true"
    :deep-destroy="true"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="node-icon-library">
      <!-- 左侧：按分类列出全部节点类型 -->
      <div class="node-icon-library__sidebar">
        <div v-for="group in TYPE_GROUPS" :key="group.category" class="node-icon-library__group">
          <div class="node-icon-library__group-title">{{ group.label }}</div>
          <button
            v-for="type in group.types"
            :key="type"
            type="button"
            class="node-icon-library__type"
            :class="{ 'is-active': selectedType === type }"
            @click="selectedType = type"
          >
            <span
              class="node-icon-library__swatch"
              :style="{ background: getNodeColor(type) }"
            ></span>
            <span class="node-icon-library__type-label">{{ getNodeLabel(type) }}</span>
            <el-icon v-if="hasDefaultConfig(type)" class="node-icon-library__type-dot">
              <Picture />
            </el-icon>
          </button>
        </div>
      </div>

      <!-- 右侧：所选类型的默认图标编辑 -->
      <div class="node-icon-library__editor">
        <div class="node-icon-library__editor-head">
          <div class="node-icon-library__editor-title">
            {{ getNodeLabel(selectedType) }} · 默认图标
          </div>
          <el-button
            size="small"
            text
            type="danger"
            :disabled="!hasDefaultConfig(selectedType)"
            @click="clearDefault"
          >
            清除默认
          </el-button>
        </div>
        <div class="node-icon-library__editor-desc">
          配置后，该类型下所有未单独设置图标的节点将统一显示此图标；未配置时使用内置默认图标。
        </div>
        <NodeIconEditor
          :key="selectedType"
          :model-value="typeDefaultConfig"
          :node-type="selectedType"
          @update:model-value="onTypeConfigChange"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Picture } from "@element-plus/icons-vue";
import { useFlowDesignerStore } from "@/stores/flow-designer";
import type { NodeIconConfig, NodeType } from "@/api/logicflow";
import { getNodeColor, getNodeLabel } from "@/api/logicflow";
import NodeIconEditor from "./NodeIconEditor.vue";
import { getBuiltinTypeIcon } from "./builtinIcons";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const store = useFlowDesignerStore();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

/** 打开弹窗时默认选中第一个任务节点，便于快速配置 */
watch(
  () => props.modelValue,
  (v) => {
    if (v) selectedType.value = "userTask";
  }
);

/** 类型分组（与 NodePalette 分类一致） */
const TYPE_GROUPS: { category: "event" | "task" | "gateway"; label: string; types: NodeType[] }[] =
  [
    { category: "event", label: "事件节点", types: ["startEvent", "endEvent"] },
    {
      category: "task",
      label: "任务节点",
      types: [
        "userTask",
        "serviceTask",
        "scriptTask",
        "businessRuleTask",
        "manualTask",
        "receiveTask",
        "sendTask",
        "callActivity",
        "subProcess",
        "customNode",
      ],
    },
    {
      category: "gateway",
      label: "网关节点",
      types: [
        "exclusiveGateway",
        "parallelGateway",
        "inclusiveGateway",
        "eventBasedGateway",
        "complexGateway",
      ],
    },
  ];

const selectedType = ref<NodeType>("userTask");

/** 所选类型的类型级默认图标 */
const typeDefaultConfig = computed<NodeIconConfig | null>(
  () => store.graphData.iconConfig?.[selectedType.value] ?? getBuiltinTypeIcon(selectedType.value)
);

/** 某类型是否已配置默认图标 */
function hasDefaultConfig(type: NodeType): boolean {
  const config = store.graphData.iconConfig?.[type];
  return !!config && config.iconType !== "none";
}

/** 编辑类型默认图标（写入 graphData.iconConfig） */
function onTypeConfigChange(config: NodeIconConfig | null) {
  store.updateNodeIconConfig(selectedType.value, config);
}

/** 清除该类型默认图标 */
function clearDefault() {
  store.updateNodeIconConfig(selectedType.value, null);
}
</script>

<style scoped lang="scss">
.node-icon-library {
  display: flex;
  height: 480px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;

  &__sidebar {
    flex-shrink: 0;
    width: 200px;
    padding: 8px;
    overflow-y: auto;
    background: var(--el-fill-color-light);
    border-right: 1px solid var(--el-border-color);
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__group-title {
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  &__type {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 7px 8px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.is-active {
      font-weight: 600;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
    }
  }

  &__swatch {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }

  &__type-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    white-space: nowrap;
  }

  &__type-dot {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--el-color-success);
  }

  &__editor {
    flex: 1;
    min-width: 0;
    padding: 16px;
    overflow-y: auto;
    background: var(--el-bg-color);
  }

  &__editor-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  &__editor-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__editor-desc {
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
