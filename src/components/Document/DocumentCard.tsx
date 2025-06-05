import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCube,
    faDownload,
    faExternalLinkAlt,
    faSyncAlt,
    faTrash,
    faEdit,
    faNetworkWired,
    faEllipsisV
} from '@fortawesome/free-solid-svg-icons';
import { faMarkdown } from '@fortawesome/free-brands-svg-icons';
import { Document } from '@/context/DocumentContext';
import { useDateTime } from '@/hooks/useDateTime';
import { useDocument } from '@/context/DocumentContext';
import { MarkdownViewer, ChunksViewer } from '@/components/Document';

export default function DocumentCard({
    doc,
    onEdit,
    onDelete,
    onDownload
}: {
    doc: Document;
    onEdit: (doc: Document) => void;
    onDelete: (document_id: string) => void;
    onDownload: (document_id: string) => Promise<boolean>;
}) {
    const { parseTimestamp, formatDate } = useDateTime();
    const { indexDocument, rollbackDocumentState } = useDocument();
    const { state, sub_state, chunks_count, source_type, download_url, document_id } = doc;

    // 子状态快捷判断
    const isProcessing = sub_state === 'processing';
    const isFailed = sub_state === 'failed';
    const isCompleted = sub_state === 'completed';

    // 各功能可用性判断
    const canViewMarkdown = state === 'markdowned' && isCompleted;
    const canGenerateMarkdown = ['init', 'uploaded', 'bookmarked', 'saved_chat'].includes(state) && !isProcessing;
    const canViewChunks = ['chunked', 'embedded'].includes(state) && isCompleted;
    const canGenerateChunks = state === 'markdowned' && isCompleted;
    const canViewEmbeddings = state === 'embedded' && isCompleted;
    const canGenerateEmbeddings = state === 'chunked' && isCompleted;

    // 弹窗状态
    const [showMarkdown, setShowMarkdown] = useState(false);
    const [showChunks, setShowChunks] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    const createdAt = formatDate(parseTimestamp(doc.created_at));

    // 文件类型显示处理
    const getFileTypeDisplay = () => {
        if (doc.source_type === 'remote') {
            return 'WEB';
        }
        return doc.type.toUpperCase() || '文件';
    };

    // 文件大小显示处理
    const getFileSizeDisplay = () => {
        if (doc.source_type === 'remote') {
            return '';
        }
        return formatFileSize(doc.size);
    };

    // 处理向量索引按钮点击
    const handleIndexDocument = async () => {
        if (window.confirm('确定要将此文档添加到向量索引吗？')) {
            await indexDocument(doc.document_id);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span
                    title={`文件类型: ${getFileTypeDisplay()}\n原始文件名: ${doc.original_name}`}
                    className="text-xs px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300"
                >
                    {getFileTypeDisplay()}{getFileSizeDisplay() && ` · ${getFileSizeDisplay()}`}
                </span>

                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full
                        ${isProcessing ? 'bg-yellow-100 animate-pulse' :
                            isFailed ? 'bg-red-100' :
                                isCompleted ? 'bg-green-100' :
                                    'bg-gray-100'}`}>
                        {isProcessing ? '处理中' :
                            isFailed ? '失败' :
                                isCompleted ? '完成' :
                                    '待处理'}
                    </span>
                </div>
            </div>

            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-white truncate">
                        {doc.title || doc.original_name || '未命名文档'}
                    </h3>
                </div>
            </div>

            {/* 功能按钮区域：保留下载/外部链接/向量索引，移除文档处理操作到查看器 */}
            <div className="mt-3 flex justify-between items-center">
                <div className="flex gap-1.5 items-center">
                    {/* 保留下载按钮 */}
                    {doc.source_type === 'local' && doc.download_url && (
                        <button
                            onClick={() => onDownload(doc.document_id)}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                            title="下载原始文件"
                        >
                            <FontAwesomeIcon icon={faDownload} />
                        </button>
                    )}
                    {/* 保留外部链接按钮 */}
                    {doc.source_type === 'remote' && (
                        <a
                            href={doc.source_url || ''}
                            target="_blank"
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                            title="查看原始链接"
                        >
                            <FontAwesomeIcon icon={faExternalLinkAlt} />
                        </a>
                    )}

                    {/* 打开 Markdown 查看器，生成/恢复逻辑在查看器内 */}
                    <button
                        onClick={() => setShowMarkdown(true)}
                        className="p-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs"
                        title="查看/生成 Markdown"
                    >
                        <FontAwesomeIcon icon={faMarkdown} />
                    </button>

                    {/* 打开 切片 查看器，生成/恢复逻辑在查看器内 */}
                    <button
                        onClick={() => setShowChunks(true)}
                        className="p-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/40 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                        title="查看/生成 文本切片"
                    >
                        <FontAwesomeIcon icon={faCube} />
                    </button>

                    {/* 保留向量索引按钮 */}
                    <button
                        disabled={!canGenerateEmbeddings}
                        onClick={handleIndexDocument}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                        title="添加到向量索引"
                    >
                        <FontAwesomeIcon icon={faNetworkWired} />
                    </button>
                </div>

                {/* 右侧收纳菜单 */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs"
                        title="更多操作"
                    >
                        <FontAwesomeIcon icon={faEllipsisV} />
                    </button>

                    {showMenu && (
                        <div className="absolute z-10 right-0 mt-1 py-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    onEdit(doc);
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            >
                                <FontAwesomeIcon icon={faEdit} className="mr-2" />
                                编辑
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(doc.document_id);
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            >
                                <FontAwesomeIcon icon={faTrash} className="mr-2" />
                                删除
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                    <span>创建时间: {createdAt}</span>
                </div>
                {state === 'processing' && (
                    <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <FontAwesomeIcon icon={faSyncAlt} className="animate-spin mr-1" />
                        <span>正在处理中，剩余约 {(doc.estimated_time || 0).toFixed(0)}秒</span>
                    </div>
                )}
            </div>

            {state === 'failed' && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300">
                    {doc.error_message || '文档处理失败'}
                </div>
            )}

            {/* 更新查看器 Props，移除 hasMarkdown/hasChunks */}
            {showMarkdown && (
                <MarkdownViewer
                    documentId={doc.document_id}
                    state={state}
                    subState={sub_state}
                    onClose={() => setShowMarkdown(false)}
                />
            )}
            {showChunks && (
                <ChunksViewer
                    documentId={doc.document_id}
                    state={state}
                    subState={sub_state}
                    onClose={() => setShowChunks(false)}
                />
            )}
        </div>
    );
}
