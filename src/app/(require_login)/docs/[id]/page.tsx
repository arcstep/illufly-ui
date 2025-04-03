'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSearch, faDownload, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useDocument } from '@/context/DocumentContext';

export default function DocumentPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const {
        currentDocument,
        chunks,
        currentChunkIndex,
        isLoading,
        searchResults,
        isSearching,
        loadDocument,
        loadChunks,
        deleteDocument,
        searchChunks,
        setCurrentChunkIndex
    } = useDocument();
    const [searchQuery, setSearchQuery] = useState('');

    // 加载文档信息和切片
    useEffect(() => {
        loadDocument(params.id);
        loadChunks(params.id);
    }, [params.id]);

    // 处理文档删除
    const handleDelete = async () => {
        if (!confirm('确定要删除这个文档吗？')) return;
        await deleteDocument(params.id);
        router.push('/docs');
    };

    // 处理文档下载
    const handleDownload = () => {
        if (currentDocument?.file_url) {
            window.open(currentDocument.file_url, '_blank');
        }
    };

    // 处理切片搜索
    const handleSearch = async () => {
        await searchChunks(params.id, searchQuery);
    };

    // 导航到指定切片
    const navigateToChunk = (chunkId: string) => {
        const index = chunks.findIndex(chunk => chunk.id === chunkId);
        if (index !== -1) {
            setCurrentChunkIndex(index);
        }
    };

    // 处理切片导航
    const handlePrevChunk = () => {
        setCurrentChunkIndex(Math.max(0, currentChunkIndex - 1));
    };

    const handleNextChunk = () => {
        setCurrentChunkIndex(Math.min(chunks.length - 1, currentChunkIndex + 1));
    };

    if (isLoading || !currentDocument) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* 顶部导航栏 */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/docs')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <FontAwesomeIcon icon={faArrowLeft as IconProp} className="mr-2" />
                        返回文档列表
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">{currentDocument.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleDownload}
                        className="text-blue-500 hover:text-blue-600"
                    >
                        <FontAwesomeIcon icon={faDownload as IconProp} className="mr-2" />
                        下载原文件
                    </button>
                    <button
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-600"
                    >
                        <FontAwesomeIcon icon={faTrash as IconProp} className="mr-2" />
                        删除文档
                    </button>
                </div>
            </div>

            {/* 搜索栏 */}
            <div className="mb-8">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="搜索文档内容..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <FontAwesomeIcon
                        icon={faSearch as IconProp}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                </div>
            </div>

            {/* 搜索结果 */}
            {isSearching && searchResults.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">搜索结果</h2>
                    <div className="space-y-2">
                        {searchResults.map((result) => (
                            <div
                                key={result.id}
                                className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                onClick={() => navigateToChunk(result.id)}
                            >
                                <p className="text-sm text-gray-600 line-clamp-2">{result.content}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    第 {result.sequence} 段
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 文档内容 */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-500">
                        第 {currentChunkIndex + 1} / {chunks.length} 段
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevChunk}
                            disabled={currentChunkIndex === 0}
                            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            上一段
                        </button>
                        <button
                            onClick={handleNextChunk}
                            disabled={currentChunkIndex === chunks.length - 1}
                            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            下一段
                        </button>
                    </div>
                </div>

                <div className="prose max-w-none">
                    {chunks[currentChunkIndex]?.content}
                </div>
            </div>
        </div>
    );
} 