import request from "@/utils/request";
import type { EnterpriseForm, EnterpriseItem, EnterpriseQueryParams } from "./types.d";
import type { OptionItem, PageResult } from "@/api/common";

const ENTERPRISE_BASE_URL = "/lrcore-system/api/v1/enterprises";

const EnterpriseAPI = {
  getPage(queryParams?: EnterpriseQueryParams) {
    return request<unknown, PageResult<EnterpriseItem>>({
      url: ENTERPRISE_BASE_URL,
      method: "get",
      params: queryParams,
    });
  },
  getOptions() {
    return request<unknown, OptionItem[]>({
      url: `${ENTERPRISE_BASE_URL}/options`,
      method: "get",
    });
  },
  getFormData(id: string) {
    return request<unknown, EnterpriseForm>({
      url: `${ENTERPRISE_BASE_URL}/${id}/form`,
      method: "get",
    });
  },
  create(data: EnterpriseForm) {
    return request({
      url: ENTERPRISE_BASE_URL,
      method: "post",
      data,
    });
  },
  update(id: string, data: EnterpriseForm) {
    return request({
      url: `${ENTERPRISE_BASE_URL}/${id}`,
      method: "put",
      data,
    });
  },
  deleteByIds(ids: string) {
    return request({
      url: `${ENTERPRISE_BASE_URL}/${ids}`,
      method: "delete",
    });
  },
};

export default EnterpriseAPI;
export * from "./types.d";
