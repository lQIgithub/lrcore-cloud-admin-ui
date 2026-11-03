import { ElMessage, type MessageType } from "element-plus";
import { h } from "vue";

type ApiNotice = {
  message: string;
  type: MessageType;
};

const noticeWindow: ApiNotice[] = [];
const recentNoticeKeys = new Set<string>();
let flushTimer: number | undefined;

export function showApiNotification(
  message: string,
  type: MessageType = "error",
  duration = 5000
): void {
  const key = `${type}:${message}`;
  if (recentNoticeKeys.has(key)) return;
  recentNoticeKeys.add(key);
  window.setTimeout(() => recentNoticeKeys.delete(key), duration);

  if (!noticeWindow.some((notice) => notice.message === message && notice.type === type)) {
    noticeWindow.push({ message, type });
  }

  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    const notices = noticeWindow.splice(0);
    if (!notices.length) return;

    const messageText =
      notices.length > 1
        ? notices.map((notice) => `• ${notice.message}`).join("\n")
        : notices[0].message;
    const hasError = notices.some((notice) => notice.type === "error");

    ElMessage({
      message:
        notices.length > 1
          ? h(
              "div",
              { class: "api-message-list" },
              notices.map((notice) => h("div", notice.message))
            )
          : notices[0].message,
      type: hasError ? "warning" : notices[0].type,
      duration,
    });
  }, 600);
}
