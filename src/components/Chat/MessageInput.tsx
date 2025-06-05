import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTrash, faExclamationTriangle, faRedo } from '@fortawesome/free-solid-svg-icons';
import { useChat } from '@/context/ChatContext';

interface FileItem {
    id: string;
    name: string;
    size: number;
    type: string;
}

export default function MessageInput() {
    const { ask, isProcessing, cancelProcessing } = useChat();
    const [message, setMessage] = useState<string>('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [lastFailedMessage, setLastFailedMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showFileUpload, setShowFileUpload] = useState<boolean>(false);

    // 输入框样式，固定字体大小，确保良好的显示效果
    const textareaStyle = {
        fontSize: '16px', // 固定字体大小
        lineHeight: '1.5',
        scrollbarWidth: 'thin' as const,
        scrollbarColor: '#cbd5e0 #f7fafc',
    };

    // 使用useEffect监听全局处理状态，确保本地状态与全局状态同步
    useEffect(() => {
        // 如果全局状态显示不在处理中，但本地状态仍在发送中，则同步
        if (!isProcessing && isSending) {
            setIsSending(false);
        }
    }, [isProcessing, isSending]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                type: file.type
            }));
            setFiles(prev => [...prev, ...newFiles]);
            setShowFileUpload(false);
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);

        const droppedFiles = event.dataTransfer.files;
        if (droppedFiles) {
            const newFiles = Array.from(droppedFiles).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                type: file.type
            }));
            setFiles(prev => [...prev, ...newFiles]);
            setShowFileUpload(false);
        }
    };

    const handleRemoveFile = (fileId: string) => {
        setFiles(prev => prev.filter(file => file.id !== fileId));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!message.trim() && files.length === 0) return;

        // 清除之前的错误
        setSendError(null);
        setIsSending(true);

        // 保存当前消息文本，以便发送和可能的重试
        const currentMessage = message;
        setLastFailedMessage(currentMessage);

        // 立即清空输入框，提高用户体验
        setMessage('');
        setFiles([]);

        try {
            await ask(currentMessage);
            // 清空上次失败的消息记录
            setLastFailedMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            if (error instanceof Error) {
                setSendError(`发送失败: ${error.message}`);
            } else {
                setSendError('发送失败，请检查网络连接后重试');
            }
            // 已经保存消息到lastFailedMessage，方便用户重试
        } finally {
            setIsSending(false);
        }
    };

    // 重试发送上一条失败的消息
    const handleRetry = async () => {
        if (!lastFailedMessage && !message) return;

        const messageToRetry = lastFailedMessage || message;
        setSendError(null);
        setIsSending(true);

        // 如果用户输入框有内容，先保存起来
        if (message) {
            setLastFailedMessage(message);
        }

        // 清空输入框
        setMessage('');

        try {
            await ask(messageToRetry);
            // 成功后清空失败消息记录
            setLastFailedMessage('');
        } catch (error) {
            console.error('Error retrying message:', error);
            if (error instanceof Error) {
                setSendError(`重试失败: ${error.message}`);
            } else {
                setSendError('重试失败，请检查网络连接');
            }
        } finally {
            setIsSending(false);
        }
    };

    // 清除错误并重置状态
    const clearError = () => {
        setSendError(null);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
        }
    };

    // 调整输入框高度
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [message]);

    // 监听窗口大小变化，重新调整高度
    useEffect(() => {
        window.addEventListener('resize', adjustTextareaHeight);
        return () => {
            window.removeEventListener('resize', adjustTextareaHeight);
        };
    }, []);

    return (
        <form onSubmit={handleSubmit} className="p-4">
            {sendError && (
                <div className="mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm flex justify-between items-center">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                        <span>{sendError}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleRetry}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700"
                        >
                            <FontAwesomeIcon icon={faRedo} className="mr-1" />
                            重试
                        </button>
                        <button
                            type="button"
                            onClick={clearError}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入消息..."
                        className="w-full min-h-[40px] max-h-[200px] p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 overflow-y-auto"
                        rows={1}
                        style={textareaStyle}
                        disabled={isSending || isProcessing}
                    />
                    {/* <button
                        type="button"
                        onClick={() => setShowFileUpload(!showFileUpload)}
                        className="absolute right-2 bottom-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={isSending || isProcessing}
                    >
                        <FontAwesomeIcon icon={faPaperclip} />
                    </button> */}
                </div>
                <button
                    type="submit"
                    disabled={(!message.trim() && files.length === 0) || isSending || isProcessing}
                    className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                    style={{ fontSize: '16px' }}
                >
                    {isSending || isProcessing ? '发送中...' : '发送'}
                </button>
            </div>

            {/* {showFileUpload && (
                <div
                    className={`mt-2 relative rounded-lg border-2 border-dashed p-4
                    ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center">
                        <FontAwesomeIcon
                            icon={faPaperclip}
                            className="text-gray-400 dark:text-gray-500 mb-2"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            拖放文件到这里或
                            <button
                                type="button"
                                className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 ml-1"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                点击选择
                            </button>
                        </p>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                    />
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-2 space-y-2">
                    {files.map(file => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg p-2"
                        >
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {file.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemoveFile(file.id)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    ))}
                </div>
            )} */}
        </form>
    );
} 