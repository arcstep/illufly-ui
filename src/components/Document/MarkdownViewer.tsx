import { useState, useEffect } from 'react';
import { useApiBase } from '@/hooks/useApiBase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faMarkdown } from '@fortawesome/free-brands-svg-icons';
import { useDocument } from '@/context/DocumentContext';

interface MarkdownViewerProps {
    documentId: string;
    hasMarkdown: boolean;
    onClose: () => void;
}

export default function MarkdownViewer({ documentId, hasMarkdown, onClose }: MarkdownViewerProps) {
    const { API_BASE_URL } = useApiBase();
    const [markdown, setMarkdown] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { convertToMarkdown } = useDocument();

    useEffect(() => {
        if (hasMarkdown) {
            fetchMarkdown();
        } else {
            setIsLoading(false);
        }
    }, [documentId, hasMarkdown]);

    const fetchMarkdown = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/markdown`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('获取Markdown内容失败');
            }

            const data = await response.json();
            setMarkdown(data.content || '');
        } catch (error) {
            console.error('获取Markdown失败:', error);
            setError('无法加载Markdown内容');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConvert = async () => {
        setIsLoading(true);
        const success = await convertToMarkdown(documentId);
        if (success) {
            // 转换成功后关闭窗口，让用户再次点击查看
            onClose();
        } else {
            setError('转换失败，请稍后重试');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        <FontAwesomeIcon icon={faMarkdown} className="mr-2 text-blue-500" />
                        Markdown 内容
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
                            <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500 text-2xl" />
                        </div>
                    ) : error ? (
                        <div className="text-red-500 p-4 text-center">{error}</div>
                    ) : !hasMarkdown ? (
                        <div className="text-center p-8">
                            <p className="mb-4 text-gray-600 dark:text-gray-300">此文档尚未生成Markdown内容</p>
                            <button
                                onClick={handleConvert}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                                生成Markdown
                            </button>
                        </div>
                    ) : (
                        <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base lg:prose-lg">
                            <pre className="whitespace-pre-wrap">{markdown}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 