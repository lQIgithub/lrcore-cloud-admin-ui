import type { BaseQueryParams } from "@/api/common";

export interface EnterpriseQueryParams extends BaseQueryParams {
  keywords?: string;
  tenantId?: string;
  status?: number;
}

export interface EnterpriseItem {
  id: string;
  name: string;
  abbreviation?: string;
  code: string;
  parentId?: number | string;
  parentName?: string;
  phone?: string;
  address?: string;
  description?: string;
  tenantId?: string;
  status: number;
}

export interface EnterpriseForm {
  id?: string;
  name: string;
  abbreviation?: string;
  code: string;
  parentId?: number | string;
  description?: string;
  phone?: string;
  address?: string;
  tenantId?: string;
  status: number;
}
