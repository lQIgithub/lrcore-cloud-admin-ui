<template>
  <el-card shadow="never" class="enterprise-card">
    <div class="enterprise-card__header">
      <h3>企业列表</h3>
      <p>选择企业后查看用户信息</p>
    </div>
    <el-divider class="enterprise-card__divider" />
    <div class="enterprise-card__body">
      <el-input v-model="keyword" class="enterprise-card__search" placeholder="搜索企业" clearable>
        <template #prefix>
          <el-icon>
            <Search />
          </el-icon>
        </template>
      </el-input>

      <el-tree
        ref="enterpriseTreeRef"
        :data="enterpriseList"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
        :expand-on-click-node="false"
        highlight-current
        node-key="id"
        :filter-node-method="handleFilter"
        @node-click="handleNodeClick"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import EnterpriseAPI from "@/api/system/enterprise";
import type { OptionItem } from "@/api/common";
import type { TreeNodeData } from "element-plus/es/components/tree";

const emits = defineEmits(["node-click"]);

const enterpriseList = ref<OptionItem[]>([]);
const enterpriseTreeRef = ref();
const keyword = ref("");

watch(keyword, (value) => {
  enterpriseTreeRef.value?.filter(value);
});

function handleFilter(value: string, data: TreeNodeData): boolean {
  if (!value) {
    return true;
  }
  return String((data as OptionItem).label ?? "").includes(value);
}

function handleNodeClick(data: OptionItem): void {
  emits("node-click", { id: String(data.value) });
}

onBeforeMount(async () => {
  enterpriseList.value = await EnterpriseAPI.getOptions();
});
</script>

<style lang="scss" scoped>
.enterprise-card {
  height: 100%;
  background: transparent;
  border: 0;
  border-radius: inherit;
  box-shadow: none;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 12px;
  }

  &__header {
    flex-shrink: 0;
    padding: 10px 12px;
    background: var(--el-color-primary-light-9);
    border-radius: 10px;

    h3 {
      margin: 0;
      font-size: 15px;
    }

    p {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  &__divider {
    margin: 10px 0;
  }

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  &__search {
    margin-bottom: 10px;
  }

  :deep(.el-tree-node__content) {
    height: 32px;
  }
}
</style>
