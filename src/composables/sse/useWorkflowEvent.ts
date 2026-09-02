import { useSse } from "./useSse";

/** 工作流任务事件（后端 Flowable TASK_* / ENTITY_DELETED(Task) → workflow-task） */
export interface WorkflowTaskEvent {
  /** created=新任务 created / assigned=指派转办 / completed=完成 / deleted=删除撤回 */
  type: "created" | "assigned" | "completed" | "deleted";
  taskId: string;
  processInstanceId?: string;
  taskName?: string;
  processDefinitionId?: string;
  taskDefinitionKey?: string;
  assigneeId?: string;
  time?: number;
}

/** 工作流实例事件（后端 Flowable PROCESS_* / ENTITY_* → workflow-instance） */
export interface WorkflowInstanceEvent {
  /** started=启动 / completed=完成 / suspended=挂起 / activated=激活 / cancelled=终止 */
  type: "started" | "completed" | "suspended" | "activated" | "cancelled";
  processInstanceId: string;
  processDefinitionKey?: string;
  businessKey?: string;
  time?: number;
}

type WorkflowEventHandler = (event: WorkflowTaskEvent | WorkflowInstanceEvent) => void;

const MAX_EVENT_HISTORY = 50;
const TASK_EVENT = "workflow-task";
const INSTANCE_EVENT = "workflow-instance";

let singletonInstance: ReturnType<typeof createWorkflowEventComposable> | null = null;

function createWorkflowEventComposable() {
  const sse = useSse();

  /** 最近任务事件（新→旧，最多 50 条） */
  const taskEvents = ref<WorkflowTaskEvent[]>([]);
  /** 最近实例事件（新→旧，最多 50 条） */
  const instanceEvents = ref<WorkflowInstanceEvent[]>([]);
  /** 未读任务数（created/assigned 累加，markTasksRead 清零） */
  const unreadTaskCount = ref(0);

  const workflowEventHandlers = ref<WorkflowEventHandler[]>([]);

  let unsubscribeTask: (() => void) | null = null;
  let unsubscribeInstance: (() => void) | null = null;

  const pushHistory = <T>(list: Ref<T[]>, item: T) => {
    list.value.unshift(item);
    if (list.value.length > MAX_EVENT_HISTORY) {
      list.value.length = MAX_EVENT_HISTORY;
    }
  };

  const notifyHandlers = (event: WorkflowTaskEvent | WorkflowInstanceEvent) => {
    workflowEventHandlers.value.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("[WorkflowEvent] 事件回调执行失败:", error);
      }
    });
  };

  const handleTaskEvent = (data: WorkflowTaskEvent) => {
    if (!data?.taskId) return;
    pushHistory(taskEvents, data);
    if (data.type === "created" || data.type === "assigned") {
      unreadTaskCount.value += 1;
      ElNotification({
        title: "新的待办任务",
        message: data.taskName ? `待办任务「${data.taskName}」已到达` : "您有一条新的待办任务",
        type: "success",
        position: "bottom-right",
      });
    }
    notifyHandlers(data);
  };

  const handleInstanceEvent = (data: WorkflowInstanceEvent) => {
    if (!data?.processInstanceId) return;
    pushHistory(instanceEvents, data);
    if (data.type === "completed" || data.type === "cancelled") {
      ElNotification({
        title: data.type === "completed" ? "流程已完成" : "流程已终止",
        message: `流程实例 ${data.processInstanceId} ${data.type === "completed" ? "已完成" : "已被终止"}`,
        type: data.type === "completed" ? "info" : "warning",
        position: "bottom-right",
      });
    }
    notifyHandlers(data);
  };

  /** 订阅工作流事件（供页面做增量刷新），返回取消订阅函数 */
  const onWorkflowEvent = (handler: WorkflowEventHandler): (() => void) => {
    workflowEventHandlers.value.push(handler);
    return () => {
      const index = workflowEventHandlers.value.indexOf(handler);
      if (index !== -1) {
        workflowEventHandlers.value.splice(index, 1);
      }
    };
  };

  /** 清零未读任务数（待办页打开/刷新后调用） */
  const markTasksRead = () => {
    unreadTaskCount.value = 0;
  };

  const initialize = () => {
    sse.connect();
    if (!unsubscribeTask) {
      unsubscribeTask = sse.on<WorkflowTaskEvent>(TASK_EVENT, handleTaskEvent);
      unsubscribeInstance = sse.on<WorkflowInstanceEvent>(INSTANCE_EVENT, handleInstanceEvent);
    }
  };

  const cleanup = () => {
    if (unsubscribeTask) {
      unsubscribeTask();
      unsubscribeTask = null;
    }
    if (unsubscribeInstance) {
      unsubscribeInstance();
      unsubscribeInstance = null;
    }
    workflowEventHandlers.value = [];
    taskEvents.value = [];
    instanceEvents.value = [];
    unreadTaskCount.value = 0;
  };

  return {
    taskEvents,
    instanceEvents,
    unreadTaskCount,
    isConnected: sse.isConnected,
    connectionState: sse.connectionState,
    onWorkflowEvent,
    markTasksRead,
    initialize,
    cleanup,
  };
}

/**
 * 工作流实时事件组合式函数（单例模式）
 *
 * 复用全局 SSE 通道（useSse），订阅 workflow-task / workflow-instance 事件：
 * - 新任务到达弹层提醒并累计未读数；
 * - 实例完成/终止弹层提醒；
 * - 页面可经 onWorkflowEvent 订阅事件做增量刷新（如流程监控页）。
 */
export function useWorkflowEvent() {
  if (!singletonInstance) {
    singletonInstance = createWorkflowEventComposable();
  }
  return singletonInstance;
}
