<template>
  <div class="sso-callback">
    <div class="sso-callback__card">
      <!-- 1. 处理中 -->
      <div v-if="phase === 'processing'" class="sso-callback__state">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
        <p>第三方登录处理中，请稍候…</p>
      </div>

      <!-- 2. 未绑定 → 绑定本地账号 -->
      <template v-else-if="phase === 'bind' && unbound">
        <el-avatar :size="64" :src="unbound.avatarUrl || undefined" class="sso-callback__avatar">
          <el-icon :size="28"><User /></el-icon>
        </el-avatar>
        <h2 class="sso-callback__title">{{ unbound.nickname || "第三方用户" }}</h2>
        <p class="sso-callback__desc">
          该{{ platformLabel }}账号尚未绑定本地账号，请输入本地账号密码完成绑定并登录
        </p>

        <el-form
          ref="bindFormRef"
          :model="bindForm"
          :rules="bindRules"
          size="large"
          @submit.prevent
        >
          <el-form-item prop="username">
            <el-input
              v-model.trim="bindForm.username"
              placeholder="用户名"
              :prefix-icon="UserIcon"
              @keyup.enter="handleBind"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model.trim="bindForm.password"
              placeholder="密码"
              type="password"
              show-password
              :prefix-icon="LockIcon"
              @keyup.enter="handleBind"
            />
          </el-form-item>
        </el-form>

        <el-button
          type="primary"
          size="large"
          class="sso-callback__btn"
          :loading="binding"
          @click="handleBind"
        >
          绑定并登录
        </el-button>
        <el-button
          size="large"
          class="sso-callback__btn sso-callback__btn--plain"
          @click="backToLogin"
        >
          重新扫码
        </el-button>
      </template>

      <!-- 3. 失败 -->
      <div v-else class="sso-callback__state">
        <el-icon :size="28" color="var(--el-color-danger)"><WarningFilled /></el-icon>
        <p class="sso-callback__error">{{ errorMessage || "第三方登录失败" }}</p>
        <el-button type="primary" size="large" @click="backToLogin">返回登录</el-button>
      </div>
    </div>

    <div class="sso-callback__footer">
      <span class="sso-callback__brand">{{ appConfig.title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Lock, Loading, User, WarningFilled } from "@element-plus/icons-vue";
import type { FormInstance, FormRules } from "element-plus";
import { markRaw, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useUserStoreHook } from "@/stores";
import type { SocialCallbackResult, SocialLoginType } from "@/api/auth";
import { STORAGE_KEYS } from "@/constants";
import { appConfig } from "@/settings";

defineOptions({ name: "SsoCallbackPage" });

const UserIcon = markRaw(User);
const LockIcon = markRaw(Lock);

const route = useRoute();
const router = useRouter();

type Phase = "processing" | "bind" | "error";

const phase = ref<Phase>("processing");
const errorMessage = ref("");
const binding = ref(false);

/** 未绑定信息（openId/昵称/头像 + 短时绑定凭据） */
const unbound = ref<SocialCallbackResult | null>(null);
/** 本次登录的平台（优先取回调 URL 查询参数，其次取发起时写入 sessionStorage 的值） */
const platform = ref<SocialLoginType>("wechat");

const platformLabelMap: Record<SocialLoginType, string> = {
  wechat: "微信",
  qq: "QQ",
  github: "GitHub",
  gitee: "Gitee",
};
const platformLabel = platformLabelMap[platform.value] ?? "第三方";

const bindFormRef = ref<FormInstance>();
const bindForm = reactive({
  username: "",
  password: "",
});

const bindRules: FormRules = {
  username: [{ required: true, trigger: "blur", message: "请输入用户名" }],
  password: [
    { required: true, trigger: "blur", message: "请输入密码" },
    { min: 6, trigger: "blur", message: "密码不能少于6位" },
  ],
};

/** 登录成功后的跳转目标（登录页可通过 redirect 参数透传） */
function redirectTarget(): string {
  const redirect = route.query.redirect as string | undefined;
  return redirect ? decodeURIComponent(redirect) : "/";
}

/**
 * 令牌写入后进入系统
 *
 * 微信扫码场景下本页运行在 iframe 中（qrconnect 页扫码成功后将 iframe 自身
 * 重定向到 redirect_uri）：iframe 与顶层窗口同域、共享 localStorage，令牌已就绪，
 * 直接替换顶层窗口位置即可；其他场景（整页跳转式第三方）在本窗口内跳转。
 */
function enterSystem() {
  const target = window.location.origin + `/#${redirectTarget()}`;
  const top = window.top;
  if (top && window.self !== top) {
    try {
      top.location.replace(target);
      return;
    } catch {
      // 理论上重定向后 iframe 与顶层同域不会走到这里；降级为本窗口跳转
    }
  }
  router.replace(redirectTarget());
}

/** 返回登录页（iframe 场景下刷新顶层窗口，重新加载登录页与二维码） */
function backToLogin() {
  sessionStorage.removeItem(STORAGE_KEYS.SOCIAL_PLATFORM);
  const top = window.top;
  if (top && window.self !== top) {
    try {
      top.location.reload();
      return;
    } catch {
      // 理论不会发生；降级为本窗口跳转
    }
  }
  router.replace("/login");
}

/** 提交绑定表单：校验凭据 → 写绑定 → 直接登录出令牌 → 进入系统 */
async function handleBind() {
  if (!bindFormRef.value || !unbound.value?.pendingToken) return;

  const valid = await bindFormRef.value.validate().catch(() => false);
  if (!valid) return;

  binding.value = true;
  try {
    await useUserStoreHook().socialBind(
      unbound.value.pendingToken,
      platform.value,
      bindForm.username,
      bindForm.password
    );
    sessionStorage.removeItem(STORAGE_KEYS.SOCIAL_PLATFORM);
    enterSystem();
  } catch {
    // 业务错误提示（密码错误/凭据过期等）由请求拦截器统一弹出
  } finally {
    binding.value = false;
  }
}

/** 处理扫码回调：code + state 换令牌（已绑定）或 pending（未绑定） */
async function handleCallback() {
  const code = (route.query.code as string) || undefined;
  const state = (route.query.state as string) || undefined;

  const queryPlatform = route.query.platform as SocialLoginType | undefined;
  const savedPlatform = sessionStorage.getItem(
    STORAGE_KEYS.SOCIAL_PLATFORM
  ) as SocialLoginType | null;
  if (queryPlatform && platformLabelMap[queryPlatform]) {
    platform.value = queryPlatform;
  } else if (savedPlatform && platformLabelMap[savedPlatform]) {
    platform.value = savedPlatform;
  }

  if (!code || !state) {
    phase.value = "error";
    errorMessage.value = "缺少授权码参数，请重新发起扫码登录";
    return;
  }

  try {
    const result = await useUserStoreHook().socialCallbackLogin(platform.value, code, state);
    if (result.bound) {
      // 已绑定：令牌已由 store 写入，直接进入系统
      sessionStorage.removeItem(STORAGE_KEYS.SOCIAL_PLATFORM);
      enterSystem();
      return;
    }
    // 未绑定（首次扫码）：展示绑定表单
    unbound.value = result;
    phase.value = "bind";
  } catch (error) {
    phase.value = "error";
    // state 失效/授权码无效等提示已由请求拦截器弹出，这里给出兜底文案
    errorMessage.value = error instanceof Error ? error.message : "第三方登录失败，请重新扫码";
  }
}

onMounted(handleCallback);
</script>

<style lang="scss" scoped>
.sso-callback {
  display: flex;
  flex-direction: column;
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

  &__avatar {
    margin-bottom: 12px;
  }

  &__title {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
  }

  &__desc {
    margin: 0 0 20px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    text-align: center;
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
    color: var(--el-text-color-regular) !important;
    text-align: center;
  }

  &__btn {
    width: 100%;
    margin-top: 8px;
  }

  &__footer {
    margin-top: 24px;
  }

  &__brand {
    font-size: 13px;
    color: var(--el-text-color-placeholder);
  }
}
</style>
