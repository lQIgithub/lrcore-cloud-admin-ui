<template>
  <div class="page-container page-container--split">
    <aside class="page-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <div class="page-aside__inner">
        <el-card class="tenant-card" shadow="never">
          <el-input
            v-model="tenantKeyword"
            class="tenant-card__search"
            placeholder="搜索租户"
            clearable
            :prefix-icon="Search"
          />
          <div class="tenant-card__body">
            <el-tree
              ref="tenantTreeRef"
              :data="tenantOptions"
              :props="{ label: 'label', children: 'children' }"
              default-expand-all
              :expand-on-click-node="false"
              :filter-node-method="filterTenantNode"
              highlight-current
              node-key="value"
              @node-click="handleTenantNodeClick"
            >
              <template #default="{ data }">
                <el-tooltip
                  placement="right"
                  :show-after="300"
                  :hide-after="0"
                  :content="getTenantTooltip(data as TenantOption)"
                >
                  <span>{{ data.label }}</span>
                </el-tooltip>
              </template>
            </el-tree>
          </div>
        </el-card>
      </div>
      <button class="page-aside__toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <el-icon :size="14">
          <ArrowLeft v-if="!sidebarCollapsed" />
          <ArrowRight v-else />
        </el-icon>
      </button>
    </aside>

    <div class="page-main">
      <el-card class="page-search" shadow="never">
        <el-form ref="queryFormRef" :model="params" :inline="true" label-suffix=":">
          <el-form-item label="关键字" prop="keywords">
            <el-input
              v-model="params.keywords"
              placeholder="请输入应用名称\编码\描述"
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
            v-loading="loading"
            :data="list"
            class="page-table"
            border
            height="100%"
            highlight-current-row
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" align="center" />
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="应用名称" prop="name" min-width="160" />
            <el-table-column label="应用编码" prop="code" min-width="120" />
            <el-table-column label="访问地址" prop="url" min-width="180" show-overflow-tooltip />
            <el-table-column label="权限前缀" prop="permissionPrefix" min-width="110" />
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
    </div>

    <el-drawer
      v-model="dialogState.visible"
      :title="dialogState.title"
      size="520px"
      @close="closeDialog"
    >
      <el-form ref="appFormRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="所属租户" prop="tenantId">
          <el-select
            v-model="formData.tenantId"
            placeholder="请选择所属租户"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="tenant in tenantOptions"
              :key="tenant.value"
              :label="tenant.label"
              :value="tenant.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="应用名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入应用名称" />
        </el-form-item>
        <el-form-item label="应用编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入应用编码" />
        </el-form-item>
        <el-form-item label="访问地址" prop="url">
          <el-input v-model="formData.url" placeholder="请输入访问地址" />
        </el-form-item>
        <el-form-item label="权限前缀" prop="permissionPrefix">
          <el-input v-model="formData.permissionPrefix" placeholder="请输入权限前缀" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CommonStatus.ENABLED">启用</el-radio>
            <el-radio :value="CommonStatus.DISABLED">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="应用描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入应用描述"
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
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { ArrowLeft, ArrowRight, Search } from "@element-plus/icons-vue";

import AppAPI from "@/api/system/app";
import type { AppForm, AppItem, AppQueryParams } from "@/api/system/app";
import type { ElTree } from "element-plus";
import TenantManagementAPI from "@/api/system/tenant-simple";
import type { OptionItem } from "@/api/common";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus } from "@/enums";

defineOptions({ name: "AppManagement", inheritAttrs: false });

const queryFormRef = ref<FormInstance>();
const appFormRef = ref<FormInstance>();
const sidebarCollapsed = ref(false);
type TenantOption = OptionItem & {
  code: string;
  description?: string;
};

const tenantOptions = ref<TenantOption[]>([]);
const tenantTreeRef = ref<InstanceType<typeof ElTree>>();
const tenantKeyword = ref("");

const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  AppItem,
  AppQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    keywords: "",
  },
  request: AppAPI.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<AppItem>();

const dialogState = reactive({ title: "", visible: false });

const initialFormData: AppForm = {
  name: "",
  code: "",
  description: "",
  url: "",
  icon: "",
  permissionPrefix: "",
  remark: "",
  status: CommonStatus.ENABLED,
};

const formData = reactive<AppForm>({ ...initialFormData });

function filterTenantNode(value: string, data: { label?: string }): boolean {
  return (data.label ?? "").toLowerCase().includes(value.trim().toLowerCase());
}

function getTenantTooltip(tenant: TenantOption): string {
  const lines = [`编码：${tenant.code}`];
  if (tenant.description) {
    lines.push(`描述：${tenant.description}`);
  }
  return lines.join("\n");
}

watch(tenantKeyword, (keyword) => tenantTreeRef.value?.filter(keyword));

async function handleTenantNodeClick(node: OptionItem): Promise<void> {
  if (node.value == null) return;
  params.tenantId = node.value.toString();
  await handleQuery();
}

const rules: FormRules<AppForm> = {
  tenantId: [{ required: true, message: "所属租户不能为空", trigger: "change" }],
  name: [{ required: true, message: "请输入应用名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入应用编码", trigger: "blur" }],
  status: [{ required: true, message: "请选择应用状态", trigger: "change" }],
};

function resetForm(): void {
  appFormRef.value?.resetFields();
  appFormRef.value?.clearValidate();
  Object.assign(formData, initialFormData);
}

function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

async function openDialog(id?: string): Promise<void> {
  dialogState.visible = true;
  if (id) {
    dialogState.title = "修改应用";
    const data = await AppAPI.getFormData(id);
    Object.assign(formData, data);
  } else {
    dialogState.title = "新增应用";
    formData.tenantId = params.tenantId;
  }
}

async function handleSubmit(): Promise<void> {
  const valid = await appFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  loading.value = true;
  try {
    if (formData.id) {
      await AppAPI.update(formData.id, formData);
      ElMessage.success("修改成功");
    } else {
      await AppAPI.create(formData);
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
    await ElMessageBox.confirm("确认删除选中的应用吗？", "警告", {
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
    await AppAPI.deleteByIds(id);
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

onMounted(async () => {
  const tenants = await TenantManagementAPI.getPage({
    pageNum: 1,
    pageSize: 100,
  });
  tenantOptions.value = tenants.list.map((tenant) => ({
    value: tenant.id,
    label: tenant.name,
    code: tenant.code,
    description: tenant.description,
  }));
  params.tenantId = tenantOptions.value[0]?.value?.toString();
  await fetchData();
});
</script>

<style lang="scss" scoped>
.tenant-card {
  height: 100%;
  background: transparent;
  border: 0;
  border-radius: inherit;
  box-shadow: none;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
  }

  &__search {
    flex-shrink: 0;
  }

  &__body {
    flex: 1 1 auto;
    min-height: 0;
    padding-top: 8px;
    overflow: auto;
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
