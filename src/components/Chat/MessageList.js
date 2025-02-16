import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar, faThumbsUp, faThumbsDown, faCopy } from '@fortawesome/free-solid-svg-icons';
import MarkdownRenderer from '../Knowledge/MarkdownRenderer';
import RAGCard from '../RAG/RAGCard';
import CopyButton from '../Common/CopyButton';
import { useChat } from '@/context/ChatContext';

export default function MessageList() {
    const { threads, switchThread, currentThreadId, messages } = useChat()
    const messagesEndRef = useRef(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [attitude, setAttitude] = useState({});

    useEffect(() => {
        const lastThread = threads.sort((a, b) => b.created_at - a.created_at)[0]
        if (lastThread) {
            switchThread(lastThread.thread_id)
        }
    }, [threads])

    useEffect(() => {
        console.log('messages: ', messages)
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectMessage = (id) => {
        setSelectedMessageIds((prevSelected) =>
            prevSelected.includes(id)
                ? prevSelected.filter((selectedId) => selectedId !== id)
                : [...prevSelected, id]
        );
    };

    const handleAttitudeChange = (id, type) => {
        setAttitude((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [type]: !prev[id]?.[type],
            },
        }));
    };

    const handleShareMessages = () => {
        const selectedMessages = messages.filter((message) =>
            selectedMessageIds.includes(message.id)
        );
        console.log('分享消息:', selectedMessages);
    };

    const handleCancelShare = () => {
        setSelectedMessageIds([]);
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-4">
                    {messages.map((message) => (
                        <li
                            key={message.message_id}
                            className={`flex gap-3 group relative p-4 rounded-lg shadow-sm bg-white 
                                ${selectedMessageIds.includes(message.message_id) ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
                        >
                            <div className="w-8 flex-shrink-0">
                                <button
                                    className={`cursor-pointer w-6 h-6 rounded-full flex items-center justify-center 
                                        ${selectedMessageIds.includes(message.message_id)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100'} 
                                        transition-opacity duration-200`}
                                    onClick={() => handleSelectMessage(message.message_id)}
                                    title="选择消息"
                                >
                                    <FontAwesomeIcon icon={faCheck} className="text-sm" />
                                </button>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-gray-700">
                                        {message.role}
                                    </span>
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
                                        {message.message_type.toUpperCase()}
                                    </span>
                                    {message.favorite && (
                                        <span className="text-yellow-500">
                                            <FontAwesomeIcon icon={faStar} className="text-sm" />
                                        </span>
                                    )}
                                    <CopyButton content={message.content} />
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {new Date(message.completed_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-gray-800">
                                    <MarkdownRenderer
                                        content={message.content}
                                        className="prose prose-sm max-w-none"
                                    />
                                </div>
                            </div>
                        </li>
                    ))}
                    <div ref={messagesEndRef} />
                </ul>
            </div>
            {selectedMessageIds.length > 0 && (
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
            )}
        </div>
    );
}