import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";
import { name, version } from "./package.json";

export default defineConfig({
  plugins: [
    vue(),
    // 与 vite.config.ts 保持一致：部分 store（如 stores/user.ts）依赖自动导入的
    // ref/defineStore/ElMessage 等，测试环境缺少该插件会导致模块加载失败
    AutoImport({
      imports: ["vue", "@vueuse/core", "pinia", "vue-router", "vue-i18n"],
      resolvers: [ElementPlusResolver({ importStyle: false })],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      dirs: ["src/components", "src/**/components"],
      dts: false,
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  define: {
    __APP_INFO__: JSON.stringify({ pkg: { name, version } }),
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
