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
import { SsoStorage, buildSsoLogoutUrl, isSasToken, startSsoSilentReauth } from "@/utils/sso";
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
   * 应用 SSO（SAS / OIDC）登录结果
   *
   * 与旧轨双令牌的区别：
   * - 公共客户端授权码流程不签发 refresh_token（SAS 7.1），故 refresh 传空；
   * - 额外保存 id_token（前通道登出 id_token_hint 用，与访问令牌同一“记住我”语义）。
   */
  function applySsoLogin(accessToken: string, idToken: string): void {
    AuthStorage.setTokens(accessToken, "", AuthStorage.getRememberMe());
    if (idToken) {
      SsoStorage.setIdToken(idToken);
    }
  }

  /** 当前访问令牌是否为 SAS（RS256）新轨令牌 */
  function isSas(): boolean {
    return isSasToken(AuthStorage.getAccessToken());
  }

  /**
   * SSO 令牌过期的静默再授权（prompt=none 复用 AS 会话）。
   *
   * 触发整页跳转（不返回）；AS 会话存活时无感换码，失效时由 AS 引导重新登录。
   * @param currentPath 当前系统内路由（成功后恢复）
   */
  async function silentSsoReauth(currentPath: string): Promise<void> {
    await startSsoSilentReauth(currentPath);
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
   * 登出（双轨）
   *
   * - SAS 新轨（RS256）：前通道登出——整页跳转 AS /connect/logout，
   *   AS 销毁会话、按 principal 撤销全部授权并发放 back-channel logout_token
   *   通知其他 RP，随后回跳本应用 /login；
   * - 旧轨（HS512 双令牌）：调用 AuthAPI.logout() 撤销会话后本地清理。
   */
  async function logout(): Promise<void> {
    if (isSas()) {
      const idToken = SsoStorage.getIdToken();
      resetAllState();
      SsoStorage.clearAll();
      // 整页跳转前通道登出（不等待返回）
      window.location.href = buildSsoLogoutUrl(idToken);
      return;
    }
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
    SsoStorage.clearAll();
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
    isSas,
    login,
    loginBySms,
    socialCallbackLogin,
    socialBind,
    applySsoLogin,
    silentSsoReauth,
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
