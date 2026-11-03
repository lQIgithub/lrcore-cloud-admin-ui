<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <el-form ref="queryFormRef" :model="params" :inline="true" label-suffix=":">
        <el-form-item label="关键字" prop="keywords">
          <el-input
            v-model="params.keywords"
            placeholder="请输入租户名称\编码\描述"
            clearable
            @keyup.enter="handleQuery()"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="params.status" clearable placeholder="全部" style="width: 100px">
            <el-option :value="CommonStatus.ENABLED" label="启用" />
            <el-option :value="CommonStatus.DISABLED" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery()">搜索</el-button>
          <el-button @click="handleResetQuery()">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <el-button type="primary" @click="openDialog()">新增</el-button>
        <el-button type="danger" :disabled="!hasSelection" @click="handleBatchDelete()">
          删除
        </el-button>
      </div>

      <div class="page-table-wrapper">
        <el-table
          ref="dataTableRef"
          :key="tenantTableKey"
          v-loading="loading"
          :data="list"
          class="page-table"
          border
          height="100%"
          highlight-current-row
          :row-class-name="getRowClassName"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="租户名称" prop="name" min-width="160" />
          <el-table-column label="租户编码" prop="code" min-width="120" />
          <el-table-column
            label="租户描述"
            prop="description"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column align="center" label="排序" prop="sort" width="80" />
          <el-table-column align="center" label="是否内置" width="90">
            <template #default="scope">
              <el-tag :type="scope.row.buildIn === 1 ? 'warning' : 'info'">
                {{ scope.row.buildIn === 1 ? "是" : "否" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column align="center" label="状态" width="90">
            <template #default="scope">
              <el-tag :type="scope.row.status === CommonStatus.ENABLED ? 'success' : 'info'">
                {{ scope.row.status === CommonStatus.ENABLED ? "启用" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column align="center" label="操作" width="120">
            <template #default="scope">
              <el-button type="primary" size="small" link @click="openDialog(scope.row.id)">
                编辑
              </el-button>
              <el-button type="danger" size="small" link @click="handleDelete(scope.row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="params.pageNum"
        v-model:limit="params.pageSize"
        @pagination="fetchData"
      />
    </el-card>

    <el-drawer
      v-model="dialogState.visible"
      :title="dialogState.title"
      size="520px"
      @close="closeDialog"
    >
      <el-form ref="tenantFormRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="租户编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入租户编码" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CommonStatus.ENABLED">启用</el-radio>
            <el-radio :value="CommonStatus.DISABLED">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="租户描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入租户描述"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
        <el-button @click="closeDialog">取消</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import Sortable, { type SortableEvent } from "sortablejs";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
  type TableInstance,
} from "element-plus";

import TenantManagementAPI from "@/api/system/tenant-simple";
import type { TenantForm, TenantItem, TenantQueryParams } from "@/api/system/tenant-simple";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus } from "@/enums";

defineOptions({ name: "TenantManagement", inheritAttrs: false });

const queryFormRef = ref<FormInstance>();
const tenantFormRef = ref<FormInstance>();
const dataTableRef = ref<TableInstance>();
let tenantTableSortable: Sortable | null = null;
const tenantTableKey = ref(0);

const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  TenantItem,
  TenantQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    keywords: "",
  },
  request: TenantManagementAPI.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<TenantItem>();

const dialogState = reactive({ title: "", visible: false });

const initialFormData: TenantForm = {
  name: "",
  code: "",
  description: "",
  remark: "",
  status: CommonStatus.ENABLED,
};

const formData = reactive<TenantForm>({ ...initialFormData });

const rules: FormRules<TenantForm> = {
  name: [{ required: true, message: "请输入租户名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入租户编码", trigger: "blur" }],
  status: [{ required: true, message: "请选择租户状态", trigger: "change" }],
};

function resetForm(): void {
  tenantFormRef.value?.resetFields();
  tenantFormRef.value?.clearValidate();
  Object.assign(formData, initialFormData);
}

function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

async function openDialog(id?: string): Promise<void> {
  dialogState.visible = true;
  if (id) {
    dialogState.title = "修改租户";
    const data = await TenantManagementAPI.getFormData(id);
    Object.assign(formData, data);
  } else {
    dialogState.title = "新增租户";
  }
}

async function handleSubmit(): Promise<void> {
  const valid = await tenantFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  loading.value = true;
  try {
    if (formData.id) {
      await TenantManagementAPI.update(formData.id, formData);
      ElMessage.success("修改成功");
    } else {
      await TenantManagementAPI.create(formData);
      ElMessage.success("新增成功");
    }
    closeDialog();
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: string): Promise<void> {
  try {
    await ElMessageBox.confirm("确认删除选中的租户吗？", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    ElMessage.info("已取消删除");
    return;
  }

  loading.value = true;
  try {
    await TenantManagementAPI.deleteByIds(id);
    ElMessage.success("删除成功");
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

function handleBatchDelete(): void {
  const ids = selectedIds.value.join(",");
  if (ids) handleDelete(ids);
}

onMounted(() => {
  handleQuery();
  initTenantRowDrag();
});

onBeforeUnmount(() => {
  tenantTableSortable?.destroy();
});

function getRowClassName({ row }: { row: TenantItem }): string {
  return `tenant-row-${row.id}`;
}

function initTenantRowDrag(): void {
  const tableElement = dataTableRef.value?.$el as HTMLElement | undefined;
  const tbody = tableElement?.querySelector<HTMLElement>(".el-table__body tbody");
  if (!tbody) return;

  tenantTableSortable?.destroy();
  tenantTableSortable = Sortable.create(tbody, {
    animation: 160,
    draggable: ".el-table__row",
    onEnd: handleTenantRowDrop,
  });
}

async function handleTenantRowDrop(event: SortableEvent): Promise<void> {
  const oldIndex = event.oldIndex;
  const newIndex = event.newIndex;
  if (oldIndex === undefined || newIndex === undefined) return;
  if (oldIndex === newIndex || oldIndex >= list.value.length || newIndex >= list.value.length) {
    return;
  }

  const reorderedList = [...list.value];
  const [draggedItem] = reorderedList.splice(oldIndex, 1);
  reorderedList.splice(newIndex, 0, draggedItem);
  list.value = reorderedList;

  const sortBase = (params.pageNum - 1) * params.pageSize;
  const sortItems = reorderedList
    .filter((item): item is TenantItem & { id: string } => Boolean(item.id))
    .map((item, index) => ({
      id: item.id,
      sort: sortBase + index + 1,
    }));

  try {
    await TenantManagementAPI.updateSort(sortItems);
    await refreshTenantTable();
    ElMessage.success("排序已保存");
  } catch {
    await refreshTenantTable();
  }
}

async function refreshTenantTable(): Promise<void> {
  tenantTableKey.value++;
  await fetchData();
  await nextTick();
  initTenantRowDrag();
}
</script>

<style scoped>
.el-table .el-table__row {
  cursor: grab;
}

.el-table .el-table__row:active {
  cursor: grabbing;
}
</style>
