import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar, faCopy } from '@fortawesome/free-solid-svg-icons';
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

export default function MessageList() {
    const { threads, switchThread, currentThreadId, messages } = useChat()
    const messagesEndRef = useRef(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [timeRefresh, setTimeRefresh] = useState(0);

    // 每分钟更新一次相对时间
    useEffect(() => {
        const timeUpdateInterval = setInterval(() => {
            setTimeRefresh(prev => prev + 1);
        }, 60000);  // 60秒更新一次

        return () => clearInterval(timeUpdateInterval);
    }, []);

    useEffect(() => {
        const lastThread = threads.sort((a, b) => b.created_at - a.created_at)[0]
        if (lastThread) {
            switchThread(lastThread.thread_id)
        }
    }, [threads])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-4">
                    {
                        messages.map((message) => (
                            <li
                                key={message.dialouge_id}
                                className={`group relative ${message.role === 'user' ? 'flex justify-end' : ''}`}
                            >
                                <div
                                    className={`relative rounded-lg p-3 
                                    ${message.role === 'user'
                                            ? 'bg-gray-100 max-w-[80%]'
                                            : 'w-full'} 
                                    ${selectedMessageIds.includes(message.dialouge_id) ? 'ring-2 ring-blue-400' : ''}`}
                                >
                                    <div className="flex items-center gap-2 mb-1 text-xs">
                                        <span className="text-gray-400">
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

                                    <div>
                                        <MarkdownRenderer
                                            content={message.content}
                                            className="prose prose-sm max-w-none"
                                        />
                                    </div>
                                </div>
                            </li>
                        ))
                    }
                    <div ref={messagesEndRef} />
                </ul>
            </div>
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