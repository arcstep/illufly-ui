import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

interface CodeProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    [key: string]: any;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const components: Components = {
        code({ node, inline, className, children, ...props }: CodeProps) {
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
        table({ children }) {
            return (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        {children}
                    </table>
                </div>
            );
        },
        thead({ children }) {
            return (
                <thead className="bg-gray-50 dark:bg-gray-800">
                    {children}
                </thead>
            );
        },
        th({ children }) {
            return (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {children}
                </th>
            );
        },
        td({ children }) {
            return (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {children}
                </td>
            );
        },
        tr({ children }) {
            return (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {children}
                </tr>
            );
        },
        blockquote({ children }) {
            return (
                <blockquote className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 italic text-gray-600 dark:text-gray-300">
                    {children}
                </blockquote>
            );
        },
        a({ href, children }) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline"
                >
                    {children}
                </a>
            );
        },
        img({ src, alt }) {
            return (
                <img
                    src={src}
                    alt={alt}
                    className="max-w-full h-auto rounded-lg shadow-md"
                />
            );
        },
        ul({ children }) {
            return (
                <ul className="list-disc pl-5 space-y-1">
                    {children}
                </ul>
            );
        },
        ol({ children }) {
            return (
                <ol className="list-decimal pl-5 space-y-1">
                    {children}
                </ol>
            );
        },
        li({ children }) {
            return (
                <li className="text-gray-700 dark:text-gray-300">
                    {children}
                </li>
            );
        },
        p({ children }) {
            return (
                <p className="mb-4 last:mb-0">
                    {children}
                </p>
            );
        },
        h1({ children }) {
            return (
                <h1 className="text-3xl font-bold mb-4">
                    {children}
                </h1>
            );
        },
        h2({ children }) {
            return (
                <h2 className="text-2xl font-bold mb-3">
                    {children}
                </h2>
            );
        },
        h3({ children }) {
            return (
                <h3 className="text-xl font-bold mb-2">
                    {children}
                </h3>
            );
        },
        h4({ children }) {
            return (
                <h4 className="text-lg font-bold mb-2">
                    {children}
                </h4>
            );
        },
        h5({ children }) {
            return (
                <h5 className="text-base font-bold mb-2">
                    {children}
                </h5>
            );
        },
        h6({ children }) {
            return (
                <h6 className="text-sm font-bold mb-2">
                    {children}
                </h6>
            );
        },
        hr() {
            return (
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
            );
        },
        pre({ children }) {
            return (
                <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
                    {children}
                </pre>
            );
        },
    };

    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}