'use client';

import { useAuth } from '../../context/AuthContext'
import Header from '../../components/Header'

export default function ChatLayout({
    children
}: {
    children: React.ReactNode
}) {
    const { username, logout } = useAuth();
    return (
        <div className="p-5 pt-12 h-screen flex flex-col">
            <Header
                username={username ?? undefined}
                onLogout={logout}
                currentPath="/share"
            />
            {children}
        </div>
    )
}