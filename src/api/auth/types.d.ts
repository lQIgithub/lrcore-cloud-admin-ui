/**
 * 登录请求参数
 */
export interface LoginRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 验证码缓存 key */
  captchaId?: string;
  /** 验证码 */
  captchaCode?: string;
  /** 记住我 */
  rememberMe?: boolean;
  /** 租户 ID */
  tenantId?: number;
}

/**
 * 登录结果
 */
export interface LoginResult {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 令牌类型 */
  tokenType: string;
  /** 过期时间(单位:秒) */
  expiresIn: number;
}

/**
 * 验证码信息
 */
export interface CaptchaInfo {
  /** 验证码缓存 key */
  captchaId: string;
  /** 验证码图片 Base64 */
  captchaBase64: string;
}

/**
 * 短信登录请求参数
 */
export interface SmsLoginRequest {
  /** 手机号 */
  phone: string;
  /** 短信验证码 */
  smsCode: string;
  /** 记住我 */
  rememberMe?: boolean;
  /** 租户 ID */
  tenantId?: number;
}

/**
 * 第三方登录类型
 */
export type SocialLoginType = "wechat" | "qq" | "github" | "gitee";

/**
 * 第三方授权请求结果
 *
 * - wechat：authorizeUrl 为微信 qrconnect 二维码页 URL，可直接作为 iframe src 渲染扫码框
 * - 其他平台：authorizeUrl 为平台授权页 URL，浏览器整体跳转
 */
export interface SocialAuthorizeResult {
  /** 平台编码 */
  platform: string;
  /** 防 CSRF 随机串（服务端生成，回调时原样带回） */
  state: string;
  /** 平台授权页完整 URL */
  authorizeUrl: string;
}

/**
 * 第三方令牌（后端 TokenDto）
 */
export interface SocialTokenDto {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期毫秒数 */
  expireIn?: number;
  /** 令牌类型 */
  tokenType?: string;
}

/**
 * 第三方扫码回调结果
 *
 * - bound=true：已绑定本地账号，token 为平台令牌
 * - bound=false：未绑定（首次），pendingToken 为短时绑定凭据（10 分钟有效、一次性），
 *   前端展示绑定表单，提交 socialBind 完成绑定并登录
 */
export interface SocialCallbackResult {
  /** 是否已绑定本地账号 */
  bound: boolean;
  /** 平台编码 */
  platform: string;
  /** 已绑定时返回的平台令牌 */
  token?: SocialTokenDto;
  /** 未绑定时返回的短时绑定凭据 */
  pendingToken?: string;
  /** 平台侧用户唯一标识（openId） */
  openId?: string;
  /** 平台昵称 */
  nickname?: string;
  /** 平台头像地址 */
  avatarUrl?: string;
}

/**
 * 第三方账号绑定请求
 */
export interface SocialBindRequest {
  /** 回调返回的短时绑定凭据 */
  pendingToken: string;
  /** 平台编码 */
  platform: SocialLoginType;
  /** 本地账号用户名 */
  username: string;
  /** 本地账号密码 */
  password: string;
}
