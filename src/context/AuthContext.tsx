'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { API_BASE_URL } from '@/utils/config'

interface AuthContextType {
    user_id: string | null;
    username: string | null;
    email: string | null;
    role: string | null;
    isAuthenticated: boolean;
    device_id: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh_token: () => Promise<void>;
}

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
    const pathname = usePathname()

    // 不需要自动刷新token的路径
    const noAuthPaths = ['/login', '/register', '/forgot-password']

    const [user_id, setUserId] = useState<string | null>(null)
    const [device_id, setDeviceId] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        // 只在非认证页面自动刷新
        if (!noAuthPaths.includes(pathname)) {
            refresh_token()
        }
    }, [pathname])

    // 在任何意见中，自动获取用户信息，然后更新 Context
    const refresh_token = async () => {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, { credentials: 'include' })
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
    const login = async (username: string, password: string) => {
        console.log("login >>> ", username, password)
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Login failed');
        }

        const response = await res.json()
        setUserId(response.user_id)
        setDeviceId(response.device_id)
        setUsername(response.username)
        setEmail(response.email)
        setRole(response.role)
        setIsAuthenticated(true)

        // 登录后重定向
        const from = searchParams.get('from') || '/'
        router.replace(from)
    }

    // 退出登录
    const logout = async () => {
        await fetch(`${API_BASE_URL}/auth/logout`, {
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

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}