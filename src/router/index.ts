import type { App } from "vue";
import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";

export const Layout = () => import("@/layouts/index.vue");

// 静态路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect.vue"),
      },
    ],
  },

  {
    path: "/login",
    component: () => import("@/views/login/index.vue"),
    meta: { hidden: true },
  },

  {
    path: "/sso/callback",
    name: "SsoCallback",
    component: () => import("@/views/sso/callback.vue"),
    meta: { hidden: true, title: "第三方登录" },
  },

  {
    // SSO 单点登录（OIDC 授权码 + PKCE）回调：
    // 注册的 redirect_uri 为 history 形态（origin + 本路径，无 #），
    // main.ts 在应用启动前将其归一化为 hash URL 后由本路由承接
    path: "/sso/oauth-callback",
    name: "SsoOauthCallback",
    component: () => import("@/views/sso/oauth-callback.vue"),
    meta: { hidden: true, title: "单点登录" },
  },

  {
    path: "/",
    name: "/",
    component: Layout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        // 用于 keep-alive 功能，需要与 SFC 中自动推导或显式声明的组件名称一致
        // 参考文档: https://cn.vuejs.org/guide/built-ins/keep-alive.html#include-exclude
        name: "Dashboard",
        meta: {
          title: "dashboard",
          icon: "homepage",
          affix: true,
          keepAlive: true,
        },
      },
      {
        path: "401",
        component: () => import("@/views/error/401.vue"),
        meta: { hidden: true },
      },
      {
        path: "404",
        component: () => import("@/views/error/404.vue"),
        meta: { hidden: true },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("@/views/profile/index.vue"),
        meta: { title: "个人中心", icon: "user", hidden: true },
      },
      {
        path: "profile/notice",
        name: "MyNotice",
        component: () => import("@/views/profile/notice/index.vue"),
        meta: { title: "我的通知", icon: "user", hidden: true },
      },
      {
        path: "/detail/:id(\\d+)",
        name: "DemoDetail",
        component: () => import("@/views/demo/detail.vue"),
        meta: { title: "详情页缓存", icon: "user", hidden: true, keepAlive: true },
      },
      {
        path: "designer",
        name: "FlowDesigner",
        component: () => import("@/views/logicflow/FlowDesigner.vue"),
        meta: { title: "流程设计器", icon: "user", hidden: true },
      },
      {
        path: "processes",
        name: "ProcessList",
        component: () => import("@/views/logicflow/ProcessList.vue"),
        meta: { title: "流程列表", icon: "user", hidden: true },
      },
    ],
  },

  // 请假工作流静态菜单（用于前置测试，未接入后端菜单时也可直接访问）
  {
    path: "/workflow",
    component: Layout,
    redirect: "/workflow/leave-apply",
    meta: { title: "请假工作流", icon: "el-icon-s-order" },
    children: [
      {
        path: "leave-apply",
        name: "LeaveApply",
        component: () => import("@/views/logicflow/LeaveApply.vue"),
        meta: { title: "发起请假", icon: "el-icon-edit" },
      },
      {
        path: "my-applications",
        name: "MyApplications",
        component: () => import("@/views/logicflow/MyApplications.vue"),
        meta: { title: "我的申请", icon: "el-icon-tickets" },
      },
      {
        path: "todo-tasks",
        name: "TodoTasks",
        component: () => import("@/views/logicflow/TodoTasks.vue"),
        meta: { title: "待办审批", icon: "el-icon-finished" },
      },
    ],
  },
];

/**
 * 创建路由
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes,
  // 刷新时，滚动条位置还原
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局注册 router
export function setupRouter(app: App<Element>) {
  app.use(router);
}

export default router;
