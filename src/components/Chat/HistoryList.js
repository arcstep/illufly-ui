'use client'

import { useChat } from '@/context/ChatContext'
import { useEffect, useState } from 'react'

export default function HistoryList() {
    const { threads, loadAllThreads, switchThread } = useChat()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchThreads = async () => {
            setLoading(true)
            try {
                await loadAllThreads()

                console.log("更新 threads: ", threads)
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
                threads.map(({ thread_id, title }) => (
                    <button
                        key={thread_id}
                        onClick={() => switchThread(thread_id)}
                        className="w-full p-2 text-left hover:bg-gray-100"
                    >
                        <div className="font-medium">{title}</div>
                    </button>
                ))
            )}
        </div>
    )
}