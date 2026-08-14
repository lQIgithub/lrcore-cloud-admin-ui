import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type {
  ApiResponse,
  ClaimTaskVo,
  CompleteTaskVo,
  QueryTaskVo,
  TaskVO,
  transferTaskVo,
} from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";
const WORKFLOW_PROCESSTASK_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processTask";

/**
 * 任务API
 */
const processTaskApi = {
  /** 查询待办任务 */
  list(data?: QueryTaskVo): Promise<ApiResponse<TaskVO[]>> {
    return request({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/update`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取任务详情 */
  getById(id: string): Promise<ApiResponse<TaskVO>> {
    return request({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/getInfo/${id}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 签收任务 */
  claim(data: ClaimTaskVo): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/claim`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 完成任务 */
  complete(data: CompleteTaskVo): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/complete`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 转办任务 */
  transfer(data: transferTaskVo): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/transfer`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },
};

export default processTaskApi;

// 重导出类型
export * from "./types.d";
