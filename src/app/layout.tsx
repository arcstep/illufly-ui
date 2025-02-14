'use client'
import './globals.css'
import { initMirage } from '@/mirage'

// 立即执行初始化
initMirage()

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh">
            <body>{children}</body>
        </html>
    )
}