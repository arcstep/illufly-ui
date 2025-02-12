'use client'

import { createContext, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthContextType } from '@/types/auth'

export const AuthContext = createContext<AuthContextType>({
    user_id: null,
    username: null,
    email: null,
    role: null,
    device_id: null,
    isAuthenticated: false,
    login: async () => {
        throw new Error('AuthProvider not found')
    },
    logout: async () => {
        throw new Error('AuthProvider not found')
    },
    refresh_token: async () => {
        throw new Error('AuthProvider not found')
    }
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [user_id, setUserId] = useState<string | null>(null)
    const [device_id, setDeviceId] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // 在任何意见中，自动获取用户信息，然后更新 Context
    const refresh_token = async () => {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
            const result = await res.json()
            console.log(result)
            setUserId(result.user_id)
            setDeviceId(result.device_id)
            setUsername(result.username)
            setEmail(result.email)
            setRole(result.role)
            setIsAuthenticated(true)
        } else {
            router.push('/login')
        }
    }

    // 登录获得 Context 更新
    const login = async (email: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ email, password })
        })

        if (!res.ok) throw new Error('Login failed')

        const user = await res.json()
        setUserId(user.user_id)
        setIsAuthenticated(true)

        // 登录后重定向
        const from = searchParams.get('from') || '/chat'
        router.replace(from)
    }

    // 退出登录
    const logout = async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        })
        setUserId(null)
        setUsername(null)
        setEmail(null)
        setRole(null)
        setIsAuthenticated(false)
        router.replace('/login')
    }

    return (
        <AuthContext.Provider value={{ user_id, device_id, username, email, role, isAuthenticated, login, logout, refresh_token }}>
            {children}
        </AuthContext.Provider>
    )
}
