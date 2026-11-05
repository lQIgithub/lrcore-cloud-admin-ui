/**
 * Role 角色类型定义
 */

import type { BaseQueryParams } from "@/api/common";

/** 角色级别 */
export type RoleScope = "PLATFORM" | "APP";

/** 角色分页查询参数 */
export interface RoleQueryParams extends BaseQueryParams {
  /** 搜索关键字 */
  keywords?: string;
  appId?: string;
  /** 角色级别 */
  roleScope?: RoleScope;
}

/** 角色分页对象 */
export interface RoleItem {
  /** 角色ID */
  id?: string;
  /** 角色编码 */
  code?: string;
  /** 角色名称 */
  name?: string;
  appId?: string;
  /** 角色级别 */
  roleScope?: RoleScope;
  /** 排序 */
  sort?: number;
  /** 角色状态 */
  status?: number;
  /** 是否内置(1:是；0:否) */
  buildIn?: number;
  /** 修改时间 */
  updateTime?: Date;
}

/** 角色表单对象 */
export interface RoleForm {
  /** 角色ID */
  id?: string;
  /** 角色编码 */
  code?: string;
  /** 角色名称 */
  name?: string;
  appId?: string;
  /** 角色级别 */
  roleScope?: RoleScope;
  /** 排序 */
  sort?: number;
  /** 角色状态 */
  status?: number;
  /** 备注 */
  remark?: string;
}
