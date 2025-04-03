'use client';

import { Suspense } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/SettingsContext'
import Header from '@/components/Layout/Header'

// 创建一个内部组件来使用 Context
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    // 在这里使用 useAuth，这样可以响应 Context 的变化
    const { username, logout } = useAuth()

    return (
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            <Header
                username={username ?? undefined}
                onLogout={logout}
            />
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

// 外层组件只负责提供 Context
export default function ChatLayout({
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