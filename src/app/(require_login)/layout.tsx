import { AuthProvider } from '../../context/AuthContext'
import { Suspense } from 'react'

export default function ChatLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthProvider>
                <div className="flex h-screen">
                    <nav>{/* 聊天侧边栏 */}</nav>
                    <main>{children}</main>
                </div>
            </AuthProvider>
        </Suspense>
    )
}