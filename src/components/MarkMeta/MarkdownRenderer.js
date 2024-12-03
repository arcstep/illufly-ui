import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// 自定义 schema，允许某些标签
const customSchema = {
    ...defaultSchema,
    tagNames: [...defaultSchema.tagNames, 'question', 'answer'], // 添加自定义标签
    attributes: {
        ...defaultSchema.attributes,
        question: ['className'],
        answer: ['className'] // 允许自定义标签的属性
    }
};

export default function MarkdownRenderer({ content, className = '' }) {
    return (
        <div className={`prose prose-sm max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[
                    remarkGfm,
                    remarkMath,
                    remarkBreaks,
                    remarkEmoji
                ]}
                rehypePlugins={[
                    rehypeRaw,
                    rehypeSanitize(customSchema),
                    rehypeKatex,
                    rehypeHighlight
                ]}
                components={{
                    question: ({ node, ...props }) => (
                        <div className="relative border border-gray-300 p-4 my-4 rounded-md">
                            <span className="absolute top-0 left-2 bg-white px-2 text-xs text-gray-500 border border-gray-300 rounded">
                                question
                            </span>
                            <div {...props} />
                        </div>
                    ),
                    answer: ({ node, ...props }) => (
                        <div className="relative border border-gray-300 p-4 my-4 rounded-md">
                            <span className="absolute top-0 left-2 bg-white px-2 text-xs text-gray-500 border border-gray-300 rounded">
                                answer
                            </span>
                            <div {...props} />
                        </div>
                    )
                }}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
}