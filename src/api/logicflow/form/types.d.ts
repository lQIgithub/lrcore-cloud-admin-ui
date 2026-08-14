/**
 * 表单定义VO
 */
export interface FormDefinitionVO {
  id?: string;
  processKey: string;
  taskKey: string;
  formName: string;
  formType?: "dynamic" | "static";
  formContent?: Record<string, unknown>;
}

/**
 * API响应结构
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
