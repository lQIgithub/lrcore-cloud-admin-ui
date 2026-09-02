/**
 * 节点图标模块 - 图标加载器
 *
 * 针对「自定义上传图片」的加载优化：
 * - 懒加载：仅在节点进入可视区域后（由调用方触发 ensureIconLoaded）才开始预加载，
 *   避免画布外大量图片同时发起请求。
 * - 缓存去重：相同 URL 只发起一次加载，多节点共享状态。
 * - 错误处理：加载失败进入 error 状态，由渲染层展示占位图标。
 * - 订阅机制：状态变化时通知订阅者重新渲染徽标。
 */

export type IconLoadState = "idle" | "loading" | "loaded" | "error";

interface IconRecord {
  state: IconLoadState;
}

const cache = new Map<string, IconRecord>();

/** 订阅者：url 变化时回调 */
type Listener = (url: string, state: IconLoadState) => void;
const listeners = new Set<Listener>();

function notify(url: string, state: IconLoadState) {
  listeners.forEach((cb) => {
    try {
      cb(url, state);
    } catch {
      /* 单个订阅者异常不影响其他订阅者 */
    }
  });
}

/** 订阅图标状态变化，返回取消订阅函数 */
export function subscribeIconState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 获取指定 URL 的加载状态（不触发加载） */
export function getIconLoadState(url: string): IconLoadState {
  if (!url) return "error";
  return cache.get(url)?.state ?? "idle";
}

/**
 * 开始加载指定 URL（幂等，已加载/加载中不重复发起）。
 * 调用方应在节点可见时触发，实现懒加载。
 */
export function ensureIconLoaded(url: string): void {
  if (!url) return;
  const record = cache.get(url);
  if (record && record.state !== "idle") return;

  cache.set(url, { state: "loading" });
  const img = new Image();
  img.onload = () => {
    cache.set(url, { state: "loaded" });
    notify(url, "loaded");
  };
  img.onerror = () => {
    cache.set(url, { state: "error" });
    notify(url, "error");
  };
  img.src = url;
}

/** 重置加载状态（用于错误后重试） */
export function resetIconLoadState(url: string): void {
  cache.delete(url);
  notify(url, "idle");
}
