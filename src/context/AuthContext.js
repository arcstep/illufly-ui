'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { fetchUser, login as authLogin, logout as authLogout } from '../utils/auth';
import { useRouter, usePathname } from 'next/navigation';

// 创建 AuthContext
const AuthContext = createContext();

// AuthProvider 组件
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        console.log("Current pathname:", pathname);
        const initializeUser = async () => {
            if (pathname === '/login') {
                setLoading(false);
                return;
            }

            try {
                const userData = await fetchUser();
                setUser(userData);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        initializeUser();
    }, [pathname]);

    const login = async (username, password) => {
        try {
            const userData = await authLogin(username, password);
            setUser(userData);
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authLogout();
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('登出错误:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// 自定义 useAuth 钩子
export const useAuth = () => useContext(AuthContext);
