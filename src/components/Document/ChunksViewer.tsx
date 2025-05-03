import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDocument } from '@/context/DocumentContext';
import { DocumentChunk } from '@/context/DocumentContext';

interface ChunksViewerProps {
    documentId: string;
    hasChunks: boolean;
    onClose: () => void;
    hasEmbeddings?: boolean;
}

export default function ChunksViewer({ documentId, hasChunks, onClose, hasEmbeddings = false }: ChunksViewerProps) {
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

    const { loadChunks, generateChunks, searchChunks } = useDocument();

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

                {hasEmbeddings && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSearch} className="w-full">
                            <div className="relative">
                                <textarea
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="输入问题或关键词搜索相似切片... (回车搜索，Shift+回车换行)"
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    style={{
                                        minHeight: '2.5rem',
                                        maxHeight: 'calc(3 * 1.5rem + 1.5rem)',
                                        height: 'auto',
                                        overflowY: searchQuery.split('\n').length > 3 ? 'scroll' : 'hidden'
                                    }}
                                    rows={Math.min(3, Math.max(1, searchQuery.split('\n').length))}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors duration-200"
                                    disabled={isSearching || !searchQuery.trim()}
                                    title="基于语义相似度搜索"
                                >
                                    {isSearching ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="flex justify-end mt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                                >
                                    {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="mt-2 grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                                            结果数量 (1-50)
                                        </label>
                                        <div className="flex items-center">
                                            <input
                                                type="range"
                                                min="1"
                                                max="50"
                                                step="1"
                                                value={topK}
                                                onChange={(e) => setTopK(parseInt(e.target.value))}
                                                className="w-full mr-2"
                                            />
                                            <span className="text-xs w-10 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600">{topK}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                )}

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
                    ) : chunks.length === 0 ? (
                        <div className="text-center text-gray-500 p-4">没有找到文档切片</div>
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