import { store } from "@/stores";

import AuthAPI from "@/api/auth";
import UserAPI from "@/api/system/user";
import type {
  LoginRequest,
  LoginResult,
  SocialCallbackResult,
  SocialLoginType,
  SmsLoginRequest,
} from "@/api/auth";
import type { UserInfo } from "@/api/system/user";

import { AuthStorage } from "@/utils/auth";
import { usePermissionStoreHook } from "@/stores/permission";
import { useDictStoreHook } from "@/stores/dict";
import { useTagsViewStore } from "@/stores";
import { cleanupSseServices } from "@/composables";

export const useUserStore = defineStore("user", () => {
  // 用户信息
  const userInfo = ref<UserInfo>({} as UserInfo);
  // 记住我状态
  const rememberMe = ref(AuthStorage.getRememberMe());

  /**
   * 应用登录结果（保存令牌并更新“记住我”状态）
   *
   * 注意：axios 响应拦截器已解包 ApiResult，resolve 的即是 data 字段（TokenDto），
   * 不能再多解一层 { data: ... }（否则 accessToken 恒为 undefined，登录成功但不跳转）
   */
  function applyLoginResult(
    result: Pick<LoginResult, "accessToken" | "refreshToken">,
    keepRememberMe: boolean
  ): void {
    rememberMe.value = keepRememberMe;
    AuthStorage.setTokens(result.accessToken, result.refreshToken, rememberMe.value);
  }

  /**
   * 登录（用户名 + 密码）
   */
  async function login(loginRequest: LoginRequest): Promise<void> {
    const result = await AuthAPI.login(loginRequest);
    applyLoginResult(result, loginRequest.rememberMe ?? false);
  }

  /**
   * 登录（短信验证码）
   */
  async function loginBySms(smsRequest: SmsLoginRequest): Promise<void> {
    const result = await AuthAPI.loginBySms(smsRequest);
    applyLoginResult(result, smsRequest.rememberMe ?? false);
  }

  /**
   * 登录（第三方 OAuth：微信 / QQ / GitHub / Gitee）
   */
  /**
   * 第三方扫码回调登录
   *
   * - 已绑定：写入平台令牌并返回结果（bound=true + token）
   * - 未绑定（首次）：返回 pending 信息（bound=false + pendingToken/openId/昵称），
   *   由调用方展示绑定表单，提交后走 socialBind
   */
  async function socialCallbackLogin(
    platform: SocialLoginType,
    code: string,
    state: string
  ): Promise<SocialCallbackResult> {
    const result = await AuthAPI.socialCallback({ platform, code, state });
    if (result.bound && result.token) {
      applyLoginResult(result.token, AuthStorage.getRememberMe());
    }
    return result;
  }

  /**
   * 第三方账号绑定并登录（首次扫码，未绑定场景）
   */
  async function socialBind(
    pendingToken: string,
    platform: SocialLoginType,
    username: string,
    password: string
  ): Promise<void> {
    const token = await AuthAPI.socialBind({ pendingToken, platform, username, password });
    applyLoginResult(token, AuthStorage.getRememberMe());
  }

  let refreshPromise: Promise<void> | null = null;

  /**
   * 刷新 token（单飞模式）
   *
   * 多个并发请求遇到 token 过期时，共享同一次 refresh 请求。
   */
  function refreshTokenOnce(): Promise<void> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = doRefreshToken().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  /**
   * 获取用户信息
   */
  async function getUserInfo(): Promise<UserInfo> {
    const data = await UserAPI.getInfo();
    if (!data) {
      throw new Error("Verification failed, please Login again.");
    }
    Object.assign(userInfo.value, data);
    return data;
  }

  /**
   * 登出
   */
  async function logout(): Promise<void> {
    await AuthAPI.logout();
    resetAllState();
  }

  /**
   * 重置所有系统状态
   *
   * 统一处理所有清理工作，包括用户凭证、路由、缓存等
   */
  function resetAllState(): void {
    // 1. 重置用户状态
    resetUserState();

    // 2. 重置其他模块状态
    usePermissionStoreHook().resetRouter();
    useDictStoreHook().clearDictCache();
    useTagsViewStore().delAllViews();

    // 3. 清理 SSE 连接
    cleanupSseServices();
  }

  /**
   * 重置用户状态
   *
   * 仅处理用户模块内的状态
   */
  function resetUserState(): void {
    AuthStorage.clearAuth();
    userInfo.value = {} as UserInfo;
  }

  /**
   * 刷新 token
   */
  async function doRefreshToken(): Promise<void> {
    const currentRefreshToken = AuthStorage.getRefreshToken();

    if (!currentRefreshToken) {
      throw new Error("没有有效的刷新令牌");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await AuthAPI.refreshToken(currentRefreshToken);
    AuthStorage.setTokens(accessToken, newRefreshToken, AuthStorage.getRememberMe());
  }

  return {
    userInfo,
    rememberMe,
    isLoggedIn: () => !!AuthStorage.getAccessToken(),
    login,
    loginBySms,
    socialCallbackLogin,
    socialBind,
    logout,
    getUserInfo,
    resetAllState,
    resetUserState,
    refreshToken: doRefreshToken,
    refreshTokenOnce,
  };
});

/**
 * 在组件外部使用 UserStore 的钩子函数
 *
 * @see https://pinia.vuejs.org/core-concepts/outside-component-usage.html
 */
export function useUserStoreHook() {
  return useUserStore(store);
}
