<template>
  <div class="node-icon-editor">
    <!-- 实时预览 -->
    <div class="node-icon-editor__preview">
      <NodeIconPreview :config="draft" :size="56" />
      <div class="node-icon-editor__preview-info">
        <span class="node-icon-editor__preview-label">实时预览</span>
        <span class="node-icon-editor__preview-desc">
          {{ previewDesc }}
        </span>
      </div>
    </div>

    <!-- 来源选择 -->
    <el-radio-group v-model="source" class="node-icon-editor__source" size="small">
      <el-radio-button value="preset">预设图标</el-radio-button>
      <el-radio-button value="custom">上传图片</el-radio-button>
      <el-radio-button value="none">无图标</el-radio-button>
    </el-radio-group>

    <!-- 预设图标选择 -->
    <template v-if="source === 'preset'">
      <div v-if="recommended.length" class="node-icon-editor__group">
        <div class="node-icon-editor__group-title">推荐</div>
        <div class="node-icon-editor__grid">
          <button
            v-for="icon in recommendedIcons"
            :key="icon.key"
            type="button"
            class="node-icon-editor__item"
            :class="{ 'is-active': draft?.iconType === 'preset' && draft.iconValue === icon.key }"
            :title="`${icon.name} · ${icon.description}`"
            @click="selectPreset(icon.key)"
          >
            <svg
              :viewBox="ICON_VIEWBOX"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <component :is="el.tag" v-for="(el, i) in icon.elements" :key="i" v-bind="el.attrs" />
            </svg>
          </button>
        </div>
      </div>

      <div class="node-icon-editor__group">
        <div class="node-icon-editor__group-title">全部图标</div>
        <div class="node-icon-editor__grid">
          <button
            v-for="icon in PRESET_ICONS"
            :key="icon.key"
            type="button"
            class="node-icon-editor__item"
            :class="{ 'is-active': draft?.iconType === 'preset' && draft.iconValue === icon.key }"
            :title="`${icon.name} · ${icon.description}`"
            @click="selectPreset(icon.key)"
          >
            <svg
              :viewBox="ICON_VIEWBOX"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <component :is="el.tag" v-for="(el, i) in icon.elements" :key="i" v-bind="el.attrs" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <!-- 上传图片 -->
    <div v-else-if="source === 'custom'" class="node-icon-editor__upload">
      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        accept="image/*"
        :limit="1"
        :disabled="uploading"
        :on-change="handleFileChange"
      >
        <el-button :icon="Upload" :loading="uploading" size="small">
          {{ draft?.iconType === "custom" ? "重新上传" : "选择图片上传" }}
        </el-button>
      </el-upload>
      <div class="node-icon-editor__upload-tip">支持 JPG / PNG / SVG，大小不超过 2MB</div>
      <div v-if="draft?.iconType === 'custom'" class="node-icon-editor__current">
        <NodeIconPreview :config="draft" :size="32" />
        <span class="node-icon-editor__current-url" :title="draft.iconValue">
          {{ draft.iconValue }}
        </span>
      </div>
    </div>

    <!-- 图标尺寸 -->
    <div v-if="draft && draft.iconType !== 'none'" class="node-icon-editor__size">
      <div class="node-icon-editor__size-label">
        <span>图标大小</span>
        <span class="node-icon-editor__size-value">
          {{ draft.iconSize || DEFAULT_ICON_SIZE }}px
        </span>
      </div>
      <el-slider
        :model-value="draft.iconSize || DEFAULT_ICON_SIZE"
        :min="ICON_SIZE_RANGE.min"
        :max="ICON_SIZE_RANGE.max"
        :step="2"
        @input="setSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Upload } from "@element-plus/icons-vue";
import type { NodeIconConfig, NodeType } from "@/api/logicflow";
import { DEFAULT_ICON_SIZE, ICON_SIZE_RANGE } from "@/api/logicflow";
import FileAPI from "@/api/file";
import NodeIconPreview from "./NodeIconPreview.vue";
import { ICON_VIEWBOX, PRESET_ICONS, getPresetIcon, getRecommendedIconKeys } from "./presetIcons";

const props = withDefaults(
  defineProps<{
    /** 当前图标配置（编辑对象） */
    modelValue?: NodeIconConfig | null;
    /** 节点类型（用于展示推荐图标） */
    nodeType?: NodeType;
  }>(),
  { modelValue: null, nodeType: "userTask" }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: NodeIconConfig | null): void;
}>();

/** 上传进行中标记（禁用重复上传） */
const uploading = ref(false);

/** 本地编辑草稿：每次修改立即 emit，供父组件实时预览 */
const draft = ref<NodeIconConfig | null>(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    draft.value = v;
  }
);

// 来源切换（同步来源字段，保留图标值与尺寸）
const source = computed({
  get: () => draft.value?.iconType ?? "preset",
  set: (v: "preset" | "custom" | "none") => {
    if (v === "none") {
      emit("update:modelValue", { iconType: "none", iconValue: "" });
      return;
    }
    const current = draft.value;
    // 保留同来源的有效图标值；跨来源切换时回退到推荐预设
    const keepCurrent = current && current.iconType === v && current.iconValue;
    if (v === "custom" && !keepCurrent) {
      // 切到上传且尚无自定义图片：置空，等待用户上传，避免预设 key 被当作图片 URL
      emit("update:modelValue", { iconType: "custom", iconValue: "", iconSize: current?.iconSize });
      return;
    }
    emit("update:modelValue", {
      iconType: v,
      iconValue: keepCurrent ? current!.iconValue : recommended.value[0],
      iconSize: current?.iconSize,
    });
  },
});

const recommended = computed(() => getRecommendedIconKeys(props.nodeType));
const recommendedIcons = computed(() =>
  recommended.value.map((key) => getPresetIcon(key)!).filter(Boolean)
);

const previewDesc = computed(() => {
  if (!draft.value) return "未配置图标";
  if (draft.value.iconType === "none") return "当前无图标";
  if (draft.value.iconType === "preset") {
    return getPresetIcon(draft.value.iconValue)?.name || "预设图标";
  }
  return "自定义上传图片";
});

function selectPreset(key: string) {
  emit("update:modelValue", {
    iconType: "preset",
    iconValue: key,
    iconSize: draft.value?.iconSize,
  });
}

function setSize(size: number | number[]) {
  const value = Array.isArray(size) ? size[0] : size;
  if (!draft.value || draft.value.iconType === "none" || value === undefined) return;
  emit("update:modelValue", {
    ...draft.value,
    iconSize: value,
  });
}

async function handleFileChange(uploadFile: { raw?: File }) {
  const file = uploadFile.raw;
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    ElMessage.warning("仅支持上传图片文件");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning("图片大小不能超过 2MB");
    return;
  }
  try {
    uploading.value = true;
    const res = await FileAPI.uploadFile(file);
    emit("update:modelValue", {
      iconType: "custom",
      iconValue: res.url,
      iconSize: draft.value?.iconSize,
    });
    ElMessage.success("图标上传成功");
  } catch {
    ElMessage.error("图标上传失败，请重试");
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped lang="scss">
.node-icon-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__preview {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &__preview-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__preview-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__preview-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__source {
    display: flex;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__group-title {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 6px;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    color: var(--el-text-color-regular);
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary);
    }

    &.is-active {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
    }
  }

  &__upload {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__upload-tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__current {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  &__current-url {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  &__size {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__size-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--el-text-color-regular);
  }

  &__size-value {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
</style>
