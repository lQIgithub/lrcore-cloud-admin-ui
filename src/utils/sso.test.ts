/**
 * sso.ts 单元测试（SSO 单点登录 OIDC + PKCE 前端工具）
 *
 * 覆盖：PKCE 生成与 S256 挑战（RFC 7636 附录 B 向量）、base64url、
 * 授权 URL / 登出 URL 构造、state 一次性校验（防重放）、id_token 存取语义。
 */

import { webcrypto } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEYS } from "@/constants";
import { Storage } from "@/utils/storage";
import {
  SSO_CALLBACK_PATH,
  SSO_CLIENT_ID,
  SSO_ISSUER,
  SSO_REDIRECT_URI,
  SsoStorage,
  base64UrlEncode,
  buildAuthorizeUrl,
  buildSsoLogoutUrl,
  generateCodeVerifier,
  generateState,
  isSasToken,
  sha256Challenge,
} from "@/utils/sso";

// jsdom 的 crypto 可能不含 subtle，借用 Node WebCrypto 保证 S256 可计算
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis.crypto, "subtle", {
      value: webcrypto.subtle,
      configurable: true,
    });
  }
});

// 每个用例前清空两个 storage（SsoStorage 读写均落在这两个 store 上）
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function makeJwt(alg: string): string {
  const header = btoa(JSON.stringify({ alg, typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payload = btoa(JSON.stringify({ sub: "1" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${payload}.sig`;
}

describe("base64UrlEncode", () => {
  it("输出无填充的 base64url（- 与 _ 替换 + 与 /）", () => {
    // 0xfb 0xff → 标准 base64 为 "+/8="，base64url 无填充为 "-_8"
    expect(base64UrlEncode(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
  });

  it("ASCII 常规内容编码正确", () => {
    const bytes = new TextEncoder().encode("hello");
    expect(base64UrlEncode(bytes)).toBe("aGVsbG8");
  });
});

describe("PKCE", () => {
  it("generateCodeVerifier 生成 43 字符（32 字节 base64url 无填充）", () => {
    const v = generateCodeVerifier();
    expect(v).toHaveLength(43);
    expect(v).not.toMatch(/[+/=]/);
  });

  it("generateState 生成 22 字符且每次不同", () => {
    const a = generateState();
    const b = generateState();
    expect(a).toHaveLength(22);
    expect(a).not.toBe(b);
  });

  it("sha256Challenge 符合 RFC 7636 附录 B 向量", async () => {
    // RFC 7636 Appendix B
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    await expect(sha256Challenge(verifier)).resolves.toBe(expected);
  });
});

describe("buildAuthorizeUrl", () => {
  it("包含授权码流程全部必需参数（公共客户端 + PKCE）", () => {
    const url = buildAuthorizeUrl({ state: "s1", challenge: "c1" });
    const [base, query] = url.split("?");
    expect(base).toBe(`${SSO_ISSUER}/oauth2/authorize`);
    const params = new URLSearchParams(query);
    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe(SSO_CLIENT_ID);
    expect(params.get("redirect_uri")).toBe(SSO_REDIRECT_URI);
    expect(params.get("scope")).toBe("openid profile");
    expect(params.get("state")).toBe("s1");
    expect(params.get("code_challenge")).toBe("c1");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("prompt")).toBeNull();
  });

  it("prompt=none 时携带静默再授权参数", () => {
    const url = buildAuthorizeUrl({ prompt: "none", state: "s2", challenge: "c2" });
    expect(new URLSearchParams(url.split("?")[1]).get("prompt")).toBe("none");
  });
});

describe("回调地址契约", () => {
  it("redirect_uri 为 history 形态（origin + 回调路径，无 #），与注册客户端逐字一致", () => {
    expect(SSO_CALLBACK_PATH).toBe("/sso/oauth-callback");
    expect(SSO_REDIRECT_URI).toBe(`${window.location.origin}${SSO_CALLBACK_PATH}`);
    expect(SSO_REDIRECT_URI).not.toContain("#");
  });
});

describe("SsoStorage（state / verifier / id_token）", () => {
  it("setPending + verifyState 一次性消费成功；重复校验失败", () => {
    SsoStorage.setPending("state-abc", "verifier-xyz", "/dashboard");
    expect(SsoStorage.verifyState("state-abc")).toBe(true);
    // state 已消费：再次校验失败（防重放）
    expect(SsoStorage.verifyState("state-abc")).toBe(false);
  });

  it("state 不匹配时返回 false 并清理", () => {
    SsoStorage.setPending("state-abc", "verifier-xyz", "/");
    expect(SsoStorage.verifyState("state-evil")).toBe(false);
    expect(SsoStorage.getCodeVerifier()).toBe("");
  });

  it("校验成功后 verifier 保留到 clearPending（换码前可取）", () => {
    SsoStorage.setPending("s", "v", "/x");
    SsoStorage.verifyState("s");
    expect(SsoStorage.getCodeVerifier()).toBe("v");
    SsoStorage.clearPending();
    expect(SsoStorage.getCodeVerifier()).toBe("");
  });

  it("redirect 目标读取与清理", () => {
    SsoStorage.setPending("s", "v", "/system/user?tab=1");
    SsoStorage.verifyState("s");
    expect(SsoStorage.getRedirect()).toBe("/system/user?tab=1");
    SsoStorage.clearRedirect();
    expect(SsoStorage.getRedirect()).toBe("/");
  });

  it("id_token 遵循“记住我”语义（默认 sessionStorage，记住我后 localStorage）", () => {
    // 默认（未记住我）：sessionStorage
    SsoStorage.setIdToken("id-1");
    expect(Storage.sessionGet(STORAGE_KEYS.SSO_ID_TOKEN, "")).toBe("id-1");
    expect(Storage.get(STORAGE_KEYS.SSO_ID_TOKEN, "")).toBe("");

    // 记住我：迁移到 localStorage
    Storage.set(STORAGE_KEYS.REMEMBER_ME, true);
    SsoStorage.setIdToken("id-2");
    expect(Storage.get(STORAGE_KEYS.SSO_ID_TOKEN, "")).toBe("id-2");
    expect(Storage.sessionGet(STORAGE_KEYS.SSO_ID_TOKEN, "")).toBe("");

    SsoStorage.clearAll();
    expect(Storage.get(STORAGE_KEYS.SSO_ID_TOKEN, "")).toBe("");
    expect(Storage.sessionGet(STORAGE_KEYS.SSO_ID_TOKEN, "")).toBe("");
  });
});

describe("isSasToken", () => {
  it("RS256 JWT 判定为新轨", () => {
    expect(isSasToken(makeJwt("RS256"))).toBe(true);
  });

  it("HS512 旧轨双令牌判定为 false", () => {
    expect(isSasToken(makeJwt("HS512"))).toBe(false);
  });

  it("空值 / 非法格式判定为 false", () => {
    expect(isSasToken("")).toBe(false);
    expect(isSasToken(null)).toBe(false);
    expect(isSasToken("not-a-jwt")).toBe(false);
    expect(isSasToken("a.!!!.c")).toBe(false);
  });
});

describe("buildSsoLogoutUrl", () => {
  it("指向 AS 前通道登出端点并携带回跳与 id_token_hint", () => {
    const url = buildSsoLogoutUrl("id-token-abc");
    const [base, query] = url.split("?");
    expect(base).toBe(`${SSO_ISSUER}/connect/logout`);
    const params = new URLSearchParams(query);
    expect(params.get("post_logout_redirect_uri")).toBe(`${window.location.origin}/login`);
    expect(params.get("id_token_hint")).toBe("id-token-abc");
  });

  it("无 id_token 时不携带 id_token_hint（匿名前通道登出）", () => {
    const url = buildSsoLogoutUrl("");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("id_token_hint")).toBeNull();
    expect(params.get("post_logout_redirect_uri")).toBe(`${window.location.origin}/login`);
  });
});
