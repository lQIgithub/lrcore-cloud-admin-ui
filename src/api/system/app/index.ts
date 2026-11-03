import request from "@/utils/request";
import type { AppForm, AppItem, AppQueryParams } from "./types.d";
import type { PageResult } from "@/api/common";

const APP_BASE_URL = "/lrcore-system/api/v1/apps";

const AppAPI = {
  getPage(queryParams?: AppQueryParams) {
    return request<unknown, PageResult<AppItem>>({
      url: APP_BASE_URL,
      method: "get",
      params: queryParams,
    });
  },
  getFormData(id: string) {
    return request<unknown, AppForm>({
      url: `${APP_BASE_URL}/${id}/form`,
      method: "get",
    });
  },
  create(data: AppForm) {
    return request({ url: APP_BASE_URL, method: "post", data });
  },
  update(id: string, data: AppForm) {
    return request({ url: `${APP_BASE_URL}/${id}`, method: "put", data });
  },
  deleteByIds(ids: string) {
    return request({ url: `${APP_BASE_URL}/${ids}`, method: "delete" });
  },
};

export default AppAPI;
export * from "./types.d";
