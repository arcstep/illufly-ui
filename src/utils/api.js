import axios from 'axios';
import Router from 'next/router';

// 创建 Axios 实例
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001', // FastAPI 后端 URL
    withCredentials: true, // 允许携带凭证（如 cookies）
});

// 响应拦截器：处理 401 错误，尝试刷新令牌
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // 尝试刷新令牌
                await api.post('/api/token/refresh', {}, { withCredentials: true });
                // 重新发送原始请求
                return api(originalRequest);
            } catch (err) {
                // 清除本地状态并重定向到登录页
                // 这里后端在返回 401 时会清除 http_only cookies
                // 你可以在这里添加任何需要的本地状态清理逻辑
                Router.push('/login');
                return Promise.reject(err);
            }
        } else if (error.response && error.response.status === 401) {
            // 如果刷新令牌也失败，直接重定向到登录页
            Router.push('/login');
        }
        return Promise.reject(error);
    }
);

export default api;