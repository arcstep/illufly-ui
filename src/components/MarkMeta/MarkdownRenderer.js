import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';

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
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
}