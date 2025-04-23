import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiBase } from './useApiBase';
import { useMessage } from './useMessage';

// 文档接口定义
export interface Document {
    id: string;
    original_name: string;
    title: string;
    description: string;
    size: number;
    type: string;
    extension: string;
    created_at: string;
    updated_at: string;
    download_url: string;
    preview_url: string;
    tags: string[];
    chunks_count?: number;
    status?: string; // API返回的状态
    processing_progress?: number; // 可选的处理进度
    processing_message?: string; // 可选的处理消息
    custom_metadata?: Record<string, any>;
}

// 文档元数据更新接口
export interface DocumentMetadataUpdate {
    title?: string;
    description?: string;
    tags?: string[];
    custom_metadata?: Record<string, any>;
}

/**
 * 文档列表管理Hook - 负责文档的加载、搜索、删除等功能
 */
export function useDocumentList() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
    const processingFilesRef = useRef<Map<string, EventSource>>(new Map());

    const { API_BASE_URL } = useApiBase();
    const { showMessage } = useMessage();

    // 更新文档状态的辅助函数
    const updateDocumentState = useCallback((fileId: string, updates: Partial<Document>) => {
        setDocuments(prevDocs =>
            prevDocs.map(doc =>
                doc.id === fileId ? { ...doc, ...updates } : doc
            )
        );
    }, []);

    // 停止监控指定文件
    const stopMonitoring = useCallback((fileId: string) => {
        const eventSource = processingFilesRef.current.get(fileId);
        if (eventSource) {
            console.log(`[SSE] 停止监控: ${fileId}`);
            eventSource.close();
            processingFilesRef.current.delete(fileId);
        }
    }, []);

    // 监控文件处理进度
    const monitorProcessing = useCallback((fileId: string) => {
        // 如果已经在监控，则不再重复创建
        if (processingFilesRef.current.has(fileId)) {
            console.log(`[SSE] 文件 ${fileId} 已在监控中`);
            return;
        }

        // console.log(`[SSE] 开始监控: ${fileId}`);
        // const eventSource = new EventSource(`${API_BASE_URL}/oculith/files/${fileId}/process/stream`, {
        //     withCredentials: true
        // });

        // processingFilesRef.current.set(fileId, eventSource);

        // eventSource.onmessage = (event) => {
        //     try {
        //         const data = JSON.parse(event.data);
        //         console.log(`[SSE] 收到状态更新 for ${fileId}:`, data);

        //         // 更新文档列表中的状态
        //         updateDocumentState(fileId, {
        //             status: data.status,
        //             processing_progress: data.progress,
        //             processing_message: data.message,
        //         });

        //         // 如果处理完成或失败，停止监控
        //         if (data.status === 'completed' || data.status === 'failed') {
        //             stopMonitoring(fileId);
        //         }
        //     } catch (error) {
        //         console.error(`[SSE] 解析事件数据失败 for ${fileId}:`, error);
        // }
        // };

        // eventSource.onerror = (error) => {
        //     console.error(`[SSE] 监控错误 for ${fileId}:`, error);
        //     updateDocumentState(fileId, {
        //         status: 'failed', // 将其标记为失败
        //         processing_message: '监控连接失败'
        //     });
        //     stopMonitoring(fileId);
        // };

    }, [API_BASE_URL, updateDocumentState, stopMonitoring]);

    // 加载文档列表并启动监控
    const loadDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const api_url = `${API_BASE_URL}/oculith/files`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('加载文档失败');

            const data: Document[] = await res.json();
            console.log(`[文档管理] 从API加载了${data.length}个文档`);

            // 更新文档列表
            setDocuments(data);

            // 停止监控不再需要的文件
            const currentFileIds = new Set(data.map(doc => doc.id));
            processingFilesRef.current.forEach((source, fileId) => {
                if (!currentFileIds.has(fileId)) {
                    stopMonitoring(fileId);
                }
            });

            // 启动对未完成文件的监控
            data.forEach(doc => {
                if (doc.status && doc.status !== 'completed' && doc.status !== 'failed') {
                    monitorProcessing(doc.id);
                }
            });

            return data;
        } catch (error) {
            console.error('加载文档失败:', error);
            showMessage?.({
                type: 'error',
                content: '加载文档列表失败'
            });
        } finally {
            setIsLoading(false);
        }

        return [];
    }, [API_BASE_URL, showMessage, monitorProcessing, stopMonitoring]);

    // 组件卸载时清理所有SSE连接
    useEffect(() => {
        return () => {
            console.log('[SSE] 组件卸载，清理所有监控');
            processingFilesRef.current.forEach((source, fileId) => {
                stopMonitoring(fileId);
            });
        };
    }, [stopMonitoring]);

    // 加载单个文档
    const loadDocument = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}`; // 确认路径
            const res = await fetch(api_url, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('加载文档失败');

            const data = await res.json();
            setCurrentDocument(data);

            // 如果加载的文档正在处理，也启动监控
            if (data.status && data.status !== 'completed' && data.status !== 'failed') {
                monitorProcessing(data.id);
            }

            return data;
        } catch (error) {
            console.error('加载文档失败:', error);
            showMessage?.({
                type: 'error',
                content: '加载文档详情失败'
            });
        } finally {
            setIsLoading(false);
        }

        return null;
    }, [API_BASE_URL, showMessage, monitorProcessing]);

    // 删除文档
    const deleteDocument = useCallback(async (id: string) => {
        stopMonitoring(id); // 删除前停止监控
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}`; // 确认路径
            const res = await fetch(api_url, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!res.ok) throw new Error('删除失败');

            setDocuments(prev => prev.filter(doc => doc.id !== id));

            if (currentDocument?.id === id) {
                setCurrentDocument(null);
            }

            showMessage?.({
                type: 'success',
                content: '文档已删除'
            });

            return true;
        } catch (error) {
            console.error('删除失败:', error);
            showMessage?.({
                type: 'error',
                content: '删除文档失败'
            });
            return false;
        }
    }, [API_BASE_URL, currentDocument, showMessage, stopMonitoring]);

    // 更新文档元数据
    const updateDocumentMetadata = useCallback(async (id: string, metadata: DocumentMetadataUpdate) => {
        try {
            const api_url = `${API_BASE_URL}/oculith/files/${id}`; // 确认路径
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

            setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...data } : doc));
            if (currentDocument?.id === id) {
                setCurrentDocument(prev => prev ? { ...prev, ...data } : null);
            }

            showMessage?.({
                type: 'success',
                content: '文档信息已更新'
            });

            return data;
        } catch (error) {
            console.error('更新元数据失败:', error);
            showMessage?.({
                type: 'error',
                content: '更新文档信息失败'
            });
            throw error;
        }
    }, [API_BASE_URL, currentDocument, showMessage]);

    // 下载文档
    const downloadDocument = useCallback(async (fileId: string) => {
        console.log(`尝试下载文件: ${fileId}`);
        try {
            const downloadUrl = `${API_BASE_URL}/oculith/files/${fileId}/download`; // 确认路径
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = downloadUrl;
            form.target = '_blank';
            form.style.display = 'none';
            document.body.appendChild(form);
            form.submit();
            setTimeout(() => {
                document.body.removeChild(form);
            }, 1000);
            return true;
        } catch (error) {
            console.error("下载失败:", error);
            showMessage?.({
                type: 'error',
                content: '下载文件失败'
            });
            return false;
        }
    }, [API_BASE_URL, showMessage]);

    // 搜索文档
    const searchDocuments = useCallback(async (query: string) => {
        if (!query.trim()) {
            return loadDocuments();
        }

        setIsLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('query', query);
            formData.append('limit', '20');

            const api_url = `${API_BASE_URL}/oculith/search/documents`; // 确认路径
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

            // 搜索结果通常是静态的，不需要实时监控状态
            // 如果需要，可以在这里添加监控逻辑

            return data;
        } catch (error) {
            console.error('搜索失败:', error);
            showMessage?.({
                type: 'error',
                content: '搜索文档失败'
            });
        } finally {
            setIsLoading(false);
        }

        return [];
    }, [API_BASE_URL, loadDocuments, showMessage]);

    return {
        documents,
        currentDocument,
        isLoading,
        loadDocuments,
        loadDocument,
        deleteDocument,
        updateDocumentMetadata,
        downloadDocument,
        searchDocuments,
        setCurrentDocument,
        monitorProcessing // 暴露监控函数供Context使用
    };
} 