'use client'

import { useChat } from '@/context/ChatContext'
import { useEffect, useState } from 'react'

export default function HistoryList() {
    const { threads, loadAllThreads, switchThread, createNewThread, currentThreadId } = useChat()
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
            <button
                className="w-full p-3 mb-4 text-left text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 transition duration-150 ease-in-out"
                onClick={createNewThread}
            >
                <span className="font-medium">+ 新对话</span>
            </button>
            {loading ? (
                <div>加载中...</div>
            ) : (
                threads.map(({ thread_id, title }) => (
                    <div key={thread_id} className={`border-b border-gray-200 ${thread_id === currentThreadId ? 'border-l-2 border-l-red-500' : ''}`}>
                        <button
                            key={thread_id}
                            onClick={() => switchThread(thread_id)}
                            className="w-full p-2 text-left hover:bg-gray-100"
                        >
                            <div className="font-medium">{title}</div>
                        </button>
                    </div>
                ))
            )}
        </div>
    )
}