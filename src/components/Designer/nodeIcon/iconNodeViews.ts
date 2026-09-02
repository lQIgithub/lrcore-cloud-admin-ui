/**
 * 节点图标模块 - 图标节点视图
 *
 * 为 RectNode / CircleNode / PolygonNode 提供带「右上角图标徽标」的视图变体：
 * - getShape() 在原有形状外层包裹 <g> 并追加徽标
 * - 徽标位于画布绝对坐标（与节点形状同坐标系），随节点移动/缩放自动保持相对位置
 * - 自定义上传图片懒加载：节点进入视口（IntersectionObserver）后才开始预加载
 * - 订阅图标加载状态，加载完成/失败后自动重渲染徽标
 */

import { h } from "@logicflow/core";
import type LogicFlow from "@logicflow/core";
import { CircleNode, RectNode, PolygonNode } from "@logicflow/core";
import { buildNodeIconBadge, type IconBadgeModelLike } from "./renderIcon";
import { ensureIconLoaded, subscribeIconState } from "./iconLoader";
import { resolveNodeIcon, subscribeFlowIconConfig } from "./iconResolver";

/** 徽标所需的图模型字段（结构化，避免依赖 GraphModel 完整类型） */
interface IconBadgeGraphModelLike {
  eventCenter: { emit: (event: string, payload?: unknown) => void };
}

/** 获取节点生效的自定义图标 URL（无则返回空串） */
function getNodeCustomIconUrl(model: IconBadgeModelLike): string {
  const config = resolveNodeIcon(model.type as never, model.properties);
  if (config && config.iconType === "custom") return config.iconValue;
  return "";
}

/**
 * 节点视图构造器类型（结构化）。
 * 仅声明图标徽标所需字段，规避 RectNode/CircleNode/PolygonNode 泛型构造签名的差异，
 * 同时将 getShape 视为普通方法（非抽象），规避 super 调用抽象方法的报错。
 */
type IconNodeViewCtor = new (...args: unknown[]) => {
  props: { model: IconBadgeModelLike; graphModel: IconBadgeGraphModelLike };
  base?: Element | Text | undefined;
  forceUpdate(): void;
  componentDidMount?(): void;
  componentDidUpdate?(): void;
  componentWillUnmount?(): void;
  getShape(): unknown;
};

/**
 * 为节点视图类混入图标徽标能力，返回新的视图类。
 * 不修改原类，避免影响其它使用内置视图的注册。
 */
export function withIconBadge<NodeView extends IconNodeViewCtor>(NodeClass: NodeView): NodeView {
  class IconBadgeNode extends NodeClass {
    /** 取消图标状态订阅 */
    private _iconUnsubscribe: (() => void) | undefined;
    /** 取消类型级图标配置订阅 */
    private _iconConfigUnsubscribe: (() => void) | undefined;
    /** 懒加载观察器 */
    private _iconObserver: IntersectionObserver | null = null;
    /** 当前已触发的自定义图标 URL */
    private _iconUrl = "";

    getShape() {
      const shape = super.getShape() as ReturnType<typeof h>;
      const badge = buildNodeIconBadge(this.props.model, this.props.graphModel);
      // 无有效图标时保持原形状，避免多包一层 <g>
      return badge ? h("g", { className: "lf-node-icon-badge-wrap" }, [shape, badge]) : shape;
    }

    /** 同步自定义图标 URL 的懒加载（URL 变化时重新观察） */
    private _syncIconLoad() {
      const model = this.props?.model;
      if (!model) return;
      const url = getNodeCustomIconUrl(model);
      if (!url) return;

      if (url === this._iconUrl) return;
      this._iconUrl = url;

      this._iconObserver?.disconnect();
      this._iconObserver = null;

      if (typeof IntersectionObserver !== "undefined" && this.base instanceof Element) {
        this._iconObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              ensureIconLoaded(url);
              this._iconObserver?.disconnect();
              this._iconObserver = null;
            }
          });
        });
        this._iconObserver.observe(this.base);
      } else {
        // 不支持 IntersectionObserver 或挂载元素非 Element 时退化为立即加载
        ensureIconLoaded(url);
      }
    }

    componentDidMount() {
      super.componentDidMount?.();
      this._syncIconLoad();
      // 订阅加载状态：当前节点自定义图标加载完成/失败后重渲染徽标
      this._iconUnsubscribe = subscribeIconState(() => {
        if (this.props?.model && getNodeCustomIconUrl(this.props.model)) {
          this.forceUpdate();
        }
      });
      // 订阅类型级默认图标变化：重渲染徽标并同步懒加载
      this._iconConfigUnsubscribe = subscribeFlowIconConfig(() => {
        this.forceUpdate();
        this._syncIconLoad();
      });
    }

    componentDidUpdate() {
      super.componentDidUpdate?.();
      this._syncIconLoad();
    }

    componentWillUnmount() {
      this._iconObserver?.disconnect();
      this._iconObserver = null;
      this._iconUnsubscribe?.();
      this._iconUnsubscribe = undefined;
      this._iconConfigUnsubscribe?.();
      this._iconConfigUnsubscribe = undefined;
      super.componentWillUnmount?.();
    }
  }

  return IconBadgeNode as unknown as NodeView;
}

/** 图标矩形节点（任务类） */
export const IconRectNode = withIconBadge(RectNode);
/** 图标圆形节点（开始/结束事件） */
export const IconCircleNode = withIconBadge(CircleNode);
/** 图标多边形节点（网关类） */
export const IconPolygonNode = withIconBadge(PolygonNode);

export type { LogicFlow };
