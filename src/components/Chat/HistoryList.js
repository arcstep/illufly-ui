'use client'

import { useChat } from '@/context/ChatContext'
import { useEffect } from 'react'

export default function HistoryList() {
    const { threads, loadThreadHistory, loadThreadMessages } = useChat()

    useEffect(() => {
        // 组件挂载时加载历史记录
        loadThreadHistory()
    }, []) // 仅在挂载时执行一次

    return (
        <div className="w-full max-w-xs p-4 border-b md:border-b-0 md:border-r">
            {threads.map((thread) => (
                <button
                    key={thread.thread_id}
                    onClick={() => loadThreadMessages(thread.thread_id)}
                    className="w-full p-2 text-left hover:bg-gray-100"
                >
                    <div className="font-medium">{thread.title}</div>
                    <div className="text-sm text-gray-500">{thread.last_message}</div>
                </button>
            ))}
        </div>
    )
}