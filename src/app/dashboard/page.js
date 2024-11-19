"use client";

import useAuth from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return <p>加载中...</p>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <h1 className="text-4xl font-bold">欢迎来到仪表盘，{user.email}！</h1>
        </div>
    );
}