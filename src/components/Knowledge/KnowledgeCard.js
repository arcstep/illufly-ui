import React, { useState } from 'react';
import Link from 'next/link';
import MarkdownRenderer from './MarkdownRenderer';
import CopyButton from '../Common/CopyButton';
import KnowledgeModelShow from './KnowledgeModelShow';
import { get_knowledge } from '../../utils/knowledge';

/**
 * 知识卡片组件
 * @param {Object} props
 * @param {Object} props.knowledge - 知识对象，包含 id, summary, tags, source 等
 */
function KnowledgeCard({ knowledge }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!knowledge) return null;

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4">
            {/* 知识标题/摘要 */}
            <div className="mb-3">
                <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                    <MarkdownRenderer content={knowledge.summary} />
                </h3>
            </div>

            {/* 标签展示 */}
            {knowledge.tags && knowledge.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {knowledge.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* 来源信息 */}
            {knowledge.source && (
                <div className="text-xs text-gray-500 mb-3">
                    来源: {knowledge.source}
                </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                    >
                        查看详情
                    </button>
                    <CopyButton
                        getContent={async () => {
                            const response = await get_knowledge(knowledge.id);
                            return response?.content?.text || '';
                        }}
                    />
                </div>
                <Link
                    href={`/knowledge/edit?knowledge_id=${knowledge.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                    编辑
                </Link>
            </div>

            {/* 详情模态框 */}
            <KnowledgeModelShow
                isOpen={isModalOpen}
                knowledge={knowledge}
                get_knowledge={get_knowledge}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}

export default KnowledgeCard;

