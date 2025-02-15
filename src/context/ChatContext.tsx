'use client'

import { createContext, useState, useContext } from 'react'
import { API_BASE_URL } from '@/utils/config'

// 基础消息类型
export interface Message {
    request_id: string
    message_id: string
    message_type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'text_chunk'
    favorite: string | null
    role: 'user' | 'assistant'
    content: string
}

// 线程
export interface Thread {
    thread_id: string
    title: string
    created_at: string
    loaded: boolean | false
    chat: Message[]
}

interface ChatContextType {
    // 当前线程状态
    currentThreadId: string | null

    // 对话历史
    history: { [thread_id: string]: Thread }

    // 当前线程的最后一条消息
    // 临时保存流消息，与 history 中的消息合并组成完整的对话
    lastChunksContent: string | ""

    // 创建新对话
    createNewThread: () => Promise<string>

    // 加载所有历史线程清单
    loadAllThreads: () => Promise<void>

    // 加载特定线程的消息
    loadThreadMessages: (threadId: string) => Promise<void>

    // 发送新消息
    ask: (content: string) => Promise<void>

    // 切换收藏状态
    toggleFavorite: (requestId: string) => Promise<void>
}

// 创建 Context
const ChatContext = createContext<ChatContextType>({
    currentThreadId: null,
    history: {},
    lastChunksContent: "",
    createNewThread: async () => { throw new Error('ChatProvider not found') },
    loadAllThreads: async () => { throw new Error('ChatProvider not found') },
    loadThreadMessages: async () => { throw new Error('ChatProvider not found') },
    ask: async () => { throw new Error('ChatProvider not found') },
    toggleFavorite: async () => { throw new Error('ChatProvider not found') }
})

// Provider 组件
export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
    const [history, setHistory] = useState<{ [thread_id: string]: Thread }>({})
    const [lastChunksContent, setLastChunksContent] = useState<string | "">("")

    // 创建新对话
    const createNewThread = async () => {
        const res = await fetch(`${API_BASE_URL}/chat/threads`, {
            method: 'POST',
            credentials: 'include'
        })
        const data = await res.json()
        const newThreadId = data
        setCurrentThreadId(newThreadId)
        setHistory({ ...history, [newThreadId]: { ...history[newThreadId], loaded: false, chat: [] } })
        return newThreadId
    }

    // 加载历史对话列表
    const loadAllThreads = async () => {
        const res = await fetch(`${API_BASE_URL}/chat/threads`, {
            credentials: 'include'
        })
        const data = await res.json()
        setHistory(data.threads)
    }

    // 加载特定对话的消息
    const loadThreadMessages = async (threadId: string) => {
        const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/messages`, {
            credentials: 'include'
        })
        const data = await res.json()
        setHistory({ ...history, [threadId]: { ...history[threadId], chat: data.messages } })
    }

    // 发送新消息
    const ask = async (content: string) => {
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
        setLastChunksContent(data.message.content)
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
            history,
            lastChunksContent,
            createNewThread,
            loadAllThreads,
            loadThreadMessages,
            ask,
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