/**
 * Vitest 全局测试环境初始化
 * 补充 jsdom 缺失的浏览器 API
 */

// jsdom 未实现 matchMedia，手动 polyfill
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
