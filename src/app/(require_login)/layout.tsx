'use client';

import { Suspense } from 'react'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import Header from '../../components/Header'

// 创建一个内部组件来使用 Context
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    // 在这里使用 useAuth，这样可以响应 Context 的变化
    const { username, logout, currentPath } = useAuth()

    return (
        <div className="p-5 pt-12 h-screen flex flex-col">
            <Header
                username={username ?? undefined}
                onLogout={logout}
                currentPath={currentPath ?? '/'}
            />
            {children}
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
        <Suspense fallback={<div>Loading...</div>}>
            <AuthProvider>
                <AuthenticatedLayout>
                    {children}
                </AuthenticatedLayout>
            </AuthProvider>
        </Suspense>
    )
}