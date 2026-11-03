<template>
  <el-card shadow="never" class="dept-card">
    <div class="dept-card__header">
      <h3>部门列表</h3>
      <p>选择部门后查看用户信息</p>
    </div>
    <el-divider class="dept-card__divider" />
    <div class="dept-card__body">
      <el-input v-model="deptName" class="dept-card__search" placeholder="搜索部门" clearable>
        <template #prefix>
          <el-icon>
            <Search />
          </el-icon>
        </template>
      </el-input>

      <el-tree
        ref="deptTreeRef"
        class="dept-card__tree"
        :data="deptList"
        :props="{ children: 'children', label: 'name', disabled: '' }"
        :expand-on-click-node="false"
        :filter-node-method="handleFilter"
        default-expand-all
        @node-click="handleNodeClick"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import DeptAPI from "@/api/system/dept";
import type { DeptItem } from "@/api/system/dept";
import type { TreeNodeData } from "element-plus/es/components/tree";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: undefined,
  },
});

const deptList = ref<DeptItem[]>();
const deptTreeRef = ref();
const deptName = ref("");

const emits = defineEmits(["node-click"]);

const deptId = useVModel(props, "modelValue", emits);

watchEffect(
  () => {
    deptTreeRef.value?.filter(deptName.value);
  },
  {
    flush: "post",
  }
);

function handleFilter(value: string, data: TreeNodeData): boolean {
  if (!value) {
    return true;
  }
  return String((data as DeptItem).name ?? "").includes(value);
}

function handleNodeClick(data: DeptItem): void {
  deptId.value = data.id;
  emits("node-click");
}

onBeforeMount(() => {
  DeptAPI.getList({}).then((data) => {
    deptList.value = data;
  });
});
</script>

<style lang="scss" scoped>
.dept-card {
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
}

.dept-card__search {
  margin-bottom: 10px;
}

.dept-card__header {
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

.dept-card__divider {
  margin: 10px 0;
}

.dept-card__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.dept-card__tree {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;

  :deep(.el-tree-node__content) {
    height: 32px;
  }
}
</style>
