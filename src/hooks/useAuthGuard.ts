'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/AuthContext';

export function useAuthGuard() {
    const router = useRouter();
    const authContext = useContext(AuthContext);

    useEffect(() => {
        // 创建一个内部异步函数
        const checkAuth = async () => {
            try {
                await authContext.refresh_token();
            } catch (error) {
                console.error('Failed to refresh token:', error);
                router.push('/login');
            }
        };

        // 执行验证
        checkAuth();

        // 依赖项数组为空，表示只在组件挂载时执行一次
    }, []);

    return authContext;
} 