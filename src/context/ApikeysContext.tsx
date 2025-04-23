'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { useApiBase } from '@/hooks/useApiBase'

interface Apikey {
    api_key: string
    base_url: string
    user_id: string
    description: string
    created_at: number
    expires_at: number
    is_expired: boolean
}

export interface ApikeyContextType {
    apikeys: Apikey[]
    imitators: string[]
    createApikey: (description: string, imitator: string) => Promise<string>
    listApikeys: () => Promise<void>
    revokeApikey: (key: string) => Promise<void>
}

export const ApikeysContext = createContext<ApikeyContextType>({
    apikeys: [],
    imitators: [],
    createApikey: async () => {
        throw new Error('ApikeysProvider not found')
    },
    listApikeys: async () => {
        throw new Error('ApikeysProvider not found')
    },
    revokeApikey: async () => {
        throw new Error('ApikeysProvider not found')
    }
})

export function ApikeysProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true)
    const [apikeys, setApikeys] = useState<Apikey[]>([])
    const [imitators, setImitators] = useState<string[]>([])
    const { API_BASE_URL } = useApiBase();

    useEffect(() => {
        // 只在客户端执行
        if (typeof window === 'undefined') return;

        // 优先获取imitators列表
        listImitators().then(() => {
            // 然后获取apikeys列表
            listApikeys();
        });
    }, []);

    const listImitators = async () => {
        try {
            setIsLoading(true)
            const api_url = `${API_BASE_URL}/imitators`
            const res = await fetch(api_url, {
                method: 'GET',
                credentials: 'include',
            })

            if (res.ok) {
                const data = await res.json()
                console.log('imitators response >>> ', data)
                // 确保设置正确的数据结构
                if (data && data.imitators && Array.isArray(data.imitators)) {
                    setImitators(data.imitators)
                } else if (Array.isArray(data)) {
                    // 如果直接返回数组
                    setImitators(data)
                } else {
                    console.error('imitators数据格式不正确', data)
                    // 设置默认值
                    setImitators(['OPENAI', 'QWEN', 'ZHIPU'])
                }
            } else {
                console.error('获取imitators失败', res.status)
                // 设置默认值
                setImitators(['OPENAI', 'QWEN', 'ZHIPU'])
            }
        } catch (error) {
            console.error('获取imitators出错:', error)
            // 设置默认值
            setImitators(['OPENAI', 'QWEN', 'ZHIPU'])
        } finally {
            setIsLoading(false)
        }
    }

    const createApikey = async (description: string, imitator: string): Promise<string> => {
        const api_url = `${API_BASE_URL}/apikeys`
        try {
            setIsLoading(true)
            const res = await fetch(api_url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description, imitator }),
                credentials: 'include',
            })

            if (res.ok) {
                const data = await res.json()
                console.log('apikey >>> ', data)
                // 刷新API密钥列表
                await listApikeys()
                return data.apikey // 返回新创建的API密钥
            } else {
                console.log('创建 APIKEY 失败')
                throw new Error('创建 APIKEY 失败')
            }
        } catch (error) {
            console.error('创建 APIKEY 失败:', {
                error,
            })
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const revokeApikey = async (key: string) => {
        const api_url = `${API_BASE_URL}/apikeys/revoke/${key}`
        try {
            setIsLoading(true)
            const res = await fetch(api_url, {
                method: 'POST',
                credentials: 'include',
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
        } finally {
            setIsLoading(false)
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
                setApikeys(apikeys_list)
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
            imitators,
            createApikey, listApikeys, revokeApikey
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