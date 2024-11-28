import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';

export default function MessageHistory({ messages }) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto mb-4">
            <h3 className="text-md md:text-lg font-bold">消息</h3>
            <ul>
                {messages.map((message) => (
                    <li key={message.id} className="flex items-start mb-4">
                        <div className="mr-2">{message.logo}</div>
                        <div>
                            <div className="font-semibold">{message.name}</div>
                            {message.segments.map((segment, index) => {
                                const content = segment.content;
                                const displayContent = typeof content === 'string' ? content : '';
                                return (
                                    <div key={index} className="bg-white shadow-md p-2 mb-2 rounded">
                                        <div className="text-xs text-gray-500">[{segment.type.toUpperCase()}]</div>
                                        <div className="text-sm markdown-content">
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
                                        <div className="text-xs text-gray-500">{message.timestamp}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </li>
                ))}
                <div ref={messagesEndRef} />
            </ul>
        </div>
    );
}