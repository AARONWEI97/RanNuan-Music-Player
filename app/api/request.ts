import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_BASE_URL = 'http://192.168.1.6:3000';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
  noRetry?: boolean;
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
    config.baseURL = apiBaseUrl;

    if (config.retryCount === undefined) {
      config.retryCount = 0;
    }

    config.params = {
      ...config.params,
      timestamp: Date.now(),
      device: 'mobile',
    };

    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token && config.method !== 'post') {
        config.params.cookie = config.params.cookie !== undefined ? config.params.cookie : token;
      } else if (token && config.method === 'post') {
        config.data = {
          ...config.data,
          cookie: token,
        };
      }
    } catch (e) {
      // AsyncStorage 在 Web 端可能不可用，忽略 token 读取失败
      console.warn('Failed to read auth token:', e);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as CustomAxiosRequestConfig;

    if (!config) {
      return Promise.reject(error);
    }

    if (error.response?.status === 301 && config.params?.noLogin !== true) {
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
