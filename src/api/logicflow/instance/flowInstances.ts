import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type {
  ProcessInstanceVO,
  StartProcessInstanceVO,
  QueryProcessInstanceVO,
  ProcessInstancevAriablesVO,
} from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSINSTANCE_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processInstance";

/**
 * 流程实例API
 *
 * 注意：request 的响应拦截器已拆掉 ApiResult 壳，
 * 返回 Promise 解析值即为 data 载荷本身，不是 { code, success, data } 信封。
 */
const processInstanceApi = {
  /** 启动流程实例 */
  start(data: StartProcessInstanceVO): Promise<ProcessInstanceVO> {
    return request<unknown, ProcessInstanceVO>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/start`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取实例列表 */
  list(queryParams?: QueryProcessInstanceVO): Promise<ProcessInstanceVO[]> {
    return request<unknown, ProcessInstanceVO[]>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/list`,
      method: "get",
      params: queryParams,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取实例详情 */
  getById(id: string): Promise<ProcessInstanceVO> {
    return request<unknown, ProcessInstanceVO>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/getInfo/${id}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 查询流程变量 */
  getVariables(id: string): Promise<Record<string, unknown>> {
    // 后端为 @GetMapping("/getVariables") + @RequestParam("id")，id 走 query 参数
    return request<unknown, Record<string, unknown>>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/getVariables`,
      method: "get",
      params: { id },
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 设置流程变量 */
  setVariables(data: ProcessInstancevAriablesVO): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/setVariables`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 删除流程实例 */
  delete(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/delete/${id}`,
      method: "delete",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 挂起流程实例 */
  suspend(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/suspend`,
      method: "post",
      params: { id },
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 激活流程实例 */
  activate(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/activate`,
      method: "post",
      params: { id },
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },
};

export default processInstanceApi;
// 重导出类型
export * from "./types.d";
