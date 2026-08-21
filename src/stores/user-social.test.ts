/**
 * user store 第三方（扫码）登录单元测试
 *
 * 覆盖与后端 /api/v1/auth/social 契约对应的 store 逻辑：
 * - socialCallbackLogin：已绑定 → 写入令牌；未绑定 → 返回 pending（不写令牌）；失败 → 抛出
 * - socialBind：绑定请求参数正确 → 成功后写入令牌
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/api/auth", () => ({
  default: {
    socialAuthorize: vi.fn(),
    socialCallback: vi.fn(),
    socialBind: vi.fn(),
    login: vi.fn(),
    loginBySms: vi.fn(),
    sendSmsCode: vi.fn(),
    switchTenant: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    getCaptcha: vi.fn(),
  },
}));

vi.mock("@/api/system/user", () => ({
  default: {
    getInfo: vi.fn(),
    updateLastLoginTime: vi.fn(),
    resetPwd: vi.fn(),
    profile: vi.fn(),
  },
}));

vi.mock("@/utils/auth", () => ({
  AuthStorage: {
    getAccessToken: vi.fn(() => "test-access-token"),
    getRefreshToken: vi.fn(() => "test-refresh-token"),
    setTokens: vi.fn(),
    getRememberMe: vi.fn(() => false),
    setRememberMe: vi.fn(),
    clear: vi.fn(),
  },
  redirectToLogin: vi.fn(),
  hasPerm: vi.fn(() => false),
}));

vi.mock("@/stores/permission", () => ({
  usePermissionStoreHook: vi.fn(() => ({
    routes: [],
    generateRoutes: vi.fn().mockResolvedValue([]),
    refreshPermissions: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/stores/dict", () => ({
  useDictStoreHook: vi.fn(() => ({
    setDict: vi.fn(),
    removeDict: vi.fn(),
  })),
}));

vi.mock("@/stores", () => ({
  store: {},
  useTagsViewStore: vi.fn(() => ({ removeView: vi.fn(), clearCaches: vi.fn() })),
}));

vi.mock("@/composables", () => ({
  cleanupSseServices: vi.fn(),
}));

import AuthAPI from "@/api/auth";
import { AuthStorage } from "@/utils/auth";
import { useUserStore } from "@/stores/user";

// ---------- 测试数据工厂 ----------

const WECHAT_TOKEN = {
  accessToken: "jwt-access",
  refreshToken: "jwt-refresh",
  expireIn: 1800000,
  tokenType: "Bearer",
};

function boundResult() {
  return {
    bound: true,
    platform: "wechat",
    token: WECHAT_TOKEN,
  };
}

function unboundResult() {
  return {
    bound: false,
    platform: "wechat",
    pendingToken: "pending-xyz",
    openId: "openid-001",
    nickname: "微信用户-openid-001",
    avatarUrl: "https://wx.example.com/avatar/openid-001.png",
  };
}

describe("user store 第三方登录", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it("socialCallbackLogin：已绑定 → 写入平台令牌并返回结果", async () => {
    vi.mocked(AuthAPI.socialCallback).mockResolvedValue(boundResult() as never);

    const store = useUserStore();
    const result = await store.socialCallbackLogin("wechat", "code-1", "state-1");

    expect(AuthAPI.socialCallback).toHaveBeenCalledWith({
      platform: "wechat",
      code: "code-1",
      state: "state-1",
    });
    expect(result.bound).toBe(true);
    expect(AuthStorage.setTokens).toHaveBeenCalledWith(
      WECHAT_TOKEN.accessToken,
      WECHAT_TOKEN.refreshToken,
      false
    );
  });

  it("socialCallbackLogin：未绑定（首次扫码）→ 返回 pending，不写入令牌", async () => {
    vi.mocked(AuthAPI.socialCallback).mockResolvedValue(unboundResult() as never);

    const store = useUserStore();
    const result = await store.socialCallbackLogin("wechat", "code-2", "state-2");

    expect(result.bound).toBe(false);
    expect(result.pendingToken).toBe("pending-xyz");
    expect(result.openId).toBe("openid-001");
    expect(AuthStorage.setTokens).not.toHaveBeenCalled();
  });

  it("socialCallbackLogin：业务失败（state 失效等）→ 向上抛出", async () => {
    // 请求拦截器在 success=false 时 reject(Error(message))
    vi.mocked(AuthAPI.socialCallback).mockRejectedValue(new Error("登录状态已失效，请重新扫码"));

    const store = useUserStore();
    await expect(store.socialCallbackLogin("wechat", "code-3", "state-3")).rejects.toThrow(
      "登录状态已失效，请重新扫码"
    );
    expect(AuthStorage.setTokens).not.toHaveBeenCalled();
  });

  it("socialBind：提交正确参数，成功后写入令牌", async () => {
    vi.mocked(AuthAPI.socialBind).mockResolvedValue(WECHAT_TOKEN as never);

    const store = useUserStore();
    await store.socialBind("pending-xyz", "wechat", "admin", "Lr@123456.");

    expect(AuthAPI.socialBind).toHaveBeenCalledWith({
      pendingToken: "pending-xyz",
      platform: "wechat",
      username: "admin",
      password: "Lr@123456.",
    });
    expect(AuthStorage.setTokens).toHaveBeenCalledWith(
      WECHAT_TOKEN.accessToken,
      WECHAT_TOKEN.refreshToken,
      false
    );
  });

  it("socialBind：密码错误等业务失败 → 向上抛出且不写入令牌", async () => {
    vi.mocked(AuthAPI.socialBind).mockRejectedValue(new Error("用户名或密码错误"));

    const store = useUserStore();
    await expect(
      store.socialBind("pending-xyz", "wechat", "admin", "wrong-password")
    ).rejects.toThrow("用户名或密码错误");
    expect(AuthStorage.setTokens).not.toHaveBeenCalled();
  });
});
