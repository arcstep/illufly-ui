import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

export default function MarkdownShow({ isOpen, content, onClose }) {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl mx-4 my-6 w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold">详细信息</h2>
                    <button
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        onClick={onClose}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <MarkdownRenderer
                        content={content}
                        className="prose prose-lg max-w-none"
                    />
                </div>
            </div>
        </div>
    );
}