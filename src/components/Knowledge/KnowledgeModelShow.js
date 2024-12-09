import React, { useEffect, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

export default function KnowledgeModelShow({
    isOpen,
    knowledge,
    get_knowledge,
    onClose
}) {
    const [detail, setDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!isOpen || !knowledge?.id || detail) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await get_knowledge(knowledge.id);
                setDetail(response);
            } catch (err) {
                console.error('加载数据失败:', err);
                setError('加载失败，请重试');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetail();
    }, [isOpen, knowledge?.id]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}>
            <div className="bg-white rounded-lg shadow-xl mx-4 my-6 w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex flex-col gap-2">
                                {knowledge?.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {knowledge.tags.map((tag, index) => (
                                            <span key={index} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="text-sm text-gray-500">
                                    <div>ID: {knowledge?.id}</div>
                                    {knowledge?.source && <div>来源: {knowledge.source}</div>}
                                </div>
                            </div>
                        </div>
                        <button className="text-gray-500 hover:text-gray-700 transition-colors ml-4"
                            onClick={onClose}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {error ? (
                        <div className="text-center text-red-500">{error}</div>
                    ) : isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : detail?.content?.text ? (
                        <div className="prose prose-lg max-w-none">
                            <MarkdownRenderer content={detail.content.text} />
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">暂无内容</div>
                    )}
                </div>

                <div className="px-6 py-3 border-t bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {detail?.raw_meta && (
                            <details className="mt-2">
                                <summary className="cursor-pointer hover:text-gray-700">
                                    原始元数据
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(detail.raw_meta, null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}