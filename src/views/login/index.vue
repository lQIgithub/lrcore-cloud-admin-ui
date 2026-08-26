<template>
  <div class="login-page">
    <div class="login-toolbar">
      <ThemeSwitch />
      <LangSelect size="text-18px" />
    </div>

    <div class="login-layout">
      <div class="login-brand">
        <div class="login-brand__header">
          <el-image :src="logo" class="login-brand__logo" />
          <div class="login-brand__identity">
            <span class="login-brand__name">{{ appConfig.title }}</span>
            <span class="login-brand__version">v{{ appConfig.version }}</span>
          </div>
        </div>

        <div class="login-brand__hero">
          <div class="login-brand__main">
            <el-tag class="login-brand__tag" type="primary" effect="plain" round>
              <span class="login-brand__tag-dot" />
              Enterprise Ready
            </el-tag>
            <h1 class="login-brand__title">企业级管理系统</h1>
            <p class="login-brand__desc">
              提供安全、高效、可扩展的管理解决方案，助力企业数字化转型与业务增长。
            </p>
          </div>
          <div class="login-brand__features">
            <div class="login-brand__feature">
              <span class="login-brand__feature-mark">
                <span class="login-brand__feature-icon i-svg:security" />
              </span>
              <span class="login-brand__feature-text">安全可靠</span>
            </div>
            <div class="login-brand__feature">
              <span class="login-brand__feature-mark">
                <el-icon class="login-brand__feature-icon"><Clock /></el-icon>
              </span>
              <span class="login-brand__feature-text">高效稳定</span>
            </div>
            <div class="login-brand__feature">
              <span class="login-brand__feature-mark">
                <span class="login-brand__feature-icon i-svg:flexible" />
              </span>
              <span class="login-brand__feature-text">灵活扩展</span>
            </div>
          </div>
        </div>
      </div>

      <div class="login-card">
        <div class="login-card__inner">
          <transition name="fade-slide" mode="out-in">
            <div v-if="component === 'login'" key="login" class="login-card__form">
              <h2 class="login-card__title">欢迎回来</h2>
              <p class="login-card__desc">请完成身份验证后进入系统</p>

              <div class="login-tabs" role="tablist" aria-label="登录方式">
                <button
                  v-for="tab in loginTabs"
                  :key="tab.key"
                  type="button"
                  role="tab"
                  class="login-tabs__item"
                  :class="{ 'is-active': loginType === tab.key }"
                  :aria-selected="loginType === tab.key"
                  @click="loginType = tab.key"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div v-if="loginType === 'sso'" class="login-sso-form">
                <el-button
                  :loading="loading"
                  type="primary"
                  size="large"
                  class="login-btn"
                  @click="handleSsoLogin"
                >
                  <el-icon :size="16"><Key /></el-icon>
                  SSO 单点登录
                </el-button>
                <div class="login-options">
                  <a class="login-options__link" @click="showForm('resetPwd')">忘记密码？</a>
                </div>
              </div>

              <div v-else class="login-card__form login-card__form--wechat">
                <WeChatLoginPanel />
              </div>

              <div class="login-alt">
                <div class="login-alt__divider">其他登录方式</div>
                <div class="login-alt__buttons">
                  <el-tooltip
                    v-for="social in socialLogins"
                    :key="social.type"
                    :content="social.label"
                    placement="top"
                  >
                    <button
                      type="button"
                      class="login-social"
                      :class="`login-social--${social.type}`"
                      :aria-label="social.label"
                      @click="handleSocialLogin(social.type)"
                    >
                      <span class="login-social__icon" :class="`i-svg:${social.icon}`" />
                    </button>
                  </el-tooltip>
                </div>
              </div>
            </div>

            <ResetPwd
              v-else
              key="resetPwd"
              class="login-card__form"
              @update:model-value="component = $event"
            />
          </transition>
        </div>

        <div class="login-footer">Copyright © 2021-2026 youlai.tech</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "LoginPage", inheritAttrs: false });

import { Clock, Key } from "@element-plus/icons-vue";
import AuthAPI from "@/api/auth";
import type { SocialLoginType } from "@/api/auth";
import { startSsoLogin } from "@/utils/sso";
import { appConfig } from "@/settings";
import { STORAGE_KEYS } from "@/constants";
import ThemeSwitch from "@/components/ThemeSwitch/index.vue";
import WeChatLoginPanel from "@/views/login/components/WeChatLogin.vue";
import ResetPwd from "./components/ResetPwd.vue";
import logo from "@/assets/images/logo.png";

const route = useRoute();
const component = ref<"login" | "resetPwd">("login");
const loading = ref(false);

/* ---------------------------- 登录方式 ---------------------------- */

/** 登录方式：sso-单点登录 / wechat-微信扫码 */
type LoginType = "sso" | "wechat";

const loginType = ref<LoginType>("sso");

const loginTabs: { key: LoginType; label: string }[] = [
  { key: "sso", label: "SSO 登录" },
  { key: "wechat", label: "微信扫码登录" },
];

function showForm(type: "resetPwd") {
  component.value = type;
}

/* ---------------------------- 第三方登录 ---------------------------- */

/** 第三方登录类型配置（图标来自 src/assets/icons，i-svg: 前缀引用） */
const socialLogins: { type: SocialLoginType; label: string; icon: string }[] = [
  { type: "wechat", label: "微信登录", icon: "wechat" },
  { type: "qq", label: "QQ 登录", icon: "qq" },
  { type: "github", label: "GitHub 登录", icon: "github" },
  { type: "gitee", label: "Gitee 登录", icon: "gitee" },
];

/**
 * 发起第三方登录：
 * - wechat：切换到微信扫码 Tab（iframe 渲染 qrconnect 二维码页）
 * - 其他平台：获取平台授权页 URL 后整页跳转，授权完成后平台重定向到
 *   前端回调路由 /#/sso/callback?code=..&state=..（见 views/sso/callback.vue）
 */
async function handleSocialLogin(type: SocialLoginType) {
  if (type === "wechat") {
    loginType.value = "wechat";
    return;
  }

  try {
    const { authorizeUrl } = await AuthAPI.socialAuthorize(type);
    // 回调页据此确定平台（第三方重定向 URL 无法再携带查询参数）
    sessionStorage.setItem(STORAGE_KEYS.SOCIAL_PLATFORM, type);
    window.location.href = authorizeUrl;
  } catch {
    sessionStorage.removeItem(STORAGE_KEYS.SOCIAL_PLATFORM);
    // 业务错误提示（如“第三方登录未启用：GitHub”）由请求拦截器统一弹出
  }
}

/* ---------------------------- SSO 单点登录（OIDC + PKCE） ---------------------------- */

/**
 * 发起 SSO 单点登录：
 * 生成 PKCE/state 暂存后整页跳转授权服务器（lrcore-auth）授权端点，
 * 认证完成后回到 /sso/oauth-callback 换码取令牌（见 views/sso/oauth-callback.vue）。
 * 登录成功后的回跳目标沿用登录页 redirect 参数。
 */
async function handleSsoLogin() {
  const rawRedirect = (route.query.redirect as string) || "/";
  let redirectPath: string;
  try {
    redirectPath = decodeURIComponent(rawRedirect);
  } catch {
    redirectPath = "/";
  }
  loading.value = true;
  try {
    await startSsoLogin(redirectPath);
  } catch (e) {
    loading.value = false;
    // 不静默吞错（例如非安全上下文下的异常）：给出可见提示，便于定位
    console.error("[SSO] 发起单点登录失败:", e);
    ElMessage.error("发起单点登录失败：" + (e instanceof Error ? e.message : String(e)));
  }
}
</script>

<style lang="scss" scoped>
$primary: #5d87ff;
$bg: #f8fafc;
$text-primary: #273248;
$text-secondary: #667085;
$text-muted: #98a2b3;
$input-h: 44px;

.login-page {
  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: auto;
  background: $bg;
}

.login-toolbar {
  position: fixed;
  top: 28px;
  right: 32px;
  z-index: 10;
  display: flex;
  gap: 12px;
  align-items: center;

  :deep(*) {
    cursor: pointer;
  }
}

.login-layout {
  display: flex;
  flex: 1;
  min-height: 100%;
}

.login-brand {
  position: relative;
  display: flex;
  flex: 0 0 65%;
  flex-direction: column;
  min-height: 100vh;
  padding: 28px 64px 48px;
  overflow: hidden;
  background: url("@/assets/images/login/bg.svg") center / cover no-repeat;
  animation: login-pane-in 0.36s ease-out both;

  &__header,
  &__hero {
    position: relative;
    z-index: 1;
  }

  &__header {
    display: flex;
    gap: 14px;
    align-items: center;
  }

  &__logo {
    width: 42px;
    height: 42px;
  }

  &__identity {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }

  &__name {
    font-size: 24px;
    font-weight: 600;
    line-height: 1;
    color: $text-primary;
  }

  &__version {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    color: rgba($primary, 0.88);
    background: rgba($primary, 0.07);
    border: 1px solid rgba($primary, 0.13);
    border-radius: 999px;
  }

  &__hero {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    width: min(720px, 100%);
    padding: 20px 0 88px;
  }

  &__main {
    width: 100%;
  }

  &__tag {
    gap: 8px;
    height: 28px;
    padding: 0 13px 0 11px;
    margin-bottom: 18px;
    font-weight: 700;
    color: $primary;
    background: rgba($primary, 0.035);
    border-color: rgba($primary, 0.14);

    :deep(.el-tag__content) {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
  }

  &__tag-dot {
    display: inline-block;
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    background: $primary;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba($primary, 0.12);
  }

  &__title {
    margin: 0 0 18px;
    font-size: 46px;
    font-weight: 800;
    line-height: 1.18;
    color: #222b3a;
    letter-spacing: 0;
  }

  &__desc {
    max-width: 560px;
    margin: 0;
    font-size: 16px;
    line-height: 1.75;
    color: $text-secondary;
  }

  &__features {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    max-width: 100%;
    margin-top: 28px;
  }

  &__feature {
    position: relative;
    display: inline-flex;
    gap: 8px;
    align-items: center;
    height: 28px;
    padding: 0 13px;
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    background: transparent;

    &:first-child {
      padding-left: 0;
    }

    &:not(:last-child)::after {
      position: absolute;
      top: 7px;
      right: 0;
      width: 1px;
      height: 14px;
      content: "";
      background: rgba(39 50 72 / 12%);
    }
  }

  &__feature-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: $primary;
    background: rgba($primary, 0.08);
    border: 1px solid rgba($primary, 0.1);
    border-radius: 6px;
  }

  &__feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    color: $primary;
  }

  &__feature-text {
    line-height: 1;
    white-space: nowrap;
  }
}

.login-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 0 0 35%;
  flex-direction: column;
  align-items: center;
  padding: 0 0 32px;
  background: #fff;
  animation: login-pane-in 0.36s ease-out 0.04s both;

  &__inner {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    max-width: 430px;
    padding: 0 20px;
  }

  &__form {
    width: 100%;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 34px;
    font-weight: 750;
    line-height: 1.1;
    color: $text-primary;
    letter-spacing: 0;
  }

  &__desc {
    margin: 8px 0 24px;
    font-size: 14px;
    color: $text-muted;
  }
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.el-input__wrapper) {
  height: $input-h;
}

.input-prefix-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
  color: var(--el-text-color-placeholder);
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-row__input {
  flex: 1;
  min-width: 0;
}

.captcha-img {
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 108px;
  height: $input-h;
  overflow: hidden;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--el-color-primary);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
  font-size: 14px;
  color: $text-secondary;

  &__link {
    margin-top: 14px;
    font-weight: 500;
    color: $primary;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.8;
    }
  }
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba($primary, 0.18);

  &:hover {
    box-shadow: 0 14px 28px rgba($primary, 0.22);
  }

  &:focus,
  &:focus-visible {
    outline: none;
  }
}

.login-sso-form {
  width: 100%;
}

.login-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 18px;
  background: var(--el-fill-color-light);
  border-radius: 10px;

  &__item {
    flex: 1;
    height: 34px;
    font-size: 14px;
    font-weight: 500;
    color: $text-secondary;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 7px;
    transition:
      color 0.2s,
      background 0.2s,
      box-shadow 0.2s;

    &:hover {
      color: $text-primary;
    }

    &.is-active {
      font-weight: 600;
      color: $primary;
      background: var(--el-bg-color);
      box-shadow: 0 2px 8px rgba(39 50 72 / 10%);
    }
  }
}

.sms-code-row {
  display: flex;
  gap: 12px;
  width: 100%;

  &__input {
    flex: 1;
    min-width: 0;
  }

  &__btn {
    flex-shrink: 0;
    width: 118px;
    height: $input-h;
    font-size: 13px;
  }
}

.login-sso {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  margin-bottom: 18px;
  font-size: 14px;
  font-weight: 500;
  color: $primary;
  cursor: pointer;
  background: rgba($primary, 0.05);
  border: 1px dashed rgba($primary, 0.45);
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: $primary;
    border-color: $primary;
    box-shadow: 0 8px 20px rgba($primary, 0.22);
  }
}

.login-alt {
  margin-top: 28px;

  &__divider {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 14px;
    font-size: 13px;
    color: $text-muted;

    &::before,
    &::after {
      flex: 1;
      height: 1px;
      content: "";
      background: var(--el-border-color-lighter);
    }
  }

  &__buttons {
    display: flex;
    gap: 18px;
    justify-content: center;
  }
}

.login-social {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: $text-secondary;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 50%;
  transition:
    color 0.2s,
    border-color 0.2s,
    transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &__icon {
    width: 20px;
    height: 20px;
  }

  &--wechat:hover {
    color: #07c160;
    border-color: rgba(7 193 96 / 45%);
  }

  &--qq:hover {
    color: #12b7f5;
    border-color: rgba(18 183 245 / 45%);
  }

  &--github:hover {
    color: #24292f;
    border-color: rgba(36 41 47 / 45%);
  }

  &--gitee:hover {
    color: #c71d23;
    border-color: rgba(199 29 35 / 45%);
  }
}

.login-footer {
  flex-shrink: 0;
  font-size: 12px;
  color: $text-muted;
}

.dark .login-page {
  background: #0b1020;
}

.dark .login-brand {
  background-image: url("@/assets/images/login/bg-dark.svg");

  &__name {
    color: rgb(255 255 255 / 86%);
  }

  &__version {
    color: rgb(167 190 255 / 92%);
    background: rgba($primary, 0.12);
    border-color: rgba($primary, 0.2);
  }

  &__tag {
    color: rgba($primary, 0.95);
    background: rgba($primary, 0.08);
    border-color: rgba($primary, 0.18);
  }

  &__title {
    color: rgb(255 255 255 / 90%);
  }

  &__desc {
    color: rgb(226 232 240 / 62%);
  }

  &__feature {
    color: rgb(255 255 255 / 76%);

    &:not(:last-child)::after {
      background: rgba(255 255 255 / 12%);
    }
  }

  &__feature-mark {
    background: rgba($primary, 0.15);
    border-color: rgba($primary, 0.18);
  }
}

.dark .login-card {
  background: #0b1020;

  &__title {
    color: rgb(255 255 255 / 85%);
  }

  &__desc {
    color: rgb(255 255 255 / 30%);
  }
}

.dark .login-footer {
  color: rgb(255 255 255 / 15%);
}

.dark .login-sso {
  color: rgba(167 190 255 / 92%);
  background: rgba($primary, 0.1);
  border-color: rgba($primary, 0.4);

  &:hover {
    color: #fff;
    background: $primary;
  }
}

.dark .login-alt__divider {
  color: rgb(255 255 255 / 20%);
}

.dark .login-social {
  color: rgb(255 255 255 / 65%);

  &--github:hover {
    color: #e6e8eb;
    border-color: rgba(230 232 235 / 45%);
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@keyframes login-pane-in {
  from {
    opacity: 0;
    filter: blur(4px);
  }

  to {
    opacity: 1;
    filter: blur(0);
  }
}

@media (max-width: 1024px) {
  .login-layout {
    flex-direction: column;
  }

  .login-toolbar {
    position: absolute;
    top: 37px;
  }

  .login-brand {
    flex: none;
    height: auto;
    min-height: auto;
    padding: 28px 40px 0;
    background: #fff;

    &__hero {
      display: none;
    }
  }

  .dark .login-brand {
    background: #0b1020;
  }

  .login-card {
    flex: 1;
    justify-content: flex-start;
    padding: 96px 48px 0;
  }
}

@media (max-width: 640px) {
  .login-toolbar {
    top: 33px;
    right: 20px;
  }

  .login-brand {
    padding: 24px 0 0 24px;
  }

  .login-card {
    padding: 72px 24px 0;

    &__inner {
      width: 100%;
      padding: 0;
    }
  }
}
</style>
