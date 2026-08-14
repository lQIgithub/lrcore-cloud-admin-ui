import type { FlowNode, FlowEdge } from "../node/types.d";

/**
 * 流程图数据结构
 */
export interface FlowGraphData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * 流程定义VO
 */
export interface ProcessDefinitionVO {
  id?: string;
  key: string;
  name: string;
  description?: string;
  category?: string;
  version?: number;
  graphData?: FlowGraphData;
  bpmnXml?: string;
  status?: "draft" | "deployed" | "archived";
  createTime?: string;
  updateTime?: string;
}

/**
 * API响应结构
 */
export interface ApiResponse<T> {
  code: string;
  message: string;
  errorStack: string;
  data: T;
  success: boolean;
}

/**
 * 部署流程参数
 */
export interface DeployParam {
  id?: string;
  bpmnXml?: string;
}
