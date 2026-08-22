<template>
  <div class="sso-oauth-callback">
    <div class="sso-oauth-callback__card">
      <!-- 1. 处理中 -->
      <div v-if="phase === 'processing'" class="sso-oauth-callback__state">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
        <p>单点登录授权处理中，请稍候…</p>
      </div>

      <!-- 2. 失败 -->
      <div v-else class="sso-oauth-callback__state">
        <el-icon :size="28" color="var(--el-color-danger)"><WarningFilled /></el-icon>
        <p class="sso-oauth-callback__error">{{ errorMessage || "单点登录失败" }}</p>
        <el-button type="primary" size="large" @click="backToLogin">返回登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * SSO 单点登录（OIDC 授权码 + PKCE）回调页
 *
 * 流程：/oauth2/authorize 302 → 本路由 ?code=..&state=..
 * 1) 校验 state（防重放，sessionStorage 一次性消费）；
 * 2) code + code_verifier 直接 POST AS /oauth2/token 换令牌（公共客户端无密钥）；
 * 3) 写入访问令牌 / id_token，按发起时暂存的目标路由进入系统。
 *
 * 令牌过期后的静默再授权（prompt=none）也落在本路由：
 * AS 会话存活 → 无感换码续接；会话失效 → AS 已重定向登录页，不会到达此处。
 */
import { Loading, WarningFilled } from "@element-plus/icons-vue";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useUserStoreHook } from "@/stores";
import { SsoStorage, exchangeCodeForTokens } from "@/utils/sso";

defineOptions({ name: "SsoOauthCallbackPage" });

const route = useRoute();
const router = useRouter();

type Phase = "processing" | "error";

const phase = ref<Phase>("processing");
const errorMessage = ref("");

function backToLogin() {
  SsoStorage.clearAll();
  router.replace("/login");
}

async function handleCallback() {
  const code = route.query.code as string | undefined;
  const state = route.query.state as string | undefined;

  if (!code || !state) {
    phase.value = "error";
    errorMessage.value = "缺少授权码参数，请重新发起单点登录";
    return;
  }

  // state 一次性校验（不匹配 = 重放/跨会话回调，直接拒绝）
  if (!SsoStorage.verifyState(state)) {
    phase.value = "error";
    errorMessage.value = "登录状态校验失败（state 不匹配），请重新发起单点登录";
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await useUserStoreHook().applySsoLogin(tokens.accessToken, tokens.idToken);
    SsoStorage.clearPending();
    const target = SsoStorage.getRedirect() || "/";
    SsoStorage.clearRedirect();
    router.replace(target);
  } catch (error) {
    SsoStorage.clearPending();
    phase.value = "error";
    errorMessage.value =
      error instanceof Error && error.message ? error.message : "单点登录失败，请返回重试";
  }
}

onMounted(handleCallback);
</script>

<style lang="scss" scoped>
.sso-oauth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, var(--bg-color) 0%, var(--el-bg-color-page) 100%);

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 400px;
    padding: 40px 32px;
    background: var(--el-bg-color);
    border-radius: 12px;
    box-shadow: var(--el-box-shadow-light);
  }

  &__state {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    padding: 24px 0;
    color: var(--el-text-color-secondary);

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  &__error {
    color: var(--el-color-danger) !important;
    text-align: center;
  }
}
</style>
