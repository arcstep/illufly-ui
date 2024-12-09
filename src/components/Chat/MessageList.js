import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar, faThumbsUp, faThumbsDown, faCopy } from '@fortawesome/free-solid-svg-icons';
import MarkdownRenderer from '../Knowledge/MarkdownRenderer';
import RAGCard from '../RAG/RAGCard';
import CopyButton from '../Common/CopyButton';

export default function MessageList({ messages }) {
    const messagesEndRef = useRef(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);
    const [attitude, setAttitude] = useState({});

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
                <ul>
                    {messages.map((message) => (
                        <li
                            key={message.id}
                            className={`flex items-start relative group mb-4 p-4 rounded-lg shadow-sm bg-white 
                                ${selectedMessageIds.includes(message.id) ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
                        >
                            <div className="flex flex-col items-center mr-4">
                                {message.logo}
                                <div
                                    className={`mt-2 flex flex-col items-center 
                                        ${selectedMessageIds.includes(message.id) ||
                                            attitude[message.id]?.star ||
                                            attitude[message.id]?.like ||
                                            attitude[message.id]?.dislike
                                            ? 'opacity-100'
                                            : 'opacity-0 group-hover:opacity-100'
                                        } transition-opacity duration-300`}
                                >
                                    <button
                                        className={`cursor-pointer w-6 h-6 rounded-full mb-2 flex items-center justify-center 
                                            ${selectedMessageIds.includes(message.id) ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`}
                                        onClick={() => handleSelectMessage(message.id)}
                                        title="点击选择/取消选择"
                                    >
                                        <FontAwesomeIcon icon={faCheck} />
                                    </button>
                                    <button
                                        className={`cursor-pointer w-6 h-6 rounded-full mb-2 flex items-center justify-center 
                                            ${attitude[message.id]?.star ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-500'}`}
                                        onClick={() => handleAttitudeChange(message.id, 'star')}
                                        title="收藏"
                                    >
                                        <FontAwesomeIcon icon={faStar} />
                                    </button>
                                    {message.name !== '你' && (
                                        <>
                                            <button
                                                className={`cursor-pointer w-6 h-6 rounded-full mb-2 flex items-center justify-center 
                                                    ${attitude[message.id]?.like ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}
                                                onClick={() => handleAttitudeChange(message.id, 'like')}
                                                title="点赞"
                                            >
                                                <FontAwesomeIcon icon={faThumbsUp} />
                                            </button>
                                            <button
                                                className={`cursor-pointer w-6 h-6 rounded-full flex items-center justify-center 
                                                    ${attitude[message.id]?.dislike ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-500'}`}
                                                onClick={() => handleAttitudeChange(message.id, 'dislike')}
                                                title="踩"
                                            >
                                                <FontAwesomeIcon icon={faThumbsDown} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-gray-800">{message.name}</div>
                                {message.segments.map((segment, index) => (
                                    <div key={index} className="bg-white p-2 mb-2 rounded">
                                        <div className="flex items-center text-xs text-gray-500 mb-1">
                                            <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                                                {segment.type.toUpperCase()}
                                            </span>
                                            {['human', 'chunk'].includes(segment.type) && (
                                                <CopyButton content={segment.content} />
                                            )}
                                            <span className="text-gray-400 ml-auto">{message.timestamp}</span>
                                        </div>
                                        {segment.type === 'rag' ? (
                                            <RAGCard content={segment.content} />
                                        ) : (
                                            <MarkdownRenderer
                                                content={segment.content}
                                                className="text-sm text-gray-700 prose prose-sm max-w-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </li>
                    ))}
                    <div ref={messagesEndRef} />
                </ul>
            </div>
            {selectedMessageIds.length > 0 && (
                <div className="sticky bottom-0 bg-white p-2 shadow-md flex justify-between">
                    <button
                        className="text-blue-500"
                        onClick={handleShareMessages}
                    >
                        分享选中的消息
                    </button>
                    <button
                        className="text-red-500"
                        onClick={handleCancelShare}
                    >
                        取消分享
                    </button>
                </div>
            )}
        </div>
    );
}