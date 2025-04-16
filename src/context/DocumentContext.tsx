'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useMessage } from '@/hooks/useMessage';
import { useApiBase } from '@/hooks/useApiBase';
import { DocumentWorker } from '@/workers/worker-factory';

// 将函数重命名并更新类型定义
const adaptTimestamp = (timestamp: string | number | Date): Date => {
    if (!timestamp) return new Date(0);

    // 直接返回Date对象
    if (typeof timestamp === 'object' && timestamp instanceof Date) {
        return timestamp;
    }

    // 转换为字符串并移除小数点及小数部分
    const timeStr = String(timestamp).split('.')[0];

    // 处理ISO日期字符串
    if (typeof timestamp === 'string' && isNaN(Number(timestamp)) && timestamp.includes('-')) {
        return new Date(timestamp);
    }

    // 根据位数处理时间戳
    const digits = timeStr.length;

    if (digits <= 10) { // 秒级时间戳
        return new Date(parseInt(timeStr) * 1000);
    } else if (digits <= 13) { // 毫秒级时间戳
        return new Date(parseInt(timeStr));
    } else { // 微秒/纳秒级时间戳
        return new Date(parseInt(timeStr.substring(0, 13)));
    }
};

// 导出时间戳工具
export { adaptTimestamp };

interface FileMetadata {
    name?: string;
    title?: string;
    description?: string;
    tags?: string[];
}

export interface QueuedUpload {
    id: string;
    file: File | { name: string; size: number; type: string; };
    metadata?: {
        title?: string;
        description?: string;
        tags?: string[]
    };
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
    progress: number;
    message?: string;
    error?: string;
    fileId?: string; // 服务器返回的文件ID
    createdAt: number; // 添加到队列的时间戳
}

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
    uploadQueue: QueuedUpload[]; // 添加上传队列
    loadDocuments: (includeDeleted?: boolean) => Promise<void>;
    loadDocument: (id: string) => Promise<void>;
    loadChunks: (id: string) => Promise<void>;
    uploadDocument: (file: File, metadata?: { title?: string, description?: string, tags?: string[] }) => Promise<void>;
    addToUploadQueue: (file: File, metadata?: FileMetadata) => string; // 添加到队列中并返回队列项ID
    removeFromUploadQueue: (id: string) => void; // 从队列中移除
    deleteDocument: (id: string) => Promise<void>;
    updateDocumentMetadata: (id: string, metadata: DocumentMetadataUpdate) => Promise<void>;  // 添加更新元数据
    downloadDocument: (fileId: string) => Promise<void>;  // 添加下载文档
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
    const [isUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);

    // 从sessionStorage恢复队列状态，同时优化恢复逻辑
    const getInitialQueue = (): QueuedUpload[] => {
        if (typeof window === 'undefined') return [];

        try {
            const savedQueue = sessionStorage.getItem('uploadQueue');
            if (savedQueue) {
                const parsedQueue = JSON.parse(savedQueue);
                console.log('从sessionStorage恢复了', parsedQueue.length, '个上传任务');

                // 过滤出有效任务并保留状态
                return parsedQueue.map((item: any) => ({
                    ...item,
                    // 只有pending状态会变成error，其他状态保持不变
                    status: item.status === 'pending' ? 'error' : item.status,
                    error: item.status === 'pending' ? '页面刷新导致上传中断' : item.error,
                    // 确保保留fileId用于恢复
                    fileId: item.fileId || undefined
                }));
            }
        } catch (error) {
            console.error('恢复上传队列失败:', error);
        }
        return [];
    };

    const [uploadQueue, setUploadQueue] = useState<QueuedUpload[]>(getInitialQueue);
    const { API_BASE_URL } = useApiBase();
    const { showMessage } = useMessage();

    // Worker 引用和消息处理
    const [uploadWorker, setUploadWorker] = useState<Worker | null>(null);
    const [requestIdCounter, setRequestIdCounter] = useState(0);
    const pendingRequests = useRef<Map<string, {
        resolve: (value: any) => void,
        reject: (reason?: any) => void,
        queueId?: string
    }>>(new Map());

    // 生成唯一请求ID
    const getNextRequestId = () => {
        const id = `req_${Date.now()}_${requestIdCounter}`;
        setRequestIdCounter(prev => prev + 1);
        return id;
    };

    // 查询文件处理状态
    const fetchFileProcessingStatus = async (fileId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/oculith/files/${fileId}/status`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.log(`获取文件状态失败: ${response.status}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('查询文件处理状态失败:', error);
            return null;
        }
    };

    // 初始化worker并确保它在页面切换间保持活跃
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 不创建新的Worker实例，而是重用之前的
        if (uploadWorker) {
            console.log('重用现有Worker');
            // 如果已经有Worker，只恢复上传状态
            setTimeout(() => {
                if (uploadWorker) {
                    restoreProcessingUploads(uploadWorker);
                }
            }, 1000);
            return;
        }

        const initWorker = async () => {
            try {
                // 使用已导入的API_BASE_URL
                const worker = new Worker(new URL('../workers/upload-worker.ts', import.meta.url));

                // 设置消息处理器 - 修复：传递整个event而不是仅data
                worker.onmessage = (event) => handleWorkerMessage(event);
                worker.onerror = (error) => console.error('Worker错误:', error);

                setUploadWorker(worker);

                // 初始化Worker
                const id = getNextRequestId();
                pendingRequests.current.set(id, {
                    resolve: (result) => console.log('Worker初始化结果:', result),
                    reject: (error) => console.error('Worker初始化失败:', error)
                });

                worker.postMessage({
                    id,
                    action: 'init',
                    payload: { apiBaseUrl: API_BASE_URL }
                });

                // 延迟恢复上传任务
                setTimeout(() => {
                    if (worker) {
                        restoreProcessingUploads(worker);
                    }
                }, 1000);
            } catch (error) {
                console.error('Worker初始化失败:', error);
            }
        };

        initWorker();

        // 关键点：不在组件卸载时终止Worker
        // 这样即使用户离开页面，上传也会继续
        return () => {
            // 不终止Worker: uploadWorker?.terminate();
            // 只清除引用，让Worker继续在后台运行
            setUploadWorker(null);
        };
    }, []);

    // 恢复处理中的上传任务
    const restoreProcessingUploads = (worker: Worker) => {
        // 检查队列中是否有需要恢复的任务
        const activeUploads = uploadQueue.filter(item =>
            (item.status === 'uploading' || item.status === 'processing') && item.fileId);

        if (activeUploads.length === 0) {
            console.log('[恢复上传] 没有需要恢复的活跃上传任务');
            return;
        }

        console.log(`[恢复上传] 尝试恢复${activeUploads.length}个上传任务`);

        // 对每个任务查询状态
        activeUploads.forEach(upload => {
            console.log(`[恢复上传] 恢复任务: ${upload.id}, 文件ID: ${upload.fileId}`);

            const id = getNextRequestId();
            worker.postMessage({
                id,
                action: 'resumeUpload',
                payload: {
                    queueId: upload.id,
                    fileId: upload.fileId
                }
            });

            // 将消息通知用户任务正在后台继续
            updateQueueItem(upload.id, {
                status: 'processing',
                message: '上传任务在后台继续进行...',
            });

            // 获取文件处理状态
            if (upload.fileId) {
                fetchFileProcessingStatus(upload.fileId)
                    .then(status => {
                        if (status) {
                            const isComplete = status.status === 'complete' || status.status === 'completed';
                            updateQueueItem(upload.id, {
                                status: isComplete ? 'completed' : 'processing',
                                progress: status.progress || upload.progress,
                                message: isComplete
                                    ? '处理完成'
                                    : (status.message || '正在继续处理...')
                            });

                            // 如果已完成，加载文件信息
                            if (isComplete && upload.fileId) {
                                fetchFileInfo(upload.fileId)
                                    .then((fileData: Document | null) => {
                                        if (fileData && !documents.some(doc => doc.id === fileData.id)) {
                                            // 只有当文档不在列表中时才添加
                                            setDocuments(prev => [...prev, fileData]);
                                            console.log(`[恢复上传] 文件已完成处理并添加到文档列表: ${fileData.id}`);
                                        }

                                        // 延迟移除已完成的上传项
                                        setTimeout(() => {
                                            removeFromUploadQueue(upload.id);
                                        }, 3000);
                                    })
                                    .catch((error: Error) => {
                                        console.error('[恢复上传] 获取完成文件信息失败:', error);
                                    });
                            }
                        }
                    })
                    .catch((error: Error) => {
                        console.error(`[恢复上传] 获取文件处理状态失败:`, error);
                    });
            }
        });
    };

    // 更新队列中的项目
    const updateQueueItem = (queueId: string, updates: Partial<QueuedUpload>) => {
        setUploadQueue(prevQueue =>
            prevQueue.map(item =>
                item.id === queueId ? { ...item, ...updates } : item
            )
        );
    };

    // 保存队列状态到sessionStorage - 增强版
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 只有队列非空时才保存
        if (uploadQueue.length > 0) {
            try {
                // 准备用于存储的队列数据，确保所有必要字段
                const queueForStorage = uploadQueue.map(item => ({
                    id: item.id,
                    file: {
                        name: item.file.name,
                        size: item.file.size,
                        type: item.file.type
                    },
                    status: item.status,
                    progress: item.progress,
                    message: item.message,
                    error: item.error,
                    fileId: item.fileId,
                    createdAt: item.createdAt,
                    metadata: item.metadata
                }));

                // 保存到sessionStorage
                sessionStorage.setItem('uploadQueue', JSON.stringify(queueForStorage));
                console.log(`保存上传队列: ${queueForStorage.length}个任务`);
            } catch (error) {
                console.error('保存上传队列失败:', error);
            }
        } else {
            // 队列为空时，清除存储
            sessionStorage.removeItem('uploadQueue');
        }
    }, [uploadQueue]);

    // 处理worker消息
    const handleWorkerMessage = (event: MessageEvent) => {
        // 从event.data中解构，而不是直接从event中解构
        const { id, action, success, queueId, ...rest } = event.data || {};

        if (!queueId) return;

        // 根据消息类型更新队列
        switch (action) {
            case 'uploadStatus':
                // 上传状态更新
                setUploadQueue(prev => prev.map(item => {
                    if (item.id === queueId) {
                        return {
                            ...item,
                            ...rest,
                            // 保存文件ID用于恢复
                            fileId: rest.fileId || item.fileId
                        };
                    }
                    return item;
                }));
                break;

            case 'uploadComplete':
                // 上传完成
                setUploadQueue(prev => prev.map(item => {
                    if (item.id === queueId) {
                        return {
                            ...item,
                            ...rest,
                            status: 'completed',
                            progress: 100
                        };
                    }
                    return item;
                }));

                // 显示成功消息
                showMessage({ type: 'success', content: `文件 "${rest.filename || '未命名'}" 上传成功！` });
                break;

            case 'uploadError':
                // 上传错误
                setUploadQueue(prev => prev.map(item => {
                    if (item.id === queueId) {
                        return {
                            ...item,
                            status: 'error',
                            error: rest.error || '上传失败',
                            // 保存文件ID用于恢复
                            fileId: rest.fileId || item.fileId
                        };
                    }
                    return item;
                }));

                // 显示错误消息
                showMessage({ type: 'error', content: `文件 "${rest.filename || '未命名'}" 上传失败: ${rest.error}` });
                break;
        }
    };

    // 添加到上传队列
    const addToUploadQueue = (file: File, metadata?: FileMetadata): string => {
        const id = uuidv4();

        // 创建新的上传项
        const newUpload: QueuedUpload = {
            id,
            file,
            metadata,
            progress: 0,
            status: 'pending',
            createdAt: Date.now() // 记录添加时间
        };

        // 更新队列
        setUploadQueue(prev => [...prev, newUpload]);

        // 启动上传
        startUpload(id, file, metadata);

        return id;
    };

    // 启动上传
    const startUpload = async (id: string, file: File, metadata?: FileMetadata) => {
        try {
            // 更新状态为上传中
            setUploadQueue(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, status: 'uploading' };
                }
                return item;
            }));

            // 生成请求ID
            const requestId = uuidv4();

            // 发送上传请求到Worker
            DocumentWorker.postMessage({
                id: requestId,
                action: 'uploadFile',
                payload: {
                    queueId: id,
                    file,
                    metadata
                }
            });
        } catch (error) {
            console.error('启动上传失败:', error);

            // 更新状态为错误
            setUploadQueue(prev => prev.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        status: 'error',
                        error: (error as Error).message || '启动上传失败'
                    };
                }
                return item;
            }));
        }
    };

    // 从上传队列中移除
    const removeFromUploadQueue = (id: string) => {
        // 获取要移除的项
        const itemToRemove = uploadQueue.find(item => item.id === id);

        if (itemToRemove && (itemToRemove.status === 'uploading' || itemToRemove.status === 'processing')) {
            // 如果正在上传中或处理中，取消上传
            try {
                const requestId = uuidv4();
                DocumentWorker.postMessage({
                    id: requestId,
                    action: 'cancelUpload',
                    payload: { queueId: id }
                });
            } catch (error) {
                console.error('取消上传失败:', error);
            }
        }

        // 从队列中移除
        setUploadQueue(prev => prev.filter(item => item.id !== id));
    };

    // 修改上传文档函数以适配队列系统
    const uploadDocument = async (file: File, metadata?: { title?: string, description?: string, tags?: string[] }) => {
        console.log(`添加文件到上传队列: ${file.name}`);
        // 将文件添加到上传队列，并返回队列ID
        addToUploadQueue(file, metadata);

        // 刷新存储状态
        await getStorageStatus();
    };

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

            // 检查上传队列中是否有与获取到的文档重复的文件
            if (uploadQueue.length > 0) {
                // 更新上传队列，标记重复项
                setUploadQueue(prevQueue => {
                    return prevQueue.map(queueItem => {
                        // 检查队列中的文件是否已在文档列表中
                        const duplicate = data.find((doc: any) =>
                            // 通过fileId匹配
                            (queueItem.fileId && queueItem.fileId === doc.id) ||
                            // 或通过文件名和大小匹配
                            (doc.original_name === queueItem.file.name &&
                                doc.size === queueItem.file.size)
                        );

                        if (duplicate && queueItem.status !== 'completed') {
                            // 标记为完成，稍后移除
                            return {
                                ...queueItem,
                                status: 'completed',
                                progress: 100,
                                message: '文件已存在，跳过上传',
                                fileId: duplicate.id
                            };
                        }
                        return queueItem;
                    });
                });

                // 延迟移除已完成的重复项
                setTimeout(() => {
                    setUploadQueue(prevQueue =>
                        prevQueue.filter(item =>
                            !(item.status === 'completed' &&
                                item.message === '文件已存在，跳过上传')
                        )
                    );
                }, 3000);
            }

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
    const downloadDocument = async (fileId: string) => {
        console.log(`尝试下载文件: ${fileId}`);

        // 构建下载URL
        const downloadUrl = `${API_BASE_URL}/oculith/files/${fileId}/download`;
        console.log(`下载URL: ${downloadUrl}`);

        // 方法1: 使用表单提交方式下载 - 最可靠的下载方式，不受许多浏览器限制影响
        try {
            console.log("尝试方法1: 表单提交下载");
            // 创建一个临时表单
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = downloadUrl;
            form.target = '_blank'; // 在新窗口打开
            form.style.display = 'none';

            // 添加认证令牌 - 如果您的API使用查询参数认证
            // const tokenInput = document.createElement('input');
            // tokenInput.type = 'hidden';
            // tokenInput.name = 'token';
            // tokenInput.value = 'your-auth-token-if-needed';
            // form.appendChild(tokenInput);

            // 提交表单
            document.body.appendChild(form);
            form.submit();

            // 清理
            setTimeout(() => {
                document.body.removeChild(form);
            }, 1000);

            return;
        } catch (formError) {
            console.error("表单提交下载失败:", formError);
        }

        // 方法2: 使用fetch API下载
        try {
            console.log("尝试方法2: Fetch API下载");

            // 显示详细的请求信息，用于调试
            console.log("请求URL:", downloadUrl);
            console.log("请求头:", {
                'Accept': '*/*',
                'Cache-Control': 'no-cache',
                // 显示其他可能的头部信息
            });

            // 执行请求
            const response = await fetch(downloadUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                }
            });

            // 记录详细的响应信息，方便调试
            console.log("响应状态:", response.status, response.statusText);
            console.log("响应头:", {
                'Content-Type': response.headers.get('content-type'),
                'Content-Disposition': response.headers.get('content-disposition'),
                'Content-Length': response.headers.get('content-length')
            });

            if (!response.ok) {
                let errorDetail = "";
                try {
                    // 尝试解析错误详情
                    const errorText = await response.text();
                    console.error("错误响应内容:", errorText);

                    // 尝试解析为JSON
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorDetail = errorJson.detail || errorJson.message || errorText;
                    } catch {
                        errorDetail = errorText;
                    }
                } catch {
                    errorDetail = "无法获取错误详情";
                }

                throw new Error(`下载失败: ${response.status} ${response.statusText} - ${errorDetail}`);
            }

            // 检查响应类型
            const contentType = response.headers.get('content-type') || '';
            const contentLength = response.headers.get('content-length') || '0';
            console.log(`响应类型: ${contentType}, 大小: ${contentLength}字节`);

            // 处理JSON响应
            if (contentType.includes('application/json')) {
                console.log("收到JSON响应，分析内容");
                const jsonData = await response.json();
                console.log("JSON内容:", jsonData);

                // 检查是否是远程文件的响应
                if (jsonData.source_url) {
                    console.log("检测到远程文件URL:", jsonData.source_url);
                    window.open(jsonData.source_url, '_blank');
                    return;
                }

                // 检查是否是其他可用的下载链接
                if (jsonData.download_url) {
                    console.log("使用JSON中的下载链接:", jsonData.download_url);
                    window.open(jsonData.download_url, '_blank');
                    return;
                }

                // 没有可用的下载链接
                throw new Error(jsonData.message || jsonData.detail || "服务器返回JSON但不包含下载链接");
            }

            // 如果不是JSON，应该是文件内容
            // 获取文件名
            let filename = '';

            // 从Content-Disposition头部获取文件名
            const contentDisposition = response.headers.get('content-disposition') || '';
            console.log("Content-Disposition:", contentDisposition);

            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const filenameMatch = contentDisposition.match(filenameRegex);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
                console.log("从Content-Disposition获取文件名:", filename);
            }

            // 尝试从URL编码的filename*获取
            if (!filename && contentDisposition.includes("filename*=")) {
                const filenameStarMatch = contentDisposition.match(/filename\*=([^']*)'([^']*)'(.*)/);
                if (filenameStarMatch && filenameStarMatch[3]) {
                    try {
                        filename = decodeURIComponent(filenameStarMatch[3]);
                        console.log("从filename*获取并解码文件名:", filename);
                    } catch (e) {
                        console.warn("解码filename*失败:", e);
                    }
                }
            }

            // 如果没有从响应头获取到文件名，使用默认名称
            if (!filename) {
                filename = `文件-${fileId}`;
                console.log("使用默认文件名:", filename);
            }

            // 获取响应blob
            const blob = await response.blob();
            console.log(`获取到文件Blob, 大小: ${blob.size}字节, 类型: ${blob.type}`);

            if (blob.size === 0) {
                throw new Error("下载的文件内容为空");
            }

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            // 添加到文档并触发点击
            document.body.appendChild(link);
            link.click();

            // 清理
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(link);
                console.log(`文件下载完成并清理资源: ${filename}`);
            }, 100);

            return;
        } catch (fetchError) {
            // 指定fetchError类型以避免linter错误
            const error = fetchError as Error;
            console.error("Fetch API下载失败:", error.message);

            // 继续尝试其他方法
        }

        // 方法3: 直接在新窗口打开
        try {
            console.log("尝试方法3: 直接在新窗口打开");
            window.open(downloadUrl, '_blank');
            return;
        } catch (windowError) {
            const error = windowError as Error;
            console.error("直接打开下载链接失败:", error.message);
        }

        // 所有方法都失败
        console.error("所有下载方法均失败");
        throw new Error("无法下载文件，请查看控制台日志获取详细错误信息");
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


    // 添加fetchFileInfo函数定义
    const fetchFileInfo = async (fileId: string): Promise<Document | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/oculith/files/${fileId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`获取文件信息失败: ${response.status}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('获取文件信息出错:', error);
            return null;
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
                uploadQueue,
                loadDocuments,
                loadDocument,
                loadChunks,
                uploadDocument,
                addToUploadQueue,
                removeFromUploadQueue,
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