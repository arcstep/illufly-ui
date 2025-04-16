'use client';

import { useState, useEffect, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faSearch, faTrash, faBook, faFileAlt, faDownload, faSort } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { useDocument, adaptTimestamp } from '@/context/DocumentContext';
import { DocumentProvider } from '@/context/DocumentContext';

function DocsPageContent() {
    const { changeCurrentPath } = useAuth();
    const {
        documents,
        isLoading,
        isUploading,
        uploadProgress,
        storageStatus,
        uploadQueue,
        loadDocuments,
        uploadDocument,
        deleteDocument,
        downloadDocument,
        searchDocuments,
        getStorageStatus,
        removeFromUploadQueue
    } = useDocument();
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadMetadata, setUploadMetadata] = useState({
        title: '',
        description: '',
        tags: [] as string[]
    });
    const [showMetadataForm, setShowMetadataForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // 简化的过滤与排序状态
    const [titleFilter, setTitleFilter] = useState('');
    const [sortOption, setSortOption] = useState<string>('date-desc');

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

    // 实用函数 - 格式化日期显示
    const formatDateDisplay = (timestamp: string | number): string => {
        const date = adaptTimestamp(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    };

    // 合并上传队列和文档列表，并去重
    const getMergedDocuments = () => {
        // 创建一个已有文档的映射，用于检查重复
        const existingDocMap = new Map();
        documents.forEach(doc => {
            existingDocMap.set(doc.id, doc);
            // 也用文件名+大小作为备用键，处理没有ID的情况
            existingDocMap.set(`${doc.original_name}_${doc.size}`, doc);
        });

        // 过滤上传队列，移除已在文档列表中的项
        const uniqueQueueItems = uploadQueue.filter(item => {
            // 如果队列项有fileId，检查是否已在文档列表中
            if (item.fileId && existingDocMap.has(item.fileId)) {
                return false; // 在文档列表中已存在，过滤掉
            }

            // 如果没有fileId，通过文件名+大小判断是否重复
            const queueKey = `${item.file.name}_${item.file.size}`;
            return !existingDocMap.has(queueKey);
        });

        return { uniqueQueueItems };
    };

    // 获取过滤后的队列项和文档
    const { uniqueQueueItems } = getMergedDocuments();

    // 应用过滤和排序 - 简化版
    const filteredDocuments = documents.filter(doc => {
        // 只保留标题关键字过滤
        if (titleFilter && !(doc.title || doc.original_name).toLowerCase().includes(titleFilter.toLowerCase())) {
            return false;
        }
        return true;
    }).sort((a, b) => {
        // 排序选项: date-desc, date-asc, size-desc, size-asc, title-asc, title-desc
        const [field, direction] = sortOption.split('-');
        const isAsc = direction === 'asc';

        if (field === 'date') {
            // 使用adaptTimestamp确保正确排序
            const dateA = adaptTimestamp(a.created_at).getTime();
            const dateB = adaptTimestamp(b.created_at).getTime();
            return isAsc ? dateA - dateB : dateB - dateA;
        }
        else if (field === 'size') {
            return isAsc ? a.size - b.size : b.size - a.size;
        }
        else { // title
            const aTitle = a.title || a.original_name;
            const bTitle = b.title || b.original_name;
            return isAsc
                ? aTitle.localeCompare(bTitle)
                : bTitle.localeCompare(aTitle);
        }
    });

    // 获取上传队列项的状态文本
    const getQueueItemStatusText = (status: string, progress: number) => {
        switch (status) {
            case 'pending': return '等待上传...';
            case 'uploading': return `上传中 ${progress}%`;
            case 'processing': return `处理中 ${progress}%`;
            case 'completed': return '上传完成';
            case 'error': return '上传失败';
            default: return '未知状态';
        }
    };

    // 获取队列项状态的颜色类名
    const getQueueItemStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'text-gray-500 dark:text-gray-400';
            case 'uploading': return 'text-blue-500 dark:text-blue-400';
            case 'processing': return 'text-blue-500 dark:text-blue-400';
            case 'completed': return 'text-green-500 dark:text-green-400';
            case 'error': return 'text-red-500 dark:text-red-400';
            default: return 'text-gray-500 dark:text-gray-400';
        }
    };

    // 取消上传队列中的文件
    const handleCancelUpload = (queueId: string) => {
        if (confirm('确定要取消这个上传任务吗？')) {
            removeFromUploadQueue(queueId);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-900 min-h-screen">
            {/* 顶部控制栏 - 紧凑版 */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">文档管理</h1>
                    <label className="cursor-pointer bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                        <FontAwesomeIcon icon={faUpload as IconProp} className="mr-1.5" />
                        上传文档
                        <input type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt" />
                    </label>
                </div>

                {/* 紧凑的过滤和搜索栏 */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* 存储空间 - 小巧版 */}
                    {storageStatus && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-3 py-1.5 flex items-center text-xs flex-shrink-0">
                            <span className="text-gray-500 dark:text-gray-400 mr-2">存储:</span>
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mr-2">
                                <div
                                    className={`h-1.5 rounded-full ${storageStatus.usage_percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${storageStatus.usage_percentage}%` }}
                                ></div>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {storageStatus.usage_percentage.toFixed(1)}%
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 mx-2">|</span>
                            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                <span className="text-gray-700 dark:text-gray-300">{storageStatus.file_count}</span> 个文件
                            </span>
                        </div>
                    )}

                    {/* 关键字过滤 */}
                    <div className="relative flex-grow max-w-xs">
                        <input
                            type="text"
                            placeholder="按标题过滤..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            value={titleFilter}
                            onChange={(e) => setTitleFilter(e.target.value)}
                        />
                        <FontAwesomeIcon
                            icon={faSearch as IconProp}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"
                        />
                    </div>

                    {/* 排序选择器 */}
                    <div className="flex-shrink-0">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faSort as IconProp} className="text-gray-400 mr-1.5 text-xs" />
                            <select
                                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm border border-gray-300 dark:border-gray-600 rounded-lg py-1.5 pl-2 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                            >
                                <option value="date-desc">最新日期</option>
                                <option value="date-asc">最早日期</option>
                                <option value="size-desc">最大尺寸</option>
                                <option value="size-asc">最小尺寸</option>
                                <option value="title-asc">标题 A-Z</option>
                                <option value="title-desc">标题 Z-A</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* 上传进度条 */}
            {isUploading && (
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {uploadProgress < 5 ? "准备上传..." :
                                uploadProgress < 75 ? "处理文档..." :
                                    uploadProgress < 95 ? "创建索引..." :
                                        "完成"}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
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

            {/* 加载状态 */}
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {/* 文档列表 - 包含上传队列 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* 上传队列项 - 只显示不在文档列表中的队列项 */}
                        {uniqueQueueItems.map((queueItem) => (
                            <div
                                key={queueItem.id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <FontAwesomeIcon
                                            icon={faFileAlt as IconProp}
                                            className="text-2xl text-blue-500"
                                        />
                                        <div>
                                            <h3 className="font-medium text-gray-800 dark:text-white">
                                                {queueItem.metadata?.title || queueItem.file.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {formatFileSize(queueItem.file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    {queueItem.status !== 'completed' && (
                                        <button
                                            onClick={() => handleCancelUpload(queueItem.id)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <FontAwesomeIcon icon={faTrash as IconProp} />
                                        </button>
                                    )}
                                </div>

                                {/* 上传状态和进度条 */}
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-sm ${getQueueItemStatusColor(queueItem.status)}`}>
                                            {getQueueItemStatusText(queueItem.status, queueItem.progress)}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {queueItem.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-300 ${queueItem.status === 'error' ? 'bg-red-500' : 'bg-blue-600'
                                                }`}
                                            style={{ width: `${queueItem.progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* 错误消息 */}
                                {queueItem.error && (
                                    <div className="mt-2 text-sm text-red-500">
                                        错误: {queueItem.error}
                                    </div>
                                )}

                                {/* 当前处理状态消息 */}
                                {queueItem.message && queueItem.status !== 'error' && (
                                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        {queueItem.message}
                                    </div>
                                )}

                                {/* 标签显示 */}
                                {queueItem.metadata?.tags && queueItem.metadata.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {queueItem.metadata.tags.map(tag => (
                                            <span key={tag} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* 已完成的文档 */}
                        {filteredDocuments.map((doc) => (
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
                                                {formatDateDisplay(doc.created_at)}
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
                </>
            )}

            {/* 空状态 - 如果没有文档且上传队列为空 */}
            {!isLoading && filteredDocuments.length === 0 && uniqueQueueItems.length === 0 && (
                <div className="text-center py-8">
                    <FontAwesomeIcon
                        icon={faBook as IconProp}
                        className="text-3xl text-gray-400 mb-3"
                    />
                    <p className="text-gray-500">暂无匹配的文档</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {titleFilter ? "尝试其他关键词" : "上传文档开始管理您的知识库"}
                    </p>
                </div>
            )}

            {/* 显示过滤后的文档数量 - 小型显示 */}
            {filteredDocuments.length > 0 && documents.length !== filteredDocuments.length && (
                <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    显示 {filteredDocuments.length}/{documents.length} 个文档
                    {uniqueQueueItems.length > 0 && ` · ${uniqueQueueItems.length} 个文件正在上传`}
                </div>
            )}
        </div>
    );
}

export default function DocsPage() {
    return (
        <Suspense fallback={<div>正在加载文档页面...</div>}>
            <DocumentProvider>
                <DocsPageContent />
            </DocumentProvider>
        </Suspense>
    );
} 