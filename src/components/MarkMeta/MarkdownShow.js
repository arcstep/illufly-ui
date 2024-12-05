import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

export default function MarkdownShow({ isOpen, content, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
                <h2 className="text-lg font-semibold mb-4">详细信息</h2>
                <MarkdownRenderer
                    content={content}
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                />
                <button
                    className="mt-4 text-blue-500"
                    onClick={onClose}
                >
                    关闭
                </button>
            </div>
        </div>
    );
}