'use client';

import { useState, useEffect, Suspense } from 'react';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faBook, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { useDocument, adaptTimestamp } from '@/context/DocumentContext';
import { DocumentProvider, Document } from '@/context/DocumentContext';
import {
    DocumentToolbar,
    DocumentMetadataForm,
    DocumentCard
} from '@/components/Document';

function DocsPageContent() {
    const { changeCurrentPath } = useAuth();
    const {
        documents,
        storageStatus,
        loadDocuments,
        uploadDocument,
        deleteDocument,
        downloadDocument,
        getStorageStatus,
        checkDocumentStatus,
        retryDocumentProcessing,
        updateDocumentMetadata
    } = useDocument();
    const [uploadMetadata, setUploadMetadata] = useState({
        title: '',
        description: '',
        tags: [] as string[]
    });
    const [showMetadataForm, setShowMetadataForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);

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

    const handleEditMetadata = (doc: Document) => {
        setUploadMetadata({
            title: doc.title,
            description: doc.description,
            tags: doc.tags
        });
        setEditingDoc(doc);
        setShowMetadataForm(true);
    };

    const handleUpdateMetadata = async () => {
        if (!editingDoc) return;

        await updateDocumentMetadata(editingDoc.document_id, {
            title: uploadMetadata.title,
            description: uploadMetadata.description,
            tags: uploadMetadata.tags
        });

        setShowMetadataForm(false);
        setEditingDoc(null);
        setUploadMetadata({ title: '', description: '', tags: [] });
    };

    return (
        <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-900 min-h-screen">
            <DocumentToolbar
                storageStatus={storageStatus}
                titleFilter={titleFilter}
                setTitleFilter={setTitleFilter}
                sortOption={sortOption}
                setSortOption={setSortOption}
                onFileSelect={handleFileSelect}
            />

            {showMetadataForm && (
                <DocumentMetadataForm
                    file={selectedFile}
                    metadata={uploadMetadata}
                    onMetadataChange={setUploadMetadata}
                    onCancel={() => {
                        setShowMetadataForm(false);
                        setSelectedFile(null);
                        setEditingDoc(null);
                    }}
                    onSubmit={editingDoc ? handleUpdateMetadata : handleFileUpload}
                    isEditing={!!editingDoc}
                />
            )}

            {/* 文档列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                    <DocumentCard
                        key={doc.document_id}
                        doc={doc}
                        onEdit={handleEditMetadata}
                        onDelete={handleDelete}
                        onDownload={downloadDocument}
                        onRetry={retryDocumentProcessing}
                    />
                ))}
            </div>
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