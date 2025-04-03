'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faSearch, faTrash, faBook, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { useDocument } from '@/context/DocumentContext';

export default function DocsPage() {
    const { changeCurrentPath } = useAuth();
    const {
        documents,
        isLoading,
        isUploading,
        uploadProgress,
        loadDocuments,
        uploadDocument,
        deleteDocument,
        searchDocuments
    } = useDocument();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        changeCurrentPath('/docs');
        loadDocuments();
    }, []);

    // 处理文件上传
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        await uploadDocument(files[0]);
    };

    // 处理文档删除
    const handleDelete = async (docId: string) => {
        if (!confirm('确定要删除这个文档吗？')) return;
        await deleteDocument(docId);
    };

    // 处理文档搜索
    const handleSearch = async () => {
        await searchDocuments(searchQuery);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">文档管理</h1>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="搜索文档..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <FontAwesomeIcon
                            icon={faSearch as IconProp}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                    </div>
                    <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <FontAwesomeIcon icon={faUpload as IconProp} className="mr-2" />
                        上传文档
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt"
                        />
                    </label>
                </div>
            </div>

            {/* 上传进度条 */}
            {isUploading && (
                <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">正在上传... {uploadProgress}%</p>
                </div>
            )}

            {/* 加载状态 */}
            {isLoading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {/* 文档列表 */}
            {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <FontAwesomeIcon
                                        icon={doc.type === 'pdf' ? faFileAlt as IconProp : faBook as IconProp}
                                        className="text-2xl text-blue-500"
                                    />
                                    <div>
                                        <h3 className="font-medium text-gray-800">{doc.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <FontAwesomeIcon icon={faTrash as IconProp} />
                                </button>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <span className="text-sm text-gray-500">
                                    {doc.chunks_count} 个片段
                                </span>
                                <button
                                    onClick={() => window.location.href = `/docs/${doc.id}`}
                                    className="text-blue-500 hover:text-blue-600 text-sm"
                                >
                                    查看详情
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 空状态 */}
            {!isLoading && documents.length === 0 && (
                <div className="text-center py-12">
                    <FontAwesomeIcon
                        icon={faBook as IconProp}
                        className="text-4xl text-gray-400 mb-4"
                    />
                    <p className="text-gray-500">暂无文档</p>
                    <p className="text-sm text-gray-400 mt-2">
                        上传文档开始管理您的知识库
                    </p>
                </div>
            )}
        </div>
    );
} 