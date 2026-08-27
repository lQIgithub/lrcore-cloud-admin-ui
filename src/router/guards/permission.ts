import type { RouteRecordRaw } from "vue-router";
import NProgress from "@/plugins/nprogress";
import router from "@/router";
import { usePermissionStore, useUserStore } from "@/stores";
import { useTenantStoreHook } from "@/stores/tenant";
import { isTenantEnabled } from "@/utils/tenant";
import { startSsoLogin } from "@/utils/sso";
import { appConfig } from "@/settings";

/**
 * 路由权限守卫
 *
 * 处理登录验证、动态路由生成、404检测等
 */
export function setupPermissionGuard() {
  const whiteList = ["/login", "/sso/callback", "/sso/oauth-callback"];

  router.beforeEach(async (to, _from) => {
    NProgress.start();

    try {
      const isLoggedIn = useUserStore().isLoggedIn();

      // 未登录处理
      if (!isLoggedIn) {
        // 白名单路由直接放行（登录页 / 回调页不参与鉴权）
        if (whiteList.includes(to.path)) {
          return;
        }
        NProgress.done();
        // SSO 自动登录：未登录访问受保护路由时，不再停在登录页，
        // 直接发起 SSO 授权码流程（AS 有会话 → 免登直达；无会话 → AS 登录后回跳）。
        if (appConfig.autoSsoLogin) {
          try {
            // startSsoLogin 内部单飞互斥：成功发起则整页跳转 AS（返回 true），
            // 已有其它在途 SSO 流程（如 401 静默再授权）则不发起、交由该流程承接（返回 false）。
            await startSsoLogin(to.fullPath);
          } catch (error) {
            // 非安全上下文等场景下无法计算 PKCE，回退登录页并给出可见提示
            console.error("[guard] 自动 SSO 登录失败:", error);
            return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
          }
          return false;
        }
        return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
      }

      // 已登录访问登录页，重定向到首页
      if (to.path === "/login") {
        return { path: "/" };
      }

      const permissionStore = usePermissionStore();
      const userStore = useUserStore();

      // 动态路由生成
      if (!permissionStore.isRouteGenerated) {
        if (!userStore.userInfo?.roles?.length) {
          await userStore.getUserInfo();
        }

        // 加载用户租户列表（VITE_APP_TENANT_ENABLED=true 时生效）
        await initTenantContext();

        const dynamicRoutes = await permissionStore.generateRoutes();
        dynamicRoutes.forEach((route: RouteRecordRaw) => {
          router.addRoute(route);
        });

        return { ...to, replace: true };
      }

      // 路由 404 检查
      if (to.matched.length === 0) {
        // 从登录页跳转且目标路径无效，回退首页（避免不同用户权限不同导致的 404）
        if (_from.path === "/login") {
          return { path: "/", replace: true };
        }
        return "/404";
      }

      // 动态标题
      const title = (to.params.title as string) || (to.query.title as string);
      if (title) {
        to.meta.title = title;
      }
    } catch (error) {
      console.error("Route guard error:", error);
      await useUserStore().resetAllState();
      NProgress.done();
      return "/login";
    }
  });

  router.afterEach(() => {
    NProgress.done();
  });
}

/** 初始化多租户上下文，未启用或失败时静默跳过 */
async function initTenantContext(): Promise<void> {
  if (!isTenantEnabled()) return;

  try {
    await useTenantStoreHook().loadTenant();
  } catch {
    // 静默失败，不影响主流程
  }
}
