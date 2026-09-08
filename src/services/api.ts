import axios, {type AxiosError, type InternalAxiosRequestConfig} from 'axios';
import {config} from '../constants/config';
import {persistCookiesFromResponse} from '../utils/cookieParser';
import {
  buildCookieHeader,
  clearEmployeeSessionTokens,
} from '../utils/secureStorage';

type RetryableConfig = InternalAxiosRequestConfig & {_retry?: boolean};

let refreshPromise: Promise<boolean> | null = null;
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return (
    url.includes('/api/employee/auth/refresh') ||
    url.includes('/api/employee/auth/logout')
  );
}

async function refreshEmployeeSession(): Promise<boolean> {
  if (!config.API_BASE_URL) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const cookie = await buildCookieHeader();
        const response = await axios.post(
          `${config.API_BASE_URL}/api/employee/auth/refresh`,
          {},
          {
            headers: cookie ? {Cookie: cookie} : undefined,
            timeout: 15000,
          },
        );
        await persistCookiesFromResponse(response.headers as Record<string, unknown>);
        return response.status >= 200 && response.status < 300;
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          await clearEmployeeSessionTokens();
        }
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

/**
 * Shared Axios client for Tasty Bites backend calls.
 * Attaches auth cookies and refreshes on 401 (mirrors web employeeFetch).
 */
export const api = axios.create({
  baseURL: config.API_BASE_URL || undefined,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (requestConfig) => {
  const cookie = await buildCookieHeader();
  if (cookie) {
    requestConfig.headers.set('Cookie', cookie);
  }
  return requestConfig;
});

api.interceptors.response.use(
  async (response) => {
    await persistCookiesFromResponse(response.headers as Record<string, unknown>);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;
      const refreshed = await refreshEmployeeSession();
      if (refreshed) {
        const cookie = await buildCookieHeader();
        if (cookie) {
          originalRequest.headers.set('Cookie', cookie);
        }
        return api.request(originalRequest);
      }

      authFailureHandler?.();
    }

    return Promise.reject(error);
  },
);

export {refreshEmployeeSession};
