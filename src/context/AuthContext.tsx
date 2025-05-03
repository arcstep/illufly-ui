'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useApiBase } from '@/hooks/useApiBase'

interface AuthContextType {
    user_id: string | null;
    username: string | null;
    email: string | null;
    role: string | null;
    isAuthenticated: boolean;
    device_id: string | null;
    currentPath: string | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh_token: () => Promise<boolean>;
    changeCurrentPath: (path: string) => Promise<void>;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    setToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
    user_id: null,
    username: null,
    email: null,
    role: null,
    device_id: null,
    isAuthenticated: false,
    currentPath: null,
    token: null,
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
    },
    authFetch: async () => {
        throw new Error('AuthProvider not found')
    },
    setToken: () => {
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
    const [token, setTokenState] = useState<string | null>(null)
    const { API_BASE_URL } = useApiBase();

    // 更新token并保存到本地存储
    const setToken = (newToken: string | null) => {
        setTokenState(newToken);
        if (newToken) {
            localStorage.setItem('auth_token', newToken);
        } else {
            localStorage.removeItem('auth_token');
        }
    };

    useEffect(() => {
        // 页面加载时从localStorage读取token
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            setTokenState(storedToken);
            // 有token时尝试获取用户信息
            fetchUserInfo(storedToken);
        } else if (!noAuthPaths.includes(pathname || '')) {
            // 如果没有token且不在免认证页面，则尝试刷新token
            refresh_token();
        } else {
            setIsLoading(false);
        }
    }, []);

    // 获取用户信息
    const fetchUserInfo = async (currentToken: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();
                // 更新用户信息
                setUserId(userData.user_id || userData.id);
                setUsername(userData.username);
                setEmail(userData.email);
                setRole(userData.role);
                setDeviceId(userData.device_id);
                setIsAuthenticated(true);
            } else {
                // 如果获取用户信息失败，尝试刷新token
                const refreshed = await refresh_token();
                if (!refreshed) {
                    handleUnauthorized();
                }
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            handleUnauthorized();
        } finally {
            setIsLoading(false);
        }
    };

    // 辅助函数：获取带认证的请求头
    const getAuthHeaders = () => {
        const headers: HeadersInit = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    };

    // 带认证的fetch函数
    const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
        // 添加认证头
        const headers = {
            ...options.headers,
            ...getAuthHeaders()
        };

        // 发送请求
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        });

        // 处理自动令牌续订
        const newToken = response.headers.get('Authorization');
        if (newToken?.startsWith('Bearer ')) {
            const extractedToken = newToken.substring(7);
            setToken(extractedToken);
        }

        // 处理401错误（令牌过期）
        if (response.status === 401) {
            // 尝试刷新令牌
            const refreshed = await refresh_token();
            if (refreshed) {
                // 使用新令牌重试请求
                return authFetch(url, options);
            } else {
                // 刷新失败，重定向到登录页
                handleUnauthorized();
            }
        }

        return response;
    };

    const refresh_token = async (): Promise<boolean> => {
        try {
            console.log('开始刷新 token')
            setIsLoading(true)

            const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                credentials: 'include'
            })

            if (res.ok) {
                // 从响应头获取访问令牌
                const authHeader = res.headers.get('Authorization');
                if (authHeader?.startsWith('Bearer ')) {
                    const accessToken = authHeader.substring(7);
                    setToken(accessToken);
                }

                // 如果响应中包含用户信息，也更新它
                try {
                    const data = await res.json();
                    if (data) {
                        setUserId(data.user_id || data.id || null);
                        setDeviceId(data.device_id || null);
                        setUsername(data.username || null);
                        setEmail(data.email || null);
                        setRole(data.role || null);
                    }
                } catch (e) {
                    // 如果响应中没有JSON数据，这不是错误，我们已经从头部获取了令牌
                    console.log('刷新令牌响应中没有JSON数据，这是正常的');
                }

                setIsAuthenticated(true);
                return true;
            } else {
                handleUnauthorized();
                return false;
            }
        } catch (error) {
            console.error('刷新 token 详细错误:', {
                error,
                message: error instanceof Error ? error.message : '未知错误'
            })
            handleUnauthorized();
            return false;
        } finally {
            setIsLoading(false)
        }
    }

    // 处理未授权情况
    const handleUnauthorized = () => {
        setIsAuthenticated(false)
        setToken(null)

        // 清除用户信息
        setUserId(null)
        setDeviceId(null)
        setUsername(null)
        setEmail(null)
        setRole(null)

        console.log("认证已失效，清除用户状态")

        // 当前不重定向到登录页，让调用者决定是否重定向
    }

    // 登录获得 Context 更新
    const login = async (username: string, password: string) => {
        console.log("login >>> ", username, password)
        setIsLoading(true);
        try {
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
                try {
                    const errorData = await res.json();
                    throw new Error(errorData.detail || 'Login failed');
                } catch (e) {
                    throw new Error(`Login failed: ${res.status}`);
                }
            }

            // 克隆响应以便可以多次读取
            const responseClone = res.clone();

            // 从响应头获取访问令牌
            const authHeader = res.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const accessToken = authHeader.substring(7);
                setToken(accessToken);
            }

            try {
                const userData = await responseClone.json()
                console.log("POST api/auth/login >>> ", userData)

                // 检查是否有嵌套的user对象
                const userInfo = userData.user || userData
                console.log("处理后的用户信息 >>> ", userInfo)

                setUserId(userInfo.user_id || userInfo.id)
                setDeviceId(userInfo.device_id)
                setUsername(userInfo.username)
                setEmail(userInfo.email)
                setRole(userInfo.role)
                setIsAuthenticated(true)

                console.log("用户信息已设置 >>> ", {
                    user_id: userInfo.user_id || userInfo.id,
                    username: userInfo.username,
                    isAuthenticated: true
                })
            } catch (error) {
                console.error("无法解析用户数据，但令牌已设置:", error);
                // 即使没有用户数据也设置为已认证状态，因为我们有令牌
                setIsAuthenticated(true);
            }

            // 登录后重定向
            const from = searchParams?.get('from') || '/'
            router.replace(from)
        } catch (error: any) {
            console.error("登录失败:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    // 退出登录
    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
        } catch (error) {
            console.error('登出请求失败:', error);
        } finally {
            setUserId(null)
            setUsername(null)
            setEmail(null)
            setRole(null)
            setIsAuthenticated(false)
            setToken(null)
            router.replace('/login')
        }
    }

    const changeCurrentPath = async (path: string) => {
        setCurrentPath(path)
    }

    if (isLoading && !noAuthPaths.includes(pathname || '')) {
        return <div>Loading...</div>
    }

    return (
        <AuthContext.Provider value={{
            user_id, device_id, username, email, role,
            isAuthenticated, token, login, logout, refresh_token,
            currentPath, changeCurrentPath, authFetch, setToken
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