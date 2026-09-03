/**
 * 启动流程实例参数
 */
export interface StartProcessInstanceVO {
  key: string;
  businessKey?: string;
  variables?: Record<string, unknown>;
}

/**
 * 实例查询参数
 */
export interface QueryProcessInstanceVO {
  processDefinitionKey?: string;
  businessKey?: string;
  status?: "active" | "suspended" | "completed" | "terminated" | string;
  pageNum?: number;
  pageSize?: number;
}

/**
 * 设置流程变量
 */
export interface ProcessInstancevAriablesVO {
  id?: string;
  variables?: Record<string, unknown>;
}

/**
 * 流程实例VO
 */
export interface ProcessInstanceVO {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  processDefinitionName: string;
  businessKey?: string;
  status: "active" | "suspended" | "completed" | "terminated";
  startTime?: string;
  endTime?: string;
  variables?: Record<string, unknown>;
}

/**
 * API响应结构
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
