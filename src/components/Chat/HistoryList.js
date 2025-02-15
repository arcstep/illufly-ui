'use client'

import { useChat } from '@/context/ChatContext'
import { useEffect, useState } from 'react'

export default function HistoryList() {
    const { history, loadThreadMessages, loadAllThreads } = useChat()
    const [loading, setLoading] = useState(false)
    const [threads, setThreads] = useState([])

    useEffect(() => {
        if (history) {
            setThreads(Object.values(history))
            console.log("更新 history: ", history)
        }
    }, [history])

    useEffect(() => {
        const fetchThreads = async () => {
            setLoading(true)
            try {
                await loadAllThreads()
                console.log("更新 history: ", history)
            } catch (error) {
                console.error('加载历史记录失败:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchThreads()
    }, []) // 添加 loadAllThreads 作为依赖

    return (
        <div className="w-full max-w-xs p-4 border-b md:border-b-0 md:border-r">
            {loading ? (
                <div>加载中...</div>
            ) : (
                threads.map(({ thread_id, title, last_message }) => (
                    <button
                        key={thread_id}
                        onClick={() => loadThreadMessages(thread_id)}
                        className="w-full p-2 text-left hover:bg-gray-100"
                    >
                        <div className="font-medium">{title}</div>
                        <div className="text-sm text-gray-500">{last_message}</div>
                    </button>
                ))
            )}
        </div>
    )
}