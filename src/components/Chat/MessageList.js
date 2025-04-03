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
    const memoryDate = new Date(memory.created_at * 1000);

    return (
        <div className="bg-blue-50 rounded-lg border border-blue-200 mb-2 text-sm transition-all duration-300">
            <div
                className="flex flex-col p-2 cursor-pointer hover:bg-blue-100 rounded-t-lg"
                onClick={toggleCollapse}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faMemory} className="text-blue-500" />
                        <span className="font-medium text-blue-800">{memory.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{getRelativeTime(memory.created_at)}</span>
                        <FontAwesomeIcon
                            icon={isCollapsed ? faChevronDown : faChevronUp}
                            className="text-gray-500 transition-transform duration-300"
                        />
                    </div>
                </div>

                {/* 即使在折叠状态下也显示问题 */}
                <div className="mt-1 text-gray-700 line-clamp-2 text-sm">
                    <span className="font-medium">问：</span>
                    <span>{memory.question}</span>
                </div>
            </div>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                    }`}
            >
                <div className="p-2 border-t border-blue-200">
                    <div>
                        <span className="font-medium text-gray-700">答：</span>
                        <span className="text-gray-600">{memory.answer}</span>
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

    // 记忆类型图标和颜色
    const typeConfig = {
        'memory_retrieve': {
            icon: faMemory,
            title: '记忆检索',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-800'
        },
        'memory_extract': {
            icon: faBook,
            title: '记忆提取',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            textColor: 'text-green-800'
        },
        'kg_retrieve': {
            icon: faBook,
            title: '知识库',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            textColor: 'text-purple-800'
        },
        'search_results': {
            icon: faSearch,
            title: '搜索结果',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            textColor: 'text-amber-800'
        }
    };

    const config = typeConfig[chunkType];

    return (
        <div className={`${config.bgColor} rounded-lg border ${config.borderColor} p-2 mb-3`}>
            <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={config.icon} className={config.textColor} />
                <span className={`font-medium ${config.textColor}`}>{config.title}</span>
                <span className="text-xs text-gray-500 ml-auto">
                    {memories.length} 项结果
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {memories.map((memory) => {
                    // 检查是否有展开的记忆项
                    const hasExpandedItems = Object.values(expandedMemories).some(value => value);
                    // 如果有展开的项，则全部卡片变为单列布局，否则保持多列布局
                    const cardWidth = hasExpandedItems ? 'w-full' : 'w-full md:w-[calc(50%-0.5rem)]';

                    return (
                        <div key={memory.memory.question_hash} className={cardWidth}>
                            <MemoryCard
                                memory={memory.memory}
                                isCollapsed={!expandedMemories[memory.memory.question_hash]}
                                toggleCollapse={() => toggleMemory(memory.memory.question_hash)}
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

    useEffect(() => {
        const lastThread = threads.sort((a, b) => b.created_at - a.created_at)[0]
        if (lastThread) {
            switchThread(lastThread.thread_id)
        }
    }, [threads])

    // 只有在底部时才自动滚动
    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom();
        }
    }, [messages, isAtBottom]);

    const handleSelectMessage = (id) => {
        setSelectedMessageIds((prevSelected) =>
            prevSelected.includes(id)
                ? prevSelected.filter((selectedId) => selectedId !== id)
                : [...prevSelected, id]
        );
    };

    const handleShareMessages = () => {
        const selectedMessages = messages.filter((message) =>
            selectedMessageIds.includes(message.dialouge_id)
        );
        console.log('分享消息:', selectedMessages);
    };

    const handleCancelShare = () => {
        setSelectedMessageIds([]);
    };

    // 处理消息分组
    const processedMessages = useMemo(() => {
        // 创建一个新数组存储处理后的消息
        const result = [];
        // 临时存储记忆检索和提取消息
        const memoryGroups = {
            memory_retrieve: [],
            memory_extract: [],
            kg_retrieve: [],
            search_results: []
        };

        // 遍历所有消息
        messages.forEach((message, index) => {
            // 如果是记忆相关消息，先收集起来不立即添加
            if (message.chunk_type && ['memory_retrieve', 'memory_extract', 'kg_retrieve', 'search_results'].includes(message.chunk_type)) {
                memoryGroups[message.chunk_type].push(message);
                return;
            }

            // 处理常规消息前，先检查是否有记忆组需要添加
            const allMemoryGroups = Object.keys(memoryGroups);
            for (const groupType of allMemoryGroups) {
                if (memoryGroups[groupType].length > 0) {
                    // 添加收集的记忆组
                    result.push({
                        isMemoryGroup: true,
                        chunkType: groupType,
                        memories: [...memoryGroups[groupType]]
                    });
                    // 清空该组
                    memoryGroups[groupType] = [];
                }
            }

            // 添加常规消息
            result.push(message);
        });

        // 检查是否还有剩余的记忆组需要添加
        const remainingGroups = Object.keys(memoryGroups);
        for (const groupType of remainingGroups) {
            if (memoryGroups[groupType].length > 0) {
                result.push({
                    isMemoryGroup: true,
                    chunkType: groupType,
                    memories: [...memoryGroups[groupType]]
                });
            }
        }

        return result;
    }, [messages]);

    return (
        <div className="h-full flex flex-col relative">
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4"
            >
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
                            return (
                                <li
                                    key={message.dialouge_id}
                                    className={`group relative ${message.role === 'user' ? 'flex justify-end' : ''}`}
                                >
                                    <div
                                        className={`relative rounded-lg p-1 
                                        ${selectedMessageIds.includes(message.dialouge_id) ? 'ring-2 ring-blue-400' : ''}`}
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
                                                ${selectedMessageIds.includes(message.dialouge_id)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-200 text-gray-500'}`}
                                                onClick={() => handleSelectMessage(message.dialouge_id)}
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
                    <div ref={messagesEndRef} />
                </ul>
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