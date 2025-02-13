export default function PublicLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen">
            <nav>{/* 聊天侧边栏 */}</nav>
            <main>{children}</main>
        </div>
    )
}