import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type { ProcessDefinitionVO, FlowGraphData, ApiResponse, DeployParam } from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSDEFINITION_BASE_URL =
  SYSTEM_BASE_PREFIX + "/api/v1/workflow/processDefinition";

/**
 * 流程定义API
 */
const processDefinitionApi = {
  /** 创建流程定义 */
  create(data: Partial<ProcessDefinitionVO>): Promise<ApiResponse<ProcessDefinitionVO>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/save`,
      method: "post",
      data,
    });
  },

  /** 更新流程定义 */
  update(data: Partial<ProcessDefinitionVO>): Promise<ApiResponse<ProcessDefinitionVO>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/update`,
      method: "post",
      data,
    });
  },

  /** 删除流程定义 */
  remove(id: string): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/delete/${id}`,
      method: "delete",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取流程定义列表 */
  list(queryParams?: {
    keyword?: string;
    status?: string;
  }): Promise<ApiResponse<ProcessDefinitionVO[]>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/list`,
      method: "get",
      params: queryParams,
    });
  },

  /** 获取流程定义详情 */
  getById(id: string): Promise<ApiResponse<ProcessDefinitionVO>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/getInfo/${id}`,
      method: "get",
    });
  },
  /** 验证流程定义 */
  validate(data: Partial<FlowGraphData>): Promise<ApiResponse<boolean>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/validateFlowGraph`,
      method: "post",
      data,
    });
  },
  /** 保存流程图数据 */
  saveGraph(data: FlowGraphData): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/saveGraph`,
      method: "post",
      data,
    });
  },

  /** 导出BPMN XML */
  exportBpmn(id: string): Promise<ApiResponse<string>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/exportBpmn/${id}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 部署流程（可选传入前端生成的BPMN XML，未传则由后端根据已保存的图形数据生成） */
  deploy(data: DeployParam): Promise<ApiResponse<void>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/deploy`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取BPMN XML列表（已部署的版本） */
  versions(key: string): Promise<ApiResponse<ProcessDefinitionVO[]>> {
    return request({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/versions/${key}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },
};

export default processDefinitionApi;

// 重导出类型
export * from "./types.d";
