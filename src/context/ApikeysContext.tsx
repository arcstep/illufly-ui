'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { API_BASE_URL } from '@/utils/config'

interface Apikey {
    apikey: string
    user_id: string
    description: string
    created_at: number
    expires_at: number
    is_expired: boolean
}

// 基础消息类型
export interface ApikeyContextType {
    apikeys: Apikey[]
    currentApikey: Apikey | null
    createApikey: (user_id: string, description: string) => Promise<void>
    listApikeys: (user_id: string) => Promise<void>
    revokeApikey: (user_id: string, key: string) => Promise<void>
    changeCurrentApikey: (apikey: Apikey) => Promise<void>
}

export const ApikeysContext = createContext<ApikeyContextType>({
    apikeys: [],
    currentApikey: null,
    createApikey: async () => {
        throw new Error('ApikeysProvider not found')
    },
    listApikeys: async () => {
        throw new Error('ApikeysProvider not found')
    },
    revokeApikey: async () => {
        throw new Error('ApikeysProvider not found')
    },
    changeCurrentApikey: async () => {
        throw new Error('ApikeysProvider not found')
    }
})

export function ApikeysProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true)
    const [apikeys, setApikeys] = useState<Apikey[]>([])
    const [currentApikey, setCurrentApikey] = useState<Apikey | null>(null)

    useEffect(() => {
        // 只在客户端执行
        if (typeof window === 'undefined') return;

        listApikeys();
    }, [])

    const changeCurrentApikey = async (apikey: Apikey) => {
        setCurrentApikey(apikey)
    }

    const createApikey = async (user_id: string, description: string) => {
        const api_url = `${API_BASE_URL}/apikeys`
        try {
            setIsLoading(true)
            const res = await fetch(api_url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id, description })
            })

            if (res.ok) {
                const apikey = await res.json()
                console.log('apikey >>> ', apikey)
            } else {
                console.log('创建 APIKEY 失败')
            }
        } catch (error) {
            console.error('创建 APIKEY 失败:', {
                error,
            })
        }
    }

    const revokeApikey = async (user_id: string, key: string) => {
        const api_url = `${API_BASE_URL}/apikeys/${user_id}/${key}`
        try {
            setIsLoading(true)
            const res = await fetch(api_url, {
                method: 'POST',
            })

            if (res.ok) {
                console.log('撤销 APIKEY 成功')
            } else {
                console.log('撤销 APIKEY 失败')
            }
        } catch (error) {
            console.error('撤销 APIKEY 失败:', {
                error,
            })
        }
    }

    const listApikeys = async () => {
        const api_url = `${API_BASE_URL}/apikeys`
        try {
            setIsLoading(true)

            const res = await fetch(api_url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                signal: AbortSignal.timeout(8000),
            })

            if (res.ok) {
                const apikeys_list = await res.json()
                console.log('apikeys_list >>> ', apikeys_list)
                setApikeys(apikeys_list.data)
            } else {
                console.log('获取 APIKEYS 失败')
            }
        } catch (error) {
            console.error('获取 APIKEYS 失败:', {
                error,
                message: error instanceof Error ? error.message : '未知错误',
                api_url
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <ApikeysContext.Provider value={{
            apikeys,
            currentApikey,
            createApikey, listApikeys, revokeApikey,
            changeCurrentApikey
        }}>
            {children}
        </ApikeysContext.Provider>
    )
}

export function useApikeys() {
    const context = useContext(ApikeysContext);
    if (context === undefined) {
        throw new Error('useApikeys must be used within an ApikeysProvider');
    }
    return context;
}