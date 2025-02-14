'use client'
import '@/mirage/init'
import './globals.css'

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