import request from "@/utils/request";
import type { PageResult } from "@/api/common";
import type {
  DataPermissionOperator,
  DataPermissionRuleForm,
  DataPermissionRuleItem,
  DataPermissionRuleQueryParams,
  DataPermissionScope,
  DataPermissionRuleType,
} from "./types.d";

/**
 * 数据权限规则 API
 *
 * 对应后端：lrcore-system 服务 SysDataPermissionRuleController（/sysDataPermissionRule）。
 * 后端分页接口 /page 不支持任何过滤条件，而规则表数据量小（管理配置型），
 * 因此列表页统一走 /list 拉全量，过滤与分页在前端完成。
 */
const BASE_URL = "/lrcore-system/sysDataPermissionRule";

/** 后端 /list 返回的原始行（枚举字段可能是枚举名或数字编码，做宽松类型） */
interface RawRuleItem {
  id?: string | number;
  tenantId?: string | number;
  ruleName?: string;
  ruleCode?: string;
  ruleTypeEnum?: string | number;
  targetTable?: string;
  targetField?: string;
  permissionColumn?: string;
  permOperatorEnum?: string | number;
  permissionValue?: string;
  filterCondition?: string;
  dataScopeEnum?: string | number;
  priority?: number;
  isDefault?: number;
  isEnabled?: number;
  appId?: string | number;
  buildIn?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/** 枚举名与数字编码（1 起始）的映射表 */
const RULE_TYPE_NAMES: DataPermissionRuleType[] = ["ROW", "COLUMN", "DATA_SCOPE", "CUSTOM_SQL"];
const OPERATOR_NAMES: DataPermissionOperator[] = ["EQ", "NE", "IN", "NOT_IN", "LIKE", "BETWEEN"];
const SCOPE_NAMES: DataPermissionScope[] = [
  "ALL",
  "THIS_ENTERPRISE",
  "THIS_DEPARTMENT",
  "THIS_DEPARTMENT_AND_SUBORDINATE",
  "THIS_USER",
  "CUSTOM",
];

/** 枚举解码：兼容数字编码（1 起始）与枚举名（大小写不敏感） */
function decodeEnum<T extends string>(value: unknown, names: readonly T[]): T | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return names[value - 1];
  }
  const normalized = String(value).trim().toUpperCase();
  return (names as readonly string[]).includes(normalized) ? (normalized as T) : (value as T);
}

function toStringValue(value?: string | number): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return String(value);
}

/** 将后端原始行解码为前端列表项 */
function decodeRuleItem(raw: RawRuleItem): DataPermissionRuleItem {
  return {
    id: toStringValue(raw.id),
    tenantId: toStringValue(raw.tenantId),
    ruleName: raw.ruleName,
    ruleCode: raw.ruleCode,
    ruleTypeEnum: decodeEnum(raw.ruleTypeEnum, RULE_TYPE_NAMES),
    targetTable: raw.targetTable,
    targetField: raw.targetField,
    permissionColumn: raw.permissionColumn,
    permOperatorEnum: decodeEnum(raw.permOperatorEnum, OPERATOR_NAMES),
    permissionValue: raw.permissionValue,
    filterCondition: raw.filterCondition,
    dataScopeEnum: decodeEnum(raw.dataScopeEnum, SCOPE_NAMES),
    priority: raw.priority,
    isDefault: raw.isDefault,
    isEnabled: raw.isEnabled,
    appId: toStringValue(raw.appId),
    buildIn: raw.buildIn,
    remark: raw.remark,
    createTime: raw.createTime,
    updateTime: raw.updateTime,
  };
}

/**
 * 角色编码（逗号分隔）→ filterCondition JSON
 *
 * 与后端 PermissionRuleUtil.matchRole 语义一致：
 * 空 → 空字符串（匹配所有角色）；非空 → {"role_codes":["a","b"]}
 */
export function buildFilterCondition(roleCodes?: string): string {
  const codes = (roleCodes ?? "")
    .split(/[,，]/)
    .map((code) => code.trim())
    .filter(Boolean);
  if (codes.length === 0) {
    return "";
  }
  return JSON.stringify({ role_codes: codes });
}

/**
 * filterCondition JSON → 角色编码（逗号分隔）
 *
 * 兼容 {"role_code":"a"}、{"role_codes":[...]}、纯逗号分隔字符串；解析失败返回原串。
 */
export function parseRoleCodes(filterCondition?: string): string {
  const raw = (filterCondition ?? "").trim();
  if (!raw || raw === "{}") {
    return "";
  }
  try {
    const json = JSON.parse(raw) as { role_code?: unknown; role_codes?: unknown };
    if (Array.isArray(json.role_codes)) {
      return json.role_codes
        .map((code) => String(code ?? "").trim())
        .filter(Boolean)
        .join(",");
    }
    if (typeof json.role_code === "string" && json.role_code.trim()) {
      return json.role_code.trim();
    }
    return "";
  } catch {
    // 非 JSON：按逗号分隔的角色编码处理
    return raw
      .split(/[,，]/)
      .map((code) => code.trim())
      .filter(Boolean)
      .join(",");
  }
}

/** 表单 → 后端实体（去除前端专用字段，生成 filterCondition） */
function toPayload(form: DataPermissionRuleForm): DataPermissionRuleItem {
  const { roleCodes, ...rest } = form;
  return {
    ...rest,
    filterCondition: buildFilterCondition(roleCodes),
  };
}

/** 前端过滤（后端 /list 无过滤参数） */
function filterRules(
  rules: DataPermissionRuleItem[],
  params: DataPermissionRuleQueryParams
): DataPermissionRuleItem[] {
  const keywords = (params.keywords ?? "").trim().toLowerCase();
  return rules.filter((rule) => {
    if (keywords) {
      const name = (rule.ruleName ?? "").toLowerCase();
      const code = (rule.ruleCode ?? "").toLowerCase();
      if (!name.includes(keywords) && !code.includes(keywords)) {
        return false;
      }
    }
    if (params.ruleTypeEnum && rule.ruleTypeEnum !== params.ruleTypeEnum) {
      return false;
    }
    if (params.dataScopeEnum && rule.dataScopeEnum !== params.dataScopeEnum) {
      return false;
    }
    if (
      params.isEnabled !== undefined &&
      params.isEnabled !== null &&
      rule.isEnabled !== params.isEnabled
    ) {
      return false;
    }
    return true;
  });
}

const DataPermissionRuleAPI = {
  /**
   * 分页查询（全量拉取 + 前端过滤分页）
   */
  async getPage(
    params: DataPermissionRuleQueryParams
  ): Promise<PageResult<DataPermissionRuleItem>> {
    const rawList = await request<unknown, RawRuleItem[]>({
      url: `${BASE_URL}/list`,
      method: "get",
    });
    const all = (rawList ?? []).map(decodeRuleItem);
    const filtered = filterRules(all, params);
    const start = (Math.max(params.pageNum, 1) - 1) * params.pageSize;
    return {
      list: filtered.slice(start, start + params.pageSize),
      total: filtered.length,
    };
  },
  /** 查询规则详情 */
  async getInfo(id: string): Promise<DataPermissionRuleItem> {
    const raw = await request<unknown, RawRuleItem>({
      url: `${BASE_URL}/getInfo/${id}`,
      method: "get",
    });
    return decodeRuleItem(raw ?? {});
  },
  /** 新增规则 */
  save(data: DataPermissionRuleForm): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${BASE_URL}/save`,
      method: "post",
      data: toPayload(data),
    });
  },
  /** 修改规则 */
  update(data: DataPermissionRuleForm): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${BASE_URL}/update`,
      method: "put",
      data: toPayload(data),
    });
  },
  /** 获取数据库表名列表（目标表下拉，实时来自 information_schema） */
  getTables(): Promise<string[]> {
    return request<unknown, string[]>({
      url: `${BASE_URL}/tables`,
      method: "get",
    });
  },
  /** 获取指定表的列名列表（字段下拉，随目标表级联加载） */
  getColumns(table: string): Promise<string[]> {
    return request<unknown, string[]>({
      url: `${BASE_URL}/columns`,
      method: "get",
      params: { table },
    });
  },
  /** 应用选项（来自 sys_app，规则配置-应用ID下拉） */
  getApps(): Promise<{ id: string; name: string; code: string }[]> {
    return request<unknown, { id: string; name: string; code: string }[]>({
      url: `${BASE_URL}/apps`,
      method: "get",
    });
  },
  /** 删除规则（多个 ID 以英文逗号分割，逐个调用后端单删接口） */
  async remove(ids: string): Promise<void> {
    const idList = ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    await Promise.all(
      idList.map((id) =>
        request<unknown, boolean>({
          url: `${BASE_URL}/remove/${id}`,
          method: "delete",
        })
      )
    );
  },
};

export default DataPermissionRuleAPI;

export * from "./types.d";
