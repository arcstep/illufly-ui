import { AuthProvider } from '../../context/AuthContext'

export default function ChatLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <div className="flex h-screen">
                <nav>{/* 聊天侧边栏 */}</nav>
                <main>{children}</main>
            </div>
        </AuthProvider>
    )
}