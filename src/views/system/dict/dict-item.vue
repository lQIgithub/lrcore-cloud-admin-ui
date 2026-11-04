<template>
  <div class="page-container page-container--split">
    <aside class="page-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <div class="page-aside__inner">
        <el-card class="dict-card" shadow="never">
          <el-input
            v-model="dictKeyword"
            class="dict-card__search"
            placeholder="搜索字典"
            clearable
            :prefix-icon="Search"
          />
          <div class="dict-card__body">
            <el-tree
              ref="dictTreeRef"
              :data="dictOptions"
              :props="{ label: 'label', children: 'children' }"
              default-expand-all
              :expand-on-click-node="false"
              :filter-node-method="filterDictNode"
              highlight-current
              node-key="value"
              @node-click="handleDictNodeClick"
            >
              <template #default="{ data }">
                <el-tooltip
                  placement="right"
                  :show-after="300"
                  :hide-after="0"
                  :content="getDictTooltip(data as DictOption)"
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
      <el-card ref="tableWrapperRef" class="page-search" shadow="never">
        <el-form ref="queryFormRef" :model="params" :inline="true">
          <el-form-item label="关键字" prop="keywords">
            <el-input
              v-model="params.keywords"
              placeholder="字典标签/字典值"
              clearable
              @keyup.enter="handleQuery"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleQuery">搜索</el-button>
            <el-button @click="handleResetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="page-content" shadow="never">
        <div class="page-toolbar">
          <div class="page-toolbar__left">
            <el-button type="primary" @click="handleCreateClick()">新增</el-button>
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
            :key="dictItemTableKey"
            v-loading="loading"
            highlight-current-row
            :data="list"
            :row-class-name="getRowClassName"
            class="page-table"
            border
            height="100%"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" align="center" />
            <el-table-column label="字典项标签" prop="label" />
            <el-table-column label="字典项值" prop="value" />
            <el-table-column label="排序" prop="sort" />
            <el-table-column label="状态">
              <template #default="scope">
                <el-tag :type="scope.row.status === CommonStatus.ENABLED ? 'success' : 'info'">
                  {{ scope.row.status === CommonStatus.ENABLED ? "启用" : "禁用" }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column fixed="right" label="操作" align="center" width="220">
              <template #default="scope">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click.stop="handleEditClick(scope.row as DictItem)"
                >
                  编辑
                </el-button>
                <el-button type="danger" link size="small" @click.stop="handleDelete(scope.row.id)">
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

    <el-dialog
      v-model="dialogState.visible"
      :title="dialogState.title"
      width="600px"
      @close="closeDialog"
    >
      <el-form ref="dictItemFormRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="字典项标签" prop="label">
          <el-input v-model="formData.label" placeholder="请输入字典标签" />
        </el-form-item>
        <el-form-item label="字典项值" prop="value">
          <el-input v-model="formData.value" placeholder="请输入字典值" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CommonStatus.ENABLED">启用</el-radio>
            <el-radio :value="CommonStatus.DISABLED">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" controls-position="right" />
        </el-form-item>
        <el-form-item>
          <template #label>
            <div class="flex-y-center">
              标签类型
              <el-tooltip>
                <template #content>回显样式，为空时则显示 '文本'</template>
                <el-icon class="ml-1 cursor-pointer">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
          <el-select
            v-model="formData.tagType"
            placeholder="请选择标签类型"
            clearable
            @clear="formData.tagType = ''"
          >
            <template #label="{ value }">
              <el-tag v-if="value" :type="value">
                {{ formData.label ? formData.label : "字典标签" }}
              </el-tag>
            </template>
            <el-option v-for="type in tagTypeOptions" :key="type" :label="type" :value="type">
              <div flex-y-center gap-10px>
                <el-tag :type="type as any">{{ formData.label ?? "字典标签" }}</el-tag>
                <span>{{ type }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit">确 定</el-button>
          <el-button @click="closeDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>
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
  type ElTree,
} from "element-plus";
import {
  ArrowLeft,
  ArrowRight,
  FullScreen,
  QuestionFilled,
  Refresh,
  Search,
} from "@element-plus/icons-vue";

import DictAPI from "@/api/system/dict";
import type { OptionItem } from "@/api/common";
import type { DictItem, DictItemForm, DictItemQueryParams } from "@/api/system/dict";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus } from "@/enums";

defineOptions({
  name: "DictItem",
  inheritAttrs: false,
});

const route = useRoute();
const router = useRouter();

// 当前字典编码，由路由 query 传入。
const routeDictCode = computed(() => String(route.query.dictCode ?? "").trim());
const dictCode = ref(routeDictCode.value);

type DictOption = OptionItem & {
  code: string;
};

const dictOptions = ref<DictOption[]>([]);
const dictTreeRef = ref<InstanceType<typeof ElTree>>();
const dictKeyword = ref("");
const sidebarCollapsed = ref(false);

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const dataTableRef = ref<TableInstance>();
const queryFormRef = ref<FormInstance>();
const dictItemFormRef = ref<FormInstance>();
let dictItemTableSortable: Sortable | null = null;
const dictItemTableKey = ref(0);

// 标签类型可选项。
const tagTypeOptions: NonNullable<DictItemForm["tagType"]>[] = [
  "primary",
  "success",
  "info",
  "warning",
  "danger",
];

/** 分页表格数据管理 */
const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  DictItem,
  DictItemQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    dictCode: dictCode.value,
    keywords: "",
  },
  request: (query) =>
    dictCode.value
      ? DictAPI.getDictItemPage(dictCode.value, query)
      : Promise.resolve({ list: [], total: 0 }),
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } =
  useTableSelection<DictItem>(dataTableRef);

const dialogState = reactive({
  title: "",
  visible: false,
});

const initialFormData: DictItemForm = {
  dictCode: dictCode.value,
  sort: 1,
  status: CommonStatus.ENABLED,
  tagType: "",
};

const formData = reactive<DictItemForm>({ ...initialFormData });

watch(routeDictCode, (value) => {
  if (!value || value === dictCode.value) return;
  dictCode.value = value;
  params.dictCode = value;
  formData.dictCode = value;
  handleQuery();
  nextTick(() => dictTreeRef.value?.setCurrentKey(value));
});

function filterDictNode(value: string, data: { label?: string }): boolean {
  return (data.label ?? "").toLowerCase().includes(value.trim().toLowerCase());
}

function getDictTooltip(dict: DictOption): string {
  return `编码：${dict.code}`;
}

watch(dictKeyword, (keyword) => dictTreeRef.value?.filter(keyword));

async function handleDictNodeClick(node: DictOption): Promise<void> {
  if (node.value == null || node.value === dictCode.value) return;
  await router.replace({
    query: {
      ...route.query,
      dictCode: node.value.toString(),
    },
  });
}

async function loadDictOptions(): Promise<void> {
  const page = await DictAPI.getPage({ pageNum: 1, pageSize: 1000 });
  dictOptions.value = (page.list ?? []).map((item) => ({
    value: item.dictCode,
    label: item.name,
    code: item.dictCode,
  }));
  nextTick(() => dictTreeRef.value?.setCurrentKey(dictCode.value));
}

async function ensureDictCode(): Promise<void> {
  if (routeDictCode.value) return;
  const page = await DictAPI.getPage({ pageNum: 1, pageSize: 1 });
  const first = page.list?.[0];
  if (!first) return;
  await router.replace({
    query: {
      ...route.query,
      dictCode: first.dictCode,
      title: `【${first.name}】字典数据`,
    },
  });
}

const rules: FormRules<DictItemForm> = {
  value: [{ required: true, message: "请输入字典值", trigger: "blur" }],
  label: [{ required: true, message: "请输入字典标签", trigger: "blur" }],
};

/**
 * 重置表单数据和验证状态
 */
function resetForm(): void {
  dictItemFormRef.value?.resetFields();
  dictItemFormRef.value?.clearValidate();
  Object.keys(formData).forEach((key) => {
    delete (formData as Record<string, unknown>)[key];
  });
  Object.assign(formData, initialFormData);
}

/**
 * 打开表单弹窗。
 */
function openDialog(): void {
  dialogState.visible = true;
}

/**
 * 关闭表单弹窗并清理临时状态
 */
function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

/**
 * 打开新增字典项弹窗
 */
function handleCreateClick(): void {
  dialogState.title = "新增字典项";
  openDialog();
}

/**
 * 打开编辑字典项弹窗并回填数据
 *
 * @param row 当前字典项行
 */
async function handleEditClick(row: DictItem): Promise<void> {
  if (!row.id) return;
  dialogState.title = "编辑字典值";
  const data = await DictAPI.getDictItemFormData(dictCode.value, row.id);
  Object.assign(formData, data);
  openDialog();
}

/**
 * 校验并提交字典项表单。
 */
async function handleSubmit(): Promise<void> {
  const valid = await dictItemFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  formData.dictCode = dictCode.value;
  const id = formData.id;

  loading.value = true;
  try {
    if (id) {
      await DictAPI.updateDictItem(dictCode.value, id, formData);
      ElMessage.success("修改成功");
    } else {
      await DictAPI.createDictItem(dictCode.value, formData);
      ElMessage.success("新增成功");
    }
    closeDialog();
    handleQuery();
  } finally {
    loading.value = false;
  }
}

/**
 * 删除单个或批量字典项。
 *
 * @param id 指定时删除单个字典项；不指定时删除表格勾选项
 */
async function handleDelete(id?: string): Promise<void> {
  const itemIds = id ?? selectedIds.value.join(",");
  if (!itemIds) {
    ElMessage.warning("请勾选删除项");
    return;
  }

  try {
    await ElMessageBox.confirm("确认删除已选中的数据项?", "警告", {
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
    await DictAPI.deleteDictItems(dictCode.value, itemIds);
    ElMessage.success("删除成功");
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

/**
 * 批量删除当前勾选字典项
 */
function handleBatchDelete(): void {
  handleDelete();
}

onMounted(() => {
  ensureDictCode();
  loadDictOptions();
  handleQuery();
  initDictItemRowDrag();
});

onBeforeUnmount(() => {
  dictItemTableSortable?.destroy();
});

function getRowClassName({ row }: { row: DictItem }): string {
  return `dict-item-row-${row.id}`;
}

function initDictItemRowDrag(): void {
  const tableElement = dataTableRef.value?.$el as HTMLElement | undefined;
  const tbody = tableElement?.querySelector<HTMLElement>(".el-table__body tbody");
  if (!tbody) return;

  dictItemTableSortable?.destroy();
  dictItemTableSortable = Sortable.create(tbody, {
    animation: 160,
    draggable: ".el-table__row",
    onEnd: handleDictItemRowDrop,
  });
}

async function handleDictItemRowDrop(event: SortableEvent): Promise<void> {
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
    .filter((item): item is DictItem & { id: string } => Boolean(item.id))
    .map((item, index) => ({
      id: item.id,
      sort: sortBase + index + 1,
    }));

  try {
    await DictAPI.updateDictItemSort(dictCode.value, sortItems);
    await refreshDictItemTable();
    ElMessage.success("排序已保存");
  } catch {
    await refreshDictItemTable();
  }
}

async function refreshDictItemTable(): Promise<void> {
  dictItemTableKey.value++;
  await fetchData();
  await nextTick();
  initDictItemRowDrag();
}
</script>

<style lang="scss" scoped>
.dict-card {
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

<style scoped>
.el-table .el-table__row {
  cursor: grab;
}

.el-table .el-table__row:active {
  cursor: grabbing;
}
</style>
