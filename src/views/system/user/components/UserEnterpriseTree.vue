<template>
  <el-card shadow="never" class="enterprise-card">
    <div class="enterprise-card__body">
      <el-input
        v-model="keyword"
        class="enterprise-card__search"
        placeholder="搜索企业/部门"
        clearable
      >
        <template #prefix>
          <el-icon>
            <Search />
          </el-icon>
        </template>
      </el-input>

      <el-tree
        ref="enterpriseTreeRef"
        v-loading="loading"
        :data="sidebarTreeData"
        :props="{ label: 'label', children: 'children' }"
        default-expand-all
        :expand-on-click-node="false"
        highlight-current
        node-key="value"
        :filter-node-method="handleFilter"
        @node-click="handleNodeClick"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import EnterpriseAPI from "@/api/system/enterprise";
import DeptAPI from "@/api/system/dept";
import type { OptionItem } from "@/api/common";
import type { TreeNodeData } from "element-plus";

const emits = defineEmits(["node-click"]);

type SidebarNode = OptionItem & {
  nodeType: "enterprise" | "dept";
  parentId?: string;
};

const loading = ref(false);
const sidebarTreeData = ref<SidebarNode[]>([]);
const enterpriseTreeRef = ref();
const keyword = ref("");

watch(keyword, (value) => {
  enterpriseTreeRef.value?.filter(value);
});

function handleFilter(value: string, data: TreeNodeData): boolean {
  if (!value) {
    return true;
  }
  return String((data as SidebarNode).label ?? "")
    .toLowerCase()
    .includes(value.trim().toLowerCase());
}

function handleNodeClick(data: SidebarNode): void {
  emits("node-click", {
    id: String(data.value),
    type: data.nodeType,
    parentId: data.nodeType === "dept" ? data.parentId : undefined,
  });
}

async function loadSidebarTree(): Promise<void> {
  loading.value = true;
  try {
    const enterprises = await EnterpriseAPI.getOptions();
    sidebarTreeData.value = await Promise.all(
      enterprises.map(async (enterprise) => {
        const departments = await DeptAPI.getOptions(enterprise.value?.toString());
        return {
          ...enterprise,
          nodeType: "enterprise" as const,
          children: departments.map((department) => ({
            ...department,
            parentId: enterprise.value?.toString(),
            nodeType: "dept" as const,
          })),
        };
      })
    );
  } finally {
    loading.value = false;
  }
}

onBeforeMount(loadSidebarTree);
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

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  &__search {
    margin-bottom: 10px;
  }

  :deep(.el-tree-node__content) {
    height: 36px;
    padding-right: 6px;
    border-radius: 8px;
    transition: background-color 0.15s;
  }

  :deep(.el-tree-node__content:hover) {
    background-color: var(--el-fill-color-light);
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    font-weight: 600;
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}
</style>
