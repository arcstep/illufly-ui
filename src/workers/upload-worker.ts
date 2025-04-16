const worker: Worker = self as any;

// 在worker内存储API基础URL
let API_BASE_URL = '';

// 存储当前处理中的上传任务
const activeUploads = new Map();

// 接收来自主线程的消息
worker.addEventListener('message', async (event) => {
    const { id, action, payload } = event.data;

    try {
        switch (action) {
            case 'init':
                // 初始化worker，设置API基础URL
                API_BASE_URL = payload.apiBaseUrl;
                worker.postMessage({
                    id,
                    success: true,
                    action: 'init',
                    message: 'Worker初始化成功'
                });
                console.log('[Worker初始化成功]', API_BASE_URL);
                break;

            case 'uploadFile':
                // 处理文件上传请求
                await handleFileUpload(id, payload);
                break;

            case 'cancelUpload':
                // 取消上传任务
                cancelUpload(id, payload.queueId);
                break;

            // 添加恢复上传功能
            case 'resumeUpload':
                // 恢复之前的上传任务
                await resumeUpload(id, payload);
                break;

            default:
                throw new Error(`未知的操作: ${action}`);
        }
    } catch (error) {
        worker.postMessage({
            id,
            success: false,
            action,
            error: (error as Error).message
        });
    }
});

// 处理文件上传
async function handleFileUpload(requestId: string, payload: {
    queueId: string,
    file: File,
    metadata?: {
        title?: string,
        description?: string,
        tags?: string[]
    }
}) {
    const { queueId, file, metadata } = payload;

    try {
        // 创建FormData对象
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

        // 通知主线程上传开始
        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadStatus',
            queueId,
            status: 'uploading',
            progress: 0,
            message: '准备上传...'
        });

        // 执行上传请求
        const api_url = `${API_BASE_URL}/oculith/upload/convert`;
        console.log(`[Worker] 发送上传请求到: ${api_url}, 文件名: ${file.name}, 大小: ${file.size}字节`);

        const response = await fetch(api_url, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Accept': 'text/event-stream'
            }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '无法获取响应文本');
            console.error(`[Worker] 服务器响应错误: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`上传失败 (${response.status}): ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('响应缺少内容流');
        }

        // 处理SSE响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fileId = '';
        let lineCount = 0;

        // 存储当前上传任务
        activeUploads.set(queueId, { reader, fileId });
        console.log('[Worker] 开始读取响应流');

        // 逐段读取响应
        while (true) {
            // 检查是否应该取消
            if (!activeUploads.has(queueId)) {
                console.log(`[Worker] 上传任务 ${queueId} 已被取消`);
                await reader.cancel();
                break;
            }

            const { value, done } = await reader.read();
            if (done) {
                console.log('[Worker] 响应流读取完成');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            console.log(`[Worker] 收到数据块 (${value.length} 字节): `, chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));

            // 尝试多种分隔符模式
            // 标准SSE格式是事件块之间用两个换行符分隔
            let events: string[] = [];

            // 尝试标准分隔: \n\n
            if (buffer.includes('\n\n')) {
                events = buffer.split('\n\n');
                buffer = events.pop() || '';
            }
            // 尝试备用分隔: \r\n\r\n
            else if (buffer.includes('\r\n\r\n')) {
                events = buffer.split('\r\n\r\n');
                buffer = events.pop() || '';
            }
            // 尝试单行分隔，用于非标准SSE格式
            else if (buffer.includes('\n')) {
                events = buffer.split('\n').filter(line => line.trim() !== '');
                buffer = '';
            }

            for (const event of events) {
                if (!event.trim()) continue;

                lineCount++;
                console.log(`[Worker] 处理事件 #${lineCount}: ${event.substring(0, 100)}${event.length > 100 ? '...' : ''}`);

                try {
                    // 尝试多种事件格式

                    // 1. 标准SSE格式: event: type\ndata: {...}
                    const standardMatch = {
                        eventMatch: event.match(/^event: (.+)$/m),
                        dataMatch: event.match(/^data: (.+)$/m)
                    };

                    // 2. 简化JSON格式: { "type": "...", ... }
                    let jsonData = null;
                    try {
                        if (event.trim().startsWith('{') && event.trim().endsWith('}')) {
                            jsonData = JSON.parse(event);
                        }
                    } catch (e) {
                        // 忽略不可解析的JSON
                    }

                    // 处理标准SSE格式
                    if (standardMatch.eventMatch && standardMatch.dataMatch) {
                        const eventType = standardMatch.eventMatch[1];
                        try {
                            const eventData = JSON.parse(standardMatch.dataMatch[1]);
                            console.log(`[Worker] 解析到标准SSE事件: ${eventType}`, eventData);

                            // 更新文件ID
                            if (eventType === 'init' && eventData.file_id) {
                                fileId = eventData.file_id;
                                activeUploads.set(queueId, { ...activeUploads.get(queueId), fileId });
                            }

                            // 发送状态更新到主线程
                            sendEventUpdate(requestId, queueId, eventType, eventData, fileId);
                        } catch (parseError) {
                            console.error("[Worker] 无法解析事件数据:", standardMatch.dataMatch[1], parseError);
                        }
                    }
                    // 处理简化JSON格式
                    else if (jsonData && typeof jsonData === 'object') {
                        // 尝试从JSON对象中提取事件类型和数据
                        const eventType = jsonData.type || jsonData.event || 'unknown';
                        console.log(`[Worker] 解析到JSON事件: ${eventType}`, jsonData);

                        // 更新文件ID
                        if (jsonData.file_id || jsonData.id) {
                            fileId = jsonData.file_id || jsonData.id;
                            activeUploads.set(queueId, { ...activeUploads.get(queueId), fileId });
                        }

                        // 发送状态更新到主线程
                        sendEventUpdate(requestId, queueId, eventType, jsonData, fileId);
                    }
                    // 处理纯文本行
                    else if (event.trim()) {
                        console.log(`[Worker] 收到未识别格式的事件: ${event}`);
                        // 将整行当作消息处理
                        worker.postMessage({
                            id: requestId,
                            success: true,
                            action: 'uploadStatus',
                            queueId,
                            message: `服务器消息: ${event.substring(0, 50)}${event.length > 50 ? '...' : ''}`
                        });
                    }
                } catch (eventError) {
                    console.error('[Worker] 处理事件时出错:', eventError);
                }
            }
        }

        // 处理可能仍在缓冲区的最后内容
        if (buffer.trim()) {
            console.log(`[Worker] 处理缓冲区中的最后内容: ${buffer.substring(0, 100)}${buffer.length > 100 ? '...' : ''}`);
            try {
                // 尝试作为JSON解析
                const lastEvent = JSON.parse(buffer);
                const eventType = lastEvent.type || lastEvent.event || 'unknown';

                // 更新文件ID
                if (lastEvent.file_id || lastEvent.id) {
                    fileId = lastEvent.file_id || lastEvent.id;
                }

                sendEventUpdate(requestId, queueId, eventType, lastEvent, fileId);
            } catch (e) {
                // 非JSON格式，作为纯文本处理
                if (buffer.trim()) {
                    console.log(`[Worker] 最后的未识别内容: ${buffer}`);
                    worker.postMessage({
                        id: requestId,
                        success: true,
                        action: 'uploadStatus',
                        queueId,
                        message: `服务器消息: ${buffer.substring(0, 50)}${buffer.length > 50 ? '...' : ''}`
                    });
                }
            }
        }

        // 如果有文件ID但没有收到完成事件，手动标记为完成
        if (fileId) {
            console.log(`[Worker] 上传完成，文件ID: ${fileId}`);
            worker.postMessage({
                id: requestId,
                success: true,
                action: 'uploadComplete',
                queueId,
                fileId,
                status: 'completed',
                progress: 100,
                message: '处理完成'
            });
        }

        // 成功后从活动上传集合中移除
        activeUploads.delete(queueId);
    } catch (error) {
        console.error('[Worker] 上传或处理失败:', error);

        worker.postMessage({
            id: requestId,
            success: false,
            action: 'uploadStatus',
            queueId,
            status: 'error',
            progress: 0,
            error: (error as Error).message || '上传失败'
        });

        // 出错后从活动上传集合中移除
        activeUploads.delete(queueId);
    }
}

// 处理特定事件类型并发送到主线程
function sendEventUpdate(requestId: string, queueId: string, eventType: string, eventData: any, fileId: string) {
    const normalizedType = eventType.toLowerCase();

    if (normalizedType === 'init' || normalizedType === 'start') {
        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadStatus',
            queueId,
            status: 'uploading',
            progress: 5,
            message: '初始化上传...',
            fileId: fileId || eventData.file_id || eventData.id
        });
    }
    else if (normalizedType === 'progress') {
        const progress = typeof eventData.progress === 'number'
            ? eventData.progress
            : (parseFloat(eventData.progress) || 0);

        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadStatus',
            queueId,
            status: 'processing',
            progress: Math.round(5 + (progress * 70)),
            message: eventData.message || `正在处理: ${eventData.stage || ''}`,
            fileId
        });
    }
    else if (normalizedType === 'chunks') {
        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadStatus',
            queueId,
            status: 'processing',
            progress: 75,
            message: `文档已分块: ${eventData.chunks_count || 0}个片段`,
            fileId
        });
    }
    else if (normalizedType === 'indexed') {
        const indexedChunks = eventData.indexed_chunks || 0;
        const totalChunks = eventData.total_chunks || 1;
        const indexProgress = indexedChunks / totalChunks;

        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadStatus',
            queueId,
            status: 'processing',
            progress: 75 + Math.round(indexProgress * 20),
            message: `已索引: ${indexedChunks}/${totalChunks}`,
            fileId
        });
    }
    else if (normalizedType === 'complete' || normalizedType === 'finished' || eventData.status === 'complete') {
        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadComplete',
            queueId,
            fileId,
            status: 'completed',
            progress: 100,
            message: '处理完成'
        });
    }
    else if (normalizedType === 'error') {
        worker.postMessage({
            id: requestId,
            success: false,
            action: 'uploadStatus',
            queueId,
            status: 'error',
            progress: 0,
            error: eventData.error || eventData.message || '上传失败',
            fileId
        });
    }
    else if (eventData.message) {
        // 未知事件类型，但有消息
        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadStatus',
            queueId,
            message: eventData.message,
            fileId
        });
    }
}

// 取消上传
function cancelUpload(requestId: string, queueId: string) {
    const upload = activeUploads.get(queueId);
    if (upload) {
        // 移除上传任务
        activeUploads.delete(queueId);

        // 通知主线程取消成功
        worker.postMessage({
            id: requestId,
            success: true,
            action: 'uploadCancelled',
            queueId,
            message: '上传已取消'
        });
    } else {
        worker.postMessage({
            id: requestId,
            success: false,
            action: 'uploadCancelled',
            queueId,
            error: '找不到指定的上传任务'
        });
    }
}

// 恢复上传任务
async function resumeUpload(requestId: string, payload: {
    queueId: string,
    fileId: string
}) {
    const { queueId, fileId } = payload;

    try {
        console.log(`[Worker] 尝试恢复上传任务: ${queueId}, 文件ID: ${fileId}`);

        if (!fileId) {
            throw new Error('恢复上传失败：缺少文件ID');
        }

        // 添加到活动上传列表
        activeUploads.set(queueId, { fileId });

        // 先查询文件状态
        const processingStatus = await checkFileProcessingStatus(fileId);

        // 根据文件状态发送更新
        if (processingStatus) {
            // 文件存在，发送状态更新
            const status = processingStatus.status || 'processing';
            const progress = processingStatus.progress || 50;
            const message = processingStatus.message || '正在处理...';

            console.log(`[Worker] 恢复文件状态: ${status}, 进度: ${progress}%`);

            if (status === 'complete' || status === 'completed') {
                // 文件已完成处理
                worker.postMessage({
                    id: requestId,
                    success: true,
                    action: 'uploadComplete',
                    queueId,
                    fileId,
                    status: 'completed',
                    progress: 100,
                    message: '处理完成'
                });
            } else if (status === 'error' || status === 'failed') {
                // 处理失败
                worker.postMessage({
                    id: requestId,
                    success: false,
                    action: 'uploadStatus',
                    queueId,
                    fileId,
                    status: 'error',
                    progress: progress,
                    error: message || '处理失败',
                });
            } else {
                // 处理中
                worker.postMessage({
                    id: requestId,
                    success: true,
                    action: 'uploadStatus',
                    queueId,
                    fileId,
                    status: 'processing',
                    progress: progress,
                    message: message
                });

                // 启动轮询
                startProcessingPoll(requestId, queueId, fileId);
            }
        } else {
            // 尝试直接获取文件信息
            const fileInfo = await getFileInfo(fileId);

            if (fileInfo) {
                // 文件存在，认为处理已完成
                worker.postMessage({
                    id: requestId,
                    success: true,
                    action: 'uploadComplete',
                    queueId,
                    fileId,
                    status: 'completed',
                    progress: 100,
                    message: '处理完成'
                });
            } else {
                // 文件不存在或无法访问
                throw new Error('无法获取文件信息，可能已被删除');
            }
        }

    } catch (error) {
        console.error('[Worker] 恢复上传失败:', error);

        worker.postMessage({
            id: requestId,
            success: false,
            action: 'uploadStatus',
            queueId,
            fileId,
            status: 'error',
            progress: 0,
            error: (error as Error).message || '恢复上传失败'
        });

        // 移除任务
        activeUploads.delete(queueId);
    }
}

// 检查文件处理状态
async function checkFileProcessingStatus(fileId: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/oculith/files/${fileId}/status`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.log(`[Worker] 文件状态API返回错误: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('[Worker] 检查文件状态失败:', error);
        return null;
    }
}

// 获取文件信息
async function getFileInfo(fileId: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/oculith/files/${fileId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.log(`[Worker] 获取文件信息失败: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('[Worker] 获取文件信息失败:', error);
        return null;
    }
}

// 开始轮询文件处理状态
function startProcessingPoll(requestId: string, queueId: string, fileId: string) {
    // 确保任务仍在活动列表中
    if (!activeUploads.has(queueId)) {
        console.log(`[Worker] 轮询取消: 任务 ${queueId} 已不在活动列表中`);
        return;
    }

    console.log(`[Worker] 开始轮询文件 ${fileId} 的处理状态`);

    // 存储轮询间隔ID
    const pollIntervalId = setInterval(async () => {
        // 再次检查任务是否仍在活动列表中
        if (!activeUploads.has(queueId)) {
            clearInterval(pollIntervalId);
            console.log(`[Worker] 轮询停止: 任务 ${queueId} 已不在活动列表中`);
            return;
        }

        try {
            const status = await checkFileProcessingStatus(fileId);

            if (!status) {
                // 无法获取状态，尝试获取文件信息
                const fileInfo = await getFileInfo(fileId);

                if (fileInfo) {
                    // 文件存在，认为处理已完成
                    worker.postMessage({
                        id: requestId,
                        success: true,
                        action: 'uploadComplete',
                        queueId,
                        fileId,
                        status: 'completed',
                        progress: 100,
                        message: '处理完成'
                    });

                    // 停止轮询
                    clearInterval(pollIntervalId);
                    activeUploads.delete(queueId);
                }
                return;
            }

            // 处理状态更新
            if (status.status === 'complete' || status.status === 'completed') {
                // 处理完成
                worker.postMessage({
                    id: requestId,
                    success: true,
                    action: 'uploadComplete',
                    queueId,
                    fileId,
                    status: 'completed',
                    progress: 100,
                    message: '处理完成'
                });

                // 停止轮询
                clearInterval(pollIntervalId);
                activeUploads.delete(queueId);
            }
            else if (status.status === 'error' || status.status === 'failed') {
                // 处理失败
                worker.postMessage({
                    id: requestId,
                    success: false,
                    action: 'uploadStatus',
                    queueId,
                    fileId,
                    status: 'error',
                    progress: status.progress || 0,
                    error: status.message || '处理失败'
                });

                // 停止轮询
                clearInterval(pollIntervalId);
                activeUploads.delete(queueId);
            }
            else {
                // 处理中，发送进度更新
                worker.postMessage({
                    id: requestId,
                    success: true,
                    action: 'uploadStatus',
                    queueId,
                    fileId,
                    status: 'processing',
                    progress: status.progress || 50,
                    message: status.message || '正在处理...'
                });
            }
        } catch (error) {
            console.error('[Worker] 轮询文件状态时出错:', error);
        }
    }, 3000); // 每3秒轮询一次

    // 存储轮询间隔ID，以便后续清理
    activeUploads.set(queueId, {
        ...activeUploads.get(queueId),
        pollIntervalId
    });
}

export { }; 