'use client';

import { Suspense } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/SettingsContext'
import Header from '@/components/Layout/Header'

// 创建一个内部组件来使用 Context
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    // 已登录，显示真正的布局
    return (
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            <Header />
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    )
}

// 外层组件只负责提供 Context
export default function RequireLoginLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <Suspense fallback={<div>Auth Loading...</div>}>
            <AuthProvider>
                <SettingsProvider>
                    <AuthenticatedLayout>
                        {children}
                    </AuthenticatedLayout>
                </SettingsProvider>
            </AuthProvider>
        </Suspense>
    )
}