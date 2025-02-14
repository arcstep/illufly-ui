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
    currentPath: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh_token: () => Promise<void>;
    changeCurrentPath: (path: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user_id: null,
    username: null,
    email: null,
    role: null,
    device_id: null,
    isAuthenticated: false,
    currentPath: null,
    login: async () => {
        throw new Error('AuthProvider not found')
    },
    logout: async () => {
        throw new Error('AuthProvider not found')
    },
    refresh_token: async () => {
        throw new Error('AuthProvider not found')
    },
    changeCurrentPath: async () => {
        throw new Error('AuthProvider not found')
    }
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)

    // 不需要自动刷新token的路径
    const noAuthPaths = ['/login', '/register', '/forgot-password']

    const [user_id, setUserId] = useState<string | null>(null)
    const [device_id, setDeviceId] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [currentPath, setCurrentPath] = useState<string | null>(null)

    useEffect(() => {
        if (!noAuthPaths.includes(pathname)) {
            refresh_token()
        } else {
            setIsLoading(false)
        }
    }, [pathname])

    const refresh_token = async () => {
        const api_url = `${API_BASE_URL}/auth/profile`
        console.log('api_url >>> ', api_url)

        try {
            console.log('开始刷新 token')
            setIsLoading(true)

            const res = await fetch(api_url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                signal: AbortSignal.timeout(5000)
            })

            console.log('获取到响应:', res.status)
            const result = await res.json()
            console.log('响应数据:', result)

            if (res.ok) {
                const token_claims = result.data
                setUserId(token_claims.user_id)
                setDeviceId(token_claims.device_id)
                setUsername(token_claims.username)
                setEmail(token_claims.email)
                setRole(token_claims.role)
                setIsAuthenticated(true)
            } else {
                console.log('响应不成功，重定向到登录页')
                setIsAuthenticated(false)
                if (typeof window !== 'undefined') {
                    router.replace('/login')
                }
            }
        } catch (error) {
            console.error('刷新 token 详细错误:', {
                error,
                message: error instanceof Error ? error.message : '未知错误',
                api_url
            })
            setIsAuthenticated(false)
            if (typeof window !== 'undefined') {
                router.replace('/login')
            }
        } finally {
            setIsLoading(false)
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
        const token_claims = response.data
        console.log("POST auth/login >>> ", token_claims)
        setUserId(token_claims.user_id)
        setDeviceId(token_claims.device_id)
        setUsername(token_claims.username)
        setEmail(token_claims.email)
        setRole(token_claims.role)
        setIsAuthenticated(true)

        // 登录后重定向
        const from = searchParams.get('from') || '/chat'
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

    const changeCurrentPath = async (path: string) => {
        setCurrentPath(path)
    }

    if (isLoading && !noAuthPaths.includes(pathname)) {
        return <div>Loading...</div>
    }

    return (
        <AuthContext.Provider value={{
            user_id, device_id, username, email, role, isAuthenticated, currentPath,
            login, logout, refresh_token, changeCurrentPath
        }}>
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