<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <el-form ref="queryFormRef" :model="params" :inline="true" label-suffix=":">
        <el-form-item label="关键字" prop="keywords">
          <el-input
            v-model="params.keywords"
            placeholder="请输入企业名称\编码\简称"
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

    <el-card ref="tableWrapperRef" class="page-content" shadow="never">
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button type="primary" @click="openDialog()">新增</el-button>
          <el-button type="danger" :disabled="!hasSelection" @click="handleBatchDelete()">
            删除
          </el-button>
        </div>
        <div class="page-toolbar__right">
          <el-tooltip content="刷新" placement="top">
            <el-button class="page-icon-btn" @click="fetchData">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="全屏" placement="top">
            <el-button class="page-icon-btn" @click="toggleFullscreen">
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="page-table-wrapper">
        <el-table
          ref="dataTableRef"
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
          <el-table-column label="企业名称" prop="name" min-width="180" />
          <el-table-column label="企业简称" prop="abbreviation" min-width="120" />
          <el-table-column label="企业编码" prop="code" min-width="120" />
          <el-table-column label="上级企业" prop="parentName" min-width="140" />
          <el-table-column label="联系电话" prop="phone" min-width="130" />
          <el-table-column label="联系地址" prop="address" min-width="180" show-overflow-tooltip />
          <el-table-column align="center" label="状态" width="90">
            <template #default="scope">
              <el-tag :type="scope.row.status === CommonStatus.ENABLED ? 'success' : 'info'">
                {{ scope.row.status === CommonStatus.ENABLED ? "启用" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="160">
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
      append-to-body
      :size="drawerSize"
      @close="closeDialog"
    >
      <el-form ref="enterpriseFormRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="企业名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入企业名称" :maxlength="100" />
        </el-form-item>

        <el-form-item label="企业简称" prop="abbreviation">
          <el-input v-model="formData.abbreviation" placeholder="请输入企业简称" :maxlength="50" />
        </el-form-item>

        <el-form-item label="企业编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入企业编码" :maxlength="50" />
        </el-form-item>

        <el-form-item label="上级企业" prop="parentId">
          <el-select v-model="formData.parentId" placeholder="请选择上级企业" clearable>
            <el-option label="顶级企业" :value="0" />
            <el-option
              v-for="item in parentOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              :disabled="item.value === formData.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入联系电话" :maxlength="20" />
        </el-form-item>

        <el-form-item label="联系地址" prop="address">
          <el-input v-model="formData.address" placeholder="请输入联系地址" :maxlength="255" />
        </el-form-item>

        <el-form-item label="企业描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            :maxlength="500"
            show-word-limit
            placeholder="请输入企业描述"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CommonStatus.ENABLED">启用</el-radio>
            <el-radio :value="CommonStatus.DISABLED">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit">确定</el-button>
          <el-button @click="closeDialog">取消</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { useFullscreen } from "@vueuse/core";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { FullScreen, Refresh } from "@element-plus/icons-vue";

import EnterpriseAPI from "@/api/system/enterprise";
import type {
  EnterpriseForm,
  EnterpriseItem,
  EnterpriseQueryParams,
} from "@/api/system/enterprise";
import type { OptionItem } from "@/api/common";
import { usePageTable, useTableSelection } from "@/composables";
import { useAppStore } from "@/stores";
import { CommonStatus, DeviceEnum } from "@/enums";

defineOptions({
  name: "Enterprise",
  inheritAttrs: false,
});

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const appStore = useAppStore();
const drawerSize = computed(() => (appStore.device === DeviceEnum.DESKTOP ? "620px" : "90%"));

const queryFormRef = ref<FormInstance>();
const enterpriseFormRef = ref<FormInstance>();

const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  EnterpriseItem,
  EnterpriseQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    keywords: "",
  },
  request: EnterpriseAPI.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<EnterpriseItem>();

const dialogState = reactive({
  title: "",
  visible: false,
});

const initialFormData: EnterpriseForm = {
  name: "",
  abbreviation: "",
  code: "",
  parentId: 0,
  description: "",
  phone: "",
  address: "",
  status: CommonStatus.ENABLED,
};

const formData = reactive<EnterpriseForm>({ ...initialFormData });

const parentOptions = ref<OptionItem[]>([]);

const rules: FormRules<EnterpriseForm> = {
  name: [{ required: true, message: "请输入企业名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入企业编码", trigger: "blur" }],
  status: [{ required: true, message: "请选择企业状态", trigger: "change" }],
};

async function loadParentOptions(): Promise<void> {
  parentOptions.value = await EnterpriseAPI.getOptions();
}

async function openDialog(id?: string): Promise<void> {
  dialogState.visible = true;
  loadParentOptions();
  if (id) {
    dialogState.title = "修改企业";
    const data = await EnterpriseAPI.getFormData(id);
    Object.assign(formData, data);
  } else {
    dialogState.title = "新增企业";
  }
}

function resetForm(): void {
  enterpriseFormRef.value?.resetFields();
  enterpriseFormRef.value?.clearValidate();
  Object.keys(formData).forEach((key) => {
    delete (formData as Record<string, unknown>)[key];
  });
  Object.assign(formData, initialFormData);
}

function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

async function handleSubmit(): Promise<void> {
  const valid = await enterpriseFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  loading.value = true;
  try {
    const id = formData.id;
    if (id) {
      await EnterpriseAPI.update(id, formData);
      ElMessage.success("修改成功");
    } else {
      await EnterpriseAPI.create(formData);
      ElMessage.success("新增成功");
    }
    closeDialog();
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!id) {
    ElMessage.warning("请勾选删除项");
    return;
  }

  try {
    await ElMessageBox.confirm("确认删除已选中的企业吗？", "警告", {
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
    await EnterpriseAPI.deleteByIds(id);
    ElMessage.success("删除成功");
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

function handleBatchDelete(): void {
  const ids = selectedIds.value.join(",");
  if (ids) {
    handleDelete(ids);
  }
}

onMounted(() => {
  handleQuery();
});
</script>
