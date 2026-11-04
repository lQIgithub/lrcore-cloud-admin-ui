<template>
  <div class="page-container page-container--split">
    <aside class="page-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <div class="page-aside__inner">
        <el-card class="role-scope-card" shadow="never">
          <el-input
            v-model="scopeKeyword"
            class="role-scope-card__search"
            placeholder="搜索应用"
            clearable
            :prefix-icon="Search"
          />
          <div class="role-scope-card__body">
            <el-tree
              ref="scopeTreeRef"
              :data="scopeOptions"
              :props="{ label: 'label', children: 'children' }"
              default-expand-all
              :expand-on-click-node="false"
              :filter-node-method="filterScopeNode"
              highlight-current
              node-key="value"
              @node-click="handleScopeNodeClick"
            >
              <template #default="{ data }">
                <el-tooltip
                  placement="right"
                  :show-after="300"
                  :hide-after="0"
                  :content="getScopeTooltip(data as ScopeOption)"
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
        <el-form ref="queryFormRef" :model="params" :inline="true">
          <el-form-item prop="keywords" label="关键字">
            <el-input
              v-model="params.keywords"
              placeholder="角色名称"
              clearable
              @keyup.enter="handleQuery"
            />
          </el-form-item>

          <el-form-item prop="roleScope" label="角色级别">
            <el-select
              v-model="params.roleScope"
              placeholder="全部级别"
              clearable
              style="width: 160px"
            >
              <el-option
                v-for="item in roleScopeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleQuery">搜索</el-button>
            <el-button @click="handleResetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card ref="tableWrapperRef" class="page-content" shadow="never">
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
            :key="roleTableKey"
            v-loading="loading"
            class="page-table"
            :data="list"
            height="100%"
            highlight-current-row
            border
            :row-class-name="getRoleRowClassName"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" align="center" />
            <el-table-column label="角色名称" prop="name" min-width="100" />
            <el-table-column label="角色编码" prop="code" width="150" />
            <el-table-column align="center" label="角色级别" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.roleScope === ROLE_SCOPE.PLATFORM ? 'success' : 'primary'">
                  {{ getRoleLevelLabel(scope.row.roleScope) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="数据权限" align="center" width="140" prop="dataScopeLabel" />

            <el-table-column label="是否内置" align="center" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.buildIn === 1 ? 'warning' : 'info'">
                  {{ scope.row.buildIn === 1 ? "是" : "否" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" align="center" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.status === CommonStatus.ENABLED" type="success">
                  正常
                </el-tag>
                <el-tag v-else type="info">禁用</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="排序" align="center" width="80" prop="sort" />

            <el-table-column fixed="right" label="操作" width="180" align="center">
              <template #default="scope">
                <div>
                  <el-button
                    v-hasPerm="'sys:role:assign'"
                    type="primary"
                    size="small"
                    link
                    @click="handleAssignPermClick(scope.row)"
                  >
                    分配权限
                  </el-button>
                  <el-button
                    type="primary"
                    size="small"
                    link
                    @click="handleEditClick(scope.row.id)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    link
                    @click="handleDelete(scope.row as RoleItem)"
                  >
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <pagination
          v-if="total > 0"
          v-model:total="total"
          v-model:page="params.pageNum"
          v-model:limit="params.pageSize"
          class="page-pagination"
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
      <el-form ref="roleFormRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="角色级别" prop="roleScope">
          <el-select v-model="formData.roleScope" style="width: 100%">
            <el-option
              v-for="item in roleScopeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="角色名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入角色名称" />
        </el-form-item>

        <el-form-item label="角色编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入角色编码" />
        </el-form-item>

        <el-form-item label="数据权限" prop="dataScope">
          <el-select v-model="formData.dataScope" placeholder="请选择数据权限" style="width: 100%">
            <el-option
              v-for="item in dataScopeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="formData.dataScope === DATA_SCOPE_CUSTOM"
          label="选择部门"
          prop="deptIds"
        >
          <el-tree-select
            v-model="formData.deptIds"
            :data="deptOptions"
            multiple
            :render-after-expand="false"
            check-strictly
            placeholder="请选择部门"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="CommonStatus.ENABLED">正常</el-radio>
            <el-radio :value="CommonStatus.DISABLED">停用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="formData.sort"
            controls-position="right"
            :min="0"
            style="width: 100px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit">确定</el-button>
          <el-button @click="closeDialog">取消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer
      v-model="assignPermDialogVisible"
      :title="'【' + checkedRole.name + '】权限分配'"
      :size="drawerSize"
    >
      <div class="flex-x-between">
        <el-input v-model="permKeywords" clearable class="w-[150px]" placeholder="菜单权限名称">
          <template #prefix>
            <Search />
          </template>
        </el-input>

        <div class="flex-center ml-5">
          <el-button type="primary" size="small" plain @click="togglePermTree">
            <template #icon>
              <Switch />
            </template>
            {{ isExpanded ? "收缩" : "展开" }}
          </el-button>
          <el-checkbox
            v-model="parentChildLinked"
            class="ml-5"
            @change="handleParentChildLinkedChange"
          >
            父子联动
          </el-checkbox>

          <el-tooltip placement="bottom">
            <template #content>
              如果只需勾选菜单权限，不需要勾选子菜单或者按钮权限，请关闭父子联动
            </template>
            <el-icon class="ml-1 color-[--el-color-primary] inline-block cursor-pointer">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </div>

      <el-tree
        ref="permTreeRef"
        node-key="value"
        show-checkbox
        :data="menuPermOptions"
        :filter-node-method="handlePermFilter"
        :default-expand-all="true"
        :check-strictly="!parentChildLinked"
        class="mt-5"
      >
        <template #default="{ data }">
          {{ data.label }}
        </template>
      </el-tree>
      <template #footer>
        <div class="dialog-footer">
          <el-button v-hasPerm="'sys:role:assign'" type="primary" @click="handleAssignPermSubmit">
            确定
          </el-button>
          <el-button @click="assignPermDialogVisible = false">取消</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { useFullscreen } from "@vueuse/core";
import Sortable, { type SortableEvent } from "sortablejs";
import {
  ElMessage,
  ElMessageBox,
  type ElTree,
  type FormInstance,
  type FormRules,
  type TableInstance,
  type TreeInstance,
  type TreeNodeData,
} from "element-plus";
import {
  ArrowLeft,
  ArrowRight,
  FullScreen,
  Refresh,
  Search,
  Switch,
  QuestionFilled,
} from "@element-plus/icons-vue";

import RoleAPI from "@/api/system/role";
import AppAPI from "@/api/system/app";
import type { RoleForm, RoleItem, RoleQueryParams } from "@/api/system/role";
import { ROLE_SCOPE } from "@/api/system/role/constants";
import MenuAPI from "@/api/system/menu";
import DeptAPI from "@/api/system/dept";
import type { OptionItem } from "@/api/common";
import { useAppStore } from "@/stores";
import { usePageTable, useTableSelection } from "@/composables";
import { CommonStatus, DeviceEnum } from "@/enums";

defineOptions({
  name: "Role",
  inheritAttrs: false,
});

const appStore = useAppStore();

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const queryFormRef = ref<FormInstance>();
const dataTableRef = ref<TableInstance>();
const roleFormRef = ref<FormInstance>();
const permTreeRef = ref<TreeInstance>();
let roleTableSortable: Sortable | null = null;
const roleTableKey = ref(0);

type ScopeOption = OptionItem & {
  code: string;
  description?: string;
};

const scopeOptions = ref<ScopeOption[]>([]);
const scopeTreeRef = ref<InstanceType<typeof ElTree>>();
const scopeKeyword = ref("");
const sidebarCollapsed = ref(false);
const selectedAppId = ref<string>();

const roleScopeOptions = [
  { label: "平台级", value: ROLE_SCOPE.PLATFORM },
  { label: "应用级", value: ROLE_SCOPE.APP },
];

// 自定义数据权限取值
const DATA_SCOPE_CUSTOM = 5;

const dataScopeOptions = [
  { label: "全部数据", value: 1 },
  { label: "部门及子部门数据", value: 2 },
  { label: "本部门数据", value: 3 },
  { label: "本人数据", value: 4 },
  { label: "自定义部门数据", value: DATA_SCOPE_CUSTOM },
];

/** 分页表格数据管理 */
const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  RoleItem,
  RoleQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    appId: selectedAppId.value,
    keywords: "",
  },
  request: RoleAPI.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const { selectedIds, hasSelection, handleSelectionChange } =
  useTableSelection<RoleItem>(dataTableRef);

const dialogState = reactive({
  title: "",
  visible: false,
});

const initialFormData: RoleForm = {
  roleScope: ROLE_SCOPE.APP,
  dataScope: 1,
  sort: 1,
  status: CommonStatus.ENABLED,
};

const formData = reactive<RoleForm>({ ...initialFormData });

const rules: FormRules<RoleForm> = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  dataScope: [{ required: true, message: "请选择数据权限", trigger: "blur" }],
  deptIds: [{ required: true, message: "请选择部门", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "blur" }],
};

// 部门下拉选项（懒加载，新增/编辑时才请求）
const deptOptions = ref<OptionItem[]>([]);

function filterScopeNode(value: string, data: { label?: string }): boolean {
  return (data.label ?? "").toLowerCase().includes(value.trim().toLowerCase());
}

function getScopeTooltip(scope: ScopeOption): string {
  const lines = [`编码：${scope.code}`];
  if (scope.description) {
    lines.push(`描述：${scope.description}`);
  }
  return lines.join("\n");
}

function getRoleLevelLabel(roleScope?: string): string {
  return roleScope === ROLE_SCOPE.PLATFORM ? "平台级" : "应用级";
}

watch(scopeKeyword, (keyword) => scopeTreeRef.value?.filter(keyword));

async function handleScopeNodeClick(node: ScopeOption): Promise<void> {
  if (node.value == null) return;

  selectedAppId.value = node.value.toString();
  params.appId = selectedAppId.value;
  await handleQuery();
}

async function loadScopeOptions(): Promise<void> {
  const apps = await AppAPI.getPage({
    pageNum: 1,
    pageSize: 1000,
    status: CommonStatus.ENABLED,
  });

  scopeOptions.value = (apps.list ?? []).map((app) => ({
    value: app.id,
    label: app.name,
    code: app.code,
    description: app.description,
  }));
  if (!selectedAppId.value) {
    selectedAppId.value = apps.list?.[0]?.id?.toString();
    params.appId = selectedAppId.value;
  }
  nextTick(() => scopeTreeRef.value?.setCurrentKey(selectedAppId.value));
}

interface CheckedRole {
  id?: string;
  name?: string;
}
const checkedRole = ref<CheckedRole>({});
const assignPermDialogVisible = ref(false);
const menuPermOptions = ref<OptionItem[]>([]);
const permKeywords = ref("");
const isExpanded = ref(true);
const parentChildLinked = ref(true);

const drawerSize = computed(() => (appStore.device === DeviceEnum.DESKTOP ? "600px" : "90%"));

interface ToggleableTreeNode {
  expand: () => void;
  collapse: () => void;
}

/**
 * 打开角色表单弹窗
 */
function openDialog(): void {
  dialogState.visible = true;
}

/**
 * 关闭角色表单弹窗
 *
 * 同步清理表单数据和校验状态
 */
function closeDialog(): void {
  dialogState.visible = false;
  resetForm();
}

/**
 * 重置角色表单
 */
function resetForm(): void {
  roleFormRef.value?.resetFields();
  roleFormRef.value?.clearValidate();
  Object.keys(formData).forEach((key) => {
    delete (formData as Record<string, unknown>)[key];
  });
  Object.assign(formData, initialFormData);
}

/**
 * 打开新增角色弹窗
 *
 * 部门下拉首次打开时请求，之后复用缓存
 */

/**
 * 打开新增角色弹窗
 *
 * 部门下拉首次打开时请求，之后复用缓存
 */
async function handleCreateClick(): Promise<void> {
  dialogState.title = "新增角色";
  formData.roleScope = ROLE_SCOPE.APP;
  formData.appId = selectedAppId.value;
  if (deptOptions.value.length === 0) {
    deptOptions.value = await DeptAPI.getOptions();
  }
  openDialog();
}

/**
 * 打开编辑角色弹窗
 *
 * @param roleId 角色 ID
 */
async function handleEditClick(roleId: string): Promise<void> {
  dialogState.title = "修改角色";
  if (deptOptions.value.length === 0) {
    deptOptions.value = await DeptAPI.getOptions();
  }
  const data = await RoleAPI.getFormData(roleId);
  Object.assign(formData, data);
  openDialog();
}

/**
 * 校验并提交角色表单
 *
 * 非自定义数据权限时丢弃部门 ID
 */
async function handleSubmit(): Promise<void> {
  const valid = await roleFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  const submitData: RoleForm = { ...formData };
  if (submitData.dataScope !== DATA_SCOPE_CUSTOM) {
    submitData.deptIds = undefined;
  }

  loading.value = true;
  try {
    const roleId = formData.id;
    if (roleId) {
      await RoleAPI.update(roleId, submitData);
      ElMessage.success("修改成功");
    } else {
      await RoleAPI.create(submitData);
      ElMessage.success("新增成功");
    }
    closeDialog();
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

/**
 * 删除单个或批量角色
 *
 * @param roleId 指定时删除单个角色；不指定时删除表格勾选项
 */
async function handleDelete(row?: RoleItem): Promise<void> {
  const roleIds = row?.id ?? selectedIds.value.join(",");
  if (!roleIds) {
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

  if (row?.buildIn === 1) {
    ElMessage.warning("系统内置数据不允许操作");
    return;
  }

  loading.value = true;
  try {
    await RoleAPI.deleteByIds(roleIds);
    ElMessage.success("删除成功");
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

/**
 * 批量删除当前勾选角色
 */
function handleBatchDelete(): void {
  handleDelete();
}

/**
 * 打开权限分配抽屉并回显已分配菜单
 *
 * @param row 当前角色行
 */
async function handleAssignPermClick(row: RoleItem): Promise<void> {
  const roleId = row.id;
  if (!roleId) return;

  assignPermDialogVisible.value = true;
  checkedRole.value = {
    id: roleId,
    name: row.name,
  };

  loading.value = true;
  try {
    const [menuOptions, checkedMenuIds] = await Promise.all([
      MenuAPI.getOptions(),
      RoleAPI.getRoleMenuIds(roleId),
    ]);

    menuPermOptions.value = menuOptions;
    await nextTick();

    checkedMenuIds.forEach((menuId) => {
      permTreeRef.value?.setChecked(menuId, true, false);
    });
  } finally {
    loading.value = false;
  }
}

/**
 * 提交当前角色的菜单权限配置
 */
async function handleAssignPermSubmit(): Promise<void> {
  const roleId = checkedRole.value.id;
  if (!roleId) return;

  const checkedMenuIds = (permTreeRef.value?.getCheckedNodes(false, true) ?? [])
    .map((node: TreeNodeData) => Number(node.value))
    .filter((value: number) => !Number.isNaN(value));

  loading.value = true;
  try {
    await RoleAPI.updateRoleMenus(roleId, checkedMenuIds);
    ElMessage.success("分配权限成功");
    assignPermDialogVisible.value = false;
    handleResetQuery();
  } finally {
    loading.value = false;
  }
}

/**
 * 展开或收起权限树全部节点
 */
function togglePermTree(): void {
  isExpanded.value = !isExpanded.value;
  if (!permTreeRef.value) return;

  Object.values(permTreeRef.value.store.nodesMap).forEach((node) => {
    const treeNode = node as ToggleableTreeNode;
    if (isExpanded.value) {
      treeNode.expand();
    } else {
      treeNode.collapse();
    }
  });
}

/**
 * 过滤权限树节点
 *
 * @param value 输入的关键字
 * @param data 当前节点数据
 */
function handlePermFilter(value: string, data: TreeNodeData): boolean {
  if (!value) return true;
  return String(data.label ?? "").includes(value);
}

/**
 * 同步父子联动开关值
 */
function handleParentChildLinkedChange(value: string | number | boolean): void {
  parentChildLinked.value = Boolean(value);
}

watch(permKeywords, (value) => {
  permTreeRef.value?.filter(value);
});

onMounted(async () => {
  await loadScopeOptions();
  handleQuery();
  initRoleRowDrag();
});

onBeforeUnmount(() => {
  roleTableSortable?.destroy();
});

function getRoleRowClassName({ row }: { row: RoleItem }): string {
  return `role-row-${row.id}`;
}

function initRoleRowDrag(): void {
  const tableElement = dataTableRef.value?.$el as HTMLElement | undefined;
  const tbody = tableElement?.querySelector<HTMLElement>(".el-table__body tbody");
  if (!tbody) return;

  roleTableSortable?.destroy();
  roleTableSortable = Sortable.create(tbody, {
    animation: 160,
    draggable: ".el-table__row",
    onEnd: handleRoleRowDrop,
  });
}

async function handleRoleRowDrop(event: SortableEvent): Promise<void> {
  const oldIndex = event.oldIndex;
  const newIndex = event.newIndex;
  if (oldIndex === undefined || newIndex === undefined) return;
  if (oldIndex === newIndex || oldIndex >= list.value.length || newIndex >= list.value.length)
    return;

  const reorderedList = [...list.value];
  const [draggedItem] = reorderedList.splice(oldIndex, 1);
  reorderedList.splice(newIndex, 0, draggedItem);
  list.value = reorderedList;

  const sortBase = (params.pageNum - 1) * params.pageSize;
  const sortItems = reorderedList
    .filter((item): item is RoleItem & { id: string } => Boolean(item.id))
    .map((item, index) => ({
      id: item.id,
      sort: sortBase + index + 1,
    }));

  try {
    await RoleAPI.updateSort(sortItems);
    await refreshRoleTable();
    ElMessage.success("排序已保存");
  } catch {
    await refreshRoleTable();
  }
}

async function refreshRoleTable(): Promise<void> {
  roleTableKey.value++;
  await fetchData();
  await nextTick();
  initRoleRowDrag();
}
</script>

<style scoped>
.role-scope-card {
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

.el-table .el-table__row {
  cursor: grab;
}

.el-table .el-table__row:active {
  cursor: grabbing;
}
</style>
