'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useApiBase } from '@/hooks/useApiBase';
import { useMessage } from '@/hooks/useMessage';

// 文档接口
export interface Document {
    document_id: string;
    original_name: string;
    size: number;
    type: string;
    extension: string;
    created_at: number;
    updated_at: number;
    status: 'active' | 'archived' | 'processing' | 'error';
    download_url: string | null;
    title: string;
    description: string;
    tags: string[];
    process_stage?: string;
    is_processing?: boolean;
    has_markdown: boolean;
    has_chunks: boolean;
    chunks_count?: number;
    has_embeddings?: boolean;
    source_type: 'local' | 'remote';
    source_url: string;
    [key: string]: any; // 保留扩展字段
}

// 存储状态接口
export interface StorageStatus {
    used: number;
    limit: number;
    available: number;
    usage_percentage: number;
    file_count: number;
    last_updated: number;
}

// 文件上传元数据
export interface FileMetadata {
    title?: string;
    description?: string;
    tags?: string[];
}

// 文档元数据更新接口
export interface DocumentMetadataUpdate {
    title?: string;
    description?: string;
    tags?: string[];
    extra_fields?: Record<string, any>;
}

// 文档块接口
export interface DocumentChunk {
    document_id: string;
    chunk_index: number;
    content: string;
    distance: number;
    document: {
        document_id: string;
        title: string;
        original_name: string;
        type: string;
        created_at: number;
        extension: string;
    };
    metadata: {
        document_id: string;
        title: string;
        document_type: string;
        index: number;
        total_chunks: number;
        next_index: number | null;
        prev_index: number | null;
        chunk_title: string;
    };
}

// 简化的上下文类型
interface DocumentContextType {
    // 全局状态
    documents: Document[];
    currentDocument: Document | null;
    isLoading: boolean;
    isUploading: boolean;
    isSearching: boolean;
    storageStatus: StorageStatus | null;

    // 核心操作
    loadDocuments: () => Promise<Document[]>;
    loadDocument: (id: string) => Promise<Document | null>;
    loadChunks: (id: string) => Promise<DocumentChunk[]>;
    uploadDocument: (file: File, metadata?: FileMetadata) => Promise<string | null>;
    bookmarkRemoteFile: (url: string, metadata?: FileMetadata) => Promise<string | null>;
    deleteDocument: (id: string) => Promise<boolean>;
    updateDocumentMetadata: (id: string, metadata: DocumentMetadataUpdate) => Promise<Document | null>;
    downloadDocument: (fileId: string) => Promise<boolean>;
    getStorageStatus: () => Promise<StorageStatus>;
    searchChunks: (query: string, docId?: string, limit?: number) => Promise<DocumentChunk[]>;
    convertToMarkdown: (document_id: string) => Promise<boolean>;
    generateChunks: (document_id: string) => Promise<boolean>;
    indexDocument: (document_id: string) => Promise<boolean>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
    const { API_BASE_URL } = useApiBase();
    const { showMessage } = useMessage();

    // 状态
    const [documents, setDocuments] = useState<Document[]>([]);
    const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);

    // 加载所有文档
    const loadDocuments = async (): Promise<Document[]> => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/documents`, {
                credentials: 'include'
            });
            const data = await response.json();

            // 直接使用后端返回数据
            setDocuments(data);
            return data;
        } catch (error) {
            console.error('加载文档失败:', error);
            showMessage?.({ type: 'error', content: '加载文档列表失败' });
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    // 加载单个文档
    const loadDocument = async (id: string): Promise<Document | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('获取文档详情失败');
            const data = await response.json();
            setCurrentDocument(data);
            return data;
        } catch (error) {
            console.error('加载文档详情失败:', error);
            showMessage?.({ type: 'error', content: '加载文档详情失败' });
            return null;
        }
    };

    // 加载文档切片
    const loadChunks = async (id: string): Promise<DocumentChunk[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${id}/chunks`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('加载文档切片失败');
            const data = await response.json();

            // 检查返回的数据结构并提取chunks数组
            if (data && data.success && Array.isArray(data.chunks)) {
                return data.chunks;
            } else {
                console.error('API返回的切片数据格式不正确:', data);
                return [];
            }
        } catch (error) {
            console.error('加载文档切片失败:', error);
            return [];
        }
    };

    // 上传文档
    const uploadDocument = async (file: File, metadata?: FileMetadata): Promise<string | null> => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (metadata?.title) formData.append('title', metadata.title);
            if (metadata?.description) formData.append('description', metadata.description);
            if (metadata?.tags && metadata.tags.length > 0) formData.append('tags', metadata.tags.join(','));

            const response = await fetch(`${API_BASE_URL}/documents/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '上传失败');
                throw new Error(errorText);
            }

            const data = await response.json();
            const fileId = data.id || data.file_id;

            showMessage?.({ type: 'success', content: '文件上传成功' });

            // 刷新文档列表
            await loadDocuments();

            return fileId;
        } catch (error: any) {
            console.error('上传文档失败:', error);
            showMessage?.({ type: 'error', content: `上传失败: ${error.message || '未知错误'}` });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    // 收藏远程文件
    const bookmarkRemoteFile = async (url: string, metadata?: FileMetadata): Promise<string | null> => {
        setIsUploading(true);
        try {
            const payload = {
                url,
                filename: metadata?.title,
                title: metadata?.title,
                description: metadata?.description,
                tags: metadata?.tags
            };

            const response = await fetch(`${API_BASE_URL}/documents/bookmark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '收藏失败');
                throw new Error(errorText);
            }

            const data = await response.json();
            const fileId = data.id || data.file_id;

            showMessage?.({ type: 'success', content: '远程文件收藏成功' });

            // 刷新文档列表
            await loadDocuments();

            return fileId;
        } catch (error: any) {
            console.error('收藏远程文件失败:', error);
            showMessage?.({ type: 'error', content: `收藏失败: ${error.message || '未知错误'}` });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    // 删除文档
    const deleteDocument = async (document_id: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${document_id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('删除文档失败');

            // 从本地状态移除
            setDocuments(prev => prev.filter(doc => doc.document_id !== document_id));
            if (currentDocument?.document_id === document_id) setCurrentDocument(null);

            showMessage?.({ type: 'success', content: '文档已删除' });
            return true;
        } catch (error) {
            console.error('删除文档失败:', error);
            showMessage?.({ type: 'error', content: '删除文档失败' });
            return false;
        }
    };

    // 更新文档元数据
    const updateDocumentMetadata = async (id: string, metadata: DocumentMetadataUpdate): Promise<Document | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metadata),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('更新文档元数据失败');

            const updatedDoc = await response.json();

            // 更新本地状态
            setDocuments(prev => prev.map(doc => doc.document_id === id ? updatedDoc : doc));
            if (currentDocument?.document_id === id) setCurrentDocument(updatedDoc);

            showMessage?.({ type: 'success', content: '文档信息已更新' });
            return updatedDoc;
        } catch (error) {
            console.error('更新文档元数据失败:', error);
            showMessage?.({ type: 'error', content: '更新文档信息失败' });
            return null;
        }
    };

    // 下载文档
    const downloadDocument = async (document_id: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${document_id}/download`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('下载文档失败');

            // 获取文件名
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'downloaded-file';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('下载文档失败:', error);
            showMessage?.({ type: 'error', content: '下载文档失败' });
            return false;
        }
    };

    // 获取存储状态
    const getStorageStatus = async (): Promise<StorageStatus> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/storage/status`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('获取存储状态失败');

            const data = await response.json();
            setStorageStatus(data);
            return data;
        } catch (error) {
            console.error('获取存储状态失败:', error);
            // 返回默认值
            const defaultStatus = {
                used: 0,
                limit: 1000 * 1024 * 1024, // 1GB
                available: 1000 * 1024 * 1024,
                usage_percentage: 0,
                file_count: 0,
                last_updated: Date.now()
            };
            setStorageStatus(defaultStatus);
            return defaultStatus;
        }
    };

    // 搜索文档切片
    const searchChunks = async (query: string, docId?: string, limit?: number): Promise<DocumentChunk[]> => {
        if (!query.trim()) {
            setIsSearching(false);
            return [];
        }

        setIsSearching(true);
        try {
            let url = `${API_BASE_URL}/documents/search?query=${encodeURIComponent(query)}`;
            if (docId) {
                url += `&document_id=${encodeURIComponent(docId)}`;
            }
            if (limit) {
                url += `&limit=${limit}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('搜索失败');

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('搜索失败:', error);
            return [];
        } finally {
            setIsSearching(false);
        }
    };

    // 将文档转换为Markdown
    const convertToMarkdown = async (document_id: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${document_id}/convert`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('转换失败');

            showMessage?.({ type: 'success', content: '文档转换已启动' });

            // 刷新文档
            await loadDocument(document_id);
            return true;
        } catch (error) {
            console.error('转换失败:', error);
            showMessage?.({ type: 'error', content: '文档转换失败' });
            return false;
        }
    };

    // 文档切片处理
    const generateChunks = async (document_id: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${document_id}/chunks`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('生成切片失败');

            showMessage?.({ type: 'success', content: '文档分片已启动' });

            // 刷新文档
            await loadDocument(document_id);
            return true;
        } catch (error) {
            console.error('生成切片失败:', error);
            showMessage?.({ type: 'error', content: '文档分片失败' });
            return false;
        }
    };

    // 添加到向量索引
    const indexDocument = async (document_id: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${document_id}/index`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('向量索引失败');

            showMessage?.({ type: 'success', content: '文档已添加到向量索引' });

            // 刷新文档
            await loadDocument(document_id);
            return true;
        } catch (error) {
            console.error('向量索引失败:', error);
            showMessage?.({ type: 'error', content: '向量索引失败' });
            return false;
        }
    };

    return (
        <DocumentContext.Provider
            value={{
                documents,
                currentDocument,
                isLoading,
                isUploading,
                isSearching,
                storageStatus,
                loadDocuments,
                loadDocument,
                loadChunks,
                uploadDocument,
                bookmarkRemoteFile,
                deleteDocument,
                updateDocumentMetadata,
                downloadDocument,
                getStorageStatus,
                searchChunks,
                convertToMarkdown,
                generateChunks,
                indexDocument,
            }}
        >
            {children}
        </DocumentContext.Provider>
    );
}

export function useDocument() {
    const context = useContext(DocumentContext);
    if (context === undefined) {
        throw new Error('useDocument must be used within a DocumentProvider');
    }
    return context;
} 