import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDocument } from '@/context/DocumentContext';
import { DocumentChunk } from '@/context/DocumentContext';

interface ChunksViewerProps {
    documentId: string;
    hasChunks: boolean;
    onClose: () => void;
}

export default function ChunksViewer({ documentId, hasChunks, onClose }: ChunksViewerProps) {
    const [chunks, setChunks] = useState<DocumentChunk[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { loadChunks, generateChunks } = useDocument();

    useEffect(() => {
        if (hasChunks) {
            fetchChunks();
        } else {
            setIsLoading(false);
        }
    }, [documentId, hasChunks]);

    const fetchChunks = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await loadChunks(documentId);
            setChunks(data);
        } catch (error) {
            console.error('获取文档切片失败:', error);
            setError('无法加载文档切片');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateChunks = async () => {
        setIsLoading(true);
        const success = await generateChunks(documentId);
        if (success) {
            // 生成成功后关闭窗口，让用户再次点击查看
            onClose();
        } else {
            setError('生成切片失败，请稍后重试');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        <FontAwesomeIcon icon={faCube} className="mr-2 text-purple-500" />
                        文档切片
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-purple-500 text-2xl" />
                        </div>
                    ) : error ? (
                        <div className="text-red-500 p-4 text-center">{error}</div>
                    ) : !hasChunks ? (
                        <div className="text-center p-8">
                            <p className="mb-4 text-gray-600 dark:text-gray-300">此文档尚未生成文本切片</p>
                            <button
                                onClick={handleGenerateChunks}
                                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                            >
                                生成文本切片
                            </button>
                        </div>
                    ) : chunks.length === 0 ? (
                        <div className="text-center text-gray-500 p-4">没有找到文档切片</div>
                    ) : (
                        <div className="space-y-4">
                            {chunks.map((chunk) => (
                                <div
                                    key={chunk.id}
                                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-750"
                                >
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        切片 #{chunk.sequence}
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap">{chunk.content}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 