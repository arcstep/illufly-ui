'use client';

import { useState, useEffect, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faSearch, faTrash, faBook, faFileAlt, faDownload, faSort, faCheckCircle, faCube, faLink, faRedo, faExternalLinkAlt, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { faMarkdown } from '@fortawesome/free-brands-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { useDocument, adaptTimestamp } from '@/context/DocumentContext';
import { DocumentProvider } from '@/context/DocumentContext';

function DocsPageContent() {
    const { changeCurrentPath } = useAuth();
    const {
        documents,
        isLoading,
        isUploading,
        storageStatus,
        loadDocuments,
        uploadDocument,
        deleteDocument,
        downloadDocument,
        getStorageStatus,
        checkDocumentStatus,
        retryDocumentProcessing
    } = useDocument();
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

    useEffect(() => {
        const interval = setInterval(() => {
            documents.forEach(doc => {
                if (doc.status === 'processing') {
                    checkDocumentStatus(doc.document_id);
                }
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [documents]);

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
    const handleDelete = async (document_id: string) => {
        if (!confirm('确定要删除这个文档吗？')) return;
        await deleteDocument(document_id);
        getStorageStatus(); // 刷新存储状态
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

    // 修改过滤和排序后的文档列表
    const filteredDocuments = documents.filter(doc => {
        // 只保留标题关键字过滤
        if (titleFilter && !(doc.title || doc.original_name || '未命名文档').toLowerCase().includes(titleFilter.toLowerCase())) {
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
            const aTitle = a.title || a.original_name || '未命名文档';
            const bTitle = b.title || b.original_name || '未命名文档';
            return isAsc
                ? aTitle.localeCompare(bTitle)
                : bTitle.localeCompare(aTitle);
        }
    });

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
                    {/* 文档列表 - 仅显示已上传文档 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocuments.map((doc, index) => {
                            // 双重校验
                            if (documents.slice(0, index).some(d => d.document_id === doc.document_id)) {
                                console.error(`发现重复文档ID: ${doc.document_id}，标题：${doc.title}`);
                                return null; // 暂时隐藏重复项
                            }

                            return (
                                <div key={doc.document_id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                                    {/* 顶部元数据栏 */}
                                    <div className="flex justify-between items-start mb-2">
                                        {/* 文档类型标识 */}
                                        <span
                                            title={`文件类型: ${doc.type.toUpperCase()}\n原始文件名: ${doc.original_name}`}
                                            className="text-xs px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300"
                                        >
                                            {doc.type.toUpperCase() || '文件'} · {formatFileSize(doc.size)}
                                        </span>

                                        {/* 处理状态指示器 */}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${doc.status === 'processing' ? 'bg-yellow-100 dark:bg-yellow-900/30 animate-pulse' :
                                                doc.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                                                    'bg-green-100 dark:bg-green-900/30'
                                                }`}>
                                                {doc.status === 'processing' ? '处理中' : doc.status === 'error' ? '处理失败' : '可用'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 核心信息区 */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-800 dark:text-white truncate">
                                                {doc.title || doc.original_name || '未命名文档'}
                                                {doc.source_type === 'remote' && (
                                                    <span className="ml-2 text-blue-500 text-sm" title="远程资源">
                                                        <FontAwesomeIcon icon={faLink} />
                                                    </span>
                                                )}
                                            </h3>

                                            {/* 转换状态标签 */}
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {doc.converted && (
                                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1 text-xs" />
                                                        已转换
                                                    </span>
                                                )}
                                                {doc.has_markdown && (
                                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                                                        <FontAwesomeIcon icon={faMarkdown} className="mr-1" />
                                                        Markdown
                                                    </span>
                                                )}
                                                {doc.has_chunks && (
                                                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                                                        <FontAwesomeIcon icon={faCube} className="mr-1" />
                                                        已分片 ({doc.chunks_count || 0})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 操作按钮组 */}
                                        <div className="flex items-center gap-2 pl-2">
                                            {doc.source_type === 'local' && doc.download_url && (
                                                <button
                                                    onClick={() => downloadDocument(doc.document_id)}
                                                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400"
                                                    title="下载原始文件"
                                                >
                                                    <FontAwesomeIcon icon={faDownload} />
                                                </button>
                                            )}
                                            {doc.source_type === 'remote' && (
                                                <a
                                                    href={doc.source_url}
                                                    target="_blank"
                                                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400"
                                                    title="查看原始链接"
                                                >
                                                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDelete(doc.document_id)}
                                                className="text-gray-500 hover:text-red-600 dark:text-gray-400"
                                                title="删除文档"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 时间线信息 */}
                                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                                        <div className="flex justify-between">
                                            <span>创建时间: {formatDateDisplay(doc.created_at)}</span>
                                            <span>更新时间: {formatDateDisplay(doc.updated_at)}</span>
                                        </div>
                                        {doc.status === 'processing' && (
                                            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                                                <FontAwesomeIcon icon={faSyncAlt} className="animate-spin mr-1" />
                                                <span>正在处理中，剩余约 {(doc.estimated_time || 0).toFixed(0)}秒</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 错误状态详情 */}
                                    {doc.status === 'error' && (
                                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300">
                                            {doc.error_message || '文档处理失败'}
                                            <button
                                                onClick={() => retryDocumentProcessing(doc.document_id)}
                                                className="ml-2 text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                            >
                                                重试处理
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* 空状态 - 仅检查文档列表 */}
            {!isLoading && filteredDocuments.length === 0 && (
                <div className="text-center py-8">
                    <FontAwesomeIcon
                        icon={faBook as IconProp}
                        className="text-3xl text-gray-400 mb-3"
                    />
                    <p className="text-gray-500">暂无文档</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {titleFilter ? "尝试其他关键词" : "上传文档开始管理您的知识库"}
                    </p>
                </div>
            )}

            {/* 显示过滤后的文档数量 */}
            {filteredDocuments.length > 0 && documents.length !== filteredDocuments.length && (
                <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    显示 {filteredDocuments.length}/{documents.length} 个文档
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