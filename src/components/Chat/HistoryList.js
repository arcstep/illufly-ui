'use client'

import { useChat } from '@/context/ChatContext'
import { useEffect, useState, useCallback, useRef } from 'react'

export default function HistoryList() {
    const { threads, loadAllThreads, switchThread, createNewThread, currentThreadId } = useChat()
    const [loading, setLoading] = useState(false)
    const [initialized, setInitialized] = useState(false)
    const [switchingThread, setSwitchingThread] = useState(false)
    const lastClickedThread = useRef(null)

    // 加载所有线程
    useEffect(() => {
        const fetchThreads = async () => {
            if (initialized) return

            setLoading(true)
            try {
                const loadedThreads = await loadAllThreads()
                console.log("加载完成，当前线程数:", loadedThreads?.length || 0)

                // 如果有线程但没有选择当前线程，自动选择第一个
                if (loadedThreads?.length > 0 && !currentThreadId) {
                    const firstThread = loadedThreads[0]
                    console.log("自动选择第一个线程:", firstThread.thread_id)
                    await switchThread(firstThread.thread_id)
                }

                setInitialized(true)
            } catch (error) {
                console.error('加载历史记录失败:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchThreads()
    }, [loadAllThreads, currentThreadId, initialized])

    // 添加一个副作用来监听线程和当前线程ID的变化
    useEffect(() => {
        console.log("线程列表更新:", threads.length, "当前线程:", currentThreadId)

        // 切换完成后重置状态
        if (switchingThread && lastClickedThread.current === currentThreadId) {
            setSwitchingThread(false)
            lastClickedThread.current = null
        }
    }, [threads, currentThreadId, switchingThread])

    // 处理线程切换，使用useCallback确保函数不会重复创建
    const handleSwitchThread = useCallback(async (threadId) => {
        console.log("====== 尝试切换线程 ======");
        console.log("- 目标线程:", threadId);
        console.log("- 当前线程:", currentThreadId);
        console.log("- 切换状态:", switchingThread);

        // 防止重复点击和快速点击不同线程
        if (switchingThread) {
            console.log("忽略请求: 当前正在进行其他切换操作");
            return;
        }

        // 如果是当前线程，强制刷新消息
        const isCurrentThread = threadId === currentThreadId;
        if (isCurrentThread) {
            console.log("当前已在选中线程，强制刷新消息");
        }

        console.log("开始执行线程切换:", threadId);
        setSwitchingThread(true);
        lastClickedThread.current = threadId;

        try {
            console.log("调用switchThread函数...");
            // 在React状态更新前存储当前线程ID
            const targetThreadId = threadId;

            await switchThread(threadId);
            console.log("switchThread函数执行完成");

            // 等待一段时间确保状态全部更新
            setTimeout(() => {
                // 直接与目标线程比较，不依赖currentThreadId
                console.log("检查切换结果: 当前线程=", currentThreadId, "目标线程=", targetThreadId);

                // 无论结果如何，重置状态
                setSwitchingThread(false);
                lastClickedThread.current = null;

                // 移除警告，因为状态更新是异步的，这种情况是正常的
                if (currentThreadId !== targetThreadId) {
                    console.log("线程ID暂时不匹配，这是由于React状态更新的异步性质导致的，不影响功能");
                }
            }, 500);
        } catch (error) {
            console.error("切换线程失败:", error);
            setSwitchingThread(false);
            lastClickedThread.current = null;
        }
    }, [switchThread, currentThreadId, switchingThread]);

    // 创建新对话并立即切换
    const handleCreateThread = useCallback(async () => {
        if (switchingThread) {
            console.log("忽略创建新线程请求: 正在切换中")
            return
        }

        setSwitchingThread(true)
        try {
            const newThreadId = await createNewThread()
            console.log("创建了新线程:", newThreadId)
            if (newThreadId) {
                lastClickedThread.current = newThreadId

                // 创建新线程后直接设置，无需再调用switchThread
                // 因为createNewThread已经设置了currentThreadId
                setTimeout(() => {
                    setSwitchingThread(false)
                    lastClickedThread.current = null
                }, 300)
            } else {
                setSwitchingThread(false)
            }
        } catch (error) {
            console.error("创建新线程失败:", error)
            setSwitchingThread(false)
        }
    }, [createNewThread, switchingThread])

    return (
        <div className="w-full max-w-xs p-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
                className={`w-full p-3 mb-4 text-left text-white 
                ${switchingThread
                        ? 'bg-blue-400 dark:bg-blue-500'
                        : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} 
                rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:ring-opacity-50 
                transition duration-150 ease-in-out`}
                onClick={handleCreateThread}
                disabled={switchingThread}
            >
                <span className="font-medium">+ {switchingThread ? '创建中...' : '新对话'}</span>
            </button>
            {loading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">加载中...</div>
            ) : threads.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">暂无对话记录</div>
            ) : (
                threads.map(({ thread_id, title }) => {
                    const isActive = thread_id === currentThreadId;
                    const isSwitching = switchingThread && lastClickedThread.current === thread_id;

                    return (
                        <div key={thread_id}
                            className={`border-b border-gray-200 dark:border-gray-700 
                            ${isActive
                                    ? 'border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                    : ''}`}
                        >
                            <button
                                onClick={() => handleSwitchThread(thread_id)}
                                className={`w-full p-2 text-left transition-colors
                                ${isActive
                                        ? 'font-bold text-blue-600 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'} 
                                ${isSwitching ? 'opacity-70' : ''}`}
                                disabled={switchingThread}
                            >
                                <div className="font-medium truncate">
                                    {isSwitching ? '切换中...' : (title || '新对话')}
                                </div>
                            </button>
                        </div>
                    );
                })
            )}
        </div>
    )
}