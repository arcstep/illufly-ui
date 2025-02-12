'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedLayout({
    children
}: {
    children: React.ReactNode
}) {
    const authContext = useAuthGuard()
    const router = useRouter()

    useEffect(() => {
        if (!authContext.isAuthenticated) {
            router.replace('/login')
        }
    }, [authContext.isAuthenticated, router])

    if (!authContext.isAuthenticated) {
        return <div>Loading...</div>
    } else {
        return <>{children}</>
    }
} 