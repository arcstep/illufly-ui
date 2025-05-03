'use client'

import { createContext, useState, useContext, useMemo, useEffect, useRef } from 'react'
import { useApiBase } from '@/hooks/useApiBase'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { handleAuthError, handleApiError } from '@/utils/handleApiError'
import { useTTS } from './TTSContext'
import { useAuth } from '@/context/AuthContext'

// 基础消息类型
export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
    created_at: number
    chunk_id: string
    // 可能还有dialogue_id和thread_id字段
    dialogue_id?: string
    thread_id?: string
    // 消息类型字段，用于区分不同类型的消息块
    chunk_type?: 'ai_delta' | 'ai_message' | 'memory_retrieve' | 'memory_extract' | 'kg_retrieve' | 'search_results' | 'tool_result' | 'title_update' | 'user_input'
    // 是否是最终消息（区分临时/最终内容）
    is_final?: boolean
    // 排序字段
    sequence?: number
    // 记忆相关信息
    memory?: {
        user_id: string
        topic: string
        question_hash: string
        question: string
        answer: string
        created_at: number
        [key: string]: any  // 允许其他可能的字段
    }
    // 记忆数据可能在不同字段
    memory_data?: any // 保持使用any类型以便于不同格式的内存数据
    // 搜索结果和知识库相关
    results?: any
    results_data?: any
    data?: any
    // 工具调用信息
    tool_calls?: Array<{
        tool_id: string
        name: string
        arguments: string
    }>
    // 工具相关字段
    name?: string
    tool_call_id?: string
    output_text?: string
    // 用户输入相关字段
    input_messages?: Array<{
        role: string
        content: string
    }>
}

// 线程
export interface Thread {
    user_id: string
    thread_id: string
    title: string
    created_at: number
    dialogue_count?: number // 添加对话数量字段
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
    loadAllThreads: () => Promise<Thread[]>

    // 切换当前线程
    switchThread: (threadId: string) => Promise<void>

    // 发送新消息
    ask: (content: string) => Promise<void>

    // 切换收藏状态
    toggleFavorite: (requestId: string) => Promise<void>

    // 是否正在处理请求
    isProcessing: boolean

    // 取消当前处理的请求
    cancelProcessing: () => void
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
    isProcessing: false,
    cancelProcessing: () => { throw new Error('ChatProvider not found') },
})

// Provider 组件
export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
    const [threads, setThreads] = useState<Thread[]>([])
    const [lastChunks, setLastChunks] = useState<Message[]>([])
    const [archivedMessages, setArchivedMessages] = useState<Message[]>([])
    const [pendingMessages, setPendingMessages] = useState<Message[]>([])
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const { API_BASE_URL } = useApiBase();
    const { token, setToken, authFetch } = useAuth();

    // 使用ref保存正在处理的线程ID，用于检测是否有并发切换操作
    const processingThreadRef = useRef<string | null>(null)

    // 使用Map跟踪正在处理的消息，而不是Set
    const activeMessagesRef = useRef(new Map<string, Message>())

    const { processStreamingText } = useTTS()

    // 监听当前线程ID变化
    useEffect(() => {
        if (currentThreadId) {
            console.log(`当前活动线程已更新为: ${currentThreadId}`)
        }
    }, [currentThreadId])

    // 监听pendingMessages变化，批量更新archivedMessages
    useEffect(() => {
        if (pendingMessages.length > 0) {
            // 确保消息属于当前线程
            const currentId = currentThreadId
            const filteredMessages = pendingMessages.filter(msg =>
                !msg.thread_id || msg.thread_id === currentId
            )

            if (filteredMessages.length > 0) {
                console.log(`添加 ${filteredMessages.length} 条待处理消息到线程 ${currentId}`)
                setArchivedMessages(prev => [...prev, ...filteredMessages])
            } else if (filteredMessages.length !== pendingMessages.length) {
                console.log(`丢弃 ${pendingMessages.length - filteredMessages.length} 条非当前线程的消息，线程ID: ${currentId}`)
            }

            setPendingMessages([])
        }
    }, [pendingMessages, currentThreadId])

    // 修改你现有的mergeChunks函数，确保不会重复处理相同ID
    const mergeChunks = (chunks: Message[]): Message[] => {
        if (chunks.length === 0) return []

        const messageGroups = new Map<string, Message[]>()

        // 按 chunk_id 分组
        chunks.forEach((chunk: Message) => {
            if (!messageGroups.has(chunk.chunk_id)) {
                messageGroups.set(chunk.chunk_id, [])
            }
            messageGroups.get(chunk.chunk_id)?.push(chunk)
        })
        // 合并每组chunks，但跳过已处理的ID
        return Array.from(messageGroups.entries())
            .filter(([chunkId]) => !activeMessagesRef.current.has(chunkId))
            .map(([chunkId, group]) => {
                // 标记为已处理
                activeMessagesRef.current.set(chunkId, group[0] as Message)

                const firstChunk = group[0]
                if (group.length === 1) return firstChunk

                // 合并同一message_id的chunks
                return {
                    ...firstChunk,
                    content: group.map(chunk => chunk.content).join(''),
                    role: 'assistant', // 合并后转为完整消息
                    is_final: true // 标记为最终内容
                }
            })
    }

    // 计算包含chunks的history
    const messages = useMemo(() => {
        // 如果没有当前线程ID，返回空数组
        if (!currentThreadId) return []

        console.log("计算messages列表，当前线程ID:", currentThreadId);
        console.log("archivedMessages:", archivedMessages.length);
        console.log("lastChunks:", lastChunks.length);

        // 处理增量消息
        const mergedChunks = lastChunks.length > 0 ? mergeChunks(lastChunks) : []

        // 所有消息合并
        const allMessages = [
            ...archivedMessages,
            ...mergedChunks
        ]

        // 打印所有原始消息，用于调试
        allMessages.forEach(msg => {
            console.log(`消息: type=${msg.chunk_type}, role=${msg.role}, thread=${msg.thread_id}, chunk_id=${msg.chunk_id}, content=${msg.content?.substring(0, 20)}...`);
        });

        // 确保只显示当前线程的消息
        // 一个消息属于当前线程的条件:
        // 1. 消息有thread_id且等于currentThreadId 
        // 2. 或者消息没有thread_id（向后兼容）
        const threadMessages = allMessages.filter(msg => {
            const belongsToCurrentThread =
                !msg.thread_id || // 没有线程ID的消息(旧数据)
                msg.thread_id === currentThreadId; // 线程ID匹配当前线程

            // 不属于当前线程的消息将被过滤掉
            if (!belongsToCurrentThread) {
                console.log(`过滤掉非当前线程消息: ${msg.chunk_id}, 属于线程: ${msg.thread_id}, 当前线程: ${currentThreadId}`);
                return false;
            }

            // 过滤掉title_update类型的消息
            if (msg.chunk_type === 'title_update') {
                console.log('过滤掉title_update消息:', msg.chunk_id);
                return false;
            }

            // 确保每条消息都有content
            if (!msg.content && msg.output_text) {
                msg.content = msg.output_text;
                console.log('使用output_text作为content:', msg.chunk_id);
            }

            // 检查消息有效性
            if (!msg.content) {
                console.warn('消息没有内容:', msg);
                return false;
            }

            // 如果没有role字段，根据chunk_type设置
            if (!msg.role) {
                if (msg.chunk_type === 'user_input') {
                    msg.role = 'user';
                } else if (msg.chunk_type === 'ai_message' || msg.chunk_type === 'ai_delta') {
                    msg.role = 'assistant';
                } else if (msg.chunk_type === 'tool_result') {
                    msg.role = 'tool';
                } else if (msg.chunk_type === 'memory_retrieve' ||
                    msg.chunk_type === 'memory_extract' ||
                    msg.chunk_type === 'kg_retrieve' ||
                    msg.chunk_type === 'search_results') {
                    msg.role = 'assistant'; // 记忆和知识库检索也是assistant角色
                } else {
                    msg.role = 'assistant'; // 默认角色
                }
                console.log(`根据chunk_type=${msg.chunk_type}设置role=${msg.role}:`, msg.chunk_id);
            }

            // 特殊处理记忆相关消息，确保memory字段存在
            if ((msg.chunk_type === 'memory_retrieve' || msg.chunk_type === 'memory_extract') && !msg.memory) {
                // 如果没有memory字段但有memory_data，使用memory_data
                if (msg.memory_data) {
                    console.log(`消息 ${msg.chunk_id} 使用memory_data作为memory`);
                    msg.memory = msg.memory_data;
                } else if (msg.content && typeof msg.content === 'string') {
                    // 尝试从content解析memory内容
                    try {
                        const memoryData = JSON.parse(msg.content);
                        if (memoryData && typeof memoryData === 'object') {
                            console.log(`消息 ${msg.chunk_id} 从content解析memory数据`);
                            msg.memory = memoryData;
                        }
                    } catch (e) {
                        console.warn(`无法从content解析memory数据:`, e);
                    }
                }
            }

            // 特殊处理知识库和搜索结果
            if ((msg.chunk_type === 'kg_retrieve' || msg.chunk_type === 'search_results') && !msg.results) {
                // 如果没有results字段但有results_data或data，使用它们
                if (msg.results_data) {
                    console.log(`消息 ${msg.chunk_id} 使用results_data作为results`);
                    msg.results = msg.results_data;
                } else if (msg.data) {
                    console.log(`消息 ${msg.chunk_id} 使用data作为results`);
                    msg.results = msg.data;
                }
            }

            return true; // 保留所有其他消息
        });

        // 使用Map去重，保留最新的消息
        const messageMap = new Map<string, Message>()
        threadMessages.forEach(msg => {
            // 提取真实message_id（移除临时前缀）
            const realId = msg.chunk_id.replace(/^temp_/, '')

            // 如果Map中不存在此ID或当前消息更新，则更新Map
            if (!messageMap.has(realId) || msg.created_at > messageMap.get(realId)!.created_at) {
                messageMap.set(realId, msg)
            }
        })

        // 转换回数组并排序，优先按sequence排序，如果没有则按created_at排序
        const uniqueMessages = Array.from(messageMap.values())
            .sort((a, b) => {
                // 优先按sequence排序
                if (a.sequence !== undefined && b.sequence !== undefined) {
                    return a.sequence - b.sequence;
                }
                // 如果没有sequence，则按created_at排序
                return a.created_at - b.created_at;
            })

        // 输出最终要显示的消息数量
        console.log(`线程 ${currentThreadId} 的最终消息数量: ${uniqueMessages.length}`);
        uniqueMessages.forEach(msg => {
            console.log(`最终消息: role=${msg.role}, type=${msg.chunk_type}, content=${msg.content?.substring(0, 20)}...`);
        });

        return uniqueMessages
    }, [archivedMessages, lastChunks, currentThreadId])

    // 创建新对话
    const createNewThread = async (): Promise<string> => {
        try {
            console.log('开始创建新线程')
            const res = await authFetch(`${API_BASE_URL}/chat/threads`, {
                method: 'POST'
            })

            if (!res.ok) {
                console.error(`创建新线程失败，状态码: ${res.status}`)
                return '' // 请求失败返回空字符串
            }

            const newThread = await res.json() as Thread
            console.log('成功创建新线程:', newThread)

            // 先清空当前消息
            setArchivedMessages([])
            setLastChunks([])
            activeMessagesRef.current.clear()

            // 设置新的当前线程
            setCurrentThreadId(newThread.thread_id)

            // 更新线程列表
            setThreads(prev => [newThread, ...prev])

            return newThread.thread_id
        } catch (error) {
            console.error('创建新线程时出错:', error)
            // 使用通用错误处理函数
            if (handleApiError(error, '创建新对话失败')) {
                return '' // 已处理特殊错误，返回空字符串表示失败
            }
            throw error // 其他错误继续抛出
        }
    }

    // 切换当前线程，从后端加载对话消息
    const switchThread = async (threadId: string): Promise<void> => {
        console.log(`===== switchThread被调用 =====`);
        console.log(`- 目标线程: ${threadId}`);
        console.log(`- 当前线程: ${currentThreadId}`);
        console.log(`- 处理中线程: ${processingThreadRef.current}`);

        // 如果已经是当前线程，但强制刷新
        if (currentThreadId === threadId) {
            console.log('已经是当前线程，执行强制刷新');
        }

        // 检查是否有其他切换操作正在进行
        if (processingThreadRef.current && processingThreadRef.current !== threadId) {
            console.warn(`已有切换操作在进行中: ${processingThreadRef.current}，取消切换到 ${threadId}`);
            return;
        }

        // 标记当前正在处理的线程ID
        processingThreadRef.current = threadId;
        console.log(`已标记处理线程为: ${threadId}`);

        try {
            // 在请求前先清空当前消息，确保UI立即响应
            console.log(`清空当前消息数据，准备加载线程 ${threadId}`);
            setArchivedMessages([]);
            setLastChunks([]);
            setPendingMessages([]);
            activeMessagesRef.current.clear();

            // 保存当前要切换的线程ID，用于后续比较
            const targetThreadId = threadId;

            // 先更新当前线程ID
            setCurrentThreadId(threadId);
            console.log(`已将当前线程ID更新为: ${threadId}`);

            // 确保React状态更新
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log(`开始加载线程 ${threadId} 的消息`);
            const res = await authFetch(`${API_BASE_URL}/chat/thread/${threadId}/messages`);

            if (!res.ok) {
                console.error(`加载消息失败，状态码: ${res.status}`);
                return;
            }

            const histMessages = await res.json();
            console.log(`成功加载线程 ${threadId} 的消息数量:`, histMessages.length);
            // 打印所有消息，帮助调试
            histMessages.forEach((msg: any, index: number) => {
                console.log(`收到消息 ${index + 1}/${histMessages.length}:`, {
                    type: msg.chunk_type,
                    role: msg.role,
                    id: msg.chunk_id,
                    thread: msg.thread_id,
                    content: msg.content?.substring(0, 20) || msg.output_text?.substring(0, 20) || '(无内容)'
                });
            });

            // 确认当前线程ID仍然是请求的线程ID
            console.log(`检查线程ID: 目标线程=${targetThreadId}, 当前线程=${currentThreadId}`);
            if (targetThreadId !== currentThreadId) {
                console.log(`当前线程ID与目标ID暂时不同，这是由于React状态更新的异步性质导致的。目标ID: ${targetThreadId}, 当前ID: ${currentThreadId}`);
                // 不再中断加载，确保消息能被加载
                // 恢复为目标线程ID
                setCurrentThreadId(targetThreadId);
            }

            // 处理历史消息中的记忆对象和标题更新
            const processedMessages = histMessages.filter((msg: any) => {
                // 标题更新消息特殊处理
                if (msg.chunk_type === 'title_update') {
                    console.log('处理标题更新消息:', msg.content);
                    // 使用content字段作为标题
                    const newTitle = msg.content;
                    if (newTitle) {
                        setThreads(prev =>
                            prev.map(thread =>
                                thread.thread_id === targetThreadId
                                    ? { ...thread, title: newTitle }
                                    : thread
                            )
                        );
                    }
                    return false; // 过滤掉标题更新消息，不在消息列表显示
                }

                // 确保所有消息有chunk_id字段
                if (!msg.chunk_id && msg.dialogue_id) {
                    msg.chunk_id = msg.dialogue_id;
                    console.log(`使用dialogue_id作为chunk_id: ${msg.dialogue_id}`);
                }

                // 确保消息有thread_id字段
                if (!msg.thread_id) {
                    msg.thread_id = targetThreadId;
                    console.log(`为消息 ${msg.chunk_id} 设置thread_id: ${targetThreadId}`);
                }

                // 确保消息有role字段
                if (!msg.role) {
                    if (msg.chunk_type === 'user_input') {
                        msg.role = 'user';
                    } else if (msg.chunk_type === 'ai_message' || msg.chunk_type === 'ai_delta') {
                        msg.role = 'assistant';
                    } else if (msg.chunk_type === 'tool_result') {
                        msg.role = 'tool';
                    } else if (msg.chunk_type === 'memory_retrieve' ||
                        msg.chunk_type === 'memory_extract' ||
                        msg.chunk_type === 'kg_retrieve' ||
                        msg.chunk_type === 'search_results') {
                        msg.role = 'assistant'; // 记忆和知识库检索也是assistant角色
                    } else {
                        msg.role = 'assistant'; // 默认角色
                    }
                    console.log(`为消息 ${msg.chunk_id} 设置role: ${msg.role}`);
                }

                // 确保消息有content字段
                if (!msg.content && msg.output_text) {
                    msg.content = msg.output_text;
                    console.log(`为消息 ${msg.chunk_id} 使用output_text作为content`);
                }

                // 确保所有消息都有is_final字段
                if (msg.is_final === undefined) {
                    msg.is_final = true; // 历史消息默认为最终版本
                }

                // 检查消息是否有效
                if (!msg.content) {
                    console.warn(`消息 ${msg.chunk_id} 没有内容，将被过滤`);
                    return false;
                }

                // 特殊处理记忆相关消息，确保memory字段存在
                if ((msg.chunk_type === 'memory_retrieve' || msg.chunk_type === 'memory_extract') && !msg.memory) {
                    // 如果没有memory字段但有memory_data，使用memory_data
                    if (msg.memory_data) {
                        console.log(`消息 ${msg.chunk_id} 使用memory_data作为memory`);
                        msg.memory = msg.memory_data;
                    } else if (msg.content && typeof msg.content === 'string') {
                        // 尝试从content解析memory内容
                        try {
                            const memoryData = JSON.parse(msg.content);
                            if (memoryData && typeof memoryData === 'object') {
                                console.log(`消息 ${msg.chunk_id} 从content解析memory数据`);
                                msg.memory = memoryData;
                            }
                        } catch (e) {
                            console.warn(`无法从content解析memory数据:`, e);
                        }
                    }
                }

                // 特殊处理知识库和搜索结果
                if ((msg.chunk_type === 'kg_retrieve' || msg.chunk_type === 'search_results') && !msg.results) {
                    // 如果没有results字段但有results_data或data，使用它们
                    if (msg.results_data) {
                        console.log(`消息 ${msg.chunk_id} 使用results_data作为results`);
                        msg.results = msg.results_data;
                    } else if (msg.data) {
                        console.log(`消息 ${msg.chunk_id} 使用data作为results`);
                        msg.results = msg.data;
                    }
                }

                return true; // 保留其他消息
            });

            console.log(`过滤后的消息数量: ${processedMessages.length}`);

            // 为每条消息添加对应的线程ID，确保它们始终显示在正确的线程中
            const messagesWithThreadId = processedMessages.map((msg: any) => ({
                ...msg,
                thread_id: targetThreadId // 强制设置thread_id为目标线程ID
            }));

            // 强制再次更新currentThreadId为目标线程ID，确保消息能显示
            setCurrentThreadId(targetThreadId);

            // 使用函数式更新以确保拿到最新状态
            setArchivedMessages(messagesWithThreadId);

            // 记录消息加载完成，不论是否有消息
            console.log(`线程 ${targetThreadId} 的消息加载完成，共 ${messagesWithThreadId.length} 条消息`);
            if (messagesWithThreadId.length === 0) {
                console.log(`线程 ${targetThreadId} 没有消息，这是正常情况`);
            }

            // 通知UI层消息已加载完成，强制重新计算messages
            setLastChunks([...lastChunks]);
        } catch (error) {
            console.error(`加载线程 ${threadId} 消息时出错:`, error);
            // 使用通用错误处理函数
            if (!handleApiError(error, '切换线程失败')) {
                throw error; // 其他错误继续抛出
            }
        } finally {
            // 只有在当前处理的还是这个线程时才清除
            setTimeout(() => {
                if (processingThreadRef.current === threadId) {
                    processingThreadRef.current = null;
                    console.log(`完成线程 ${threadId} 切换操作，清除处理标记`);
                }
            }, 100);
        }
    }

    // 加载历史对话列表
    const loadAllThreads = async (): Promise<Thread[]> => {
        try {
            console.log('开始加载所有线程')
            const res = await authFetch(`${API_BASE_URL}/chat/threads`);

            // 检查登录状态
            if (handleAuthError(res.status)) {
                console.error('授权错误，无法加载线程列表')
                return [] // 已处理认证错误，返回空数组
            }

            if (!res.ok) {
                console.error(`加载线程列表失败，状态码: ${res.status}`)
                return [] // 请求失败返回空数组
            }

            const threadsData = await res.json() as Thread[]
            console.log('成功加载线程列表:', threadsData.length)

            // 按创建时间降序排序
            const sortedThreads = [...threadsData].sort((a, b) => b.created_at - a.created_at)

            setThreads(sortedThreads)

            return sortedThreads // 返回线程数据，方便调用者使用
        } catch (error) {
            console.error('加载线程列表时出错:', error)
            // 使用通用错误处理函数
            if (!handleApiError(error, '加载线程失败')) {
                throw error // 其他错误继续抛出
            }
            return [] // 错误时返回空数组
        }
    }

    // 发送新消息
    const ask = async (content: string) => {
        if (!currentThreadId) return

        // 设置处理中状态
        setIsProcessing(true)

        // 重置状态
        setLastChunks([])

        // 添加用户消息到历史记录，使用与后端一致的格式
        const userMessage: Message = {
            role: 'user',
            content,
            created_at: Date.now() / 1000,
            chunk_id: `user_${Date.now()}`,
            dialogue_id: `dialogue_${Date.now()}`, // 添加dialogue_id字段
            thread_id: currentThreadId, // 确保有thread_id
            chunk_type: 'user_input', // 使用与后端一致的类型
            is_final: true, // 用户消息总是最终版本
            sequence: 0 // 默认序列号
        }
        setArchivedMessages(prev => [...prev, userMessage])

        const abortController = new AbortController()

        // 合并chunks的辅助函数
        const mergeAndClearChunks = () => {
            setLastChunks([])

            // 将所有活动消息标记为最终消息
            const activeMessages = Array.from(activeMessagesRef.current.values());
            if (activeMessages.length > 0) {
                setArchivedMessages(prev => {
                    return prev.map(msg => {
                        // 查找是否有匹配的活动消息
                        const activeMsg = activeMessages.find(am => am.chunk_id === msg.chunk_id);
                        if (activeMsg) {
                            // 更新为最终内容
                            return { ...msg, is_final: true };
                        }
                        return msg;
                    });
                });
            }

            activeMessagesRef.current.clear();

            // 完成后设置处理状态为false
            setIsProcessing(false);
        }

        try {
            // 准备请求头，添加授权token
            const headers: Record<string, string> = {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // 从上下文获取token添加到Authorization头
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            await fetchEventSource(`${API_BASE_URL}/chat/complete`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    thread_id: currentThreadId,
                    messages: [{ role: 'user', content }]
                }),
                signal: abortController.signal,
                onopen: async (response) => {
                    // 处理自动令牌续订
                    const newToken = response.headers.get('Authorization');
                    if (newToken?.startsWith('Bearer ')) {
                        const extractedToken = newToken.substring(7);
                        setToken(extractedToken);
                        localStorage.setItem('auth_token', extractedToken);
                    }

                    // 检查登录状态
                    if (response.status === 401) {
                        // 尝试刷新令牌但不重定向
                        console.error('授权错误，但暂时不重定向');
                        setIsProcessing(false);
                        throw new Error('认证错误已处理');
                    }

                    if (response.status !== 200 || !response.ok) {
                        setIsProcessing(false);
                        throw new Error(`请求失败: ${response.status}`)
                    }
                    if (!response.body) {
                        setIsProcessing(false);
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

                        // 确保所有消息有chunk_id字段
                        if (!data.chunk_id && data.dialogue_id) {
                            data.chunk_id = data.dialogue_id;
                        }

                        // 首先检查是否为标题更新消息，如是则更新线程标题
                        if (data.chunk_type === 'title_update') {
                            console.log('收到标题更新消息:', data);
                            // 使用new_title或content字段作为标题
                            const newTitle = data.new_title || data.content;
                            if (newTitle && data.thread_id) {
                                setThreads(prev =>
                                    prev.map(thread =>
                                        thread.thread_id === data.thread_id
                                            ? { ...thread, title: newTitle }
                                            : thread
                                    )
                                );
                            }
                        }

                        // 处理AI增量消息块
                        if (data.chunk_type === 'ai_delta') {
                            // 获取内容
                            const contentText = data.output_text || data.content || '';
                            if (!contentText.trim()) {
                                console.log('跳过空内容的ai_delta消息');
                                return;
                            }

                            // 发送到TTS进行实时处理
                            processStreamingText(contentText);

                            // 转换为统一的Message格式
                            const message: Message = {
                                role: 'assistant',
                                content: contentText,
                                created_at: data.created_at,
                                chunk_id: data.chunk_id,
                                dialogue_id: data.dialogue_id, // 保留dialogue_id
                                thread_id: data.thread_id || currentThreadId, // 使用数据中的thread_id或当前线程ID
                                chunk_type: 'ai_delta',
                                is_final: data.is_final || false, // 使用后端提供的is_final或默认为false
                                sequence: data.sequence // 使用后端提供的sequence
                            }

                            console.log('收到文本块:', message)

                            // 确保只处理当前线程的消息
                            if (message.thread_id && message.thread_id !== currentThreadId) {
                                console.warn(`忽略非当前线程的ai_delta消息，消息线程: ${message.thread_id}, 当前线程: ${currentThreadId}`)
                                return;
                            }

                            // 添加到lastChunks用于最终的完整合并
                            setLastChunks(prev => [...prev, message])

                            // 同时处理实时更新
                            updateActiveMessage(message)
                        }
                        // 处理记忆检索消息
                        else if (data.chunk_type === 'memory_retrieve' || data.chunk_type === 'memory_extract') {
                            const message: Message = {
                                role: 'assistant',
                                content: data.content || '',
                                created_at: data.created_at,
                                chunk_id: data.chunk_id,
                                dialogue_id: data.dialogue_id,
                                thread_id: data.thread_id || currentThreadId,
                                chunk_type: data.chunk_type,
                                is_final: data.is_final || true,
                                sequence: data.sequence,
                                memory: data.memory
                            }

                            console.log(`收到${data.chunk_type}:`, message)

                            // 直接添加到archivedMessages，实时显示记忆消息，不再添加到pendingMessages
                            setArchivedMessages(prev => [...prev, message])
                        }
                        // 处理知识库检索和搜索结果
                        else if (data.chunk_type === 'kg_retrieve' || data.chunk_type === 'search_results') {
                            const message: Message = {
                                role: 'assistant',
                                content: data.output_text || data.content || '',
                                created_at: data.created_at,
                                chunk_id: data.chunk_id,
                                dialogue_id: data.dialogue_id,
                                thread_id: data.thread_id || currentThreadId,
                                chunk_type: data.chunk_type,
                                is_final: data.is_final || true,
                                sequence: data.sequence,
                                results: data.results || data.results_data || data.data
                            }

                            console.log(`收到${data.chunk_type}:`, message)

                            // 直接添加到archivedMessages，实时显示，不再添加到pendingMessages
                            setArchivedMessages(prev => [...prev, message])
                        }
                        // 处理工具调用结果
                        else if (data.chunk_type === 'tool_result') {
                            const message: Message = {
                                role: 'tool',
                                name: data.name,
                                tool_call_id: data.tool_call_id,
                                content: data.output_text || data.content || '',
                                created_at: data.created_at,
                                chunk_id: data.chunk_id,
                                dialogue_id: data.dialogue_id,
                                thread_id: data.thread_id,
                                chunk_type: 'tool_result',
                                is_final: data.is_final || true,
                                sequence: data.sequence
                            }

                            console.log('收到工具调用结果:', message)
                            setPendingMessages(prev => [...prev, message])
                        }
                        // 处理其他类型的消息
                        else {
                            console.log('收到完整消息:', data)

                            mergeAndClearChunks() // 先合并之前的chunks

                            // 转换为统一的Message格式
                            const message: Message = {
                                role: 'assistant',
                                content: data.output_text || data.content || '',
                                created_at: data.created_at,
                                chunk_id: data.chunk_id,
                                dialogue_id: data.dialogue_id,
                                thread_id: data.thread_id,
                                chunk_type: data.chunk_type,
                                is_final: data.is_final || true,
                                sequence: data.sequence,
                                tool_calls: data.tool_calls
                            }

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
                    setIsProcessing(false)
                    throw err
                },
            })
        } catch (error) {
            // 使用通用错误处理函数
            if (!handleApiError(error, '发送消息失败')) {
                // 不是特殊错误，或未被处理的错误
                if (!(error instanceof Error && error.message === '认证错误已处理')) {
                    throw error
                }
            }
        } finally {
            abortController.abort()
            setIsProcessing(false)
        }
    }

    // 实时更新流式消息函数
    const updateActiveMessage = (chunk: Message) => {
        const chunkId = chunk.chunk_id;

        // 确保chunk消息有正确的线程ID
        const threadId = chunk.thread_id || currentThreadId || '';
        if (threadId !== currentThreadId) {
            console.log(`跳过非当前线程消息的更新，消息线程: ${threadId}, 当前线程: ${currentThreadId}`);
            return; // 避免显示其他线程的消息
        }

        // 检查是否已有正在处理的ai_delta消息
        const hasActiveDelta = Array.from(activeMessagesRef.current.keys()).some(key =>
            activeMessagesRef.current.get(key)?.chunk_type === 'ai_delta'
        )

        // 检查是否已有这个chunk_id的活动消息
        if (!activeMessagesRef.current.has(chunkId)) {
            // 首次收到此chunk_id，创建新的活动消息
            const newMessage: Message = {
                ...chunk,
                role: 'assistant',
                content: chunk.content,
                chunk_type: 'ai_message', // 转换为ai_message显示
                is_final: false, // 标记为非最终内容
                thread_id: threadId // 确保有thread_id
            }
            activeMessagesRef.current.set(chunkId, newMessage)

            // 如果是第一个ai_delta消息，添加到显示列表
            if (!hasActiveDelta) {
                setArchivedMessages(prev => [...prev, newMessage])
                console.log('添加第一个流式消息:', chunkId, '内容:', chunk.content.substring(0, 20) + '...');
            } else {
                // 否则更新最新的ai_message
                setArchivedMessages(prev => {
                    const lastIdx = prev.length - 1
                    if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
                        // 更新最近一条AI消息
                        const updatedMessages = [...prev]
                        updatedMessages[lastIdx] = {
                            ...updatedMessages[lastIdx],
                            content: updatedMessages[lastIdx].content + chunk.content,
                            thread_id: threadId
                        }
                        return updatedMessages
                    }
                    return [...prev, { ...newMessage }]
                })
            }
        } else {
            // 已有此chunk_id，更新内容
            const currentMessage = activeMessagesRef.current.get(chunkId)!
            const updatedMessage: Message = {
                ...currentMessage,
                content: currentMessage.content + chunk.content,
                created_at: chunk.created_at,
                chunk_type: 'ai_message',
                is_final: chunk.is_final || false, // 保留is_final状态或设为false
                thread_id: threadId // 确保有正确的thread_id
            }
            activeMessagesRef.current.set(chunkId, updatedMessage)

            // 更新最新的AI消息
            setArchivedMessages(prev => {
                const lastIdx = prev.length - 1
                if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
                    // 更新最近一条AI消息
                    const updatedMessages = [...prev]
                    updatedMessages[lastIdx] = {
                        ...updatedMessages[lastIdx],
                        content: updatedMessage.content,
                        is_final: updatedMessage.is_final,
                        thread_id: threadId
                    }
                    return updatedMessages
                }
                return prev
            })
        }
    }

    // 切换收藏状态
    const toggleFavorite = async (requestId: string) => {
        try {
            const res = await authFetch(`${API_BASE_URL}/chat/messages/${requestId}/favorite`, {
                method: 'POST'
            })

            if (res.ok) {
                // 更新收藏状态的逻辑可以在这里添加
            }
        } catch (error) {
            // 使用通用错误处理函数
            if (!handleApiError(error, '切换收藏状态失败')) {
                throw error // 其他错误继续抛出
            }
        }
    }

    // 取消处理中的请求，用于取消等待状态
    const cancelProcessing = () => {
        setIsProcessing(false);
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
            isProcessing,
            cancelProcessing,
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
