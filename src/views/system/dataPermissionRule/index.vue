<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <el-form ref="queryFormRef" :model="params" :inline="true" label-suffix=":">
        <el-form-item label="规则名称" prop="keywords">
          <el-input
            v-model="params.keywords"
            placeholder="名称 / 编码"
            clearable
            @keyup.enter="handleQuery()"
          />
        </el-form-item>

        <el-form-item label="规则类型" prop="ruleTypeEnum">
          <el-select
            v-model="params.ruleTypeEnum"
            clearable
            placeholder="全部"
            style="width: 140px"
          >
            <el-option
              v-for="item in RULE_TYPE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="数据范围" prop="dataScopeEnum">
          <el-select
            v-model="params.dataScopeEnum"
            clearable
            placeholder="全部"
            style="width: 150px"
          >
            <el-option
              v-for="item in SCOPE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="isEnabled">
          <el-select v-model="params.isEnabled" clearable placeholder="全部" style="width: 100px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
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
          <el-button
            v-hasPerm="'perm:system:data-permission-rule:add'"
            type="primary"
            @click="openDialog()"
          >
            新增规则
          </el-button>
          <el-button
            v-hasPerm="'perm:system:data-permission-rule:remove'"
            type="danger"
            :disabled="!hasSelection"
            @click="handleDelete()"
          >
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
          <el-table-column label="规则名称" prop="ruleName" min-width="240">
            <template #default="scope">
              <span>{{ scope.row.ruleName }}</span>
              <el-tag v-if="scope.row.buildIn === 1" type="warning" size="small" class="ml-2">
                内置
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="规则编码" prop="ruleCode" min-width="150" />
          <el-table-column align="center" label="规则类型" width="100">
            <template #default="scope">
              <el-tag :type="ruleTypeTag(scope.row.ruleTypeEnum)">
                {{ ruleTypeLabel(scope.row.ruleTypeEnum) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column align="center" label="数据范围" width="150">
            <template #default="scope">
              <el-tag v-if="scope.row.dataScopeEnum" type="info">
                {{ scopeLabel(scope.row.dataScopeEnum) }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="目标表" width="150">
            <template #default="scope">
              <span>{{ scope.row.targetTable || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="过滤字段" width="130">
            <template #default="scope">
              <span>{{ scope.row.permissionColumn || scope.row.targetField || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="操作符" width="90">
            <template #default="scope">
              <span>{{ operatorSymbol(scope.row.permOperatorEnum) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="权限值"
            prop="permissionValue"
            min-width="150"
            show-overflow-tooltip
          >
            <template #default="scope">
              <span>{{ scope.row.permissionValue || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="适用角色" width="130" show-overflow-tooltip>
            <template #default="scope">
              <span>{{ roleCodesLabel(scope.row.filterCondition) }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="优先级" prop="priority" width="80" />
          <el-table-column align="center" label="默认" width="70">
            <template #default="scope">
              <el-tag v-if="scope.row.isDefault === 1" type="success">是</el-tag>
              <span v-else>否</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="状态" width="80">
            <template #default="scope">
              <el-tag v-if="scope.row.isEnabled === 1" type="success">启用</el-tag>
              <el-tag v-else type="danger">禁用</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="createTime" width="170" />
          <el-table-column align="center" fixed="right" label="操作" width="130">
            <template #default="scope">
              <el-button
                v-hasPerm="'perm:system:data-permission-rule:edit'"
                type="primary"
                size="small"
                link
                @click="openDialog(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                v-hasPerm="'perm:system:data-permission-rule:remove'"
                type="danger"
                size="small"
                link
                :disabled="scope.row.buildIn === 1"
                @click="handleDelete(scope.row.id)"
              >
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

    <el-dialog
      v-model="dialogState.visible"
      :show-close="false"
      :fullscreen="dialogState.fullscreen"
      top="6vh"
      width="70%"
      @close="closeDialog"
    >
      <template #header>
        <div class="flex-x-between">
          <span>{{ dialogState.title }}</span>
          <div class="dialog-toolbar">
            <el-button circle @click="toggleDialogFullscreen">
              <template #icon>
                <FullScreen v-if="!dialogState.fullscreen" />
                <CopyDocument v-else />
              </template>
            </el-button>
            <el-button circle @click="closeDialog">
              <template #icon>
                <Close />
              </template>
            </el-button>
          </div>
        </div>
      </template>

      <el-form ref="ruleFormRef" :model="formData" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规则名称" prop="ruleName">
              <el-input
                v-model="formData.ruleName"
                placeholder="规则名称"
                clearable
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规则编码" prop="ruleCode">
              <el-input
                v-model="formData.ruleCode"
                placeholder="规则编码，如 dept_manager_scope"
                clearable
                maxlength="64"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规则类型" prop="ruleTypeEnum">
              <el-select
                v-model="formData.ruleTypeEnum"
                placeholder="请选择规则类型"
                style="width: 100%"
              >
                <el-option
                  v-for="item in RULE_TYPE_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              v-if="formData.ruleTypeEnum === 'DATA_SCOPE'"
              label="数据范围"
              prop="dataScopeEnum"
            >
              <el-select
                v-model="formData.dataScopeEnum"
                placeholder="请选择数据范围"
                style="width: 100%"
              >
                <el-option
                  v-for="item in SCOPE_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item v-else label="数据范围">
              <span class="form-tip">仅"数据范围"类型需要</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-alert
          v-if="formData.ruleTypeEnum === 'COLUMN' || formData.ruleTypeEnum === 'CUSTOM_SQL'"
          class="mb-4"
          type="warning"
          :closable="false"
          title="字段级 / 自定义SQL 规则当前运行时暂不生效（后端未实现对应执行器），保存后仅作为配置预留。"
        />

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="目标表" prop="targetTable">
              <el-select
                v-model="formData.targetTable"
                :loading="tablesLoading"
                filterable
                clearable
                placeholder="请选择目标表（留空 = 适用所有表）"
                style="width: 100%"
              >
                <el-option v-for="t in tableOptions" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              v-if="formData.ruleTypeEnum === 'ROW'"
              label="目标字段"
              prop="targetField"
            >
              <el-select
                v-model="formData.targetField"
                :loading="columnsLoading"
                filterable
                clearable
                :disabled="!formData.targetTable"
                :placeholder="formData.targetTable ? '请选择字段' : '请先选择目标表'"
                style="width: 100%"
              >
                <el-option v-for="c in columnOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item v-else label="权限字段" prop="permissionColumn">
              <el-select
                v-model="formData.permissionColumn"
                :loading="columnsLoading"
                filterable
                clearable
                :disabled="!formData.targetTable"
                :placeholder="formData.targetTable ? '请选择字段' : '请先选择目标表'"
                style="width: 100%"
              >
                <el-option v-for="c in columnOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row v-if="formData.ruleTypeEnum === 'ROW'" :gutter="16">
          <el-col :span="12">
            <el-form-item label="操作符" prop="permOperatorEnum">
              <el-select
                v-model="formData.permOperatorEnum"
                placeholder="请选择操作符"
                style="width: 100%"
              >
                <el-option
                  v-for="item in OPERATOR_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="权限值" prop="permissionValue">
              <el-input
                v-model="formData.permissionValue"
                :placeholder="permissionValuePlaceholder"
                clearable
                maxlength="500"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="适用角色" prop="roleCodes">
          <el-input
            v-model="formData.roleCodes"
            placeholder="角色编码，多个用英文逗号分隔；留空 = 对所有角色生效"
            clearable
          />
        </el-form-item>
        <el-form-item label="过滤条件JSON">
          <el-input
            :model-value="filterConditionPreview"
            readonly
            placeholder='{"role_codes":["manager"]}'
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-input-number
                v-model="formData.priority"
                :min="0"
                :max="9999"
                :step="10"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用ID" prop="appId">
              <el-select
                v-model="formData.appId"
                :loading="appsLoading"
                filterable
                clearable
                placeholder="请选择应用（留空 = 全局应用）"
                style="width: 100%"
              >
                <el-option
                  v-for="app in appOptions"
                  :key="app.id"
                  :label="app.code ? `${app.name}（${app.code}）` : app.name"
                  :value="app.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="默认规则" prop="isDefault">
              <el-switch
                v-model="formData.isDefault"
                :active-value="1"
                :inactive-value="0"
                active-text="是"
                inactive-text="否"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用状态" prop="isEnabled">
              <el-switch
                v-model="formData.isEnabled"
                :active-value="1"
                :inactive-value="0"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="备注"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" @click="handleSubmit()">确定</el-button>
          <el-button @click="closeDialog()">取消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Close, CopyDocument, FullScreen, Refresh } from "@element-plus/icons-vue";

import DataPermissionRuleAPI, {
  buildFilterCondition,
  parseRoleCodes,
} from "@/api/system/dataPermissionRule";
import type {
  DataPermissionOperator,
  DataPermissionRuleForm,
  DataPermissionRuleItem,
  DataPermissionRuleQueryParams,
  DataPermissionScope,
  DataPermissionRuleType,
} from "@/api/system/dataPermissionRule";
import { usePageTable, useTableSelection } from "@/composables";

defineOptions({
  name: "DataPermissionRule",
  inheritAttrs: false,
});

const tableWrapperRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen } = useFullscreen(tableWrapperRef);

const queryFormRef = ref<FormInstance>();
const ruleFormRef = ref<FormInstance>();

/** 规则类型选项（值为后端枚举名） */
const RULE_TYPE_OPTIONS: { value: DataPermissionRuleType; label: string }[] = [
  { value: "ROW", label: "行级权限" },
  { value: "COLUMN", label: "字段级权限" },
  { value: "DATA_SCOPE", label: "数据范围" },
  { value: "CUSTOM_SQL", label: "自定义SQL" },
];

/** 数据范围选项（值为后端枚举名） */
const SCOPE_OPTIONS: { value: DataPermissionScope; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "THIS_ENTERPRISE", label: "本企业" },
  { value: "THIS_DEPARTMENT", label: "本部门" },
  { value: "THIS_DEPARTMENT_AND_SUBORDINATE", label: "本部门及下级" },
  { value: "THIS_USER", label: "本人" },
  { value: "CUSTOM", label: "自定义" },
];

/** 操作符选项（值为后端枚举名） */
const OPERATOR_OPTIONS: { value: DataPermissionOperator; label: string }[] = [
  { value: "EQ", label: "= 等于" },
  { value: "NE", label: "!= 不等于" },
  { value: "IN", label: "IN 包含" },
  { value: "NOT_IN", label: "NOT IN 不包含" },
  { value: "LIKE", label: "LIKE 模糊" },
  { value: "BETWEEN", label: "BETWEEN 区间" },
];

const OPERATOR_SYMBOLS: Record<DataPermissionOperator, string> = {
  EQ: "=",
  NE: "!=",
  IN: "IN",
  NOT_IN: "NOT IN",
  LIKE: "LIKE",
  BETWEEN: "BETWEEN",
};

function ruleTypeLabel(value?: DataPermissionRuleType): string {
  return RULE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? "-";
}

function scopeLabel(value?: DataPermissionScope): string {
  return SCOPE_OPTIONS.find((item) => item.value === value)?.label ?? "-";
}

function operatorSymbol(value?: DataPermissionOperator): string {
  return value ? OPERATOR_SYMBOLS[value] : "-";
}

function roleCodesLabel(filterCondition?: string): string {
  const codes = parseRoleCodes(filterCondition);
  return codes ? codes : "所有角色";
}

/** 规则类型 → 列表 tag 颜色 */
function ruleTypeTag(value?: DataPermissionRuleType): "primary" | "warning" | "success" | "info" {
  switch (value) {
    case "ROW":
      return "primary";
    case "COLUMN":
      return "warning";
    case "DATA_SCOPE":
      return "success";
    default:
      return "info";
  }
}

/** 分页表格数据管理（后端 /list 全量 + 前端过滤分页） */
const { loading, list, total, params, fetchData, handleQuery, handleResetQuery } = usePageTable<
  DataPermissionRuleItem,
  DataPermissionRuleQueryParams
>({
  initialParams: {
    pageNum: 1,
    pageSize: 10,
    keywords: "",
    ruleTypeEnum: undefined,
    dataScopeEnum: undefined,
    isEnabled: undefined,
  },
  request: DataPermissionRuleAPI.getPage,
  onBeforeReset: () => queryFormRef.value?.resetFields(),
});

const dataTableRef = ref<unknown>();
const { selectedIds, hasSelection, handleSelectionChange } =
  useTableSelection<DataPermissionRuleItem>(dataTableRef);

const dialogState = reactive({
  title: "",
  visible: false,
  fullscreen: false,
});

const submitting = ref(false);

const initialFormData: DataPermissionRuleForm = {
  ruleName: "",
  ruleCode: "",
  ruleTypeEnum: "ROW",
  // 数据库 data_scope 为 NOT NULL 且无默认值：非数据范围类型统一传 ALL（转换层对 ROW 类型忽略该字段）
  dataScopeEnum: "ALL",
  targetTable: "",
  targetField: "",
  permissionColumn: "",
  permOperatorEnum: undefined,
  permissionValue: "",
  roleCodes: "",
  priority: 100,
  isDefault: 0,
  isEnabled: 1,
  appId: "",
  remark: "",
};

const formData = reactive<DataPermissionRuleForm>({ ...initialFormData });

/** 表单校验规则（随规则类型动态变化） */
const rules = computed<FormRules>(() => {
  const base: FormRules = {
    ruleName: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
    ruleCode: [{ required: true, message: "请输入规则编码", trigger: "blur" }],
    ruleTypeEnum: [{ required: true, message: "请选择规则类型", trigger: "change" }],
  };
  if (formData.ruleTypeEnum === "ROW") {
    base.targetField = [{ required: true, message: "请选择目标字段", trigger: "change" }];
    base.permOperatorEnum = [{ required: true, message: "请选择操作符", trigger: "change" }];
    base.permissionValue = [{ required: true, message: "请输入权限值", trigger: "blur" }];
  }
  if (formData.ruleTypeEnum === "DATA_SCOPE") {
    base.dataScopeEnum = [{ required: true, message: "请选择数据范围", trigger: "change" }];
  }
  return base;
});

/** 权限值输入提示（随操作符变化） */
const permissionValuePlaceholder = computed(() => {
  switch (formData.permOperatorEnum) {
    case "IN":
    case "NOT_IN":
      return "多个值用英文逗号分隔，如 103,104";
    case "BETWEEN":
      return "两个值用英文逗号分隔，如 2026-01-01,2026-12-31";
    case "LIKE":
      return "模糊匹配值（后端自动加 %）";
    default:
      return "字段比较值，如 103";
  }
});

/** filterCondition JSON 实时预览 */
const filterConditionPreview = computed(() => buildFilterCondition(formData.roleCodes));

function toggleDialogFullscreen(): void {
  dialogState.fullscreen = !dialogState.fullscreen;
}

// ==================== 目标表 / 字段 / 应用元数据（实时来自数据库） ====================

/** 应用选项（sys_app） */
interface AppOptionItem {
  id: string;
  name: string;
  code: string;
}

const appOptions = ref<AppOptionItem[]>([]);
const appsLoading = ref(false);
let appsLoaded = false;

/** 加载应用列表（会话内缓存） */
async function loadAppOptions(force = false): Promise<void> {
  if (appsLoaded && !force) {
    return;
  }
  appsLoading.value = true;
  try {
    const list = await DataPermissionRuleAPI.getApps();
    // 编辑回显兼容：当前应用不在启用列表（已停用/删除）时保留为可选项
    if (formData.appId && !list.some((a) => a.id === formData.appId)) {
      list.unshift({ id: formData.appId, name: `应用 ${formData.appId}`, code: "" });
    }
    appOptions.value = list;
    appsLoaded = true;
  } catch {
    appOptions.value = [];
  } finally {
    appsLoading.value = false;
  }
}

const tableOptions = ref<string[]>([]);
const columnOptions = ref<string[]>([]);
const tablesLoading = ref(false);
const columnsLoading = ref(false);
let tablesLoaded = false;

/** 加载表名列表（会话内缓存，可强制刷新） */
async function loadTableOptions(force = false): Promise<void> {
  if (tablesLoaded && !force) {
    return;
  }
  tablesLoading.value = true;
  try {
    tableOptions.value = await DataPermissionRuleAPI.getTables();
    tablesLoaded = true;
  } catch {
    tableOptions.value = [];
  } finally {
    tablesLoading.value = false;
  }
}

/** 列列表中不存在当前值时保留之（编辑回显：列可能已被改名/删除） */
function mergeCurrentValue(values: string[], current?: string): string[] {
  if (current && !values.some((v) => v.toLowerCase() === current.toLowerCase())) {
    return [current, ...values];
  }
  return values;
}

/** 按目标表加载列名列表 */
async function loadColumnOptions(table?: string): Promise<void> {
  if (!table) {
    columnOptions.value = [];
    return;
  }
  columnsLoading.value = true;
  try {
    const cols = await DataPermissionRuleAPI.getColumns(table);
    const current =
      formData.ruleTypeEnum === "ROW" ? formData.targetField : formData.permissionColumn;
    columnOptions.value = mergeCurrentValue(cols, current);
  } catch {
    columnOptions.value = [];
  } finally {
    columnsLoading.value = false;
  }
}

// 目标表变化 → 级联刷新字段；清空目标表时同时清空字段
watch(
  () => formData.targetTable,
  async (table) => {
    if (!table) {
      formData.targetField = "";
      formData.permissionColumn = "";
      columnOptions.value = [];
      return;
    }
    await loadColumnOptions(table);
  }
);

/**
 * 打开新增 / 编辑弹窗
 *
 * @param row 传入行数据则为编辑，否则为新增
 */
async function openDialog(row?: DataPermissionRuleItem): Promise<void> {
  Object.assign(formData, { ...initialFormData });

  if (row) {
    dialogState.title = "编辑数据权限规则";
    let detail = row;
    if (row.id) {
      try {
        detail = await DataPermissionRuleAPI.getInfo(row.id);
      } catch {
        detail = row;
      }
    }
    Object.assign(formData, {
      id: detail.id,
      ruleName: detail.ruleName ?? "",
      ruleCode: detail.ruleCode ?? "",
      ruleTypeEnum: detail.ruleTypeEnum ?? "ROW",
      dataScopeEnum: detail.dataScopeEnum ?? "ALL",
      targetTable: detail.targetTable ?? "",
      targetField: detail.targetField ?? "",
      permissionColumn: detail.permissionColumn ?? "",
      permOperatorEnum: detail.permOperatorEnum,
      permissionValue: detail.permissionValue ?? "",
      roleCodes: parseRoleCodes(detail.filterCondition),
      priority: detail.priority ?? 100,
      isDefault: detail.isDefault ?? 0,
      isEnabled: detail.isEnabled ?? 1,
      appId: detail.appId ?? "",
      remark: detail.remark ?? "",
    });
  } else {
    dialogState.title = "新增数据权限规则";
  }

  await Promise.all([loadTableOptions(), loadAppOptions()]);
  dialogState.visible = true;
  dialogState.fullscreen = false;
  nextTick(() => ruleFormRef.value?.clearValidate());
}

function closeDialog(): void {
  dialogState.visible = false;
  dialogState.fullscreen = false;
}

/** 提交表单（新增或更新） */
async function handleSubmit(): Promise<void> {
  if (!ruleFormRef.value) {
    return;
  }
  try {
    await ruleFormRef.value.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (formData.id) {
      await DataPermissionRuleAPI.update({ ...formData });
      ElMessage.success("修改成功");
    } else {
      await DataPermissionRuleAPI.save({ ...formData });
      ElMessage.success("新增成功");
    }
    closeDialog();
    fetchData();
  } finally {
    submitting.value = false;
  }
}

/**
 * 删除规则
 *
 * @param id 传入 ID 则删除单条，否则删除勾选记录
 */
function handleDelete(id?: string): void {
  const ids = id ? String(id) : selectedIds.value.join(",");
  if (!ids) {
    return;
  }
  ElMessageBox.confirm("确认删除所选数据权限规则吗？删除后相关角色立即失去该规则约束。", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      await DataPermissionRuleAPI.remove(ids);
      ElMessage.success("删除成功");
      fetchData();
    })
    .catch(() => {});
}
</script>

<style lang="scss" scoped>
.form-tip {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
</style>
