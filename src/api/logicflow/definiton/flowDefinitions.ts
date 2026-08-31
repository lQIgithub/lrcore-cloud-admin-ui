import request from "@/utils/request";
// 请求体在 request 拦截器中会进行 AES 加密并作为字符串发送。
// 开发环境 Mock 无法解析 application/json 下的加密字符串，
// 因此带请求体的调用显式声明 text/plain，让 mock 能读取原始加密体进行解密。
const ENCRYPTED_BODY_HEADERS = { "Content-Type": "text/plain" };

import type { ProcessDefinitionVO, FlowGraphData, DeployParam } from "./types.d";

const SYSTEM_BASE_PREFIX = "/lrcore-system";

const WORKFLOW_PROCESSDEFINITION_BASE_URL =
  SYSTEM_BASE_PREFIX + "/api/v1/workflow/processDefinition";

/**
 * 流程定义API
 *
 * 注意：request 的响应拦截器已拆掉 ApiResult 壳（见 @/utils/request），
 * 这里以 `request<unknown, 载荷类型>` 调用，返回 Promise 解析值即为 data 载荷本身，
 * 不是 { code, success, data } 信封，调用方不要再判断 res.success / res.data。
 */
const processDefinitionApi = {
  /** 创建流程定义 */
  create(data: Partial<ProcessDefinitionVO>): Promise<ProcessDefinitionVO> {
    return request<unknown, ProcessDefinitionVO>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/save`,
      method: "post",
      data,
    });
  },

  /** 更新流程定义 */
  update(data: Partial<ProcessDefinitionVO>): Promise<void> {
    return request<unknown, void>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/update`,
      method: "post",
      data,
    });
  },

  /** 删除流程定义 */
  remove(id: string): Promise<void> {
    return request<unknown, void>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/delete/${id}`,
      method: "delete",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取流程定义列表 */
  list(queryParams?: { keyword?: string; status?: string }): Promise<ProcessDefinitionVO[]> {
    return request<unknown, ProcessDefinitionVO[]>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/list`,
      method: "get",
      params: queryParams,
    });
  },

  /** 获取流程定义详情 */
  getById(id: string): Promise<ProcessDefinitionVO> {
    return request<unknown, ProcessDefinitionVO>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/getInfo/${id}`,
      method: "get",
    });
  },
  /** 验证流程定义 */
  validate(data: Partial<FlowGraphData>): Promise<boolean> {
    return request<unknown, boolean>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/validateFlowGraph`,
      method: "post",
      data,
    });
  },
  /** 保存流程图数据 */
  saveGraph(data: FlowGraphData): Promise<void> {
    return request<unknown, void>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/saveGraph`,
      method: "post",
      data,
    });
  },

  /** 导出BPMN XML */
  exportBpmn(id: string): Promise<string> {
    return request<unknown, string>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/exportBpmn/${id}`,
      method: "get",
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 部署流程（可选传入前端生成的BPMN XML，未传则由后端根据已保存的图形数据生成） */
  deploy(data: DeployParam): Promise<void> {
    return request<unknown, void>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/deploy`,
      method: "post",
      data,
      headers: ENCRYPTED_BODY_HEADERS,
    });
  },

  /** 获取BPMN XML列表（已部署的版本） */
  versions(key: string): Promise<ProcessDefinitionVO[]> {
    // 后端为 @GetMapping("/versions") + @RequestParam("key")，key 走 query 参数
    return request<unknown, ProcessDefinitionVO[]>({
      url: `${WORKFLOW_PROCESSDEFINITION_BASE_URL}/versions`,
      method: "get",
      params: { key },
    });
  },
};

export default processDefinitionApi;

// 重导出类型
export * from "./types.d";
