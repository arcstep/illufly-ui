import React, { useState } from 'react';
import MarkdownRenderer from '../MarkMeta/MarkdownRenderer';

export default function RAGCard({ content }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const [showAll, setShowAll] = useState(false);

    // 解析JSON字符串
    const data = JSON.parse(content);

    // 根据showAll状态决定显示的项目数量
    const displayedItems = showAll ? data : data.slice(0, 2);

    const handleViewDetails = (text) => {
        setModalContent(text);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent('');
    };

    const toggleShowAll = () => {
        setShowAll(!showAll);
    };

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex space-x-4 overflow-x-auto">
                {displayedItems.map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded shadow-sm border border-gray-200">
                        {item.meta?.source && (
                            <div className="text-sm font-semibold text-gray-800">
                                {item.meta.source}
                            </div>
                        )}
                        {item.text ? (
                            <MarkdownRenderer
                                content={item.text.substring(0, 50) + '...'}
                                className="text-xs text-gray-600 mt-1"
                            />
                        ) : (
                            <div className="text-xs text-gray-600 mt-1">
                                无内容
                            </div>
                        )}
                        <div className="flex items-center mt-2">
                            {item.meta?.distance !== undefined && (
                                <span className="inline-block bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5">
                                    {item.meta.distance.toFixed(2)}
                                </span>
                            )}
                            <button
                                className="ml-auto text-blue-500 text-sm"
                                onClick={() => handleViewDetails(item.text)}
                            >
                                查看详情
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {data.length > 2 && (
                <button className="text-blue-500 text-sm" onClick={toggleShowAll}>
                    {showAll ? '收起' : '更多'}
                </button>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
                        <h2 className="text-lg font-semibold mb-4">详细信息</h2>
                        <MarkdownRenderer
                            content={modalContent}
                            className="text-sm text-gray-700 prose prose-sm max-w-none"
                        />
                        <button
                            className="mt-4 text-blue-500"
                            onClick={closeModal}
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}