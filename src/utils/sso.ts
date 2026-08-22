/**
 * SSO 单点登录（OIDC 授权码 + PKCE）前端工具
 *
 * 设计（双轨并行之新轨，详见《SSO单点登录流程计划》）：
 * - 本 SPA 是授权服务器（lrcore-auth 内嵌 Spring Authorization Server）注册的
 *   <b>公共客户端</b>（client_id = web-admin-spa，无密钥，强制 PKCE/S256）；
 * - 令牌端点由浏览器直接访问 AS issuer（不经网关）；
 * - [SAS 7.1] 公共客户端授权码流程<b>不签发 refresh_token</b>（OAuth 2.1 / RFC 9700 方向），
 *   访问令牌（30 分钟）过期后走 {@link startSsoSilentReauth} 静默再授权
 *   （prompt=none + AS 会话 Cookie 存活时零交互换码）；
 * - 登出走 OIDC 前通道（front-channel）：整页跳转 /connect/logout
 *   （AS 销毁会话 + 按 principal 撤销全部授权 + 回跳登录页）。
 */
import { STORAGE_KEYS } from "@/constants";
import { Storage } from "./storage";

/** 授权服务器 issuer（dev 直连 lrcore-auth :10802；可用 VITE_SSO_ISSUER 覆盖） */
export const SSO_ISSUER: string = import.meta.env.VITE_SSO_ISSUER || "http://localhost:10802";

/** 注册的公共客户端 ID（与 oauth2_registered_client 中 web-admin-spa 一致） */
export const SSO_CLIENT_ID = "web-admin-spa";

/**
 * OIDC 回调地址（history 路径形态，无 #）。
 *
 * 注册的 redirect_uri 为该完整 URL（含 origin）；SAS 换码时按字符串精确比对。
 * SPA 使用 hash 路由，应用启动前（main.ts）会把 history 形态的回调路径
 * 归一化为 `/#/sso/oauth-callback?code=..&state=..`，路由据此命中。
 */
export const SSO_CALLBACK_PATH = "/sso/oauth-callback";

/** 完整回调地址（授权请求与换码请求共用，必须与注册值逐字一致） */
export const SSO_REDIRECT_URI = `${window.location.origin}${SSO_CALLBACK_PATH}`;

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface SsoTokens {
  accessToken: string;
  idToken: string;
  scope: string;
  expiresInSeconds: number;
}

/** base64url 编码（无填充） */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 生成 PKCE code_verifier（43~128 字符，此处取 32 随机字节 base64url ≈ 43 字符） */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * SHA-256 纯 JS 实现（无依赖，32 字节摘要输出）。
 *
 * [兜底] `crypto.subtle` 仅在**安全上下文**可用（HTTPS / localhost / 127.0.0.1）。
 * 开发环境若经局域网 IP（如 `http://192.168.x.x:3000`）访问 SPA，`crypto.subtle`
 * 为 undefined，PKCE 计算会抛 TypeError 且 Vue 点击处理器静默吞掉 ——
 * 表现为"点 SSO 按钮没反应"。此实现在该场景下兜底（PKCE verifier 为一次性
 * 随机量，摘要算法的 JS 实现与 WebCrypto 结果完全一致，无安全降级）。
 */
function sha256Bytes(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const l = data.length;
  const total = Math.ceil((l + 9) / 64) * 64; // 填充到 64 字节倍数（容纳数据 + 0x80 + 8 字节长度）
  const msg = new Uint8Array(total);
  msg.set(data);
  msg[l] = 0x80;
  const dv = new DataView(msg.buffer);
  const bitLen = l * 8;
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(total - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = H[0],
      b = H[1],
      c = H[2],
      d = H[3],
      e = H[4],
      f = H[5],
      g = H[6],
      h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i], false);
  return out;
}

/** SHA-256 → base64url（PKCE code_challenge，S256）。优先 WebCrypto，不可用时走纯 JS 兜底 */
export async function sha256Challenge(verifier: string): Promise<string> {
  const input = new TextEncoder().encode(verifier);
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const digest = await crypto.subtle.digest("SHA-256", input);
      return base64UrlEncode(new Uint8Array(digest));
    }
  } catch {
    // 落入下方纯 JS 兜底
  }
  return base64UrlEncode(sha256Bytes(input));
}

/** 生成随机 state（防 CSRF / 回调配对） */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * 构造 /oauth2/authorize 授权请求 URL。
 *
 * @param options.prompt  缺省不传（有 AS 会话则静默，否则登录页）；
 *                        'none' 用于令牌过期后的静默再授权（无会话则报 interaction_required）
 * @param options.state   随机 state（发起方生成并暂存）
 * @param options.challenge PKCE code_challenge（S256）
 */
export function buildAuthorizeUrl(options: {
  prompt?: "none" | "login" | "consent";
  state: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SSO_CLIENT_ID,
    redirect_uri: SSO_REDIRECT_URI,
    scope: "openid profile",
    state: options.state,
    code_challenge: options.challenge,
    code_challenge_method: "S256",
  });
  if (options.prompt) {
    params.set("prompt", options.prompt);
  }
  return `${SSO_ISSUER}/oauth2/authorize?${params.toString()}`;
}

/**
 * 发起 SSO 登录：生成 PKCE/state 暂存后整页跳转授权端点。
 *
 * @param redirectPath 登录成功（回调换码完成）后要进入的系统内路由（默认首页）
 */
export async function startSsoLogin(redirectPath = "/"): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await sha256Challenge(verifier);
  const state = generateState();
  SsoStorage.setPending(state, verifier, redirectPath);
  window.location.href = buildAuthorizeUrl({ state, challenge });
}

let silentReauthInFlight = false;

/**
 * 静默再授权（令牌过期兜底）：prompt=none 复用 AS 会话零交互换码。
 *
 * - AS 会话存活：直接回调出码，用户无感；
 * - AS 会话已失效：AS 回到登录页（携带原授权请求），用户重新登录后续接。
 * 本函数触发整页跳转，<b>不返回</b>（跳转前调用方不应再有 UI 操作）。
 *
 * @param currentPath 当前系统内路由（换码成功后恢复到此页）
 */
export async function startSsoSilentReauth(currentPath: string): Promise<void> {
  if (silentReauthInFlight) return;
  silentReauthInFlight = true;

  const verifier = generateCodeVerifier();
  const challenge = await sha256Challenge(verifier);
  const state = generateState();
  SsoStorage.setPending(state, verifier, currentPath);
  window.location.href = buildAuthorizeUrl({ prompt: "none", state, challenge });
}

/** 记录本次授权流程的 state / verifier / 目标路由（sessionStorage，回调页消费后清除） */
export const SsoStorage = {
  setPending(state: string, verifier: string, redirect: string): void {
    Storage.sessionSet(STORAGE_KEYS.SSO_STATE, state);
    Storage.sessionSet(STORAGE_KEYS.SSO_CODE_VERIFIER, verifier);
    Storage.sessionSet(STORAGE_KEYS.SSO_REDIRECT, redirect);
  },

  /** 校验并消费 state（一次性）；不匹配返回 false（防重放/CSRF）。
   *  注意：verifier 保留到换码完成后由 {@link clearPending} 清除 */
  verifyState(state: string): boolean {
    const expected = Storage.sessionGet(STORAGE_KEYS.SSO_STATE, "");
    Storage.sessionRemove(STORAGE_KEYS.SSO_STATE);
    if (!expected || expected !== state) {
      this.clearPending();
      return false;
    }
    return true;
  },

  getCodeVerifier(): string {
    return Storage.sessionGet(STORAGE_KEYS.SSO_CODE_VERIFIER, "");
  },

  getRedirect(): string {
    return Storage.sessionGet(STORAGE_KEYS.SSO_REDIRECT, "/");
  },

  clearPending(): void {
    Storage.sessionRemove(STORAGE_KEYS.SSO_STATE);
    Storage.sessionRemove(STORAGE_KEYS.SSO_CODE_VERIFIER);
  },

  /** 目标路由（回调页消费后保留到进入系统，登出时一并清理） */
  clearRedirect(): void {
    Storage.sessionRemove(STORAGE_KEYS.SSO_REDIRECT);
  },

  /** id_token 存取（与访问令牌同一“记住我”语义，供前通道登出 id_token_hint） */
  setIdToken(idToken: string): void {
    const rememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    if (rememberMe) {
      Storage.set(STORAGE_KEYS.SSO_ID_TOKEN, idToken);
      Storage.sessionRemove(STORAGE_KEYS.SSO_ID_TOKEN);
    } else {
      Storage.sessionSet(STORAGE_KEYS.SSO_ID_TOKEN, idToken);
      Storage.remove(STORAGE_KEYS.SSO_ID_TOKEN);
    }
  },

  getIdToken(): string {
    const rememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    return rememberMe
      ? Storage.get(STORAGE_KEYS.SSO_ID_TOKEN, "")
      : Storage.sessionGet(STORAGE_KEYS.SSO_ID_TOKEN, "");
  },

  clearAll(): void {
    Storage.remove(STORAGE_KEYS.SSO_ID_TOKEN);
    Storage.sessionRemove(STORAGE_KEYS.SSO_ID_TOKEN);
    this.clearPending();
    this.clearRedirect();
  },
};

/**
 * code + code_verifier 换令牌（公共客户端：仅 client_id，无密钥）。
 *
 * 直接 POST AS issuer 的 /oauth2/token（form-urlencoded）。
 * 成功返回 {access_token, id_token, ...}；失败抛出 Error（消息为 AS 的 error 描述）。
 */
export async function exchangeCodeForTokens(code: string): Promise<SsoTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SSO_REDIRECT_URI,
    client_id: SSO_CLIENT_ID,
    code_verifier: SsoStorage.getCodeVerifier(),
  });

  const resp = await fetch(`${SSO_ISSUER}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    credentials: "omit",
  });

  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) {
    const error = String(data.error ?? "");
    const description = String(data.error_description ?? "");
    throw new Error(
      `令牌交换失败${error ? `（${error}）` : ""}${description ? `：${description}` : ""}`
    );
  }
  const accessToken = String(data.access_token ?? "");
  const idToken = String(data.id_token ?? "");
  if (!accessToken) {
    throw new Error("令牌响应缺少 access_token");
  }
  return {
    accessToken,
    idToken,
    scope: String(data.scope ?? ""),
    expiresInSeconds: Number(data.expires_in ?? 0),
  };
}

/**
 * 识别新轨 SAS 访问令牌：RS256 签名的 JWT（旧轨 HS512 双令牌为 HS 算法）。
 * 仅解析 header 段（不验签，验签由网关资源服务器完成）。
 */
export function isSasToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    // 仅解析 header 段（parts[0]）读 alg，不验签（验签由网关资源服务器完成）
    const header = JSON.parse(atob((parts[0] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as {
      alg?: string;
    };
    return header.alg === "RS256";
  } catch {
    return false;
  }
}

/**
 * 构造 OIDC 前通道登出 URL（/connect/logout）。
 *
 * AS 校验 id_token_hint → 销毁 AS 会话 → 按 principal 撤销全部授权
 * （含发布 back-channel logout_token 通知其他 RP）→ 302 回跳 post_logout_redirect_uri。
 */
export function buildSsoLogoutUrl(idTokenHint: string): string {
  const params = new URLSearchParams({
    post_logout_redirect_uri: `${window.location.origin}/login`,
  });
  if (idTokenHint) {
    params.set("id_token_hint", idTokenHint);
  }
  return `${SSO_ISSUER}/connect/logout?${params.toString()}`;
}
