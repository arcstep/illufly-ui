import { useEffect, useRef, useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar, faCopy, faArrowDown, faChevronDown, faChevronUp, faMemory, faBook, faSearch } from '@fortawesome/free-solid-svg-icons';
import MarkdownRenderer from '../Knowledge/MarkdownRenderer';
import CopyButton from '../Common/CopyButton';
import { useChat } from '@/context/ChatContext';

// 相对时间函数
function getRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp * 1000);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) {
        return `${diff}秒前`;
    } else if (diff < 3600) {
        return `${Math.floor(diff / 60)}分钟前`;
    } else if (diff < 86400) {
        return `${Math.floor(diff / 3600)}小时前`;
    } else if (diff < 2592000) {
        return `${Math.floor(diff / 86400)}天前`;
    } else {
        return date.toLocaleDateString();
    }
}

// 记忆块组件
function MemoryCard({ memory, isCollapsed, toggleCollapse }) {
    // 确保所有必要字段都存在
    const memoryData = {
        topic: memory.topic || '记忆片段',
        question: memory.question || '未知问题',
        answer: memory.answer || '未知答案',
        created_at: memory.created_at || Date.now() / 1000,
        question_hash: memory.question_hash || `mem_${Date.now()}`
    };

    const memoryDate = new Date(memoryData.created_at * 1000);

    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 mb-2 text-sm transition-all duration-300">
            <div
                className="flex flex-col p-2 cursor-pointer hover:bg-gray-100 rounded-t-lg"
                onClick={toggleCollapse}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faMemory} className="text-gray-500" />
                        <span className="font-medium text-gray-600">{memoryData.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{getRelativeTime(memoryData.created_at)}</span>
                        <FontAwesomeIcon
                            icon={isCollapsed ? faChevronDown : faChevronUp}
                            className="text-gray-500 transition-transform duration-300"
                        />
                    </div>
                </div>

                {/* 即使在折叠状态下也显示问题 */}
                <div className="mt-1 text-gray-700 line-clamp-2 text-xs">
                    <span className="font-medium">问：</span>
                    <span>{memoryData.question}</span>
                </div>
            </div>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                    }`}
            >
                <div className="p-2 border-t border-gray-200">
                    <div>
                        <span className="font-medium text-gray-700">答：</span>
                        <span className="text-gray-600">{memoryData.answer}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 记忆检索组组件
function MemoryGroup({ memories, chunkType }) {
    const [expandedMemories, setExpandedMemories] = useState({});

    const toggleMemory = (id) => {
        setExpandedMemories(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    useEffect(() => {
        // 默认所有记忆折叠
        const initialState = {};
        memories.forEach(memory => {
            const memoryData = memory.memory || memory;
            const id = memoryData.question_hash || `mem_${Date.now()}`;
            initialState[id] = false; // 默认折叠
        });
        setExpandedMemories(initialState);
    }, [memories]);

    // 记忆类型图标和颜色
    const typeConfig = {
        'memory_retrieve': {
            icon: faMemory,
            title: '记忆检索',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-600'
        },
        'memory_extract': {
            icon: faBook,
            title: '记忆提取',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-600'
        },
        'kg_retrieve': {
            icon: faBook,
            title: '知识库',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-600'
        },
        'search_results': {
            icon: faSearch,
            title: '搜索结果',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-600'
        }
    };

    const config = typeConfig[chunkType];

    // 检查记忆是否有效
    const validMemories = memories.filter(memory => {
        // 获取memory对象 - 有些消息直接包含memory，有些消息将memory作为单独的属性
        const memoryData = memory.memory || memory;

        // 检查基本必要字段
        return (
            memoryData &&
            (memoryData.question_hash || memoryData.created_at) &&
            (memoryData.question || memoryData.content || memoryData.answer)
        );
    });

    // 如果没有有效记忆，返回null
    if (validMemories.length === 0) {
        console.warn('无有效记忆数据:', memories);
        return null;
    }

    return (
        <div className={`${config.bgColor} rounded-lg border ${config.borderColor} p-2 mb-3 text-xs`}>
            <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={config.icon} className={config.textColor} />
                <span className={`font-medium ${config.textColor}`}>{config.title}</span>
                <span className="text-xs text-gray-500 ml-auto">
                    {validMemories.length} 项结果
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {validMemories.map((memory) => {
                    // 获取memory对象 - 有些消息直接包含memory，有些消息将memory作为单独的属性
                    const memoryData = memory.memory || memory;

                    // 生成唯一ID
                    const memoryId = memoryData.question_hash ||
                        `mem_${memoryData.created_at}_${Math.random().toString(36).substring(2, 9)}`;

                    // 检查是否有展开的记忆项
                    const hasExpandedItems = Object.values(expandedMemories).some(value => value);
                    // 如果有展开的项，则全部卡片变为单列布局，否则保持多列布局
                    const cardWidth = hasExpandedItems ? 'w-full' : 'w-full md:w-[calc(50%-0.5rem)]';

                    return (
                        <div key={memoryId} className={cardWidth}>
                            <MemoryCard
                                memory={memoryData}
                                isCollapsed={!expandedMemories[memoryId]}
                                toggleCollapse={() => toggleMemory(memoryId)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function MessageList() {
    const { threads, switchThread, currentThreadId, messages } = useChat()
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [timeRefresh, setTimeRefresh] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isWaitingResponse, setIsWaitingResponse] = useState(false);

    // 检查是否在底部
    const checkIfAtBottom = () => {
        const container = scrollContainerRef.current;
        if (!container) return true;

        const threshold = 30; // 底部阈值，小于这个值认为是在底部
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
        }, 60000);  // 60秒更新一次

        return () => clearInterval(timeUpdateInterval);
    }, []);

    // 添加滚动事件监听
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // 修改消息监控效果，检测是否正在等待服务器响应
    useEffect(() => {
        console.log(`MessageList检测到线程/消息变化: 线程=${currentThreadId}, 消息数量=${messages.length}`);

        if (currentThreadId) {
            // 先显示加载状态
            setIsLoading(true);

            // 等待短暂延迟以确保所有消息都已加载
            const timer = setTimeout(() => {
                setIsLoading(false);

                // 检查最新的消息是否来自用户，如果是则显示等待服务器响应状态
                const userMessages = messages.filter(msg => msg.role === 'user');
                const assistantMessages = messages.filter(msg => msg.role === 'assistant');

                if (userMessages.length > 0 && assistantMessages.length > 0) {
                    const lastUserMsg = userMessages[userMessages.length - 1];
                    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];

                    // 如果最新消息是用户的，且这条用户消息的时间戳比最新的助手消息更晚，说明正在等待响应
                    if (lastUserMsg.created_at > lastAssistantMsg.created_at) {
                        setIsWaitingResponse(true);
                    } else {
                        setIsWaitingResponse(false);
                    }
                } else if (userMessages.length > 0 && assistantMessages.length === 0) {
                    // 如果有用户消息但没有助手消息，也表示正在等待响应
                    setIsWaitingResponse(true);
                } else {
                    setIsWaitingResponse(false);
                }

                // 滚动到底部
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [currentThreadId, messages]);

    // 监听消息变化，自动滚动到底部
    useEffect(() => {
        if (isAtBottom || messages.length <= 1) {
            scrollToBottom();
        }

        // 每次消息变化时记录在控制台，帮助调试
        console.log(`MessageList: 当前线程 ${currentThreadId} 的消息数量:`, messages.length);
    }, [messages, isAtBottom, currentThreadId]);

    const handleSelectMessage = (id) => {
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

        // 创建一个新数组存储处理后的消息
        const result = [];
        // 临时存储记忆检索和提取消息
        const memoryGroups = {
            memory_retrieve: [],
            memory_extract: [],
            kg_retrieve: [],
            search_results: []
        };

        // 记忆消息去重用的集合
        const memoryChunkIds = {
            memory_retrieve: new Set(),
            memory_extract: new Set(),
            kg_retrieve: new Set(),
            search_results: new Set()
        };

        // 记录第一个记忆消息的位置
        let firstMemoryIndex = Infinity;
        let firstMemorySequence = Infinity;
        let firstMemoryCreatedAt = Infinity;

        // 过滤掉不需要显示的消息类型
        const filteredMessages = messages.filter(message => {
            // 彻底过滤掉ai_delta类型的消息
            const messageType = message.chunk_type || message.type;

            // 记录所有接收到的消息，便于调试
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

            // 过滤掉title_update类型的消息，它们应该在ChatContext中处理
            if (messageType === 'title_update') {
                console.log('过滤掉title_update消息:', message.chunk_id);
                return false;
            }

            // 检查消息完整性
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

        // 根据is_final字段处理消息，优先显示最终消息
        const processedMessageMap = new Map();

        // 先遍历一遍，按chunk_id分组，保留is_final为true的消息
        filteredMessages.forEach(message => {
            const key = message.chunk_id;

            // 如果已存在此ID且当前消息是最终版本，则替换
            if (message.is_final && (!processedMessageMap.has(key) || !processedMessageMap.get(key).is_final)) {
                processedMessageMap.set(key, message);
            }
            // 如果尚未添加此ID，则无论是否最终版本都添加
            else if (!processedMessageMap.has(key)) {
                processedMessageMap.set(key, message);
            }
        });

        // 将处理后的消息转为数组并排序
        const deduplicatedMessages = Array.from(processedMessageMap.values())
            .sort((a, b) => {
                // 优先按sequence排序
                if (a.sequence !== undefined && b.sequence !== undefined) {
                    return a.sequence - b.sequence;
                }
                // 如果没有sequence，则按created_at排序
                return a.created_at - b.created_at;
            });

        // 遍历所有消息，先收集记忆相关消息
        deduplicatedMessages.forEach((message, index) => {
            console.log("处理去重后消息:",
                message.chunk_id,
                "类型:", message.chunk_type || message.type,
                "内容:", message.content?.substring(0, 20) + '...',
                "序列:", message.sequence,
                "创建时间:", message.created_at
            );

            // 判断消息是否属于记忆相关类型
            const messageType = message.type || message.chunk_type;

            // 如果是记忆相关消息，先收集起来不立即添加
            if (messageType && ['memory_retrieve', 'memory_extract', 'kg_retrieve', 'search_results'].includes(messageType)) {
                console.log(`收集${messageType}类型消息:`, message.chunk_id);

                // 检查此chunk_id是否已经处理过，避免重复添加
                if (memoryChunkIds[messageType].has(message.chunk_id)) {
                    console.log(`跳过重复的${messageType}消息:`, message.chunk_id);
                    return;
                }

                // 标记为已处理
                memoryChunkIds[messageType].add(message.chunk_id);

                // 记录第一个记忆消息的位置信息
                if (index < firstMemoryIndex) {
                    firstMemoryIndex = index;
                }
                if (message.sequence !== undefined && message.sequence < firstMemorySequence) {
                    firstMemorySequence = message.sequence;
                }
                if (message.created_at < firstMemoryCreatedAt) {
                    firstMemoryCreatedAt = message.created_at;
                }

                // 对于记忆检索和提取，确保memory对象存在
                if ((messageType === 'memory_retrieve' || messageType === 'memory_extract') && !message.memory) {
                    // 尝试从其他字段获取memory数据
                    if (message.memory_data) {
                        message.memory = message.memory_data;
                    } else if (message.content && typeof message.content === 'string') {
                        // 尝试从content解析JSON
                        try {
                            const memoryData = JSON.parse(message.content);
                            if (memoryData && typeof memoryData === 'object') {
                                message.memory = memoryData;
                            }
                        } catch (e) {
                            console.warn('无法从content解析memory数据:', e);
                        }
                    }

                    // 如果仍然没有memory对象，创建一个基础对象
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

                // 对于知识库检索和搜索结果，确保有效数据
                if ((messageType === 'kg_retrieve' || messageType === 'search_results') && !message.results) {
                    // 尝试从其他字段获取数据
                    if (message.results_data) {
                        message.results = message.results_data;
                    } else if (message.data) {
                        message.results = message.data;
                    }
                }

                memoryGroups[messageType].push(message);
                return;
            }

            // 添加非记忆类型的常规消息
            result.push(message);
        });

        // 没有记忆相关消息时直接返回结果
        if (Object.values(memoryGroups).every(group => group.length === 0)) {
            console.log("MessageList最终处理后消息列表数量:", result.length);
            return result;
        }

        // 找到插入记忆组的位置：记忆消息的创建时间通常早于AI回复消息
        // 根据索引、序列号和创建时间找到合适的插入位置
        let insertIndex = 0;
        for (let i = 0; i < result.length; i++) {
            const msg = result[i];

            // 如果找到一个消息的sequence大于第一个记忆消息的sequence，或者创建时间晚于第一个记忆消息
            // 则在此消息之前插入记忆组
            if ((msg.sequence !== undefined && firstMemorySequence !== Infinity && msg.sequence > firstMemorySequence) ||
                (firstMemoryCreatedAt !== Infinity && msg.created_at > firstMemoryCreatedAt)) {
                insertIndex = i;
                break;
            }

            // 如果到了最后一条消息还没找到合适的位置，就将记忆组放在最后
            if (i === result.length - 1) {
                insertIndex = result.length;
            }
        }

        // 如果结果数组为空，直接将记忆组放在开头
        if (result.length === 0) {
            insertIndex = 0;
        }

        console.log(`将记忆组插入到位置 ${insertIndex}，总消息数: ${result.length}`);

        // 创建记忆组消息对象
        const memoryGroupMessages = [];
        const groupTypes = Object.keys(memoryGroups);

        for (const groupType of groupTypes) {
            if (memoryGroups[groupType].length > 0) {
                console.log(`添加${groupType}记忆组，包含 ${memoryGroups[groupType].length} 条消息:`,
                    memoryGroups[groupType].map(m => m.chunk_id).join(', '));

                memoryGroupMessages.push({
                    isMemoryGroup: true,
                    chunkType: groupType,
                    memories: [...memoryGroups[groupType]]
                });
            }
        }

        // 在合适的位置插入记忆组
        result.splice(insertIndex, 0, ...memoryGroupMessages);

        console.log("MessageList最终处理后消息列表数量:", result.length);
        return result;
    }, [messages]);

    // 修改等待响应提示组件
    const ResponseWaitingIndicator = () => (
        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col relative">
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4"
            >
                {currentThreadId && !isLoading && processedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                            <p>当前对话还没有消息</p>
                            <p className="text-sm mt-2">在下方输入框开始对话吧</p>
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {
                            processedMessages.map((item, index) => {
                                // 如果是记忆组，使用MemoryGroup组件
                                if (item.isMemoryGroup) {
                                    return (
                                        <li key={`memory-group-${index}`}>
                                            <MemoryGroup
                                                memories={item.memories}
                                                chunkType={item.chunkType}
                                            />
                                        </li>
                                    );
                                }

                                // 否则是普通消息，使用原来的渲染方式
                                const message = item;

                                // 过滤掉title_update类型的消息，它们已经在ChatContext中处理过
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
                                            ${selectedMessageIds.includes(message.chunk_id) ? 'ring-2 ring-blue-400' : ''}`}
                                        >
                                            <div
                                                className={`rounded-lg p-1 m-1 ${message.role === 'user' ? 'bg-gray-100 max-w-[100%]' : 'w-full'}`}
                                            >
                                                <MarkdownRenderer
                                                    content={message.content}
                                                    className="prose prose-sm max-w-none"
                                                />
                                            </div>

                                            <div className={`flex items-center gap-2 mb-1 text-xs ${message.role === 'user' ? 'justify-end' : ''}`}>
                                                <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {getRelativeTime(message.created_at)}
                                                </span>

                                                {message.favorite && (
                                                    <span className="text-yellow-500">
                                                        <FontAwesomeIcon icon={faStar} size="xs" />
                                                    </span>
                                                )}

                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <CopyButton
                                                        content={message.content}
                                                        iconClassName="text-gray-400"
                                                    />
                                                </div>

                                                <button
                                                    className={`cursor-pointer w-5 h-5 rounded-full flex items-center justify-center ml-1
                                                    opacity-0 group-hover:opacity-100 transition-opacity
                                                    ${selectedMessageIds.includes(message.chunk_id)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-500'}`}
                                                    onClick={() => handleSelectMessage(message.chunk_id)}
                                                    title="选择消息"
                                                >
                                                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
                        }
                        {isWaitingResponse && <ResponseWaitingIndicator />}
                        <div ref={messagesEndRef} />
                    </ul>
                )}
            </div>

            {/* 悬浮箭头 */}
            {!isAtBottom && (
                <button
                    className="absolute bottom-16 right-4 w-10 h-10 bg-blue-500 text-white rounded-full shadow-md flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    onClick={scrollToBottom}
                    title="滚动到底部"
                >
                    <FontAwesomeIcon icon={faArrowDown} />
                </button>
            )}

            {
                selectedMessageIds.length > 0 && (
                    <div className="sticky bottom-0 bg-white p-3 shadow-md flex justify-end gap-4">
                        <button
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            onClick={handleShareMessages}
                        >
                            分享选中消息
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
                            onClick={handleCancelShare}
                        >
                            取消选择
                        </button>
                    </div>
                )
            }
        </div>
    );
}