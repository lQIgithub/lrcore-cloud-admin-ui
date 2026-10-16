import { describe, expect, it } from "vitest";
import { resolveRoutePath } from "./route";

describe("resolveRoutePath", () => {
  it("解析系统管理子菜单的完整路径", () => {
    const systemPath = resolveRoutePath("", "/system");

    expect(resolveRoutePath(systemPath, "user")).toBe("/system/user");
    expect(resolveRoutePath(systemPath, "role")).toBe("/system/role");
    expect(resolveRoutePath(systemPath, "menu")).toBe("/system/menu");
  });

  it("支持绝对路径、根路径和外链", () => {
    expect(resolveRoutePath("/system", "/system/user")).toBe("/system/user");
    expect(resolveRoutePath("", "dashboard")).toBe("/dashboard");
    expect(resolveRoutePath("/system", "https://example.com")).toBe("https://example.com");
    expect(resolveRoutePath("https://example.com", "user")).toBe("https://example.com");
  });
});
