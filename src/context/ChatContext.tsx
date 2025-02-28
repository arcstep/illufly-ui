'use client'

import { createContext, useState, useContext, useMemo, useEffect, useRef } from 'react'
import { API_BASE_URL } from '@/utils/config'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// 基础消息类型
export interface Message {
    model: string
    block_type: 'question' | 'answer'
    request_id: string
    message_id: string
    message_type: 'image' | 'audio' | 'video' | 'file' | 'text_chunk' | 'text'
    favorite_id: string | null
    role: 'user' | 'assistant' | 'system' | 'tool'
    text: string | Object
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

    // 在组件顶部添加一个ref来跟踪已处理的消息
    const processedMessageIds = useRef(new Set<string>())

    // 在每次请求开始时重置已处理消息ID
    const resetProcessedIds = () => {
        processedMessageIds.current.clear()
    }

    // 监听pendingMessages变化，批量更新archivedMessages
    useEffect(() => {
        if (pendingMessages.length > 0) {
            setArchivedMessages(prev => [...prev, ...pendingMessages])
            setPendingMessages([])
        }
    }, [pendingMessages])

    // 修改你现有的mergeChunks函数，确保不会重复处理相同ID
    const mergeChunks = (chunks: Message[]): Message[] => {
        if (chunks.length === 0) return []

        const messageGroups = new Map<string, Message[]>()

        // 按message_id分组
        chunks.forEach(chunk => {
            if (!messageGroups.has(chunk.message_id)) {
                messageGroups.set(chunk.message_id, [])
            }
            messageGroups.get(chunk.message_id)?.push(chunk)
        })

        // 合并每组chunks，但跳过已处理的ID
        return Array.from(messageGroups.entries())
            .filter(([messageId]) => !processedMessageIds.current.has(messageId))
            .map(([messageId, group]) => {
                // 标记为已处理
                processedMessageIds.current.add(messageId)

                const firstChunk = group[0]
                if (group.length === 1) return firstChunk

                // 合并同一message_id的chunks
                return {
                    ...firstChunk,
                    text: group.map(chunk => chunk.text).join(''),
                    message_type: 'text' // 合并后转为完整消息
                }
            })
    }

    // 计算包含chunks的history
    const messages = useMemo(() => {
        if (!currentThreadId && lastChunks.length === 0) return []

        const mergedMessages = [
            ...archivedMessages,
            ...mergeChunks(lastChunks)
        ].sort((a, b) => a.completed_at - b.completed_at)
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
            const res = await fetch(`${API_BASE_URL}/chat/thread/${threadId}/messages`, {
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

        // 重置状态
        setLastChunks([])
        resetProcessedIds()

        const abortController = new AbortController()
        let currentMessageId: string | null = null

        // 合并chunks的辅助函数
        const mergeAndClearChunks = () => {
            setLastChunks(prev => {
                if (prev.length === 0) return prev

                // 获取当前要处理的message_id
                const messageId = prev[0]?.message_id

                // 如果已经处理过这个ID，跳过
                if (processedMessageIds.current.has(messageId)) {
                    console.log(`跳过已处理的message_id: ${messageId}`)
                    return prev
                }

                // 只处理当前message_id的chunks
                const chunksToProcess = prev.filter(chunk => chunk.message_id === messageId)
                const otherChunks = prev.filter(chunk => chunk.message_id !== messageId)

                if (chunksToProcess.length > 0) {
                    const mergedChunks = mergeChunks(chunksToProcess)
                    console.log('合并消息:', mergedChunks)

                    // 标记为已处理
                    processedMessageIds.current.add(messageId)

                    // 更新历史记录
                    setPendingMessages(prev => [...prev, ...mergedChunks])

                    // 只返回未处理的chunks
                    return otherChunks
                }

                return prev
            })
        }

        try {
            await fetchEventSource(`${API_BASE_URL}/chat/complete`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imitator: 'QWEN',
                    model: 'qwen-plus',
                    thread_id: currentThreadId,
                    messages: [{ role: 'user', content }]
                }),
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
                        console.log('收到消息:', event.data)
                        if (event.data === '[DONE]') {
                            mergeAndClearChunks()
                            return
                        }
                        const message: Message = JSON.parse(event.data)

                        if (message.message_type === 'text_chunk') {
                            console.log('收到文本块:', message)
                            if (currentMessageId && currentMessageId !== message.message_id) {
                                mergeAndClearChunks()
                            }
                            currentMessageId = message.message_id
                            setLastChunks(prev => [...prev, message])
                        } else if (message.message_type === 'text') {
                            console.log('收到完整消息:', message)
                            mergeAndClearChunks() // 先合并之前的chunks
                            setPendingMessages(prev => [...prev, message]) // 添加完整消息
                        }
                    } catch (e) {
                        console.error('解析消息失败:', e)
                    }
                },
                onclose() {
                    console.log('SSE 连接已关闭')
                    mergeAndClearChunks()
                    // 重置处理状态
                    currentMessageId = null
                    processedMessageIds.current.clear()
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
