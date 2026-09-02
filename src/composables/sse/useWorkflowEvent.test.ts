import { describe, it, expect, vi, beforeEach } from "vitest";

type SseHandler = (data: unknown) => void;

// mock 工厂被提升到文件顶部，其依赖必须经 vi.hoisted 提供
const mocks = vi.hoisted(() => {
  const subscribed = new Map<string, SseHandler>();
  const connectMock = vi.fn();
  const ElNotificationMock = vi.fn();
  return { subscribed, connectMock, ElNotificationMock };
});

vi.mock("./useSse", () => ({
  useSse: () => ({
    connect: mocks.connectMock,
    isConnected: { value: true },
    connectionState: { value: "CONNECTED" },
    on: (eventName: string, handler: SseHandler) => {
      mocks.subscribed.set(eventName, handler);
      return () => {
        mocks.subscribed.delete(eventName);
      };
    },
  }),
  cleanupSse: vi.fn(),
  SseConnectionState: {
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
  },
}));

vi.mock("element-plus", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, ElNotification: mocks.ElNotificationMock };
});

import { useWorkflowEvent } from "./useWorkflowEvent";
import type { WorkflowTaskEvent, WorkflowInstanceEvent } from "./useWorkflowEvent";

const { subscribed, connectMock, ElNotificationMock } = mocks;

function emitTask(event: WorkflowTaskEvent) {
  subscribed.get("workflow-task")?.(event);
}

function emitInstance(event: WorkflowInstanceEvent) {
  subscribed.get("workflow-instance")?.(event);
}

const taskEvent = (overrides: Partial<WorkflowTaskEvent> = {}): WorkflowTaskEvent => ({
  type: "created",
  taskId: "101",
  processInstanceId: "55",
  taskName: "审批",
  assigneeId: "8",
  time: 1700000000000,
  ...overrides,
});

const instanceEvent = (overrides: Partial<WorkflowInstanceEvent> = {}): WorkflowInstanceEvent => ({
  type: "completed",
  processInstanceId: "55",
  time: 1700000000000,
  ...overrides,
});

describe("useWorkflowEvent", () => {
  beforeEach(() => {
    subscribed.clear();
    connectMock.mockClear();
    ElNotificationMock.mockClear();
    useWorkflowEvent().cleanup();
  });

  it("initialize 建立 SSE 连接并订阅两类工作流事件", () => {
    useWorkflowEvent().initialize();

    expect(connectMock).toHaveBeenCalled();
    expect(subscribed.has("workflow-task")).toBe(true);
    expect(subscribed.has("workflow-instance")).toBe(true);
  });

  it("新任务（created）累加未读数、记录历史并弹层提醒", () => {
    const { unreadTaskCount, taskEvents } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    emitTask(taskEvent());

    expect(unreadTaskCount.value).toBe(1);
    expect(taskEvents.value).toHaveLength(1);
    expect(taskEvents.value[0].taskId).toBe("101");
    expect(ElNotificationMock).toHaveBeenCalledTimes(1);
    expect(ElNotificationMock.mock.calls[0][0]).toMatchObject({
      title: "新的待办任务",
      type: "success",
    });
  });

  it("任务指派（assigned）同样累加未读数", () => {
    const { unreadTaskCount } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    emitTask(taskEvent({ type: "assigned", taskId: "102" }));

    expect(unreadTaskCount.value).toBe(1);
  });

  it("任务完成/删除不累加未读数，仅记录历史", () => {
    const { unreadTaskCount, taskEvents } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    emitTask(taskEvent({ type: "completed", taskId: "101" }));
    emitTask(taskEvent({ type: "deleted", taskId: "101" }));

    expect(unreadTaskCount.value).toBe(0);
    expect(taskEvents.value).toHaveLength(2);
    expect(ElNotificationMock).not.toHaveBeenCalled();
  });

  it("markTasksRead 清零未读数", () => {
    const { unreadTaskCount, markTasksRead } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    emitTask(taskEvent());
    markTasksRead();

    expect(unreadTaskCount.value).toBe(0);
  });

  it("onWorkflowEvent 回调收到任务与实例事件，且可退订", () => {
    const { onWorkflowEvent } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    const received: unknown[] = [];
    const stop = onWorkflowEvent((event) => received.push(event));

    emitTask(taskEvent());
    emitInstance(instanceEvent());

    stop();
    emitTask(taskEvent({ taskId: "999" }));

    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({ taskId: "101" });
    expect(received[1]).toMatchObject({ processInstanceId: "55", type: "completed" });
  });

  it("实例完成/终止弹层提醒，其余实例事件仅记录", () => {
    const { instanceEvents } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    emitInstance(instanceEvent({ type: "started" }));
    emitInstance(instanceEvent({ type: "completed" }));
    emitInstance(instanceEvent({ type: "cancelled" }));

    expect(instanceEvents.value).toHaveLength(3);
    expect(ElNotificationMock).toHaveBeenCalledTimes(2);
  });

  it("事件历史最多保留 50 条", () => {
    const { taskEvents } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    for (let i = 0; i < 60; i++) {
      emitTask(taskEvent({ taskId: String(i) }));
    }

    expect(taskEvents.value).toHaveLength(50);
    expect(taskEvents.value[0].taskId).toBe("59");
  });

  it("非法事件（缺 taskId/processInstanceId）被忽略", () => {
    const { taskEvents, instanceEvents } = useWorkflowEvent();
    useWorkflowEvent().initialize();

    subscribed.get("workflow-task")?.({ type: "created" } as unknown as WorkflowTaskEvent);
    subscribed.get("workflow-instance")?.({
      type: "completed",
    } as unknown as WorkflowInstanceEvent);

    expect(taskEvents.value).toHaveLength(0);
    expect(instanceEvents.value).toHaveLength(0);
  });

  it("cleanup 退订事件并清空状态", () => {
    const { taskEvents, unreadTaskCount } = useWorkflowEvent();
    useWorkflowEvent().initialize();
    emitTask(taskEvent());

    useWorkflowEvent().cleanup();

    expect(subscribed.has("workflow-task")).toBe(false);
    expect(subscribed.has("workflow-instance")).toBe(false);
    expect(taskEvents.value).toHaveLength(0);
    expect(unreadTaskCount.value).toBe(0);
  });
});
