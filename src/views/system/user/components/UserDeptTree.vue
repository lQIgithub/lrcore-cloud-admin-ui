<template>
  <el-card shadow="never" class="dept-card">
    <el-input v-model="deptName" class="dept-card__search" placeholder="搜索部门" clearable>
      <template #prefix>
        <el-icon>
          <Search/>
        </el-icon>
      </template>
    </el-input>

    <el-tree
      ref="deptTreeRef"
      class="dept-card__tree"
      :data="deptList"
      :props="{ children: 'children', label: 'nodeName', disabled: '' }"
      :expand-on-click-node="false"
      :filter-node-method="handleFilter"
      default-expand-all
      @node-click="handleNodeClick"
    />
  </el-card>
</template>

<script setup lang="ts">
import DeptAPI from "@/api/system/dept";
import type {TreeNodeData} from "element-plus/es/components/tree";

/** 部门树节点数据 */
interface DeptTreeNode {
  nodeId: string | number;
  parentNodeId: string | number;
  nodeName: string;
  children?: DeptTreeNode[];
}

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: undefined,
  },
});

const deptList = ref<DeptTreeNode[]>();
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
  return String((data as DeptTreeNode).nodeName ?? "").includes(value);
}

function handleNodeClick(data: DeptTreeNode): void {
  deptId.value = data.nodeId;
  emits("node-click");
}

onBeforeMount(() => {
  DeptAPI.getOptions().then((data) => {
    deptList.value = data as unknown as DeptTreeNode[];
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

.dept-card__tree {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;

  :deep(.el-tree-node__content) {
    height: 32px;
  }
}
</style>
