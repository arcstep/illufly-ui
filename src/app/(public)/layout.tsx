'use client';

import { useAuth } from '../../context/AuthContext'
import Header from '@/components/Layout/Header'
import { SettingsProvider } from '@/context/SettingsContext'

export default function ChatLayout({
    children
}: {
    children: React.ReactNode
}) {
    const { username, logout } = useAuth();
    return (
        <SettingsProvider>
            <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
                <Header
                    username={username ?? undefined}
                    onLogout={logout}
                />
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </div>
        </SettingsProvider>
    )
}