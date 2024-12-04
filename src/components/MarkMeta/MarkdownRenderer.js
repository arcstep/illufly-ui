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
    tagNames: [...defaultSchema.tagNames, 'question', 'final_answer', 'no_final_answer', 'context', 'knowledge', 'OUTLINE'], // 添加自定义标签
    attributes: {
        ...defaultSchema.attributes,
        // 允许自定义标签的属性
        question: ['className'],
        final_answer: ['className'],
        no_final_answer: ['className'],
        context: ['className'],
        knowledge: ['className'],
        OUTLINE: ['className']
    }
};

export default function MarkdownRenderer({ content, className = '' }) {
    const CustomTag = ({ tagName, ...props }) => (
        <div className="relative border border-gray-300 p-4 my-4 rounded-md -mt-2.5">
            <span className="absolute top-0 left-2 bg-white px-2 text-xs text-gray-500 border border-gray-300 rounded">
                {tagName}
            </span>
            <div {...props} />
        </div>
    );

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
                    question: (props) => <CustomTag tagName="question" {...props} />,
                    final_answer: (props) => <CustomTag tagName="final_answer" {...props} />,
                    no_final_answer: (props) => <CustomTag tagName="no_final_answer" {...props} />,
                    context: (props) => <CustomTag tagName="context" {...props} />,
                    knowledge: (props) => <CustomTag tagName="knowledge" {...props} />,
                    OUTLINE: (props) => <CustomTag tagName="OUTLINE" {...props} />
                }}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
}