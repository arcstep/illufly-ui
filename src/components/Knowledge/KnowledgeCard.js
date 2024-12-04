import React from 'react';
import MarkdownRenderer from '../MarkMeta/MarkdownRenderer';

function KnowledgeCard({ file, content }) {
    return (
        <div className="border rounded-lg shadow-sm hover:shadow-md transition-shadow p-2 bg-white">
            <div className="mb-2">
                <h3 className="font-medium text-gray-900 truncate">
                    {file.name}
                </h3>
                <div className="text-xs text-gray-500 flex justify-between">
                    <span>{new Date(file.lastModified).toLocaleString()}</span>
                    <span>{content?.length || 0} 字</span>
                </div>
            </div>

            <div className="h-36 overflow-hidden relative">
                <MarkdownRenderer
                    content={content || '加载中...'}
                />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
            </div>
        </div>
    );
}

export default KnowledgeCard;