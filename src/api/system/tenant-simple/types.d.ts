import type { BaseQueryParams } from "@/api/common";

export interface TenantQueryParams extends BaseQueryParams {
  keywords?: string;
  status?: number;
}

export interface TenantItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  remark?: string;
  status: number;
}

export interface TenantForm {
  id?: string;
  name: string;
  code: string;
  description?: string;
  remark?: string;
  status: number;
}
