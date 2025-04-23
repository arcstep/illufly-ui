'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { useApiBase } from '@/hooks/useApiBase'

interface MemoryItem {
    user_id: string
    topic: string
    memory_id: string
    question: string
    answer: string
    created_at: number
    similarity?: number
    distance?: number
}

export interface MemoryContextType {
    memories: MemoryItem[]
    isLoading: boolean
    topicGroups: Map<string, MemoryItem[]>
    fetchMemories: () => Promise<void>
    updateMemory: (memoryItem: MemoryItem) => Promise<boolean>
    deleteMemory: (memoryId: string) => Promise<boolean>
    searchMemories: (query: string, threshold?: number, top_k?: number) => Promise<MemoryItem[]>
    isSearching: boolean
}

export const MemoryContext = createContext<MemoryContextType>({
    memories: [],
    isLoading: false,
    topicGroups: new Map(),
    fetchMemories: async () => {
        throw new Error('MemoryProvider not found')
    },
    updateMemory: async () => {
        throw new Error('MemoryProvider not found')
        return false
    },
    deleteMemory: async () => {
        throw new Error('MemoryProvider not found')
        return false
    },
    searchMemories: async () => {
        throw new Error('MemoryProvider not found')
        return []
    },
    isSearching: false
})

export function MemoryProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [memories, setMemories] = useState<MemoryItem[]>([])
    const [topicGroups, setTopicGroups] = useState<Map<string, MemoryItem[]>>(new Map())
    const { API_BASE_URL } = useApiBase();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        fetchMemories();
    }, []);

    // 将记忆按topic分组
    useEffect(() => {
        const groups = new Map<string, MemoryItem[]>();

        memories.forEach(memory => {
            const existingGroup = groups.get(memory.topic) || [];
            groups.set(memory.topic, [...existingGroup, memory]);
        });

        setTopicGroups(groups);
    }, [memories]);

    const fetchMemories = async () => {
        setIsLoading(true)
        try {
            const api_url = `${API_BASE_URL}/memory`
            const res = await fetch(api_url, {
                method: 'GET',
                credentials: 'include',
            })

            if (res.ok) {
                const data = await res.json()
                console.log('记忆数据 >>> ', data)
                setMemories(data)
            } else {
                console.error('获取记忆失败', res.status)
                setMemories([])
            }
        } catch (error) {
            console.error('获取记忆失败:', error)
            setMemories([])
        } finally {
            setIsLoading(false)
        }
    }

    // 更新记忆
    const updateMemory = async (memoryItem: MemoryItem): Promise<boolean> => {
        try {
            const api_url = `${API_BASE_URL}/memory/${memoryItem.memory_id}`
            const res = await fetch(api_url, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: memoryItem.topic,
                    question: memoryItem.question,
                    answer: memoryItem.answer
                })
            })

            if (res.ok) {
                // 更新本地状态
                setMemories(prev => prev.map(item =>
                    item.memory_id === memoryItem.memory_id ? memoryItem : item
                ))
                return true
            } else {
                console.error('更新记忆失败', res.status)
                return false
            }
        } catch (error) {
            console.error('更新记忆失败:', error)
            return false
        }
    }

    // 删除记忆
    const deleteMemory = async (memoryId: string): Promise<boolean> => {
        try {
            const api_url = `${API_BASE_URL}/memory/${memoryId}`
            const res = await fetch(api_url, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (res.ok) {
                // 更新本地状态
                setMemories(prev => prev.filter(item => item.memory_id !== memoryId))
                return true
            } else {
                console.error('删除记忆失败', res.status)
                return false
            }
        } catch (error) {
            console.error('删除记忆失败:', error)
            return false
        }
    }

    // 搜索记忆
    const searchMemories = async (query: string, threshold: number = 1.0, top_k: number = 15): Promise<MemoryItem[]> => {
        if (!query.trim()) {
            return []
        }

        setIsSearching(true)
        try {
            const api_url = `${API_BASE_URL}/memory/search`
            const res = await fetch(api_url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    threshold,
                    top_k
                })
            })

            if (res.ok) {
                const data = await res.json()
                console.log('记忆搜索结果 >>> ', data)
                return data
            } else {
                console.error('搜索记忆失败', res.status)
                return []
            }
        } catch (error) {
            console.error('搜索记忆失败:', error)
            return []
        } finally {
            setIsSearching(false)
        }
    }

    return (
        <MemoryContext.Provider value={{
            memories,
            isLoading,
            topicGroups,
            fetchMemories,
            updateMemory,
            deleteMemory,
            searchMemories,
            isSearching
        }}>
            {children}
        </MemoryContext.Provider>
    )
}

export function useMemory() {
    const context = useContext(MemoryContext);
    if (context === undefined) {
        throw new Error('useMemory must be used within an MemoryProvider');
    }
    return context;
}