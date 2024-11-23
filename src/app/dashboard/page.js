'use client';

import { useEffect, useState } from 'react';
import { dashboardData } from '../../utils/dashboard';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
    const { user, loading, logout } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await dashboardData();
                setData(data);
            } catch (error) {
                console.error('数据加载失败:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <p>加载中...</p>;
    console.log("user", user);
    if (!user) return null;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">仪表盘</h1>
            {/* <p>欢迎, {user.username}</p> */}
            {/* 展示更多仪表盘内容 */}
            <button
                onClick={logout}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
                退出登录
            </button>
        </div>
    );
}