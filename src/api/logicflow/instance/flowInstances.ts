import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type {
  ApiResponse,
  ProcessInstanceVO,
  StartProcessInstanceVO,
  QueryProcessInstanceVO,
  ProcessInstancevAriablesVO,
} from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSINSTANCE_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processInstance";

/**
 * 流程实例API
 */
const processInstanceApi = {
  /** 启动流程实例 */
  start(data: StartProcessInstanceVO): Promise<ApiResponse<ProcessInstanceVO>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/start`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取实例列表 */
  list(queryParams?: QueryProcessInstanceVO): Promise<ApiResponse<ProcessInstanceVO[]>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/list`,
      method: "get",
      params: queryParams,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取实例详情 */
  getById(id: string): Promise<ApiResponse<ProcessInstanceVO>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/getInfo/${id}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 查询流程变量 */
  getVariables(id: string): Promise<ApiResponse<Record<string, unknown>>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/getVariables/${id}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 设置流程变量 */
  setVariables(data: ProcessInstancevAriablesVO): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/setVariables`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 删除流程实例 */
  delete(id: string): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/delete/${id}`,
      method: "delete",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 挂起流程实例 */
  suspend(id: string): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/suspend`,
      method: "post",
      params: id,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 激活流程实例 */
  activate(id: string): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/suspend`,
      method: "post",
      params: id,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },
};

export default processInstanceApi;
// 重导出类型
export * from "./types.d";
