import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import qs from "qs";

import router from "@/router";
import { ApiCodeEnum } from "@/enums/api";
import { useUserStoreHook } from "@/stores/user";
import { usePermissionStoreHook } from "@/stores/permission";
import { AuthStorage, redirectToLogin } from "@/utils/auth";
import { isSsoFlowStarted } from "@/utils/sso";
import { decryptResponseData, encryptRequestData } from "@/utils";
import type { ApiResult } from "@/api/common";

const http = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
  // 数组参数序列化为 ids=1&ids=2，而非 ids[]=1&ids[]=2
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = AuthStorage.getAccessToken();
    const authRaw = config.headers.Authorization ?? "";
    // 去除首尾空格、统一小写再对比
    const authHeader = String(authRaw).trim().toLowerCase();
    // if (authHeader === "no-auth") {
    // console.debug("进入免登分支");
    // 约定：调用方设置 Authorization 为 "no-auth" 即跳过 token 注入
    // if (config.headers.Authorization === "no-auth") {
    // delete config.headers.Authorization;
    // } else if (token) {
    // }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      // config.data = encryptRequestData(config.data);
    } catch (error) {
      console.error("请求数据加密失败:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  async (response: AxiosResponse<ApiResult>): Promise<AxiosResponse | any> => {
    const { responseType } = response.config;
    const needEncrypt = response.headers["x-captcha-type"] === "image";
    // 二进制数据直接透传
    if (responseType === "blob" || responseType === "arraybuffer") {
      return response;
    }
    const { code, data, success, message } = response.data;
    console.debug("code:{}, success:{}, message:{}", code, success, message);
    if (!success) {
      // 平台网关/资源服务器把 401 以「HTTP 200 + code:'401'」形式返回，
      // axios 不会进入下方错误分支，需在此识别为“未登录/令牌过期”：
      // SAS（公共客户端）无 refresh_token，401 直接静默再授权，失败/非 SAS 才重定向登录页
      if (code === "401") {
        const userStore = useUserStoreHook();
        if (userStore.isSas()) {
          await userStore.silentSsoReauth(router.currentRoute.value.fullPath);
          return Promise.reject(new Error("Token Invalid (sso reauth)"));
        }
        // 无本地令牌：若已有一笔 SSO 授权流程在途（守卫自动登录/登录页按钮发起，
        // 页面即将整页跳转授权服务器），不要再 redirectToLogin —— 它内部会
        // resetAllState → SsoStorage.clearAll()，把暂存的 state 清空，
        // 授权服务器回跳回调页时即“state 不匹配”。此时仅拒绝本次请求，让在途跳转承接。
        if (isSsoFlowStarted()) {
          return Promise.reject(new Error("Token Invalid (sso flow in progress)"));
        }
        await redirectToLogin("登录状态已过期，请重新登录");
        return Promise.reject(new Error("Token Invalid"));
      }
      ElMessage.error(message || "系统出错");
      return Promise.reject(new Error(message || "系统出错"));
    }
    // if (!needEncrypt) {
    //   const decryptedData = decryptResponseData(data);
    //   console.debug("后端返回解密内容解密后的数据:", decryptedData);
    //   return decryptedData;
    // }
    return data;
  },

  async (error) => {
    const { response } = error;

    if (!response) {
      ElMessage.error("网络连接失败");
      return Promise.reject(error);
    }

    const { code, message } = response.data as ApiResult;

    // Token 过期
    if (code === ApiCodeEnum.ACCESS_TOKEN_INVALID) {
      const userStore = useUserStoreHook();

      // SAS 新轨（公共客户端）无 refresh_token：401 直接静默再授权（整页跳转，不返回）
      if (userStore.isSas()) {
        await userStore.silentSsoReauth(router.currentRoute.value.fullPath);
        return Promise.reject(new Error("Token Invalid (sso reauth)"));
      }

      // 同 success-form 401 分支：SSO 流程在途时不 redirectToLogin（避免清空暂存 state）
      if (isSsoFlowStarted()) {
        return Promise.reject(new Error("Token Invalid (sso flow in progress)"));
      }

      await redirectToLogin("登录已过期，请重新登录");
      return Promise.reject(new Error("Token Invalid"));
    }

    // 权限不足
    if (code === ApiCodeEnum.PERMISSION_DENIED) {
      const permissionStore = usePermissionStoreHook();
      await permissionStore.refreshPermissions();
      ElMessage.error(message || "权限不足");
      return Promise.reject(new Error(message || "权限不足"));
    }

    ElMessage.error(message || "请求失败");
    return Promise.reject(new Error(message || "请求失败"));
  }
);

export default http;
