<template>
  <div
    class="node-icon-preview"
    :class="{ 'node-icon-preview--empty': !config }"
    :style="previewStyle"
  >
    <!-- 预设图标：内联 SVG，currentColor 随主题适配 -->
    <svg
      v-if="presetIcon"
      class="node-icon-preview__svg"
      :viewBox="ICON_VIEWBOX"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <component :is="el.tag" v-for="(el, i) in presetIcon.elements" :key="i" v-bind="el.attrs" />
    </svg>

    <!-- 自定义上传图片：懒加载 + 失败占位 -->
    <template v-else-if="isCustom">
      <img
        v-if="imgState === 'loaded'"
        class="node-icon-preview__img"
        :src="config!.iconValue"
        alt="节点图标"
      />
      <span v-else-if="imgState === 'error'" class="node-icon-preview__fallback">
        <el-icon><PictureFilled /></el-icon>
      </span>
      <span v-else class="node-icon-preview__fallback">
        <el-icon class="is-loading"><Loading /></el-icon>
      </span>
    </template>

    <!-- 无图标占位 -->
    <span v-else class="node-icon-preview__placeholder">
      <el-icon><Picture /></el-icon>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { PictureFilled, Picture, Loading } from "@element-plus/icons-vue";
import type { NodeIconConfig } from "@/api/logicflow";
import { ICON_VIEWBOX, getPresetIcon } from "./presetIcons";
import { getIconLoadState, ensureIconLoaded, subscribeIconState } from "./iconLoader";

const props = withDefaults(
  defineProps<{
    /** 图标配置；null 时显示空占位 */
    config?: NodeIconConfig | null;
    /** 预览尺寸（px），默认 32 */
    size?: number;
  }>(),
  { config: null, size: 32 }
);

const isCustom = computed(() => props.config?.iconType === "custom");
const presetIcon = computed(() =>
  props.config?.iconType === "preset" ? getPresetIcon(props.config.iconValue) : undefined
);

const previewStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));

// 自定义图片加载状态（与画布徽标共用图标加载器，保持一致）
const imgState = ref<"idle" | "loading" | "loaded" | "error">("idle");
let unsubscribeIcon: (() => void) | undefined;

watch(
  () => props.config?.iconValue,
  (url) => {
    unsubscribeIcon?.();
    unsubscribeIcon = undefined;
    if (!url || props.config?.iconType !== "custom") {
      imgState.value = "idle";
      return;
    }
    const update = (u: string, s: typeof imgState.value) => {
      if (u === url) imgState.value = s;
    };
    imgState.value = getIconLoadState(url) as typeof imgState.value;
    ensureIconLoaded(url);
    unsubscribeIcon = subscribeIconState(update);
  },
  { immediate: true }
);

onBeforeUnmount(() => unsubscribeIcon?.());
</script>

<style scoped lang="scss">
.node-icon-preview {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;

  &--empty {
    background: var(--el-fill-color-light);
    border-style: dashed;
  }

  &__svg,
  &__img {
    width: 100%;
    height: 100%;
  }

  &__img {
    object-fit: contain;
  }

  &__fallback,
  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-secondary);
  }

  &__fallback {
    color: var(--el-color-danger);
  }
}
</style>
