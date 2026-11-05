import type { BaseQueryParams } from "@/api/common";

/**
 * 数据权限规则类型定义
 *
 * 说明：后端 MyBatis-Flex 实体使用枚举字段（ruleTypeEnum / permOperatorEnum / dataScopeEnum），
 * 且全局 Jackson 未注册枚举序列化器，因此接口默认按**枚举名**传输（如 "ROW"、"EQ"、"ALL"）。
 * index.ts 中的解码函数同时兼容数字编码（1 起始），提交时统一使用枚举名。
 */

/** 规则类型：ROW=行级(1) COLUMN=字段级(2) DATA_SCOPE=数据范围(3) CUSTOM_SQL=自定义SQL(4) */
export type DataPermissionRuleType = "ROW" | "COLUMN" | "DATA_SCOPE" | "CUSTOM_SQL";

/** 权限操作符：EQ(1) NE(2) IN(3) NOT_IN(4) LIKE(5) BETWEEN(6) */
export type DataPermissionOperator = "EQ" | "NE" | "IN" | "NOT_IN" | "LIKE" | "BETWEEN";

/** 数据范围：ALL(1) 本企业(2) 本部门(3) 本部门及下级(4) 本人(5) 自定义(6) */
export type DataPermissionScope =
  | "ALL"
  | "THIS_ENTERPRISE"
  | "THIS_DEPARTMENT"
  | "THIS_DEPARTMENT_AND_SUBORDINATE"
  | "THIS_USER"
  | "CUSTOM";

/** 数据权限规则列表项（字段名与后端实体 JSON 保持一致） */
export interface DataPermissionRuleItem {
  /** 主键（后端 Long 序列化为字符串） */
  id?: string;
  /** 租户ID */
  tenantId?: string;
  /** 规则名称 */
  ruleName?: string;
  /** 规则编码 */
  ruleCode?: string;
  /** 规则类型 */
  ruleTypeEnum?: DataPermissionRuleType;
  /** 目标表名 */
  targetTable?: string;
  /** 目标字段名 */
  targetField?: string;
  /** 权限字段（优先于 targetField） */
  permissionColumn?: string;
  /** 权限操作符 */
  permOperatorEnum?: DataPermissionOperator;
  /** 权限值（IN/NOT_IN 逗号分隔多个值，BETWEEN 两个值） */
  permissionValue?: string;
  /** 角色过滤条件 JSON：{"role_codes":["a","b"]}，空表示所有角色 */
  filterCondition?: string;
  /** 数据范围 */
  dataScopeEnum?: DataPermissionScope;
  /** 优先级（越小越优先） */
  priority?: number;
  /** 是否默认规则（0否 1是） */
  isDefault?: number;
  /** 是否启用（0禁用 1启用） */
  isEnabled?: number;
  /** 应用ID */
  appId?: string;
  /** 是否系统内置（0否 1是） */
  buildIn?: number;
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}

/**
 * 表单数据
 *
 * 枚举字段统一使用枚举名；roleCodes 为纯前端字段（逗号分隔角色编码），
 * 提交时由 API 层转换为后端 filterCondition JSON。
 */
export interface DataPermissionRuleForm {
  /** 主键（编辑时必填） */
  id?: string;
  /** 规则名称 */
  ruleName: string;
  /** 规则编码 */
  ruleCode: string;
  /** 规则类型 */
  ruleTypeEnum: DataPermissionRuleType;
  /** 数据范围（仅 DATA_SCOPE 类型必填） */
  dataScopeEnum?: DataPermissionScope;
  /** 目标表名 */
  targetTable?: string;
  /** 目标字段名（行级规则必填） */
  targetField?: string;
  /** 权限字段 */
  permissionColumn?: string;
  /** 权限操作符（行级规则必填） */
  permOperatorEnum?: DataPermissionOperator;
  /** 权限值（行级规则必填） */
  permissionValue?: string;
  /** 适用角色编码，逗号分隔；留空 = 对所有角色生效（前端专用字段） */
  roleCodes?: string;
  /** 优先级 */
  priority?: number;
  /** 是否默认规则（0否 1是） */
  isDefault?: number;
  /** 是否启用（0禁用 1启用） */
  isEnabled?: number;
  /** 应用ID */
  appId?: string;
  /** 备注 */
  remark?: string;
}

/** 查询参数（后端 /list 返回全量，过滤与分页在前端完成） */
export interface DataPermissionRuleQueryParams extends BaseQueryParams {
  /** 关键词：匹配规则名称 / 规则编码 */
  keywords?: string;
  /** 规则类型 */
  ruleTypeEnum?: DataPermissionRuleType;
  /** 数据范围 */
  dataScopeEnum?: DataPermissionScope;
  /** 状态（0禁用 1启用） */
  isEnabled?: number;
}
