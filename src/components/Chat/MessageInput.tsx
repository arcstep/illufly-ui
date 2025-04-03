import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useChat } from '@/context/ChatContext';
import { useSettings } from '@/context/SettingsContext';

interface FileItem {
    id: string;
    name: string;
    size: number;
    type: string;
}

export default function MessageInput() {
    const { ask } = useChat();
    const { settings } = useSettings();
    const [message, setMessage] = useState<string>('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isDragging, setIsDragging] = useState<boolean>(false);
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

        try {
            await ask(message);
            setMessage('');
            setFiles([]);
        } catch (error) {
            console.error('Error sending message:', error);
        }
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
                    />
                    <button
                        type="button"
                        onClick={() => setShowFileUpload(!showFileUpload)}
                        className="absolute right-2 bottom-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <FontAwesomeIcon icon={faPaperclip} />
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={!message.trim() && files.length === 0}
                    className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                    style={{ fontSize: '16px' }}
                >
                    发送
                </button>
            </div>

            {showFileUpload && (
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
            )}
        </form>
    );
} 