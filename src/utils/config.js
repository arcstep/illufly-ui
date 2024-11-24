export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001';

export const handleAuthError = (error) => {
    if (error.response && error.response.status === 401) {
        // 处理 401 错误，尝试刷新令牌或重定向到登录页
        // console.error('未授权，重定向到登录页');
        Router.push('/login');
    } else {
        // console.error('API 请求错误:', error);
    }
};