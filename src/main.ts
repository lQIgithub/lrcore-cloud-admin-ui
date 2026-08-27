import { createApp } from "vue";
import App from "./App.vue";

import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/index.scss";
import "uno.css";
import "animate.css";

import { setupDirective } from "@/directives";
import { setupRouter } from "@/router";
import { setupStore } from "@/stores";
import { setupI18n } from "@/lang";
import * as ElementPlusIcons from "@element-plus/icons-vue";
import { setupPermissionGuard } from "@/router/guards/permission";
import { setupSse } from "@/composables";

// SSO OIDC 回调归一化：注册的 redirect_uri 为 history 路径形态（无 #，见 utils/sso.ts 的
// SSO_CALLBACK_PATH），而本 SPA 使用 hash 路由。应用启动前把
//   /sso/oauth-callback?code=..&state=..
// 重写为
//   /#/sso/oauth-callback?code=..&state=..
// 使路由守卫能命中回调路由（生产部署需 Nginx try_files 兜底 index.html）。
// 【关键】此处必须以 location.replace 跳转并【立即 return 停止初始化】：本文件随之继续
// 创建/挂载应用时，hash 路由会以上一文档（history 形态、无 #）的地址初始化为根路由 "/"，
// 未登录的权限守卫会对 "/" 触发 SSO 自动登录 → 授权服务器回跳本回调 → 再次进入本文件，
// 形成“回调 → 重新授权”的无限跳转循环。提前 return 后，浏览器先落地 #/sso/oauth-callback
// 文档，再由其 (pathname="/") 正常挂载应用并命中回调路由处理授权码。
const SSO_CALLBACK_PATH = "/sso/oauth-callback";
if (
  window.location.pathname === SSO_CALLBACK_PATH ||
  window.location.pathname.startsWith(`${SSO_CALLBACK_PATH}/`)
) {
  window.location.replace(
    `${window.location.origin}/#${window.location.pathname}${window.location.search}`
  );
  // 走 else 分支的直接被跳过（不挂载应用），先落地 #/sso/oauth-callback 文档再初始化
} else {
  // ===== 仅非回调文档才初始化 Vue 应用 =====
  bootstrapApp();
}

/** 启动 Vue 应用（仅非 SSO 回调文档执行，避免与回调归一化跳转竞争） */
function bootstrapApp(): void {
  const app = createApp(App);

  setupDirective(app);
  setupI18n(app);
  setupRouter(app);
  setupStore(app);

  Object.entries(ElementPlusIcons).forEach(([name, comp]) => app.component(name, comp));

  setupPermissionGuard();
  setupSse();

  app.mount("#app");
}
