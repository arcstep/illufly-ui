'use client'

import { createContext, useState, useContext, useMemo, useEffect } from 'react'
import { API_BASE_URL } from '@/utils/config'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// 基础消息类型
export interface Message {
    block_type: 'question' | 'answer'
    request_id: string
    message_id: string
    message_type: 'image' | 'audio' | 'video' | 'file' | 'text_chunk' | 'text'
    favorite_id: string | null
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string | Object
    created_at: number
    completed_at: number
}

// 线程
export interface Thread {
    thread_id: string
    title: string
    created_at: number
}

interface ChatContextType {
    // 当前线程状态
    currentThreadId: string | null

    // 对话历史
    threads: Thread[]

    // 临时保存流消息，与 history 中的消息合并组成完整的对话
    lastChunks: Message[]
    messages: Message[]

    // 创建新对话
    createNewThread: () => Promise<string>

    // 加载所有历史线程清单
    loadAllThreads: () => Promise<void>

    // 切换当前线程
    switchThread: (threadId: string) => Promise<void>

    // 发送新消息
    ask: (content: string) => Promise<void>

    // 切换收藏状态
    toggleFavorite: (requestId: string) => Promise<void>
}

// 创建 Context
const ChatContext = createContext<ChatContextType>({
    currentThreadId: null,
    threads: [],
    lastChunks: [],
    messages: [],
    createNewThread: async () => { throw new Error('ChatProvider not found') },
    loadAllThreads: async () => { throw new Error('ChatProvider not found') },
    ask: async () => { throw new Error('ChatProvider not found') },
    toggleFavorite: async () => { throw new Error('ChatProvider not found') },
    switchThread: async () => { throw new Error('ChatProvider not found') },
})

// Provider 组件
export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
    const [threads, setThreads] = useState<Thread[]>([])
    const [lastChunks, setLastChunks] = useState<Message[]>([])
    const [archivedMessages, setArchivedMessages] = useState<Message[]>([])
    const [pendingMessages, setPendingMessages] = useState<Message[]>([])

    // 监听pendingMessages变化，批量更新archivedMessages
    useEffect(() => {
        if (pendingMessages.length > 0) {
            setArchivedMessages(prev => [...prev, ...pendingMessages])
            setPendingMessages([])
        }
    }, [pendingMessages])

    // 合并chunks的工具函数
    const mergeChunks = (chunks: Message[]): Message[] => {
        if (chunks.length === 0) return []

        const messageGroups = new Map<string, Message[]>()
        chunks.forEach(chunk => {
            if (!messageGroups.has(chunk.message_id)) {
                messageGroups.set(chunk.message_id, [])
            }
            messageGroups.get(chunk.message_id)?.push(chunk)
        })

        return Array.from(messageGroups.values()).map(group => {
            const firstChunk = group[0]
            if (group.length === 1) return firstChunk

            const minCreatedAt = Math.min(
                ...group.map(chunk => chunk.created_at)
            )
            const maxCompletedAt = Math.max(
                ...group.map(chunk => chunk.completed_at)
            )

            return {
                ...firstChunk,
                content: group.map(chunk => chunk.content).join(''),
                message_type: 'text',
                created_at: minCreatedAt,
                completed_at: maxCompletedAt
            } as Message
        })
    }

    // 计算包含chunks的history
    const messages = useMemo(() => {
        if (!currentThreadId && lastChunks.length === 0) return []

        const mergedMessages = [
            ...archivedMessages,
            ...mergeChunks(lastChunks)
        ].sort((a, b) => a.created_at - b.created_at)
        // console.log('合并后的消息:', mergedMessages)
        return mergedMessages
    }, [archivedMessages, lastChunks, currentThreadId])

    // 创建新对话
    const createNewThread = async () => {
        const res = await fetch(`${API_BASE_URL}/chat/threads`, {
            method: 'POST',
            credentials: 'include'
        })
        const newThread = await res.json()
        setCurrentThreadId(newThread.thread_id)
        setThreads([...threads, newThread])
        setArchivedMessages([])
        setLastChunks([])
        return newThread.thread_id
    }

    // 切换当前线程，从后端加载对话消息
    const switchThread = async (threadId: string) => {
        const allThreads = threads.map(thread => thread.thread_id)
        if (allThreads.includes(threadId)) {
            setCurrentThreadId(threadId)
            const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/messages`, {
                credentials: 'include'
            })
            const histMessages = await res.json()
            console.log('加载远程对话消息数据', histMessages)
            setArchivedMessages(histMessages || [])
        }
    }

    // 加载历史对话列表
    const loadAllThreads = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/chat/threads`, {
                credentials: 'include'
            })
            const threads = await res.json()
            setThreads(threads)
            console.log('收到的线程数据:', threads)
        } catch (error) {
            console.error('加载线程失败:', error)
            throw error
        }
    }

    // 发送新消息
    const ask = async (content: string) => {
        if (!currentThreadId) return

        const abortController = new AbortController()
        let currentMessageId: string | null = null

        // 合并并清理chunks的辅助函数
        const mergeAndClearChunks = () => {
            if (lastChunks.length === 0) return

            // 先获取当前chunks的快照
            const currentChunks = [...lastChunks]
            const mergedChunks = mergeChunks(currentChunks)
            console.log('合并消息:', mergedChunks)

            // 使用函数式更新确保原子性
            setPendingMessages(prev => [...prev, ...mergedChunks])
            setLastChunks(prev => {
                // 只清除已合并的chunks
                if (prev === currentChunks) return []
                return prev.filter(chunk => !currentChunks.includes(chunk))
            })
        }

        try {
            await fetchEventSource(`${API_BASE_URL}/chat/threads/${currentThreadId}/ask`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages: [{ role: 'user', content }] }),
                signal: abortController.signal,
                onopen: async (response) => {
                    if (response.status !== 200 || !response.ok) {
                        throw new Error(`请求失败: ${response.status}`)
                    }
                    if (!response.body) {
                        throw new Error('没有响应体')
                    }
                    return
                },
                onmessage(event) {
                    try {
                        const message: Message = JSON.parse(event.data)

                        if (message.message_type === 'text_chunk') {
                            if (currentMessageId && currentMessageId !== message.message_id) {
                                mergeAndClearChunks()
                            }
                            currentMessageId = message.message_id
                            setLastChunks(prev => [...prev, message])
                        } else if (message.message_type === 'text') {
                            mergeAndClearChunks() // 先合并之前的chunks
                            setPendingMessages(prev => [...prev, message]) // 添加完整消息
                        }
                    } catch (e) {
                        console.error('解析消息失败:', e)
                    }
                },
                onclose() {
                    mergeAndClearChunks() // 确保关闭时合并所有剩余chunks
                },
                onerror(err) {
                    console.error('SSE 错误:', err)
                    throw err
                },
            })
        } catch (error) {
            console.error('发送消息失败:', error)
            throw error
        } finally {
            abortController.abort()
        }
    }

    // 切换收藏状态
    const toggleFavorite = async (requestId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/messages/${requestId}/favorite`, {
            method: 'POST',
            credentials: 'include'
        })

        if (res.ok) {
        }
    }

    return (
        <ChatContext.Provider value={{
            currentThreadId,
            threads,
            lastChunks,
            messages,
            createNewThread,
            switchThread,
            loadAllThreads,
            ask,
            toggleFavorite,
        }}>
            {children}
        </ChatContext.Provider>
    )
}

// Hook
export function useChat() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider')
    }
    return context
}
