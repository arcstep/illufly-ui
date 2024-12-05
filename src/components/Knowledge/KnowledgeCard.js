import React, { useState } from 'react';
import Link from 'next/link';
import MarkdownRenderer from '../MarkMeta/MarkdownRenderer';
import CopyButton from '../Common/CopyButton';
import MarkdownShow from '../MarkMeta/MarkdownShow';

function KnowledgeCard({ file, content, knowledgeId }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState('');

    const handleViewDetails = () => {
        setModalContent(content);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent('');
    };

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
                    content={content && (content.replace(/<!--[\s\S]*?-->/g, '').substring(0, 100) + '...') || '加载中...'}
                />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
            </div>

            <div className="flex items-center mt-2">
                <button
                    className="text-blue-500 text-sm"
                    onClick={handleViewDetails}
                >
                    查看详情
                </button>
                <CopyButton content={content} />
                <Link
                    href={`/knowledge/edit?knowledge_id=${knowledgeId}`}
                    className="ml-auto text-blue-500 text-sm"
                >
                    编辑
                </Link>
            </div>

            <MarkdownShow
                isOpen={isModalOpen}
                content={modalContent}
                onClose={closeModal}
            />
        </div>
    );
}

export default KnowledgeCard;