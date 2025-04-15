'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/utils/config';

// 文档块接口
interface DocumentChunk {
    id: string;
    content: string;
    sequence: number;
    created_at: string;
}

// 更新的文档接口，匹配后台API
interface Document {
    id: string;
    original_name: string;  // 从原来的title改为original_name
    title: string;          // 添加title字段
    description: string;
    size: number;           // 添加文件大小
    type: string;           // 改为字符串类型，支持更多文件类型
    extension: string;      // 添加文件扩展名
    created_at: string;
    updated_at: string;     // 添加更新时间
    download_url: string;   // 添加下载链接
    preview_url: string;    // 添加预览链接
    tags: string[];         // 添加标签
    chunks_count?: number;  // 改为可选
    status?: string;        // 添加文件状态
    custom_metadata?: Record<string, any>; // 添加自定义元数据
}

// 文件元数据更新接口
interface DocumentMetadataUpdate {
    title?: string;
    description?: string;
    tags?: string[];
    custom_metadata?: Record<string, any>;
}

// 文件处理请求接口
interface DocumentProcessRequest {
    process_type: string;
    options?: Record<string, any>;
}

// 存储状态接口
interface StorageStatus {
    used: number;
    limit: number;
    available: number;
    usage_percentage: number;
    file_count: number;
    last_updated: number;
}

// 添加文档转换接口
interface DocumentConvertResponse {
    id: string;
    success: boolean;
    message: string;
}

// 更新的上下文类型
interface DocumentContextType {
    documents: Document[];
    currentDocument: Document | null;
    chunks: DocumentChunk[];
    currentChunkIndex: number;
    isLoading: boolean;
    isUploading: boolean;
    uploadProgress: number;
    searchResults: DocumentChunk[];
    isSearching: boolean;
    storageStatus: StorageStatus | null;  // 添加存储状态
    loadDocuments: (includeDeleted?: boolean) => Promise<void>;
    loadDocument: (id: string) => Promise<void>;
    loadChunks: (id: string) => Promise<void>;
    uploadDocument: (file: File, metadata?: { title?: string, description?: string, tags?: string[] }) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    updateDocumentMetadata: (id: string, metadata: DocumentMetadataUpdate) => Promise<void>;  // 添加更新元数据
    downloadDocument: (id: string) => Promise<void>;  // 添加下载文档
    processDocument: (id: string, request: DocumentProcessRequest) => Promise<any>;  // 添加处理文档
    getStorageStatus: () => Promise<StorageStatus>;  // 获取存储状态
    searchDocuments: (query: string) => Promise<void>;
    searchChunks: (docId: string, query: string) => Promise<void>;
    setCurrentChunkIndex: (index: number) => void;
    setUploadProgress: (progress: number) => void;
    convertDocument: (id: string) => Promise<DocumentConvertResponse>;  // 添加文档转换功能
    getMarkdownContent: (id: string) => Promise<string>; // 获取Markdown内容
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
    const [chunks, setChunks] = useState<DocumentChunk[]>([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);  // 添加存储状态

    // 加载文档列表
    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const api_url = `${API_BASE_URL}/oculith/files`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('加载文档失败');
            const data = await res.json();
            setDocuments(data);
        } catch (error) {
            console.error('加载文档失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 加载单个文档
    const loadDocument = async (id: string) => {
        setIsLoading(true);
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('加载文档失败');
            const data = await res.json();
            setCurrentDocument(data);
        } catch (error) {
            console.error('加载文档失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 加载文档切片
    const loadChunks = async (id: string) => {
        setIsLoading(true);
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}/chunks`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('加载切片失败');
            const data = await res.json();
            setChunks(data);
        } catch (error) {
            console.error('加载切片失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 上传文档
    const uploadDocument = async (file: File, metadata?: { title?: string, description?: string, tags?: string[] }) => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // 添加可选的元数据
            if (metadata?.title) {
                formData.append('title', metadata.title);
            }

            if (metadata?.description) {
                formData.append('description', metadata.description);
            }

            if (metadata?.tags) {
                formData.append('tags', JSON.stringify(metadata.tags));
            }

            const api_url = `${API_BASE_URL}/oculith/local/upload`;
            const res = await fetch(api_url, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!res.ok) throw new Error('上传失败');

            const data = await res.json();
            setDocuments(prev => [...prev, data]);
        } catch (error) {
            console.error('上传失败:', error);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // 删除文档
    const deleteDocument = async (id: string) => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}`;
            const res = await fetch(api_url, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('删除失败');
            setDocuments(prev => prev.filter(doc => doc.id !== id));
            if (currentDocument?.id === id) {
                setCurrentDocument(null);
            }
        } catch (error) {
            console.error('删除失败:', error);
        }
    };

    // 更新文档元数据
    const updateDocumentMetadata = async (id: string, metadata: DocumentMetadataUpdate) => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}`;
            const res = await fetch(api_url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metadata),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('更新元数据失败');

            const data = await res.json();

            // 更新文档列表和当前文档
            setDocuments(prev => prev.map(doc => doc.id === id ? data : doc));
            if (currentDocument?.id === id) {
                setCurrentDocument(data);
            }

            return data;
        } catch (error) {
            console.error('更新元数据失败:', error);
            throw error;
        }
    };

    // 下载文档
    const downloadDocument = async (id: string) => {
        try {
            // 创建一个隐藏的a标签进行下载
            const link = document.createElement('a');
            link.href = `${API_BASE_URL}/oculith/files/${id}/download`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('下载文档失败:', error);
            throw error;
        }
    };

    // 流式下载文档
    const streamDocument = async (id: string) => {
        try {
            // 创建一个隐藏的a标签进行下载
            const link = document.createElement('a');
            link.href = `${API_BASE_URL}/oculith/files/${id}/stream`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('流式下载文档失败:', error);
            throw error;
        }
    };

    // 处理文档
    const processDocument = async (id: string, request: DocumentProcessRequest) => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}/process`;
            const res = await fetch(api_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('处理文档失败');

            return await res.json();
        } catch (error) {
            console.error('处理文档失败:', error);
            throw error;
        }
    };

    // 获取存储状态
    const getStorageStatus = async () => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/storage/status`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('获取存储状态失败');

            const data = await res.json();
            setStorageStatus(data);
            return data;
        } catch (error) {
            console.error('获取存储状态失败:', error);
            // 失败时返回模拟数据作为备用
            const mockData: StorageStatus = {
                used: 1024 * 1024 * 50,
                limit: 1024 * 1024 * 1024,
                available: 1024 * 1024 * 1024 - 1024 * 1024 * 50,
                usage_percentage: 4.88,
                file_count: documents.length,
                last_updated: Date.now() / 1000
            };
            setStorageStatus(mockData);
            return mockData;
        }
    };

    // 搜索文档
    const searchDocuments = async (query: string) => {
        if (!query.trim()) {
            loadDocuments();
            return;
        }

        setIsLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('query', query);
            formData.append('limit', '20');

            const api_url = `${API_BASE_URL}/oculith/search/documents`;
            const res = await fetch(api_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                credentials: 'include'
            });

            if (!res.ok) throw new Error('搜索失败');
            const data = await res.json();
            setDocuments(data);
        } catch (error) {
            console.error('搜索失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 搜索文档切片
    const searchChunks = async (docId: string, query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const formData = new URLSearchParams();
            formData.append('query', query);
            if (docId) {
                formData.append('file_id', docId);
            }
            formData.append('limit', '10');

            const api_url = `${API_BASE_URL}/oculith/search/chunks`;
            const res = await fetch(api_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                credentials: 'include'
            });

            if (!res.ok) throw new Error('搜索失败');
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error('搜索失败:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 添加新功能：文档转换
    const convertDocument = async (id: string): Promise<DocumentConvertResponse> => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}/convert`;
            const res = await fetch(api_url, {
                method: 'POST',
                credentials: 'include'
            });

            if (!res.ok) throw new Error('文档转换失败');
            return await res.json();
        } catch (error) {
            console.error('文档转换失败:', error);
            throw error;
        }
    };

    // 添加新功能：获取Markdown内容
    const getMarkdownContent = async (id: string): Promise<string> => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}/markdown`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('获取Markdown内容失败');
            return await res.json();
        } catch (error) {
            console.error('获取Markdown内容失败:', error);
            throw error;
        }
    };

    return (
        <DocumentContext.Provider
            value={{
                documents,
                currentDocument,
                chunks,
                currentChunkIndex,
                isLoading,
                isUploading,
                uploadProgress,
                searchResults,
                isSearching,
                storageStatus,
                loadDocuments,
                loadDocument,
                loadChunks,
                uploadDocument,
                deleteDocument,
                updateDocumentMetadata,
                downloadDocument,
                processDocument,
                getStorageStatus,
                searchDocuments,
                searchChunks,
                setCurrentChunkIndex,
                setUploadProgress,
                convertDocument,
                getMarkdownContent
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