'use client';

import { useState, useEffect, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faSearch, faTrash, faBook, faFileAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { useDocument } from '@/context/DocumentContext';
import { DocumentProvider } from '@/context/DocumentContext';

function DocsPageContent() {
    const { changeCurrentPath } = useAuth();
    const {
        documents,
        isLoading,
        isUploading,
        uploadProgress,
        storageStatus,
        loadDocuments,
        uploadDocument,
        deleteDocument,
        downloadDocument,
        searchDocuments,
        getStorageStatus
    } = useDocument();
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadMetadata, setUploadMetadata] = useState({
        title: '',
        description: '',
        tags: [] as string[]
    });
    const [showMetadataForm, setShowMetadataForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        changeCurrentPath('/docs');
        loadDocuments();
        getStorageStatus();
    }, []);

    // 处理文件选择
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        const file = files[0];
        setSelectedFile(file);

        // 预填充元数据表单
        setUploadMetadata({
            title: file.name.split('.')[0], // 使用文件名作为默认标题
            description: '',
            tags: []
        });

        setShowMetadataForm(true);
    };

    // 处理文件上传
    const handleFileUpload = async () => {
        if (!selectedFile) return;

        await uploadDocument(selectedFile, {
            title: uploadMetadata.title || selectedFile.name.split('.')[0],
            description: uploadMetadata.description,
            tags: uploadMetadata.tags
        });

        // 重置表单和状态
        setSelectedFile(null);
        setShowMetadataForm(false);
        setUploadMetadata({ title: '', description: '', tags: [] });

        // 刷新存储状态
        getStorageStatus();
    };

    // 处理文档删除
    const handleDelete = async (docId: string) => {
        if (!confirm('确定要删除这个文档吗？')) return;
        await deleteDocument(docId);
        getStorageStatus(); // 刷新存储状态
    };

    // 处理文档搜索
    const handleSearch = async () => {
        await searchDocuments(searchQuery);
    };

    // 处理标签输入
    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            const newTag = (e.target as HTMLInputElement).value.trim();
            if (!uploadMetadata.tags.includes(newTag)) {
                setUploadMetadata({
                    ...uploadMetadata,
                    tags: [...uploadMetadata.tags, newTag]
                });
            }
            (e.target as HTMLInputElement).value = '';
        }
    };

    // 删除标签
    const removeTag = (tag: string) => {
        setUploadMetadata({
            ...uploadMetadata,
            tags: uploadMetadata.tags.filter(t => t !== tag)
        });
    };

    // 获取文件类型图标
    const getFileIcon = (fileType: string) => {
        const type = fileType.toLowerCase();
        if (type === 'pdf') return faFileAlt as IconProp;
        return faBook as IconProp;
    };

    // 格式化文件大小
    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-900">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">文档管理</h1>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="搜索文档..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
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
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.txt"
                        />
                    </label>
                </div>
            </div>

            {/* 存储使用情况 */}
            {storageStatus && (
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">存储空间</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(storageStatus.used)} / {formatFileSize(storageStatus.limit)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${storageStatus.usage_percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${storageStatus.usage_percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {storageStatus.usage_percentage}% 已使用
                    </p>
                </div>
            )}

            {/* 元数据表单 */}
            {showMetadataForm && selectedFile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="font-medium text-gray-800 dark:text-white mb-4">填写文档信息</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">文件名</label>
                                <div className="text-sm text-gray-600 dark:text-gray-300">{selectedFile.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatFileSize(selectedFile.size)}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标题</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    value={uploadMetadata.title}
                                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, title: e.target.value })}
                                    placeholder="输入文档标题"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">描述</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    value={uploadMetadata.description}
                                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, description: e.target.value })}
                                    placeholder="输入文档描述"
                                    rows={3}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标签</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {uploadMetadata.tags.map(tag => (
                                        <span key={tag} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full flex items-center">
                                            {tag}
                                            <button
                                                className="ml-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                onClick={() => removeTag(tag)}
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    placeholder="输入标签并按回车添加"
                                    onKeyDown={handleTagInput}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowMetadataForm(false);
                                        setSelectedFile(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleFileUpload}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    上传
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <FontAwesomeIcon
                                        icon={getFileIcon(doc.type)}
                                        className="text-2xl text-blue-500"
                                    />
                                    <div>
                                        <h3 className="font-medium text-gray-800 dark:text-white">{doc.title || doc.original_name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                            {doc.size && ` · ${formatFileSize(doc.size)}`}
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

                            {doc.description && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{doc.description}</p>
                                </div>
                            )}

                            {doc.tags && doc.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {doc.tags.map(tag => (
                                        <span key={tag} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {doc.chunks_count ? `${doc.chunks_count} 个片段` : ""}
                                </span>
                                <button
                                    onClick={() => downloadDocument(doc.id)}
                                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    <FontAwesomeIcon icon={faDownload as IconProp} className="mr-1" />
                                    下载
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

// 外层组件提供 DocumentProvider
export default function DocsPage() {
    return (
        <Suspense fallback={<div>正在加载文档页面...</div>}>
            <DocumentProvider>
                <DocsPageContent />
            </DocumentProvider>
        </Suspense>
    );
} 