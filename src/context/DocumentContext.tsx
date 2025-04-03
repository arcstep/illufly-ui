'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DocumentChunk {
    id: string;
    content: string;
    sequence: number;
    created_at: string;
}

interface Document {
    id: string;
    title: string;
    description: string;
    type: 'pdf' | 'doc' | 'docx' | 'txt';
    created_at: string;
    chunks_count: number;
    file_url?: string;
}

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
    loadDocuments: () => Promise<void>;
    loadDocument: (id: string) => Promise<void>;
    loadChunks: (id: string) => Promise<void>;
    uploadDocument: (file: File) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    searchDocuments: (query: string) => Promise<void>;
    searchChunks: (docId: string, query: string) => Promise<void>;
    setCurrentChunkIndex: (index: number) => void;
    setUploadProgress: (progress: number) => void;
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

    // 加载文档列表
    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/docs', {
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
            const res = await fetch(`/api/docs/${id}`, {
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
            const res = await fetch(`/api/docs/${id}/chunks`, {
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
    const uploadDocument = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/docs/upload', {
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
            const res = await fetch(`/api/docs/${id}`, {
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

    // 搜索文档
    const searchDocuments = async (query: string) => {
        if (!query.trim()) {
            loadDocuments();
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}`, {
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
            const res = await fetch(`/api/docs/${docId}/search?q=${encodeURIComponent(query)}`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('搜索失败');
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error('搜索失败:', error);
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
                loadDocuments,
                loadDocument,
                loadChunks,
                uploadDocument,
                deleteDocument,
                searchDocuments,
                searchChunks,
                setCurrentChunkIndex,
                setUploadProgress
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