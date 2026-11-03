import type { BaseQueryParams } from "@/api/common";

export interface AppQueryParams extends BaseQueryParams {
  keywords?: string;
  tenantId?: string;
  status?: number;
}

export interface AppItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  url?: string;
  icon?: string;
  permissionPrefix?: string;
  remark?: string;
  tenantId?: string;
  status: number;
  buildIn?: number;
}

export interface AppForm {
  id?: string;
  name: string;
  code: string;
  description?: string;
  url?: string;
  icon?: string;
  permissionPrefix?: string;
  remark?: string;
  tenantId?: string;
  status: number;
}
