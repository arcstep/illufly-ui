import axios from 'axios';
import { API_BASE_URL, handleAuthError } from './config';

// 创建 Axios 实例
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// 响应拦截器：处理 401 错误，尝试刷新令牌
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 检查 401 错误并尝试刷新令牌
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // 尝试刷新令牌
                await api.post('/api/token/refresh', {}, { withCredentials: true });
                // 重新发送原始请求
                return api(originalRequest);
            } catch (err) {
                handleAuthError(err);
                return Promise.reject(err);
            }
        }

        // 检查 403 错误并处理
        if (error.response && error.response.status === 403) {
            console.error('访问被拒绝:', error);
            handleAuthError(error);
            return Promise.reject(error);
        }

        // 处理其他错误
        handleAuthError(error);
        return Promise.reject(error);
    }
);

export default api;