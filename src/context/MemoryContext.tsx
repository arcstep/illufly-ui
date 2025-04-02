'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { API_BASE_URL } from '@/utils/config'

interface MemoryItem {
    user_id: string
    topic: string
    question_hash: string
    question: string
    answer: string
    created_at: number
}

export interface MemoryContextType {
    memories: MemoryItem[]
    isLoading: boolean
    topicGroups: Map<string, MemoryItem[]>
    fetchMemories: () => Promise<void>
}

export const MemoryContext = createContext<MemoryContextType>({
    memories: [],
    isLoading: false,
    topicGroups: new Map(),
    fetchMemories: async () => {
        throw new Error('MemoryProvider not found')
    }
})

export function MemoryProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [memories, setMemories] = useState<MemoryItem[]>([])
    const [topicGroups, setTopicGroups] = useState<Map<string, MemoryItem[]>>(new Map())

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

    return (
        <MemoryContext.Provider value={{
            memories,
            isLoading,
            topicGroups,
            fetchMemories
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