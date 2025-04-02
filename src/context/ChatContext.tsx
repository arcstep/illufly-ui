'use client'

import { createContext, useState, useContext, useMemo, useEffect, useRef } from 'react'
import { API_BASE_URL } from '@/utils/config'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// 基础消息类型
export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
    created_at: number
    dialouge_id: string
}

// 线程
export interface Thread {
    user_id: string
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

    // 使用Map跟踪正在处理的消息，而不是Set
    const activeMessagesRef = useRef(new Map<string, Message>())

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

        // 按 dialouge_id 分组
        chunks.forEach((chunk: Message) => {
            if (!messageGroups.has(chunk.dialouge_id)) {
                messageGroups.set(chunk.dialouge_id, [])
            }
            messageGroups.get(chunk.dialouge_id)?.push(chunk)
        })
        // 合并每组chunks，但跳过已处理的ID
        return Array.from(messageGroups.entries())
            .filter(([dialougeId]) => !activeMessagesRef.current.has(dialougeId))
            .map(([dialougeId, group]) => {
                // 标记为已处理
                activeMessagesRef.current.set(dialougeId, group[0] as Message)

                const firstChunk = group[0]
                if (group.length === 1) return firstChunk

                // 合并同一message_id的chunks
                return {
                    ...firstChunk,
                    content: group.map(chunk => chunk.content).join(''),
                    role: 'assistant' // 合并后转为完整消息
                }
            })
    }

    // 计算包含chunks的history
    const messages = useMemo(() => {
        if (!currentThreadId && lastChunks.length === 0) return []

        // 所有消息合并
        const allMessages = [
            ...archivedMessages,
            ...mergeChunks(lastChunks)
        ]

        // 使用Map去重，保留最新的消息
        const messageMap = new Map<string, Message>()
        allMessages.forEach(msg => {
            // 提取真实message_id（移除临时前缀）
            const realId = msg.dialouge_id.replace(/^temp_/, '')

            // 如果Map中不存在此ID或当前消息更新，则更新Map
            if (!messageMap.has(realId) || msg.created_at > messageMap.get(realId)!.created_at) {
                messageMap.set(realId, msg)
            }
        })

        // 转换回数组并排序
        const uniqueMessages = Array.from(messageMap.values())
            .sort((a, b) => a.created_at - b.created_at)

        return uniqueMessages
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
        await loadAllThreads()
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

        // 添加用户消息到历史记录
        const userMessage: Message = {
            role: 'user',
            content,
            created_at: Date.now() / 1000,
            dialouge_id: `user_${Date.now()}`
        }
        setArchivedMessages(prev => [...prev, userMessage])

        const abortController = new AbortController()

        // 合并chunks的辅助函数
        const mergeAndClearChunks = () => {
            setLastChunks(prev => {
                // 按dialouge_id分组
                const messageGroups = new Map<string, Message[]>()
                prev.forEach((chunk: Message) => {
                    if (!messageGroups.has(chunk.dialouge_id)) {
                        messageGroups.set(chunk.dialouge_id, [])
                    }
                    messageGroups.get(chunk.dialouge_id)?.push(chunk)
                })

                // 最终合并
                messageGroups.forEach((chunks, dialougeId) => {
                    const mergedMessage = {
                        ...chunks[0],
                        content: chunks.map(c => c.content).join(''),
                        role: 'assistant'
                    }

                    // 替换之前的临时版本
                    setArchivedMessages(prev => {
                        const filtered = prev.filter(m => m.dialouge_id !== `temp_${dialougeId}`)
                        return [...filtered, {
                            ...mergedMessage,
                            role: 'assistant' as const // 使用字面量类型
                        }]
                    })

                    // 清理活动消息引用
                    activeMessagesRef.current.delete(dialougeId)
                })

                return [] // 清空lastChunks
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
                    model: 'gpt-4o-mini',
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

                        // 解析原始数据
                        const data = JSON.parse(event.data)

                        // 转换为统一的Message格式
                        const message: Message = {
                            role: 'assistant',
                            content: data.output_text || data.content || '',
                            created_at: data.created_at,
                            dialouge_id: data.dialouge_id
                        }

                        // 处理AI增量消息块
                        if (data.chunk_type === 'ai_delta') {
                            console.log('收到文本块:', message)

                            // 添加到lastChunks用于最终的完整合并
                            setLastChunks(prev => [...prev, message])

                            // 同时处理实时更新
                            updateActiveMessage(message)
                        } else {
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

    // 新增实时更新函数
    const updateActiveMessage = (chunk: Message) => {
        const dialougeId = chunk.dialouge_id

        // 检查是否已有这个dialouge_id的活动消息
        if (!activeMessagesRef.current.has(dialougeId)) {
            // 首次收到此dialouge_id，创建新的活动消息
            const newMessage: Message = {
                ...chunk,
                role: 'assistant', // 转为助手角色
                content: chunk.content // 初始内容
            }
            activeMessagesRef.current.set(dialougeId, newMessage)

            // 立即添加到界面显示
            setArchivedMessages(prev => {
                // 确认消息不存在才添加（避免重复）
                if (!prev.some(m => m.dialouge_id === `temp_${dialougeId}`)) {
                    return [...prev, {
                        ...newMessage,
                        dialouge_id: `temp_${dialougeId}` // 使用临时ID
                    } as Message]
                }
                return prev
            })
        } else {
            // 已有此dialouge_id，更新内容
            const currentMessage = activeMessagesRef.current.get(dialougeId)!
            const updatedMessage: Message = {
                ...currentMessage,
                content: currentMessage.content + chunk.content,
                created_at: chunk.created_at // 更新创建时间
            }
            activeMessagesRef.current.set(dialougeId, updatedMessage)

            // 更新UI
            setArchivedMessages(prev => {
                return prev.map(m =>
                    m.dialouge_id === `temp_${dialougeId}`
                        ? { ...updatedMessage, dialouge_id: `temp_${dialougeId}` } as Message
                        : m
                )
            })
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
