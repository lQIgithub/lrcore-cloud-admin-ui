<template>
  <el-dialog
    :model-value="visible"
    :title="`${getNodeLabel(nodeType)} · 图标配置`"
    width="440px"
    :append-to-body="true"
    :deep-destroy="true"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="node-icon-config-dialog">
      <div class="node-icon-config-dialog__node">
        <span
          class="node-icon-config-dialog__swatch"
          :style="{ background: getNodeColor(nodeType) }"
        ></span>
        <span class="node-icon-config-dialog__node-name">
          {{ node?.text || getNodeLabel(nodeType) }}
        </span>
      </div>
      <NodeIconEditor
        :model-value="editorIconConfig"
        :node-type="nodeType"
        @update:model-value="onIconConfigChange"
      />
    </div>
    <template #footer>
      <div class="node-icon-config-dialog__footer">
        <el-button
          size="small"
          text
          type="primary"
          :disabled="!hasInstanceIconOverride"
          @click="resetToTypeDefault"
        >
          恢复类型默认
        </el-button>
        <el-button type="primary" @click="visible = false">完成</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useFlowDesignerStore } from "@/stores/flow-designer";
import type { NodeIconConfig } from "@/api/logicflow";
import { getNodeColor, getNodeLabel } from "@/api/logicflow";
import NodeIconEditor from "./NodeIconEditor.vue";
import { getBuiltinTypeIcon } from "./builtinIcons";

const props = defineProps<{
  modelValue: boolean;
  /** 目标节点 id（画布徽标点击） */
  nodeId: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const store = useFlowDesignerStore();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const node = computed(() => store.graphData.nodes.find((n) => n.id === props.nodeId) ?? null);
const nodeType = computed(() => node.value?.type ?? "userTask");

/**
 * 编辑器绑定值：优先取实例覆盖（保留显式 none），否则回退类型级默认。
 * 与属性面板保持一致。
 */
const editorIconConfig = computed<NodeIconConfig | null>(() => {
  if (!node.value) return null;
  const instance = node.value.properties?.iconConfig as NodeIconConfig | undefined;
  if (instance) return instance;
  return store.graphData.iconConfig?.[node.value.type] ?? getBuiltinTypeIcon(node.value.type);
});

const hasInstanceIconOverride = computed(() => !!node.value?.properties?.iconConfig);

/** 编辑器变更：写入实例覆盖 */
function onIconConfigChange(config: NodeIconConfig | null) {
  if (node.value) store.updateNodeIcon(node.value.id, config);
}

/** 恢复类型默认：清除实例覆盖 */
function resetToTypeDefault() {
  if (node.value) store.updateNodeIcon(node.value.id, null);
}
</script>

<style scoped lang="scss">
.node-icon-config-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__node {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 10px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  &__swatch {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  &__node-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}
</style>
