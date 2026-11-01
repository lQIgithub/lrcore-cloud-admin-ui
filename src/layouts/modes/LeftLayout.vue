<template>
  <BaseLayout>
    <div
      v-show="!appStore.contentFullscreen"
      class="layout-sidebar"
      :class="{ 'is-collapsed': !isSidebarOpen }"
    >
      <div :class="{ 'has-logo': showLogo }" class="layout-sidebar__inner">
        <LayoutLogo v-if="showLogo" :collapse="!isSidebarOpen" />
        <button
          v-if="isMobile && isSidebarOpen"
          class="layout-sidebar__close"
          type="button"
          aria-label="收起菜单"
          @click="closeSidebar"
        >
          <el-icon><Close /></el-icon>
        </button>
        <el-scrollbar>
          <LayoutSidebar :data="routes" base-path="" />
        </el-scrollbar>
      </div>
    </div>

    <div
      class="layout-main"
      :class="{
        'is-collapsed': !isSidebarOpen,
        'is-fullscreen': appStore.contentFullscreen,
      }"
    >
      <LayoutNavbar v-show="!appStore.contentFullscreen" />
      <LayoutTagsView v-if="showTagsView" />
      <LayoutMain />
    </div>
  </BaseLayout>
</template>

<script setup lang="ts">
import { useLayout } from "../composables/useLayout";
import { useAppStore } from "@/stores";
import BaseLayout from "../BaseLayout.vue";
import LayoutLogo from "../components/LayoutLogo.vue";
import LayoutNavbar from "../components/LayoutNavbar.vue";
import LayoutTagsView from "../components/LayoutTagsView.vue";
import LayoutMain from "../components/LayoutMain.vue";
import LayoutSidebar from "../components/LayoutSidebar.vue";

const { showTagsView, showLogo, isMobile, isSidebarOpen, routes, closeSidebar } = useLayout();
const appStore = useAppStore();
</script>

<style lang="scss" scoped>
@use "@/styles/mixins" as *;

.layout-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  width: $sidebar-width;
  background-color: $menu-background;
  transition: width 0.28s;

  &.is-collapsed {
    width: $sidebar-width-collapsed;
  }

  &__inner {
    position: relative;
    height: 100%;
    background-color: var(--menu-background);
    border-right: 1px solid var(--card-border);
    transition: width 0.28s;

    &.has-logo {
      .el-scrollbar {
        @include sidebar-scroll-height-with-logo;
      }
    }

    :deep(.el-menu) {
      border: none;
    }
  }

  &__close {
    position: absolute;
    top: 10px;
    right: 8px;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--menu-text);
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 6px;

    &:hover {
      color: var(--menu-active-text);
      background: var(--menu-hover);
    }
  }
}

.layout-main {
  position: relative;
  height: 100%;
  margin-left: $sidebar-width;
  overflow-y: auto;
  transition: margin-left 0.28s;

  &.is-collapsed {
    margin-left: $sidebar-width-collapsed;
  }

  &.is-fullscreen {
    margin-left: 0 !important;
  }
}

.is-mobile {
  .layout-sidebar {
    width: $sidebar-width !important;
    transition:
      transform 0.28s,
      width 0s;
  }

  &.is-sidebar-collapsed {
    .layout-sidebar {
      transform: translateX(-$sidebar-width);
    }
  }

  &.is-sidebar-open {
    .layout-sidebar {
      transform: translateX(0);
    }
  }

  .layout-main {
    margin-left: 0 !important;
  }
}
</style>
