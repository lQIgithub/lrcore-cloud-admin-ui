import { store } from "@/stores";

import AuthAPI from "@/api/auth";
import UserAPI from "@/api/system/user";
import type { SocialCallbackResult, SocialLoginType } from "@/api/auth";
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
   * 应用 SSO（SAS / OIDC）登录结果
   *
   * 与旧轨双令牌的区别：
   * - 公共客户端授权码流程不签发 refresh_token（SAS 7.1），故 refresh 传空；
   * - 额外保存 id_token（前通道登出 id_token_hint 用，与访问令牌同一“记住我”语义）。
   */
  function applySsoLogin(accessToken: string, idToken: string): void {
    AuthStorage.setTokens(accessToken, AuthStorage.getRememberMe());
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
    if (result.bound && result.token?.access_token) {
      await applySsoLogin(result.token.access_token, "");
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
    if (token?.access_token) {
      await applySsoLogin(token.access_token, "");
    }
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
   * 登出（SAS 前通道登出）。
   *
   * 整页跳转 AS /connect/logout，AS 销毁会话、按 principal 撤销全部授权
   * 并发放 back-channel logout_token 通知其他 RP，随后回跳本应用 /login。
   */
  async function logout(): Promise<void> {
    const idToken = SsoStorage.getIdToken();
    resetAllState();
    SsoStorage.clearAll();
    // 整页跳转前通道登出（不等待返回）
    window.location.href = buildSsoLogoutUrl(idToken);
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

  return {
    userInfo,
    rememberMe,
    isLoggedIn: () => !!AuthStorage.getAccessToken(),
    isSas,
    socialCallbackLogin,
    socialBind,
    applySsoLogin,
    silentSsoReauth,
    logout,
    getUserInfo,
    resetAllState,
    resetUserState,
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
