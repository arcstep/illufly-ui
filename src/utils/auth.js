import api from './api';

// 登录函数
export const login = async (username, password) => {
    try {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/api/auth/login', formData, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.withCredentials) {
            alert('请检查浏览器隐私设置：客户端无法保存 Cookie 导致登录失败！');
            return null;
        } else {
            return { ...response.data, username };
        }

    } catch (error) {
        console.error('登录失败:', error.response ? error.response.data : error.message);
        throw new Error('登录失败，请检查您的凭据并重试。');
    }
};

// 登出函数
export const logout = async () => {
    try {
        await api.post('/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // 如果返回401，认为是正常退出
            return;
        }
        throw new Error('登出失败');
    }
};

// 获取当前用户信息
export const fetchUser = async () => {
    try {
        const response = await api.get('/api/auth/profile');
        console.log("fetchUser", response.data);
        return response.data;
    } catch (error) {
        console.log('获取用户信息失败');
        // throw new Error('获取用户信息失败');
    }
};

// 刷新令牌
export const refreshToken = async () => {
    try {
        await api.post('/api/auth/refresh-token', {}, { withCredentials: true });
    } catch (error) {
        console.log('刷新令牌失败');
        // throw new Error('刷新令牌失败');
    }
};
