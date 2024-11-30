'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useState, useEffect } from 'react';

import {
    fetchUser as authFetchUser,
    login as authLogin,
    logout as authLogout,
    refreshToken as authRefreshToken
} from '../utils/auth';

// 创建 AuthContext
const AuthContext = createContext();

// AuthProvider 组件
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // console.log("Current pathname:", pathname);
        const initializeUser = async () => {
            if (pathname === '/login') {
                setLoading(false);
                return;
            }

            try {
                const userData = await authFetchUser();
                if (userData.username) {
                    setUser(userData);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                setUser(null);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };
        initializeUser();
    }, [pathname]);

    const login = async (username, password) => {
        try {
            const userData = await authLogin(username, password);
            // console.log("userData >>> ", userData);
            if (userData) {
                setUser(userData);
            }
            return userData;
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            setUser(null);
            await authLogout();
        } catch (error) {
            console.error('登出错误:', error);
        }
        router.push('/login');
    };

    const refreshToken = async () => {
        try {
            await authRefreshToken();
        } catch (error) {
            console.error('刷新令牌错误:', error);
        }
    };

    const fetchUser = async () => {
        try {
            const userData = await authFetchUser();
            setUser(userData);
        } catch (error) {
            console.error('获取用户信息错误:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshToken, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// 自定义 useAuth 钩子
export const useAuth = () => useContext(AuthContext);
