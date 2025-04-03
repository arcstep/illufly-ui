'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MarkdownRenderer({ content, className = '' }) {
    if (!content) return null;

    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    // 自定义链接，在新标签页中打开
                    a({ node, ...props }) {
                        return (
                            <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 underline"
                            />
                        );
                    },
                    // 自定义表格样式
                    table({ node, ...props }) {
                        return (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200" {...props} />
                            </div>
                        );
                    },
                    th({ node, ...props }) {
                        return (
                            <th
                                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                {...props}
                            />
                        );
                    },
                    td({ node, ...props }) {
                        return (
                            <td
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                {...props}
                            />
                        );
                    },
                    // 自定义引用块样式
                    blockquote({ node, ...props }) {
                        return (
                            <blockquote
                                className="border-l-4 border-gray-300 pl-4 italic text-gray-600"
                                {...props}
                            />
                        );
                    },
                    // 自定义列表样式
                    ul({ node, ...props }) {
                        return (
                            <ul
                                className="list-disc list-inside space-y-1 text-gray-700"
                                {...props}
                            />
                        );
                    },
                    ol({ node, ...props }) {
                        return (
                            <ol
                                className="list-decimal list-inside space-y-1 text-gray-700"
                                {...props}
                            />
                        );
                    },
                    li({ node, ...props }) {
                        return (
                            <li
                                className="text-gray-700"
                                {...props}
                            />
                        );
                    },
                    // 自定义标题样式
                    h1({ node, ...props }) {
                        return (
                            <h1
                                className="text-2xl font-bold text-gray-900 mt-6 mb-4"
                                {...props}
                            />
                        );
                    },
                    h2({ node, ...props }) {
                        return (
                            <h2
                                className="text-xl font-bold text-gray-900 mt-5 mb-3"
                                {...props}
                            />
                        );
                    },
                    h3({ node, ...props }) {
                        return (
                            <h3
                                className="text-lg font-bold text-gray-900 mt-4 mb-2"
                                {...props}
                            />
                        );
                    },
                    h4({ node, ...props }) {
                        return (
                            <h4
                                className="text-base font-bold text-gray-900 mt-3 mb-2"
                                {...props}
                            />
                        );
                    },
                    h5({ node, ...props }) {
                        return (
                            <h5
                                className="text-sm font-bold text-gray-900 mt-2 mb-1"
                                {...props}
                            />
                        );
                    },
                    h6({ node, ...props }) {
                        return (
                            <h6
                                className="text-xs font-bold text-gray-900 mt-2 mb-1"
                                {...props}
                            />
                        );
                    },
                    // 自定义段落样式
                    p({ node, ...props }) {
                        return (
                            <p
                                className="text-gray-700 mb-4"
                                {...props}
                            />
                        );
                    },
                    // 自定义图片样式
                    img({ node, ...props }) {
                        return (
                            <img
                                className="max-w-full h-auto rounded-lg shadow-md"
                                {...props}
                                alt={props.alt || '图片'}
                            />
                        );
                    },
                    // 自定义水平线样式
                    hr({ node, ...props }) {
                        return (
                            <hr
                                className="my-4 border-t border-gray-200"
                                {...props}
                            />
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
} 