<template>
  <div class="wechat-login">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
      class="wechat-login__alert"
    />
    <div v-else-if="authorizeUrl" class="wechat-login__qr">
      <!-- 微信开放平台 qrconnect 二维码页：扫码后微信将顶层窗口重定向到
           Nacos 配置的 redirect-uri（/#/sso/callback?code=..&state=..） -->
      <iframe
        :src="authorizeUrl"
        width="320"
        height="400"
        style="border: 0"
        allowtransparency
        frameborder="0"
        scrolling="no"
        title="微信扫码登录"
      />
    </div>
    <div v-else class="wechat-login__loading">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>正在加载二维码…</span>
    </div>

    <div class="wechat-login__footer">
      <el-button type="primary" link :disabled="loading" @click="loadQrCode">
        <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
        刷新二维码
      </el-button>
      <span class="wechat-login__tip">使用微信扫描上方二维码登录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { onMounted, ref } from "vue";

import AuthAPI from "@/api/auth";
import { STORAGE_KEYS } from "@/constants";

defineOptions({ name: "WeChatLoginPanel" });

/** 二维码加载/错误状态 */
const loading = ref(false);
const error = ref("");
const authorizeUrl = ref("");

/**
 * 加载微信扫码二维码
 *
 * 后端生成服务端 state（Redis 10 分钟一次性），返回 qrconnect 二维码页 URL；
 * 本组件将其作为 iframe src 渲染。扫码成功微信将顶层窗口重定向到
 * Nacos 中 wechat.redirect-uri 配置的前端回调路由（/#/sso/callback）。
 */
async function loadQrCode() {
  loading.value = true;
  error.value = "";
  authorizeUrl.value = "";
  try {
    const result = await AuthAPI.socialAuthorize("wechat");
    // 回调页据此确定平台（微信重定向 URL 上无法再携带查询参数）
    sessionStorage.setItem(STORAGE_KEYS.SOCIAL_PLATFORM, "wechat");
    authorizeUrl.value = result.authorizeUrl;
  } catch {
    // 业务错误提示由请求拦截器统一弹出（如"第三方登录未启用：微信"）
    error.value = "微信扫码二维码加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

onMounted(loadQrCode);

defineExpose({ loadQrCode });
</script>

<style lang="scss" scoped>
.wechat-login {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  &__alert {
    width: 100%;
  }

  &__qr {
    display: flex;
    justify-content: center;
    line-height: 0;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    padding: 60px 0;
    font-size: 14px;
    line-height: 1;
    color: var(--el-text-color-secondary);
  }

  &__footer {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &__tip {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
</style>
