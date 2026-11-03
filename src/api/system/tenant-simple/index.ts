import request from "@/utils/request";
import type { TenantForm, TenantItem, TenantQueryParams } from "./types.d";
import type { PageResult } from "@/api/common";

const TENANT_BASE_URL = "/lrcore-system/api/v1/tenants-management";

const TenantManagementAPI = {
  getPage(queryParams?: TenantQueryParams) {
    return request<unknown, PageResult<TenantItem>>({
      url: TENANT_BASE_URL,
      method: "get",
      params: queryParams,
    });
  },
  getFormData(id: string) {
    return request<unknown, TenantForm>({
      url: `${TENANT_BASE_URL}/${id}/form`,
      method: "get",
    });
  },
  create(data: TenantForm) {
    return request({ url: TENANT_BASE_URL, method: "post", data });
  },
  update(id: string, data: TenantForm) {
    return request({ url: `${TENANT_BASE_URL}/${id}`, method: "put", data });
  },
  deleteByIds(ids: string) {
    return request({ url: `${TENANT_BASE_URL}/${ids}`, method: "delete" });
  },
};

export default TenantManagementAPI;
export * from "./types.d";
