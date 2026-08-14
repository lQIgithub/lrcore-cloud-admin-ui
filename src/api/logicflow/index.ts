/**
 * LogicFlow 工作流 API 统一出口
 *
 * 所有 API 对象与类型统一从这里导入：
 *   import { processDefinitionApi, processFormApi, taskApi } from "@/api/logicflow";
 *   import type { ProcessDefinitionVO, FlowNode, ApiResponse } from "@/api/logicflow";
 */

// ==================== API 对象 ====================
export { default as processDefinitionApi } from "./definiton/flowDefinitions";
export { default as processFormApi } from "./form/flowForms";
export { default as processInstanceApi } from "./instance/flowInstances";
export { default as processTaskApi } from "./task/flowTasks";
export { default as monitorApi } from "./monitor/flowMonitor";

// ==================== 节点相关（值 + 配置） ====================
export { CustomNodes, nodeTypeConfig } from "./node/customNodes";
export * from "./node/nodeConfig";

// ==================== 类型统一出口 ====================
export type * from "./definiton/types.d";
export type * from "./form/types.d";
export type * from "./instance/types.d";
export type * from "./node/types.d";
export type * from "./task/types.d";
export type * from "./monitor/types.d";

// ApiResponse 在多个子模块 types 中重复声明，统一以 definiton 中的定义导出，避免歧义
export type { ApiResponse } from "./definiton/types.d";
