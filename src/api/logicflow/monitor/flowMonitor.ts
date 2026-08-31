import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type { MonitorStatisticsVO, QueryMonitorParams, TaskStatisticsVO } from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSMONITOR_BASE_URL = SYSTEM_BASE_PREFIX + "/api/v1/workflow/processMonitor";

/**
 * 监控统计API
 *
 * 注意：request 的响应拦截器已拆掉 ApiResult 壳，
 * 返回 Promise 解析值即为 data 载荷本身，不是 { code, success, data } 信封。
 */
const monitorApi = {
  /** 获取流程统计数据 */
  getStatistics(queryParams?: QueryMonitorParams): Promise<MonitorStatisticsVO> {
    return request<unknown, MonitorStatisticsVO>({
      url: `${WORKFLOW_PROCESSMONITOR_BASE_URL}/statistics`,
      method: "get",
      params: queryParams,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取活跃实例统计 */
  getActiveInstances(): Promise<MonitorStatisticsVO> {
    return request<unknown, MonitorStatisticsVO>({
      url: `${WORKFLOW_PROCESSMONITOR_BASE_URL}/active-instances`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取任务统计 */
  getTaskStatistics(): Promise<TaskStatisticsVO> {
    return request<unknown, TaskStatisticsVO>({
      url: `${WORKFLOW_PROCESSMONITOR_BASE_URL}/task-statistics`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },
};

export default monitorApi;

// 重导出类型
export * from "./types.d";
