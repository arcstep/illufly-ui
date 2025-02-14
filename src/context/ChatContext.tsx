'use client'

import { createContext, useState, useContext } from 'react'
import { API_BASE_URL } from '@/utils/config'

// 定义类型
interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface ChatMessage {
    request_id: string
    favorite: boolean
    request: Message[]
    reply: Message[]
}

interface Thread {
    thread_id: string
    title: string
    last_message: string
    created_at: string
    updated_at: string
}

interface ChatContextType {
    // 当前线程状态
    currentThreadId: string | null
    currentMessages: ChatMessage[]

    // 历史线程列表
    threads: Thread[]

    // 操作方法
    createNewThread: () => Promise<string>
    loadThreadHistory: () => Promise<void>
    loadThreadMessages: (threadId: string) => Promise<void>
    sendMessage: (content: string) => Promise<void>
    toggleFavorite: (requestId: string) => Promise<void>
}

// 创建 Context
const ChatContext = createContext<ChatContextType>({
    currentThreadId: null,
    currentMessages: [],
    threads: [],
    createNewThread: async () => { throw new Error('ChatProvider not found') },
    loadThreadHistory: async () => { throw new Error('ChatProvider not found') },
    loadThreadMessages: async () => { throw new Error('ChatProvider not found') },
    sendMessage: async () => { throw new Error('ChatProvider not found') },
    toggleFavorite: async () => { throw new Error('ChatProvider not found') }
})

// Provider 组件
export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
    const [threads, setThreads] = useState<Thread[]>([])

    // 创建新对话
    const createNewThread = async () => {
        const res = await fetch(`${API_BASE_URL}/chat/threads`, {
            method: 'POST',
            credentials: 'include'
        })
        const data = await res.json()
        const newThreadId = data.thread_id
        setCurrentThreadId(newThreadId)
        setCurrentMessages([])
        return newThreadId
    }

    // 加载历史对话列表
    const loadThreadHistory = async () => {
        const res = await fetch(`${API_BASE_URL}/chat/threads`, {
            credentials: 'include'
        })
        const data = await res.json()
        setThreads(data.threads)
    }

    // 加载特定对话的消息
    const loadThreadMessages = async (threadId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/messages`, {
            credentials: 'include'
        })
        const data = await res.json()
        setCurrentThreadId(threadId)
        setCurrentMessages(data.messages)
    }

    // 发送新消息
    const sendMessage = async (content: string) => {
        if (!currentThreadId) return

        const res = await fetch(`${API_BASE_URL}/chat/threads/${currentThreadId}/messages`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content }]
            })
        })

        const data = await res.json()
        setCurrentMessages([...currentMessages, data.message])
    }

    // 切换收藏状态
    const toggleFavorite = async (requestId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/messages/${requestId}/favorite`, {
            method: 'POST',
            credentials: 'include'
        })

        if (res.ok) {
            setCurrentMessages(currentMessages.map(msg =>
                msg.request_id === requestId
                    ? { ...msg, favorite: !msg.favorite }
                    : msg
            ))
        }
    }

    return (
        <ChatContext.Provider value={{
            currentThreadId,
            currentMessages,
            threads,
            createNewThread,
            loadThreadHistory,
            loadThreadMessages,
            sendMessage,
            toggleFavorite
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