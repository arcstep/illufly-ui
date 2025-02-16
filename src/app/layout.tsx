'use client'
import { useEffect, useState } from 'react'
import './globals.css'
import { initMockServer } from '@/mock'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let isMounted = true
        console.log('Layout useEffect触发')

        const initialize = async () => {
            try {
                console.time('MSW初始化耗时')
                await initMockServer()
                console.timeEnd('MSW初始化耗时')

                if (isMounted) {
                    console.log('MSW初始化完成，设置isReady')
                    setIsReady(true)
                }
            } catch (err) {
                console.error('初始化捕获错误:', err)
                if (isMounted) setError(err as Error)
            }
        }

        initialize()

        return () => {
            console.log('清理Layout effect')
            isMounted = false
        }
    }, [])

    if (error) {
        return (
            <html lang="zh">
                <body>
                    <div style={{ padding: 20 }}>
                        <h1>初始化错误</h1>
                        <pre>{error.message}</pre>
                    </div>
                </body>
            </html>
        )
    }

    if (!isReady) {
        return (
            <html lang="zh">
                <body>
                    <div style={{ padding: 20 }}>正在初始化应用...</div>
                </body>
            </html>
        )
    }

    return (
        <html lang="zh">
            <body>{children}</body>
        </html>
    )
}