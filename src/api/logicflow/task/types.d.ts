/**
 * 任务VO
 */
export interface TaskVO {
  id: string;
  name: string;
  assignee?: string;
  processInstanceId: string;
  createTime?: string;
  dueDate?: string;
  priority?: number;
  status?: "pending" | "completed" | "claimed";
}

/**
 * 任务查询参数
 */
export interface QueryTaskVo {
  assignee?: string;
  processInstanceId?: string;
}

/**
 * 签收任务参数
 */
export interface ClaimTaskVo {
  id: string;
  userId: string;
}
/**
 * 完成任务参数
 */
export interface CompleteTaskVo {
  id: string;
  variables?: Record<string, unknown>;
}
/**
 * 完成任务参数
 */
export interface transferTaskVo {
  id: string;
  targetUserId: string;
}

/**
 * API响应结构
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
