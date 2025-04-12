import React, { useEffect, useRef, useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheck,
    faStar,
    faArrowDown,
    faVolumeUp,
    faPause,
    faSpinner,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import MarkdownRenderer from '../Common/MarkdownRenderer';
import CopyButton from '../Common/CopyButton';
import { useChat } from '@/context/ChatContext';
import { getRelativeTime } from '@/utils/time';
import MemoryGroup from '@/components/Memory/MemoryGroup';
import ResponseWaitingIndicator from './ResponseWaitingIndicator';
import { useTTS } from '@/context/TTSContext';
import { useSettings } from '@/context/SettingsContext';

interface AudioPlayButtonProps {
    content: string;
}

// 语音播放按钮组件
function AudioPlayButton({ content }: AudioPlayButtonProps) {
    const { isPlaying, isLoading, playAudio, stopAudio } = useTTS();
    const { settings } = useSettings(); // 获取设置

    const handleClick = async () => {
        if (isPlaying) {
            stopAudio();
        } else {
            await playAudio(content);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 
                      ${settings.autoPlayTTS ? 'border-b border-blue-500 dark:border-blue-400' : ''}`}
            title={isPlaying ? '暂停播放' : (settings.autoPlayTTS ? '自动播放已开启' : '播放语音')}
        >
            <FontAwesomeIcon
                icon={isLoading ? faSpinner : (isPlaying ? faPause : faVolumeUp)}
                className={isLoading ? 'animate-spin' : ''}
                size="xs"
            />
        </button>
    );
}

interface Message {
    chunk_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    created_at: number;
    favorite?: boolean;
    chunk_type?: string;
    type?: string;
    is_final?: boolean;
    sequence?: number;
    memory?: any;
    memory_data?: any;
    results?: any;
    results_data?: any;
    data?: any;
    tool_calls?: Array<{
        tool_id: string;
        name: string;
        arguments: string;
    }>;
    name?: string;
    tool_call_id?: string;
    output_text?: string;
    input_messages?: Array<{
        role: string;
        content: string;
    }>;
}

interface MemoryGroupItem {
    isMemoryGroup: true;
    memories: Message[];
    chunkType: string;
    sequence?: number;
    created_at?: number;
}

type ProcessedMessage = Message | MemoryGroupItem;

// 定义记忆组类型
type MemoryGroupType = 'memory_retrieve' | 'memory_extract' | 'kg_retrieve' | 'search_results';

// 定义记忆组数据结构
interface MemoryGroups {
    memory_retrieve: Message[];
    memory_extract: Message[];
    kg_retrieve: Message[];
    search_results: Message[];
}

interface MemoryChunkIds {
    memory_retrieve: Set<string>;
    memory_extract: Set<string>;
    kg_retrieve: Set<string>;
    search_results: Set<string>;
}

export default function MessageList() {
    const { messages, currentThreadId, isProcessing, cancelProcessing } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    const [timeRefresh, setTimeRefresh] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isWaitingResponse, setIsWaitingResponse] = useState(false);
    const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [waitingDuration, setWaitingDuration] = useState(0);

    // 检查是否在底部
    const checkIfAtBottom = () => {
        const container = scrollContainerRef.current;
        if (!container) return true;

        const threshold = 30;
        const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceToBottom < threshold;
    };

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 处理滚动事件
    const handleScroll = () => {
        setIsAtBottom(checkIfAtBottom());
    };

    // 每分钟更新一次相对时间
    useEffect(() => {
        const timeUpdateInterval = setInterval(() => {
            setTimeRefresh(prev => prev + 1);
        }, 60000);

        return () => clearInterval(timeUpdateInterval);
    }, []);

    // 添加滚动事件监听
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        } else {
            console.warn('scrollContainerRef.current 为空');
            return;
        }
    }, []);

    // 更新等待响应计时器
    useEffect(() => {
        if (isWaitingResponse) {
            // 每秒更新等待时间
            const timer = setInterval(() => {
                setWaitingDuration(prev => prev + 1);

                // 如果等待时间超过30秒，可能是网络问题或后端未响应
                if (waitingDuration > 30) {
                    console.log("等待响应时间过长，可能存在网络问题");
                }
            }, 1000);

            return () => clearInterval(timer);
        } else {
            // 重置等待时间
            setWaitingDuration(0);
            return;
        }
    }, [isWaitingResponse, waitingDuration]);

    // 同步等待状态与全局处理状态
    useEffect(() => {
        // 如果全局处理状态结束，但本地仍在等待，则取消等待
        if (!isProcessing && isWaitingResponse) {
            console.log("全局处理状态已结束，自动取消等待状态");
            setIsWaitingResponse(false);
        }
    }, [isProcessing, isWaitingResponse]);

    // 修改消息监控效果，检测是否正在等待服务器响应
    useEffect(() => {
        console.log(`MessageList检测到线程/消息变化: 线程=${currentThreadId}, 消息数量=${messages.length}`);

        // 清除之前的定时器
        if (waitingTimerRef.current) {
            clearTimeout(waitingTimerRef.current);
            waitingTimerRef.current = null;
        }

        if (currentThreadId) {
            setIsLoading(true);

            const timer = setTimeout(() => {
                setIsLoading(false);

                const userMessages = messages.filter(msg => msg.role === 'user');
                const assistantMessages = messages.filter(msg => msg.role === 'assistant');

                if (userMessages.length > 0 && assistantMessages.length > 0) {
                    const lastUserMsg = userMessages[userMessages.length - 1];
                    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];

                    if (lastUserMsg.created_at > lastAssistantMsg.created_at) {
                        // 如果最后一条用户消息的创建时间超过3分钟，则不再显示等待状态
                        const threeMinutesAgo = Date.now() / 1000 - 180; // 3分钟前(秒级时间戳)
                        if (lastUserMsg.created_at < threeMinutesAgo) {
                            console.log("检测到超过3分钟的未回复用户消息，不再显示等待状态");
                            setIsWaitingResponse(false);
                        } else {
                            setIsWaitingResponse(true);
                            // 设置2分钟后自动关闭等待状态
                            waitingTimerRef.current = setTimeout(() => {
                                console.log("等待响应超时，自动关闭等待状态");
                                setIsWaitingResponse(false);
                            }, 120000); // 2分钟
                        }
                    } else {
                        setIsWaitingResponse(false);
                    }
                } else if (userMessages.length > 0 && assistantMessages.length === 0) {
                    // 检查最后一条用户消息的创建时间
                    const lastUserMsg = userMessages[userMessages.length - 1];
                    const twoMinutesAgo = Date.now() / 1000 - 120; // 2分钟前(秒级时间戳)

                    if (lastUserMsg.created_at < twoMinutesAgo) {
                        console.log("检测到超过2分钟的未回复用户消息，不再显示等待状态");
                        setIsWaitingResponse(false);
                    } else {
                        setIsWaitingResponse(true);
                        // 设置2分钟后自动关闭等待状态
                        waitingTimerRef.current = setTimeout(() => {
                            console.log("等待响应超时，自动关闭等待状态");
                            setIsWaitingResponse(false);
                        }, 120000); // 2分钟
                    }
                } else {
                    setIsWaitingResponse(false);
                }

                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }, 300);

            return () => {
                clearTimeout(timer);
                if (waitingTimerRef.current) {
                    clearTimeout(waitingTimerRef.current);
                }
            };
        }

        return () => {
            if (waitingTimerRef.current) {
                clearTimeout(waitingTimerRef.current);
            }
        };
    }, [currentThreadId, messages.length]);

    // 监听消息变化，自动滚动到底部
    useEffect(() => {
        if (isAtBottom || messages.length <= 1) {
            scrollToBottom();
        }
    }, [messages, isAtBottom, currentThreadId]);

    const handleSelectMessage = (id: string) => {
        setSelectedMessageIds((prevSelected) =>
            prevSelected.includes(id)
                ? prevSelected.filter((selectedId) => selectedId !== id)
                : [...prevSelected, id]
        );
    };

    const handleShareMessages = () => {
        const selectedMessages = messages.filter((message) =>
            selectedMessageIds.includes(message.chunk_id)
        );
        console.log('分享消息:', selectedMessages);
    };

    const handleCancelShare = () => {
        setSelectedMessageIds([]);
    };

    // 处理消息分组
    const processedMessages = useMemo(() => {
        console.log("MessageList接收到原始消息列表:", messages.length, "条");

        const result: ProcessedMessage[] = [];
        const memoryGroups: MemoryGroups = {
            memory_retrieve: [],
            memory_extract: [],
            kg_retrieve: [],
            search_results: []
        };

        const memoryChunkIds: MemoryChunkIds = {
            memory_retrieve: new Set<string>(),
            memory_extract: new Set<string>(),
            kg_retrieve: new Set<string>(),
            search_results: new Set<string>()
        };

        let firstMemoryIndex = Infinity;
        let firstMemorySequence = Infinity;
        let firstMemoryCreatedAt = Infinity;

        const filteredMessages = messages.filter(message => {
            const messageType = message.chunk_type;

            console.log(`MessageList处理消息:`, {
                type: messageType,
                role: message.role,
                id: message.chunk_id,
                content: message.content?.substring(0, 20) + '...',
                sequence: message.sequence,
                created_at: message.created_at
            });

            if (messageType === 'ai_delta') {
                console.log('过滤掉增量消息:', message.chunk_id);
                return false;
            }

            if (messageType === 'title_update') {
                console.log('过滤掉title_update消息:', message.chunk_id);
                return false;
            }

            if (!message.content) {
                console.warn('消息内容为空，尝试使用output_text:', message);
                if (message.output_text) {
                    message.content = message.output_text;
                } else {
                    console.warn('消息没有内容，将被过滤:', message.chunk_id);
                    return false;
                }
            }

            return true;
        });

        const processedMessageMap = new Map<string, Message>();

        filteredMessages.forEach(message => {
            const key = message.chunk_id;

            if (message.is_final && (!processedMessageMap.has(key) || !processedMessageMap.get(key)?.is_final)) {
                processedMessageMap.set(key, message);
            } else if (!processedMessageMap.has(key)) {
                processedMessageMap.set(key, message);
            }
        });

        const deduplicatedMessages = Array.from(processedMessageMap.values())
            .sort((a, b) => {
                if (a.sequence !== undefined && b.sequence !== undefined) {
                    return a.sequence - b.sequence;
                }
                return a.created_at - b.created_at;
            });

        deduplicatedMessages.forEach((message, index) => {
            const messageType = message.chunk_type;

            if (messageType && ['memory_retrieve', 'memory_extract', 'kg_retrieve', 'search_results'].includes(messageType as MemoryGroupType)) {
                const groupType = messageType as MemoryGroupType;

                if (memoryChunkIds[groupType].has(message.chunk_id)) {
                    console.log(`跳过重复的${groupType}消息:`, message.chunk_id);
                    return;
                }

                memoryChunkIds[groupType].add(message.chunk_id);

                if (index < firstMemoryIndex) {
                    firstMemoryIndex = index;
                }
                if (message.sequence !== undefined && message.sequence < firstMemorySequence) {
                    firstMemorySequence = message.sequence;
                }
                if (message.created_at < firstMemoryCreatedAt) {
                    firstMemoryCreatedAt = message.created_at;
                }

                if ((groupType === 'memory_retrieve' || groupType === 'memory_extract') && !message.memory) {
                    if (message.memory_data) {
                        message.memory = message.memory_data;
                    } else if (message.content && typeof message.content === 'string') {
                        try {
                            const memoryData = JSON.parse(message.content);
                            if (memoryData && typeof memoryData === 'object') {
                                message.memory = memoryData;
                            }
                        } catch (e) {
                            console.warn('无法从content解析memory数据:', e);
                        }
                    }

                    if (!message.memory) {
                        message.memory = {
                            topic: '记忆片段',
                            question: message.content || '未找到问题',
                            answer: '未找到答案',
                            question_hash: message.chunk_id,
                            created_at: message.created_at
                        };
                    }
                }

                if ((groupType === 'kg_retrieve' || groupType === 'search_results') && !message.results) {
                    if (message.results_data) {
                        message.results = message.results_data;
                    } else if (message.data) {
                        message.results = message.data;
                    }
                }

                memoryGroups[groupType].push(message);
                return;
            }

            result.push(message);
        });

        if (Object.values(memoryGroups).every(group => group.length === 0)) {
            console.log("MessageList最终处理后消息列表数量:", result.length);
            return result;
        }

        let insertIndex = 0;
        for (let i = 0; i < result.length; i++) {
            const msg = result[i] as Message;

            if ((msg.sequence !== undefined && firstMemorySequence !== Infinity && msg.sequence > firstMemorySequence) ||
                (firstMemoryCreatedAt !== Infinity && msg.created_at > firstMemoryCreatedAt)) {
                insertIndex = i;
                break;
            }

            if (i === result.length - 1) {
                insertIndex = result.length;
            }
        }

        if (result.length === 0) {
            insertIndex = 0;
        }

        console.log(`将记忆组插入到位置 ${insertIndex}，总消息数: ${result.length}`);

        const memoryGroupMessages: MemoryGroupItem[] = [];
        const groupTypes = Object.keys(memoryGroups) as MemoryGroupType[];

        for (const groupType of groupTypes) {
            if (memoryGroups[groupType].length > 0) {
                console.log(`添加${groupType}记忆组，包含 ${memoryGroups[groupType].length} 条消息:`,
                    memoryGroups[groupType].map(m => m.chunk_id).join(', '));

                memoryGroupMessages.push({
                    isMemoryGroup: true,
                    chunkType: groupType,
                    memories: [...memoryGroups[groupType]],
                    sequence: firstMemorySequence,
                    created_at: firstMemoryCreatedAt
                });
            }
        }

        result.splice(insertIndex, 0, ...memoryGroupMessages);

        console.log("MessageList最终处理后消息列表数量:", result.length);
        return result;
    }, [messages]);

    // 手动取消等待状态
    const cancelWaiting = () => {
        console.log("用户手动取消等待状态");
        setIsWaitingResponse(false);

        // 同时取消全局处理状态
        cancelProcessing();

        if (waitingTimerRef.current) {
            clearTimeout(waitingTimerRef.current);
            waitingTimerRef.current = null;
        }
        setWaitingDuration(0);
    };

    return (
        <div className="h-full flex flex-col relative">
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4"
            >
                {currentThreadId && !isLoading && processedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <p>当前对话还没有消息</p>
                            <p className="text-sm mt-2">在下方输入框开始对话吧</p>
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {processedMessages.map((item, index) => {
                            if ('isMemoryGroup' in item) {
                                return (
                                    <li key={`memory-group-${index}`}>
                                        <MemoryGroup
                                            memories={item.memories}
                                            chunkType={item.chunkType as MemoryGroupType}
                                        />
                                    </li>
                                );
                            }

                            const message = item;

                            if (message.chunk_type === 'title_update') {
                                console.log('再次过滤掉title_update消息:', message);
                                return null;
                            }

                            return (
                                <li
                                    key={message.chunk_id}
                                    className={`group relative ${message.role === 'user' ? 'flex justify-end' : ''}`}
                                >
                                    <div
                                        className={`relative rounded-lg p-1 
                                        ${selectedMessageIds.includes(message.chunk_id) ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
                                    >
                                        <div
                                            className={`rounded-lg p-1 m-1 ${message.role === 'user'
                                                ? 'bg-blue-50 dark:bg-blue-900/30 max-w-[100%]'
                                                : 'w-full'
                                                }`}
                                        >
                                            <MarkdownRenderer
                                                content={message.content}
                                                className="prose prose-sm max-w-none dark:prose-invert prose-p:dark:text-gray-200 prose-pre:dark:text-gray-200 prose-code:dark:text-gray-200"
                                            />
                                        </div>

                                        <div className={`flex items-center gap-2 mb-1 text-xs ${message.role === 'user' ? 'justify-end' : ''}`}>
                                            <span className="text-gray-400 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {getRelativeTime(message.created_at)}
                                            </span>

                                            {message.favorite && (
                                                <span className="text-yellow-500 dark:text-yellow-400">
                                                    <FontAwesomeIcon icon={faStar} size="xs" />
                                                </span>
                                            )}

                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CopyButton
                                                    content={message.content}
                                                    iconClassName="text-gray-400 dark:text-gray-500"
                                                />
                                            </div>

                                            {message.role === 'assistant' && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <AudioPlayButton content={message.content} />
                                                </div>
                                            )}

                                            <button
                                                className={`cursor-pointer w-5 h-5 rounded-full flex items-center justify-center ml-1
                                                opacity-0 group-hover:opacity-100 transition-opacity
                                                ${selectedMessageIds.includes(message.chunk_id)
                                                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                                                onClick={() => handleSelectMessage(message.chunk_id)}
                                                title="选择消息"
                                            >
                                                <FontAwesomeIcon icon={faCheck} className="text-xs" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                        {isWaitingResponse && (
                            <li className="relative">
                                <ResponseWaitingIndicator />
                                {waitingDuration > 15 && (
                                    <button
                                        onClick={cancelWaiting}
                                        className="absolute bottom-0 right-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-gray-800 rounded-full p-1 shadow"
                                        title="取消等待"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                        <span className="ml-1">取消</span>
                                    </button>
                                )}
                            </li>
                        )}
                        <div ref={messagesEndRef} />
                    </ul>
                )}
            </div>

            {!isAtBottom && (
                <button
                    className="absolute bottom-16 right-4 w-10 h-10 bg-blue-500 dark:bg-blue-600 text-white rounded-full shadow-md flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    onClick={scrollToBottom}
                    title="滚动到底部"
                >
                    <FontAwesomeIcon icon={faArrowDown} />
                </button>
            )}

            {selectedMessageIds.length > 0 && (
                <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-3 shadow-md flex justify-end gap-4">
                    <button
                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        onClick={handleShareMessages}
                    >
                        分享选中消息
                    </button>
                    <button
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={handleCancelShare}
                    >
                        取消选择
                    </button>
                </div>
            )}
        </div>
    );
} 