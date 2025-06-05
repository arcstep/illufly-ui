import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDocument } from '@/context/DocumentContext';
import { DocumentChunk } from '@/context/DocumentContext';

interface ChunksViewerProps {
    documentId: string;
    state: string;
    subState: string;
    onClose: () => void;
}

export default function ChunksViewer({ documentId, state, subState, onClose }: ChunksViewerProps) {
    const [chunks, setChunks] = useState<DocumentChunk[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [threshold, setThreshold] = useState(1.5);
    const [topK, setTopK] = useState(15);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const { loadChunks, generateChunks, searchChunks, rollbackDocumentState } = useDocument();

    useEffect(() => {
        if (state === 'chunked' && subState === 'completed') {
            fetchChunks();
        } else {
            setIsLoading(false);
        }
    }, [documentId, state, subState]);

    const fetchChunks = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const chunks = await loadChunks(documentId);
            if (chunks && chunks.length > 0) {
                setChunks(chunks);
            } else {
                console.error('返回的切片数据格式不正确:', chunks);
                setError('切片数据格式不正确');
            }
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
            onClose();
        } else {
            setError('生成切片失败，请稍后重试');
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await searchChunks(searchQuery, documentId, topK);
            setSearchResults(results);
            setHasSearched(true);
        } catch (error) {
            console.error('搜索失败:', error);
            setError('搜索失败，请稍后重试');
        } finally {
            setIsSearching(false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setHasSearched(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (searchQuery.trim() && !isSearching) {
                handleSearch(e as any);
            }
        }
    };

    const handleRollback = async () => {
        setIsLoading(true);
        await rollbackDocumentState(documentId);
        onClose();
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
                    ) : chunks.length === 0 ? (
                        <div className="text-center p-8 space-y-4">
                            {subState === 'processing' && <p>文本切片生成中，请稍候...</p>}
                            {subState === 'failed' && <p>文本切片生成失败，可重试或恢复至上一步</p>}
                            {chunks.length === 0 && subState === 'none' && <p>尚未生成 文本切片</p>}
                            <div className="flex justify-center gap-2">
                                {subState !== 'processing' && (
                                    <button
                                        onClick={handleGenerateChunks}
                                        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                                    >
                                        生成 文本切片
                                    </button>
                                )}
                                {subState !== 'completed' && (
                                    <button
                                        onClick={handleRollback}
                                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                                    >
                                        恢复至上一步
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : hasSearched ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">搜索结果 ({searchResults.length})</h2>
                                <button
                                    onClick={handleClearSearch}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                    显示所有切片
                                </button>
                            </div>

                            {searchResults.length === 0 ? (
                                <div className="text-center text-gray-500 p-4">没有找到相关切片</div>
                            ) : (
                                <div className="space-y-4">
                                    {searchResults.map((chunk) => (
                                        <div
                                            key={`${chunk.document_id}-${chunk.chunk_index}`}
                                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-750"
                                        >
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
                                                <span>
                                                    切片 #{chunk.chunk_index}
                                                    {chunk.metadata?.chunk_title && (
                                                        <span className="ml-2 font-medium">{chunk.metadata.chunk_title}</span>
                                                    )}
                                                </span>
                                                {chunk.distance !== undefined && (
                                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                                                        相似度: {(1 - chunk.distance).toFixed(3)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm whitespace-pre-wrap">{chunk.content}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {chunks.map((chunk) => (
                                <div
                                    key={`${chunk.document_id}-${chunk.chunk_index}`}
                                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-750"
                                >
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        切片 #{chunk.chunk_index}
                                        {chunk.metadata?.chunk_title && (
                                            <span className="ml-2 font-medium">{chunk.metadata.chunk_title}</span>
                                        )}
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