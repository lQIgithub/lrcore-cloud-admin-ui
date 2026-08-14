/**
 * 监控查询参数
 */
export interface QueryMonitorParams {
  processKey?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 流程监控统计VO
 */
export interface MonitorStatisticsVO {
  activeInstances: number;
  completedInstances: number;
  pendingTasks: number;
  terminatedInstances: number;
}

/**
 * 任务统计VO
 */
export interface TaskStatisticsVO {
  pending: number;
  claimed: number;
  completed: number;
}

/**
 * API响应结构
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
