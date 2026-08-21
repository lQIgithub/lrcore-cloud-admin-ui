import request from "@/utils/request";
import type {
  CaptchaInfo,
  LoginRequest,
  LoginResult,
  SocialAuthorizeResult,
  SocialBindRequest,
  SocialCallbackResult,
  SocialLoginType,
  SocialTokenDto,
  SmsLoginRequest,
} from "./types.d";

const CAPTCHA_BASE_URL = "/api/v1/auth";
const AUTH_BASE_URL = "/lrcore-auth/api/v1/auth";

const AuthAPI = {
  login(data: LoginRequest) {
    const payload: Pick<
      LoginRequest,
      "username" | "password" | "captchaId" | "captchaCode" | "tenantId"
    > = {
      username: data.username,
      password: data.password,
      captchaId: data.captchaId,
      captchaCode: data.captchaCode,
    };

    // 仅多租户场景传入 tenantId
    if (typeof data.tenantId !== "undefined") {
      payload.tenantId = data.tenantId;
    }

    return request<unknown, LoginResult>({
      url: `${AUTH_BASE_URL}/login`,
      method: "post",
      data: payload,
    });
  },

  /**
   * 发送短信验证码
   *
   * @param phone 手机号
   */
  sendSmsCode(phone: string) {
    return request<unknown, null>({
      url: `${AUTH_BASE_URL}/sms-code`,
      method: "post",
      params: { phone },
    });
  },

  /**
   * 短信验证码登录
   *
   * @param data 短信登录参数
   */
  loginBySms(data: SmsLoginRequest) {
    const payload: Pick<SmsLoginRequest, "phone" | "smsCode"> &
      Partial<Pick<SmsLoginRequest, "tenantId">> = {
      phone: data.phone,
      smsCode: data.smsCode,
    };

    // 仅多租户场景传入 tenantId
    if (typeof data.tenantId !== "undefined") {
      payload.tenantId = data.tenantId;
    }

    return request<unknown, LoginResult>({
      url: `${AUTH_BASE_URL}/sms-login`,
      method: "post",
      data: payload,
    });
  },

  /**
   * 发起第三方授权（生成服务端 state，返回授权页 URL）
   *
   * - wechat：返回 qrconnect 二维码页 URL（iframe 渲染）
   * - 其他平台：返回平台授权页 URL（整体跳转）
   *
   * @param platform 第三方平台（wechat/qq/github/gitee）
   */
  socialAuthorize(platform: SocialLoginType) {
    return request<unknown, SocialAuthorizeResult>({
      url: `${AUTH_BASE_URL}/social/authorize`,
      method: "get",
      params: { platform },
    });
  },

  /**
   * 第三方扫码回调（code + state 换平台令牌 / 未绑定时返回 pending）
   *
   * @param data 平台 + 授权码 + state
   */
  socialCallback(data: { platform: SocialLoginType; code: string; state: string }) {
    return request<unknown, SocialCallbackResult>({
      url: `${AUTH_BASE_URL}/social/callback`,
      method: "get",
      params: data,
    });
  },

  /**
   * 绑定本地账号并登录（首次扫码，未绑定场景）
   *
   * @param data 绑定凭据 + 本地账号凭据
   */
  socialBind(data: SocialBindRequest) {
    return request<unknown, SocialTokenDto>({
      url: `${AUTH_BASE_URL}/social/bind`,
      method: "post",
      data,
    });
  },

  switchTenant(tenantId: number) {
    return request<unknown, LoginResult>({
      url: `${AUTH_BASE_URL}/switch-tenant`,
      method: "post",
      params: { tenantId },
    });
  },

  refreshToken(refreshToken: string) {
    return request<unknown, LoginResult>({
      url: `${AUTH_BASE_URL}/refresh-token`,
      method: "post",
      params: { refreshToken },
      headers: {
        Authorization: "no-auth",
      },
    });
  },

  logout() {
    return request({
      url: `${AUTH_BASE_URL}/logout`,
      method: "delete",
    });
  },

  getCaptcha() {
    return request<unknown, CaptchaInfo>({
      url: `${CAPTCHA_BASE_URL}/captcha`,
      method: "get",
    });
  },
};

export default AuthAPI;

// 重导出类型
export * from "./types.d";
