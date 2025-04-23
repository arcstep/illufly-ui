import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheckCircle,
    faCube,
    faDownload,
    faExternalLinkAlt,
    faLink,
    faSyncAlt,
    faTrash,
    faEdit
} from '@fortawesome/free-solid-svg-icons';
import { faMarkdown } from '@fortawesome/free-brands-svg-icons';
import { Document } from '@/context/DocumentContext';

export default function DocumentCard({
    doc,
    onEdit,
    onDelete,
    onDownload,
    onRetry
}: {
    doc: Document;
    onEdit: (doc: Document) => void;
    onDelete: (document_id: string) => void;
    onDownload: (document_id: string) => Promise<boolean>;
    onRetry: (document_id: string) => Promise<boolean>;
}) {
    const formatDateDisplay = (timestamp: string | number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span
                    title={`文件类型: ${doc.type.toUpperCase()}\n原始文件名: ${doc.original_name}`}
                    className="text-xs px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300"
                >
                    {doc.type.toUpperCase() || '文件'} · {formatFileSize(doc.size)}
                </span>

                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${doc.status === 'processing' ? 'bg-yellow-100 dark:bg-yellow-900/30 animate-pulse' :
                        doc.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                            'bg-green-100 dark:bg-green-900/30'
                        }`}>
                        {doc.status === 'processing' ? '处理中' : doc.status === 'error' ? '处理失败' : '可用'}
                    </span>
                </div>
            </div>

            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-white truncate">
                        {doc.title || doc.original_name || '未命名文档'}
                        {doc.source_type === 'remote' && (
                            <span className="ml-2 text-blue-500 text-sm" title="远程资源">
                                <FontAwesomeIcon icon={faLink} />
                            </span>
                        )}
                    </h3>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                        {doc.converted && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                                <FontAwesomeIcon icon={faCheckCircle} className="mr-1 text-xs" />
                                已转换
                            </span>
                        )}
                        {doc.has_markdown && (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                                <FontAwesomeIcon icon={faMarkdown} className="mr-1" />
                                Markdown
                            </span>
                        )}
                        {doc.has_chunks && (
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                                <FontAwesomeIcon icon={faCube} className="mr-1" />
                                已分片 ({doc.chunks_count || 0})
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                    <button
                        onClick={() => onEdit(doc)}
                        className="text-gray-500 hover:text-green-600 dark:text-gray-400"
                        title="编辑元数据"
                    >
                        <FontAwesomeIcon icon={faEdit} />
                    </button>

                    {doc.source_type === 'local' && doc.download_url && (
                        <button
                            onClick={() => onDownload(doc.document_id)}
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400"
                            title="下载原始文件"
                        >
                            <FontAwesomeIcon icon={faDownload} />
                        </button>
                    )}

                    {doc.source_type === 'remote' && (
                        <a
                            href={doc.source_url}
                            target="_blank"
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400"
                            title="查看原始链接"
                        >
                            <FontAwesomeIcon icon={faExternalLinkAlt} />
                        </a>
                    )}

                    <button
                        onClick={() => onDelete(doc.document_id)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400"
                        title="删除文档"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </button>
                </div>
            </div>

            <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                    <span>创建时间: {formatDateDisplay(doc.created_at)}</span>
                </div>
                {doc.status === 'processing' && (
                    <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <FontAwesomeIcon icon={faSyncAlt} className="animate-spin mr-1" />
                        <span>正在处理中，剩余约 {(doc.estimated_time || 0).toFixed(0)}秒</span>
                    </div>
                )}
            </div>

            {doc.status === 'error' && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300">
                    {doc.error_message || '文档处理失败'}
                    <button
                        onClick={() => onRetry(doc.document_id)}
                        className="ml-2 text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                        重试处理
                    </button>
                </div>
            )}
        </div>
    );
}
