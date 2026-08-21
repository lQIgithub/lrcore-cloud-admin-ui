import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import qs from "qs";

import { ApiCodeEnum } from "@/enums/api";
import { useUserStoreHook } from "@/stores/user";
import { usePermissionStoreHook } from "@/stores/permission";
import { AuthStorage, redirectToLogin } from "@/utils/auth";
import { decryptResponseData, encryptRequestData } from "@/utils";
import type { ApiResult } from "@/api/common";

// 防止同一请求在 token 刷新后重复进入重试，导致死循环
const retriedRequests = new WeakSet<InternalAxiosRequestConfig>();

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
      // 先尝试单飞刷新 token 并重放请求，失败才重定向登录页
      if (code === "401") {
        const config = response.config as InternalAxiosRequestConfig;
        if (!config || retriedRequests.has(config)) {
          await redirectToLogin("登录状态已过期，请重新登录");
          return Promise.reject(new Error("Token Invalid"));
        }

        retriedRequests.add(config);

        try {
          const userStore = useUserStoreHook();
          await userStore.refreshTokenOnce();
          config.headers.set("Authorization", `Bearer ${AuthStorage.getAccessToken()}`);
          return http(config);
        } catch {
          await redirectToLogin("登录状态已过期，请重新登录");
          return Promise.reject(new Error("Token refresh failed"));
        }
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
    const { config, response } = error;

    if (!response) {
      ElMessage.error("网络连接失败");
      return Promise.reject(error);
    }

    const { code, message } = response.data as ApiResult;

    // Token 过期
    if (code === ApiCodeEnum.ACCESS_TOKEN_INVALID) {
      if (!config || retriedRequests.has(config)) {
        await redirectToLogin("登录已过期，请重新登录");
        return Promise.reject(new Error("Token Invalid"));
      }

      retriedRequests.add(config);

      try {
        const userStore = useUserStoreHook();
        await userStore.refreshTokenOnce();

        const token = AuthStorage.getAccessToken();
        if (token) {
          config.headers.set("Authorization", `Bearer ${token}`);
        }

        return http(config);
      } catch {
        await redirectToLogin("登录已过期，请重新登录");
        return Promise.reject(new Error("Token refresh failed"));
      }
    }

    // Refresh token 失效
    if (code === ApiCodeEnum.REFRESH_TOKEN_INVALID) {
      await redirectToLogin("登录已过期，请重新登录", false);
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
