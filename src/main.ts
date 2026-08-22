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
// 使路由守卫能命中回调路由（生产部署需 Nginx try_files 兜底 index.html）
const SSO_CALLBACK_PATH = "/sso/oauth-callback";
if (
  window.location.pathname === SSO_CALLBACK_PATH ||
  window.location.pathname.startsWith(`${SSO_CALLBACK_PATH}/`)
) {
  window.location.replace(
    `${window.location.origin}/#${window.location.pathname}${window.location.search}`
  );
}

const app = createApp(App);

setupDirective(app);
setupI18n(app);
setupRouter(app);
setupStore(app);

Object.entries(ElementPlusIcons).forEach(([name, comp]) => app.component(name, comp));

setupPermissionGuard();
setupSse();

app.mount("#app");
