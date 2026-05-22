import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_BASE_URL = 'http://139.9.223.233:3000';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
  noRetry?: boolean;
  silent?: boolean;
}

let apiBaseUrl = DEFAULT_API_BASE_URL;

export const setApiBaseUrl = (url: string) => {
  apiBaseUrl = url;
};

export const getApiBaseUrl = () => apiBaseUrl;

// Web 端 withCredentials: true 会导致 CORS 失败：
// 浏览器要求 withCredentials 时服务端必须返回 Access-Control-Allow-Credentials: true
// 且 Access-Control-Allow-Origin 不能是通配符 *，但 API 服务端返回的是 *
const request = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15000,
  withCredentials: Platform.OS !== 'web',
});

const MAX_RETRIES = 1;
const RETRY_DELAY = 500;
const TOKEN_KEY = 'auth_token';

request.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    // Fallback: 即使 apiBaseUrl 被意外清空，也不丢失默认值
    config.baseURL = apiBaseUrl || DEFAULT_API_BASE_URL;

    if (config.retryCount === undefined) {
      config.retryCount = 0;
    }

    config.params = {
      ...config.params,
      timestamp: Date.now(),
      device: 'pc',
    };

    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token && !token.startsWith('uid:')) {
        // Append 'os=pc' to cookie — tells Netease API to return full (non-trial) song URLs
        const cookieWithOs = `${token} os=pc;`;
        if (config.method !== 'post') {
          config.params.cookie = config.params.cookie !== undefined ? config.params.cookie : cookieWithOs;
        } else if (config.method === 'post') {
          config.data = {
            ...config.data,
            cookie: cookieWithOs,
          };
        }
      }
    } catch (e) {
      // AsyncStorage 在 Web 端可能不可用，忽略 token 读取失败
      console.warn('Failed to read auth token:', e);
    }

    // Log: 仅记录路径，不打印含 cookie 的完整 URL
    if (__DEV__) {
      console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`, 
        config.data ? `body=${JSON.stringify(config.data).substring(0, 200)}` : '');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[Response] ${response.config.url} status=${response.status} code=${response.data?.code}`);
    }
    return response;
  },
  async (error) => {
    const config = error.config as CustomAxiosRequestConfig;

    // 502 = upstream NetEase API error, not an app bug → log as warn
    const isUpstreamError = error.response?.status === 502 || config?.silent;
    if (__DEV__) {
      const logFn = isUpstreamError ? console.warn : console.error;
      const prefix = config?.silent ? '[Silent]' : isUpstreamError ? '[Upstream 502]' : '[Response Error]';
      logFn(
        `${prefix} ${config?.url}`,
        `status=${error.response?.status}`,
        `message=${error.message}`
      );
    }

    if (!config) {
      return Promise.reject(error);
    }

    // 401/403 = 认证失效，清除 token 并触发重新登录
    if ((error.response?.status === 401 || error.response?.status === 403) && config.params?.noLogin !== true) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      config.retryCount = 3;
    }

    if (
      config.retryCount !== undefined &&
      config.retryCount < MAX_RETRIES &&
      !config.noRetry
    ) {
      config.retryCount++;

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

      return request(config);
    }

    return Promise.reject(error);
  }
);

export { TOKEN_KEY };
export default request;
