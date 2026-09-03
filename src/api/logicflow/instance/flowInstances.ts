import request from "@/utils/request";

import type { PageResult } from "@/api/common";
import type {
  ProcessInstanceVO,
  StartProcessInstanceVO,
  QueryProcessInstanceVO,
  ProcessInstancevAriablesVO,
} from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSINSTANCE_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processInstance";

/**
 * 流程实例API（RESTful）
 *
 * 注意：request 的响应拦截器已拆掉 ApiResult 壳，
 * 返回 Promise 解析值即为 data 载荷本身，不是 { code, success, data } 信封。
 * AES 加解密已停用，带 body 的调用使用默认 application/json。
 */
const processInstanceApi = {
  /** 我的申请列表（分页），返回 { list, total } */
  list(queryParams?: QueryProcessInstanceVO): Promise<PageResult<ProcessInstanceVO>> {
    return request<unknown, PageResult<ProcessInstanceVO>>({
      url: WORKFLOW_PROCESSINSTANCE_BASE_URL,
      method: "get",
      params: queryParams,
    });
  },

  /** 启动流程实例（请假申请） */
  start(data: StartProcessInstanceVO): Promise<ProcessInstanceVO> {
    return request<unknown, ProcessInstanceVO>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/start`,
      method: "post",
      data,
    });
  },

  /** 获取实例详情 */
  getById(id: string): Promise<ProcessInstanceVO> {
    return request<unknown, ProcessInstanceVO>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/${id}`,
      method: "get",
    });
  },

  /** 查询流程变量 */
  getVariables(id: string): Promise<Record<string, unknown>> {
    return request<unknown, Record<string, unknown>>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/${id}/variables`,
      method: "get",
    });
  },

  /** 设置流程变量 */
  setVariables(id: string, data: ProcessInstancevAriablesVO): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/${id}/variables`,
      method: "put",
      data: data.variables ?? {},
    });
  },

  /** 终止并删除流程实例 */
  delete(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/${id}`,
      method: "delete",
    });
  },

  /** 挂起流程实例 */
  suspend(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/${id}/suspend`,
      method: "post",
    });
  },

  /** 激活流程实例 */
  activate(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSINSTANCE_BASE_URL}/${id}/activate`,
      method: "post",
    });
  },
};

export default processInstanceApi;
// 重导出类型
export * from "./types.d";
