'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useApiBase } from '@/hooks/useApiBase'

interface User {
    user_id?: string
    id?: string
    username?: string
    email?: string
    role?: string
    device_id?: string
}

interface AuthContextType {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (username: string, password: string) => Promise<void>
    logout: () => Promise<void>
    authFetch: (url: string, options?: RequestInit) => Promise<Response>
    setToken: (token: string | null) => void
}

export const AuthContext = createContext<AuthContextType>({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => { throw new Error('AuthProvider not found') },
    logout: async () => { throw new Error('AuthProvider not found') },
    authFetch: async () => { throw new Error('AuthProvider not found') },
    setToken: () => { throw new Error('AuthProvider not found') }
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { API_BASE_URL } = useApiBase()
    const [token, setTokenState] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    // 简单更新令牌
    const setToken = (newToken: string | null) => {
        setTokenState(newToken)
    }

    const refreshAccessToken = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('刷新令牌失败');
            }
            const data = await response.json();
            setTokenState(data.access_token);
            setUser(data.user);
        } catch (error) {
            throw new Error('刷新令牌失败');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // 检查当前路径，如果是登录或注册页面则不刷新令牌
        const isAuthPage = pathname === '/login' || pathname === '/register' || pathname?.startsWith('/auth/')

        // 获取加载状态的Promise
        const checkAuth = async () => {
            if (!isAuthPage) {
                try {
                    await refreshAccessToken();
                } catch (error) {
                    // 如果刷新令牌失败且不在登录页面，则重定向到登录页
                    router.push(`/login?from=${encodeURIComponent(pathname || '')}`);
                }
            } else {
                // 在认证页面直接设置加载状态为 false
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [pathname]);

    // 简化的 authFetch
    const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {})
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        })

        // 处理自动令牌续订
        const newToken = response.headers.get('Authorization')
        if (newToken?.startsWith('Bearer ')) {
            const accessToken = newToken.substring(7)
            setToken(accessToken)
        }

        // 仅处理 401 错误，且只尝试刷新一次
        if (response.status === 401) {
            await refreshAccessToken();

            // 使用新的令牌重试请求
            return await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            })
        }

        return response
    }

    // 登录
    const login = async (username: string, password: string) => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || '登录失败')
            }

            // 从响应头获取令牌
            const authHeader = response.headers.get('Authorization')
            if (authHeader?.startsWith('Bearer ')) {
                const accessToken = authHeader.substring(7)
                setToken(accessToken)

                // 尝试从响应体获取用户信息
                try {
                    const userData = await response.json()
                    setUser(userData.user || userData)
                } catch (e) {
                    // 如果无法解析响应，尝试从令牌解析用户信息
                    try {
                        const payload = JSON.parse(window.atob(accessToken.split('.')[1]))
                        setUser({
                            user_id: payload.user_id || payload.id,
                            username: payload.username,
                            email: payload.email,
                            role: payload.role,
                            device_id: payload.device_id
                        })
                    } catch (tokenError) {
                        console.error('解析令牌失败:', tokenError)
                    }
                }
            }

            // 登录后重定向
            const from = searchParams?.get('from') || '/'
            router.push(from)
        } catch (error: any) {
            console.error('登录失败:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    // 登出
    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include'
            })
        } catch (error) {
            console.error('登出请求失败:', error)
        } finally {
            setToken(null)
            setUser(null)
            router.push('/login')
        }
    }

    const value = {
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        authFetch,
        setToken
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}