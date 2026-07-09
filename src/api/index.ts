import axios from 'axios';
import { refreshToken } from './auth';
import { useAuthStorage } from 'store/authStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const { access_token } = useAuthStorage.getState();
    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Reissue endpoint failures should not trigger another reissue.
    if (originalRequest.url?.includes('/v2/auth/reissue')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
      return Promise.reject(error);
    }

    // access_token이 없는 게스트 요청, 이미 재시도한 요청은 refresh하지 않습니다.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      useAuthStorage.getState().access_token
    ) {
      // 이 요청의 재시도는 한 번만 수행되도록 마킹
      originalRequest._retry = true;

      // 다른 요청이 이미 refresh 중이면 완료될 때까지 대기
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { data } = await refreshToken();
        const { access_token } = data;

        // store에 새 토큰 저장 → 이후 요청은 request interceptor가 자동 주입
        useAuthStorage.getState().setToken({ access_token });
        processQueue(null, access_token);

        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new Event('auth:unauthorized'));
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
