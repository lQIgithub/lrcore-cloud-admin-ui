import { useDictSync } from "./useDictSync";
import { useOnlineCount } from "./useOnlineCount";
import { useWorkflowEvent } from "./useWorkflowEvent";
import { cleanupSse } from "./useSse";

/**
 * 初始化所有 SSE 服务
 */
export function setupSse() {
  const dictSync = useDictSync();
  dictSync.initialize();

  const onlineCount = useOnlineCount();
  onlineCount.initialize();

  const workflowEvent = useWorkflowEvent();
  workflowEvent.initialize();
}

/**
 * 清理所有 SSE 连接
 */
export function cleanupSseServices() {
  const dictSync = useDictSync();
  dictSync.cleanup();

  const onlineCount = useOnlineCount();
  onlineCount.cleanup();

  const workflowEvent = useWorkflowEvent();
  workflowEvent.cleanup();

  cleanupSse();
}

export { useDictSync } from "./useDictSync";
export { useOnlineCount } from "./useOnlineCount";
export { useWorkflowEvent } from "./useWorkflowEvent";
export { useSse, cleanupSse, SseConnectionState } from "./useSse";
export type { DictMessage, DictChangeMessage, DictChangeCallback } from "./useDictSync";
export type { WorkflowTaskEvent, WorkflowInstanceEvent } from "./useWorkflowEvent";
