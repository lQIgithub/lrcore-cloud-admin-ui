/**
 * LogicFlow 工作流模块 Mock 数据
 *
 * 说明：
 * - 本 mock 覆盖 src/api/logicflow/flowDefinitions.ts 中定义的全部接口
 * - 由于前端 request 拦截器会对请求体做 AES 加密、对响应 data 做 AES 解密，
 *   这里使用与 src/utils/aes.ts 完全一致的 AES-256-CBC 算法加解密。
 * - 外层响应体使用当前后端统一格式 { code, message, success, data }，
 *   data 为加密后的内层业务体 { code: 200, data, message }（与 views 中 res.code === 200 约定一致）。
 */
import { defineMock } from "vite-plugin-mock-dev-server";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// 与 src/utils/aes.ts 保持一致
const AES_KEY_STR = "7w5A8s2D9f0G1h3J5k6L8z0C2v4B6n8M";
const AES_KEY = Buffer.from(AES_KEY_STR, "utf8");

/** AES-256-CBC 加密（响应 data），与 crypto-js 实现兼容 */
function encrypt(data: unknown): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", AES_KEY, iv);
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}

/** AES-256-CBC 解密（请求 body） */
function decrypt(encrypted: string): unknown {
  const bytes = Buffer.from(encrypted, "base64");
  const iv = bytes.subarray(0, 16);
  const ciphertext = bytes.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", AES_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted);
}

/** 统一成功响应 */
function ok(data: unknown) {
  return {
    code: "0",
    message: "操作成功",
    success: true,
    data: encrypt({ code: 200, data, message: "操作成功" }),
  };
}

/** 解析请求体（已加密） */
function bodyOf(body: unknown): any {
  if (typeof body !== "string" || !body) return undefined;
  try {
    return decrypt(body);
  } catch {
    return undefined;
  }
}

/** 拼接/生成时间字符串 */
function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

interface MockProcessDefinition {
  id: string;
  key: string;
  name: string;
  description?: string;
  category?: string;
  version?: number;
  graphData?: any;
  bpmnXml?: string;
  status?: "draft" | "deployed" | "archived";
  createTime?: string;
  updateTime?: string;
}

interface MockProcessInstance {
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

// 演示用流程图（请假审批）
const demoGraph = {
  nodes: [
    { id: "node_start", type: "startEvent", x: 120, y: 220, text: "开始" },
    {
      id: "node_apply",
      type: "userTask",
      x: 320,
      y: 220,
      text: "填写请假申请",
      properties: { assignee: "${applyUser}" },
    },
    {
      id: "node_approve",
      type: "userTask",
      x: 520,
      y: 220,
      text: "经理审批",
      properties: { assignee: "${manager}" },
    },
    {
      id: "node_gateway",
      type: "exclusiveGateway",
      x: 720,
      y: 220,
      text: "是否通过",
    },
    { id: "node_end", type: "endEvent", x: 920, y: 220, text: "结束" },
  ],
  edges: [
    { id: "edge_1", type: "polyline", sourceNodeId: "node_start", targetNodeId: "node_apply" },
    { id: "edge_2", type: "polyline", sourceNodeId: "node_apply", targetNodeId: "node_approve" },
    { id: "edge_3", type: "polyline", sourceNodeId: "node_approve", targetNodeId: "node_gateway" },
    {
      id: "edge_4",
      type: "polyline",
      sourceNodeId: "node_gateway",
      targetNodeId: "node_end",
      text: "通过",
      properties: { conditionExpression: "${approved == true}" },
    },
  ],
};

// 内存态数据（dev server 会话期间共享）
const db: {
  processDefinitions: MockProcessDefinition[];
  processInstances: MockProcessInstance[];
  tasks: any[];
  forms: any[];
} = {
  processDefinitions: [
    {
      id: "1",
      key: "leave",
      name: "请假流程",
      description: "员工请假审批流程",
      category: "OA",
      version: 3,
      graphData: demoGraph,
      status: "deployed",
      createTime: "2026-07-01 10:00:00",
      updateTime: "2026-07-20 14:30:00",
    },
    {
      id: "2",
      key: "reimburse",
      name: "报销流程",
      description: "费用报销审批流程",
      category: "财务",
      version: 1,
      graphData: {
        nodes: [
          { id: "node_start", type: "startEvent", x: 120, y: 220, text: "开始" },
          {
            id: "node_apply",
            type: "userTask",
            x: 320,
            y: 220,
            text: "填写报销单",
            properties: { assignee: "${applyUser}" },
          },
          { id: "node_end", type: "endEvent", x: 520, y: 220, text: "结束" },
        ],
        edges: [
          {
            id: "edge_1",
            type: "polyline",
            sourceNodeId: "node_start",
            targetNodeId: "node_apply",
          },
          { id: "edge_2", type: "polyline", sourceNodeId: "node_apply", targetNodeId: "node_end" },
        ],
      },
      status: "draft",
      createTime: "2026-08-01 09:00:00",
      updateTime: "2026-08-02 16:00:00",
    },
  ],
  processInstances: [
    {
      id: "ins_1001",
      processDefinitionId: "1",
      processDefinitionKey: "leave",
      processDefinitionName: "请假流程",
      businessKey: "BIZ-2026-0001",
      status: "active",
      startTime: "2026-08-05 09:12:00",
      variables: { applyUser: "张三", days: 3, reason: "家中有事" },
    },
    {
      id: "ins_1002",
      processDefinitionId: "1",
      processDefinitionKey: "leave",
      processDefinitionName: "请假流程",
      businessKey: "BIZ-2026-0002",
      status: "completed",
      startTime: "2026-08-01 10:00:00",
      endTime: "2026-08-02 11:30:00",
      variables: { applyUser: "李四", days: 1, reason: "身体不适" },
    },
    {
      id: "ins_1003",
      processDefinitionId: "1",
      processDefinitionKey: "leave",
      processDefinitionName: "请假流程",
      businessKey: "BIZ-2026-0003",
      status: "suspended",
      startTime: "2026-08-04 15:20:00",
      variables: { applyUser: "王五", days: 2, reason: "出差" },
    },
  ],
  tasks: [
    {
      id: "task_2001",
      name: "经理审批",
      assignee: "admin",
      processInstanceId: "ins_1001",
      createTime: "2026-08-05 09:12:00",
      priority: 50,
      status: "pending",
    },
    {
      id: "task_2002",
      name: "填写请假申请",
      assignee: "zhangsan",
      processInstanceId: "ins_1003",
      createTime: "2026-08-04 15:20:00",
      priority: 50,
      status: "pending",
    },
  ],
  forms: [
    {
      id: "form_3001",
      processKey: "leave",
      taskKey: "node_apply",
      formName: "请假申请单",
      formType: "dynamic",
      formContent: { fields: [{ key: "days", label: "请假天数", type: "number" }] },
    },
  ],
};

let idSeq = 100;

export default defineMock([
  // ==================== 流程定义 ====================
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition",
    method: ["GET"],
    body: ({ query }) => {
      const keyword = query?.keyword ? String(query.keyword) : "";
      const status = query?.status ? String(query.status) : "";
      let list = db.processDefinitions;
      if (keyword) {
        list = list.filter(
          (p) =>
            p.name.includes(keyword) || p.key.includes(keyword) || p.description?.includes(keyword)
        );
      }
      if (status) {
        list = list.filter((p) => p.status === status);
      }
      return ok(list);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/save",
    method: ["POST"],
    body: ({ body }) => {
      const data = bodyOf(body) || {};
      const definition: MockProcessDefinition = {
        id: String(++idSeq),
        key: data.key || "new_process",
        name: data.name || "新流程",
        description: data.description || "",
        category: data.category || "默认",
        version: 1,
        graphData: data.graphData || { nodes: [], edges: [] },
        status: "draft",
        createTime: now(),
        updateTime: now(),
      };
      db.processDefinitions.push(definition);
      return ok(definition);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:id",
    method: ["GET"],
    body: ({ params }) => {
      const definition = db.processDefinitions.find((p) => p.id === params.id);
      if (!definition) {
        return { code: "404", message: "流程定义不存在", success: false, data: null };
      }
      return ok(definition);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:id",
    method: ["PUT"],
    body: ({ params, body }) => {
      const definition = db.processDefinitions.find((p) => p.id === params.id);
      if (!definition) {
        return { code: "404", message: "流程定义不存在", success: false, data: null };
      }
      const data = bodyOf(body) || {};
      Object.assign(definition, data, { id: definition.id, updateTime: now() });
      return ok(definition);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:id",
    method: ["DELETE"],
    body: ({ params }) => {
      const index = db.processDefinitions.findIndex((p) => p.id === params.id);
      if (index === -1) {
        return { code: "404", message: "流程定义不存在", success: false, data: null };
      }
      db.processDefinitions.splice(index, 1);
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:id/graph",
    method: ["PUT"],
    body: ({ params, body }) => {
      const definition = db.processDefinitions.find((p) => p.id === params.id);
      if (!definition) {
        return { code: "404", message: "流程定义不存在", success: false, data: null };
      }
      const graphData = bodyOf(body);
      if (graphData) {
        definition.graphData = graphData;
        definition.updateTime = now();
      }
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:id/bpmn",
    method: ["GET"],
    body: ({ params }) => {
      const definition = db.processDefinitions.find((p) => p.id === params.id);
      return ok(definition?.bpmnXml || "");
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:id/deploy",
    method: ["POST"],
    body: ({ params, body }) => {
      const definition = db.processDefinitions.find((p) => p.id === params.id);
      if (!definition) {
        return { code: "404", message: "流程定义不存在", success: false, data: null };
      }
      const data = bodyOf(body);
      if (data?.bpmnXml) {
        definition.bpmnXml = data.bpmnXml;
      }
      definition.status = "deployed";
      definition.version = (definition.version || 0) + 1;
      definition.updateTime = now();
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processDefinition/:key/versions",
    method: ["GET"],
    body: ({ params }) => {
      const list = db.processDefinitions.filter((p) => p.key === params.key);
      return ok(list);
    },
  },

  // ==================== 流程实例 ====================
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/start",
    method: ["POST"],
    body: ({ body }) => {
      const data = bodyOf(body) || {};
      const definition = db.processDefinitions.find((p) => p.key === data.key);
      const instance: MockProcessInstance = {
        id: `ins_${Date.now()}`,
        processDefinitionId: definition?.id || "",
        processDefinitionKey: data.key || "",
        processDefinitionName: definition?.name || data.key || "",
        businessKey: data.businessKey || "",
        status: "active",
        startTime: now(),
        variables: data.variables || {},
      };
      db.processInstances.push(instance);
      return ok(instance);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance",
    method: ["GET"],
    body: ({ query }) => {
      const processDefinitionKey = query?.processDefinitionKey
        ? String(query.processDefinitionKey)
        : "";
      const status = query?.status ? String(query.status) : "";
      let list = db.processInstances;
      if (processDefinitionKey) {
        list = list.filter((p) => p.processDefinitionKey === processDefinitionKey);
      }
      if (status) {
        list = list.filter((p) => p.status === status);
      }
      return ok(list);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/:id",
    method: ["GET"],
    body: ({ params }) => {
      const instance = db.processInstances.find((p) => p.id === params.id);
      if (!instance) {
        return { code: "404", message: "流程实例不存在", success: false, data: null };
      }
      return ok(instance);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/:id",
    method: ["DELETE"],
    body: ({ params }) => {
      const index = db.processInstances.findIndex((p) => p.id === params.id);
      if (index !== -1) {
        db.processInstances[index].status = "terminated";
        db.processInstances[index].endTime = now();
      }
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/:id/variables",
    method: ["GET"],
    body: ({ params }) => {
      const instance = db.processInstances.find((p) => p.id === params.id);
      return ok(instance?.variables || {});
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/:id/variables",
    method: ["PUT"],
    body: ({ params, body }) => {
      const instance = db.processInstances.find((p) => p.id === params.id);
      const data = bodyOf(body);
      if (instance && data) {
        instance.variables = { ...(instance.variables || {}), ...data };
      }
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/:id/suspend",
    method: ["POST"],
    body: ({ params }) => {
      const instance = db.processInstances.find((p) => p.id === params.id);
      if (instance) {
        instance.status = "suspended";
      }
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processInstance/:id/activate",
    method: ["POST"],
    body: ({ params }) => {
      const instance = db.processInstances.find((p) => p.id === params.id);
      if (instance) {
        instance.status = "active";
      }
      return ok(null);
    },
  },

  // ==================== 任务 ====================
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processTask",
    method: ["GET"],
    body: ({ query }) => {
      const assignee = query?.assignee ? String(query.assignee) : "";
      const processInstanceId = query?.processInstanceId ? String(query.processInstanceId) : "";
      let list = db.tasks;
      if (assignee) {
        list = list.filter((t) => t.assignee === assignee);
      }
      if (processInstanceId) {
        list = list.filter((t) => t.processInstanceId === processInstanceId);
      }
      return ok(list);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processTask/:id",
    method: ["GET"],
    body: ({ params }) => {
      const task = db.tasks.find((t) => t.id === params.id);
      if (!task) {
        return { code: "404", message: "任务不存在", success: false, data: null };
      }
      return ok(task);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processTask/:id/claim",
    method: ["POST"],
    body: ({ params, body }) => {
      const task = db.tasks.find((t) => t.id === params.id);
      const data = bodyOf(body) || {};
      if (task) {
        task.assignee = data.userId || task.assignee;
        task.status = "claimed";
      }
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processTask/:id/complete",
    method: ["POST"],
    body: ({ params, body }) => {
      const task = db.tasks.find((t) => t.id === params.id);
      if (task) {
        task.status = "completed";
      }
      void body;
      return ok(null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processTask/:id/transfer",
    method: ["POST"],
    body: ({ params, body }) => {
      const task = db.tasks.find((t) => t.id === params.id);
      const data = bodyOf(body) || {};
      if (task) {
        task.assignee = data.targetUserId || task.assignee;
      }
      return ok(null);
    },
  },

  // ==================== 表单 ====================
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processForm",
    method: ["POST"],
    body: ({ body }) => {
      const data = bodyOf(body) || {};
      const form = { id: `form_${Date.now()}`, ...data };
      db.forms.push(form);
      return ok(form);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processForm",
    method: ["GET"],
    body: ({ query }) => {
      const processKey = query?.processKey ? String(query.processKey) : "";
      const taskKey = query?.taskKey ? String(query.taskKey) : "";
      const list = db.forms.filter(
        (f) => (!processKey || f.processKey === processKey) && (!taskKey || f.taskKey === taskKey)
      );
      return ok(list[0] || null);
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processForm/process/:processKey",
    method: ["GET"],
    body: ({ params }) => {
      return ok(db.forms.filter((f) => f.processKey === params.processKey));
    },
  },

  // ==================== 监控统计 ====================
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processMonitor/statistics",
    method: ["GET"],
    body: () => {
      return ok({
        activeInstances: db.processInstances.filter((p) => p.status === "active").length,
        completedInstances: db.processInstances.filter((p) => p.status === "completed").length,
        pendingTasks: db.tasks.filter((t) => t.status !== "completed").length,
        terminatedInstances: db.processInstances.filter((p) => p.status === "terminated").length,
      });
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processMonitor/active-instances",
    method: ["GET"],
    body: () => {
      return ok({
        activeInstances: db.processInstances.filter((p) => p.status === "active").length,
        completedInstances: db.processInstances.filter((p) => p.status === "completed").length,
        pendingTasks: db.tasks.filter((t) => t.status !== "completed").length,
        terminatedInstances: db.processInstances.filter((p) => p.status === "terminated").length,
      });
    },
  },
  {
    url: "/dev-api/lrcore-system/api/v1/workflow/processMonitor/task-statistics",
    method: ["GET"],
    body: () => {
      return ok({
        pending: db.tasks.filter((t) => t.status === "pending").length,
        claimed: db.tasks.filter((t) => t.status === "claimed").length,
        completed: db.tasks.filter((t) => t.status === "completed").length,
      });
    },
  },
]);
