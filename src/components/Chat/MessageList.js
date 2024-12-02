import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';

export default function MessageList({ messages }) {
    const messagesEndRef = useRef(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);

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
                            className={`flex items-start relative group mb-4 p-4 rounded-lg shadow-sm bg-white ${selectedMessageIds.includes(message.id) ? 'border-2 border-blue-500' : 'border border-gray-200'
                                }`}
                        >
                            <div className="flex flex-col items-center mr-4">
                                {message.logo}
                                <div
                                    className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                >
                                    <button
                                        className={`cursor-pointer w-6 h-6 rounded-full ${selectedMessageIds.includes(message.id) ? 'bg-blue-500' : 'bg-gray-300'
                                            }`}
                                        onClick={() => handleSelectMessage(message.id)}
                                        title="点击选择/取消选择"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-gray-800">{message.name}</div>
                                {message.segments.map((segment, index) => {
                                    const content = segment.content;
                                    const displayContent = typeof content === 'string' ? content : '';
                                    return (
                                        <div key={index} className="bg-white p-2 mb-2 rounded">
                                            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                                                <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                                                    {segment.type.toUpperCase()}
                                                </span>
                                                <span className="text-gray-400">{message.timestamp}</span>
                                            </div>
                                            <div className="text-sm markdown-content text-gray-700">
                                                <ReactMarkdown
                                                    remarkPlugins={[
                                                        remarkGfm,
                                                        remarkMath,
                                                        remarkBreaks,
                                                        remarkEmoji
                                                    ]}
                                                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                                >
                                                    {displayContent}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    );
                                })}
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