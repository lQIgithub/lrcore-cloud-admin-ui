import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type { ApiResponse, FormDefinitionVO } from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSFORM_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processForm";

/**
 * 表单API
 */
const processFormApi = {
  /** 保存表单定义 */
  save(data: FormDefinitionVO): Promise<ApiResponse<FormDefinitionVO>> {
    return request({
      url: `${WORKFLOW_PROCESSFORM_BASE_URL}/save`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取表单定义 */
  getByTask(processKey: string, taskKey: string): Promise<ApiResponse<FormDefinitionVO>> {
    return request({
      url: `${WORKFLOW_PROCESSFORM_BASE_URL}/getFormDefinitionByTask`,
      method: "get",
      params: { processKey, taskKey },
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取流程所有表单 */
  listByProcess(processKey: string): Promise<ApiResponse<FormDefinitionVO[]>> {
    return request({
      url: `${WORKFLOW_PROCESSFORM_BASE_URL}/listByProcessByProcessKey`,
      method: "get",
      params: processKey,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },
};

export default processFormApi;

// 重导出类型
export * from "./types.d";
