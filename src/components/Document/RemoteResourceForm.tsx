import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { FileMetadata } from '@/context/DocumentContext';

export default function RemoteResourceForm({
    metadata,
    onMetadataChange,
    onCancel,
    onSubmit
}: {
    metadata: FileMetadata & { url?: string };
    onMetadataChange: (data: FileMetadata & { url?: string }) => void;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            const newTag = (e.target as HTMLInputElement).value.trim();
            if (!metadata.tags?.includes(newTag)) {
                onMetadataChange({
                    ...metadata,
                    tags: [...(metadata.tags || []), newTag]
                });
            }
            (e.target as HTMLInputElement).value = '';
        }
    };

    const removeTag = (tag: string) => {
        onMetadataChange({
            ...metadata,
            tags: metadata.tags?.filter(t => t !== tag) || []
        });
    };

    const isValidUrl = (url?: string) => {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="flex items-center font-medium text-gray-800 dark:text-white mb-4">
                    <FontAwesomeIcon icon={faLink} className="mr-2 text-indigo-500" />
                    Web资源
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">资源URL</label>
                        <input
                            type="url"
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            value={metadata.url || ''}
                            onChange={(e) => onMetadataChange({ ...metadata, url: e.target.value })}
                            placeholder="https://example.com/document.pdf"
                        />
                        {metadata.url && !isValidUrl(metadata.url) && (
                            <p className="text-xs text-red-500 mt-1">请输入有效的URL</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标题</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            value={metadata.title || ''}
                            onChange={(e) => onMetadataChange({ ...metadata, title: e.target.value })}
                            placeholder="给资源起个标题"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">描述</label>
                        <textarea
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            value={metadata.description || ''}
                            onChange={(e) => onMetadataChange({ ...metadata, description: e.target.value })}
                            placeholder="添加资源描述"
                            rows={3}
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标签</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {metadata.tags?.map(tag => (
                                <span key={tag} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs px-2 py-1 rounded-full flex items-center">
                                    {tag}
                                    <button
                                        className="ml-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                                        onClick={() => removeTag(tag)}
                                    >
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            placeholder="输入标签并按回车添加"
                            onKeyDown={handleTagInput}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            取消
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={!isValidUrl(metadata.url)}
                            className={`px-4 py-2 rounded-lg text-white ${isValidUrl(metadata.url)
                                ? 'bg-indigo-500 hover:bg-indigo-600'
                                : 'bg-indigo-300 cursor-not-allowed'
                                }`}
                        >
                            登记
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
