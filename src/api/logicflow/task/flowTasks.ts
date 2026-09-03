import request from "@/utils/request";

import type { PageResult } from "@/api/common";
import type { CompleteTaskVo, QueryTaskVo, RejectTaskVo, TaskVO, TransferaskVo } from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";
const WORKFLOW_PROCESSTASK_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processTask";

/**
 * 任务API（RESTful）
 *
 * 注意：request 的响应拦截器已拆掉 ApiResult 壳，
 * 返回 Promise 解析值即为 data 载荷本身。
 * AES 加解密已停用，带 body 的调用使用默认 application/json。
 */
const processTaskApi = {
  /** 待办任务列表（分页），返回 { list, total } */
  list(queryParams?: QueryTaskVo): Promise<PageResult<TaskVO>> {
    return request<unknown, PageResult<TaskVO>>({
      url: WORKFLOW_PROCESSTASK_BASE_URL,
      method: "get",
      params: queryParams,
    });
  },

  /** 获取任务详情 */
  getById(id: string): Promise<TaskVO> {
    return request<unknown, TaskVO>({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/${id}`,
      method: "get",
    });
  },

  /** 签收任务 */
  claim(id: string): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/${id}/claim`,
      method: "post",
    });
  },

  /** 通过：完成任务 */
  complete(id: string, data: CompleteTaskVo): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/${id}/complete`,
      method: "post",
      data: { id, variables: data.variables ?? {} },
    });
  },

  /** 驳回：任务回退到上游节点 */
  reject(id: string, data: RejectTaskVo): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/${id}/reject`,
      method: "post",
      data: { comment: data.comment },
    });
  },

  /** 转办任务 */
  transfer(id: string, data: TransferaskVo): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSTASK_BASE_URL}/${id}/transfer`,
      method: "post",
      data: { id, targetUserId: data.targetUserId },
    });
  },
};

export default processTaskApi;

// 重导出类型
export * from "./types.d";
