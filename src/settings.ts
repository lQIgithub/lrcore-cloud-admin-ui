/**
 * 应用配置
 */

import {
  LayoutMode,
  ComponentSize,
  SidebarColor,
  ThemeMode,
  LanguageEnum,
  TagsViewStyle,
} from "@/enums";

const env = import.meta.env;
const { pkg } = __APP_INFO__;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

export const themeColorNames = ["primary", "success", "warning", "danger", "info"] as const;

export type ThemeColorName = (typeof themeColorNames)[number];

export type ThemeColorMap = Record<ThemeColorName, string>;

export interface ThemePalettePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColorMap;
}

export const themePalettePresets = [
  {
    id: "arco",
    name: "ArcoD",
    description: "蓝橙对比清晰，适合现代中后台",
    colors: {
      primary: "#165DFF",
      success: "#00B42A",
      warning: "#FF7D00",
      danger: "#F53F3F",
      info: "#86909C",
    },
  },
  {
    id: "ant-design",
    name: "AntD",
    description: "规范稳重，适合标准业务系统",
    colors: {
      primary: "#1677FF",
      success: "#52C41A",
      warning: "#FAAD14",
      danger: "#FF4D4F",
      info: "#1677FF",
    },
  },
  {
    id: "element-plus",
    name: "ElementD",
    description: "贴近组件默认色识别",
    colors: {
      primary: "#409EFF",
      success: "#67C23A",
      warning: "#E6A23C",
      danger: "#F56C6C",
      info: "#909399",
    },
  },
] as const satisfies readonly ThemePalettePreset[];

export const defaultThemePalette = themePalettePresets[0];

export const appConfig = {
  // 平台展示名：优先取环境变量 VITE_APP_NAME，未配置时回退到 package.json 名称
  name: (env.VITE_APP_NAME as string) || (pkg.name as string),
  version: pkg.version as string,
  title: (env.VITE_APP_TITLE as string) || (env.VITE_APP_NAME as string) || (pkg.name as string),

  // 功能开关
  tenantEnabled: env.VITE_APP_TENANT_ENABLED === "true",

  // 子门户地址：SSO 登录成功后的「子系统选择门户」页（lrcore-auth AS 侧 /sso/portal.html）。
  // 顶栏「返回子门户」入口依赖此配置；留空则不展示该入口
  portalUrl: (env.VITE_APP_PORTAL_URL as string) || "",

  // SSO 自动登录：true 时未登录访问受保护路由将自动走 SSO 授权码流程（免登直达，
  // 不再停在登录页），配合子门户“点击子系统→直接进入后台”的体验。
  // AS 无会话时会先落到 AS 登录页，登录后回跳本系统。
  autoSsoLogin: env.VITE_APP_SSO_AUTO === "true",
} as const;

export const defaults = {
  theme: prefersDark ? ThemeMode.DARK : ThemeMode.LIGHT,
  themePalette: defaultThemePalette.id,
  themeColors: { ...defaultThemePalette.colors },
  sidebarColorScheme: SidebarColor.MINIMAL_WHITE,
  layout: LayoutMode.LEFT,
  size: ComponentSize.DEFAULT,
  language: LanguageEnum.ZH_CN,
  showTagsView: true,
  tagsViewStyle: TagsViewStyle.CARD,
  showAppLogo: true,
  showWatermark: false,
  pageSwitchingAnimation: "fade-slide",
  showSettings: true,
  watermarkContent: appConfig.name,
} as const;
