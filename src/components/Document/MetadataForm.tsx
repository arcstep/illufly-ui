import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Document } from '@/context/DocumentContext';

export default function DocumentMetadataForm({
    file,
    metadata,
    onMetadataChange,
    onCancel,
    onSubmit,
    isEditing
}: {
    file?: File | null;
    metadata: { title: string; description: string; tags: string[] };
    onMetadataChange: (data: typeof metadata) => void;
    onCancel: () => void;
    onSubmit: () => void;
    isEditing?: boolean;
}) {
    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            const newTag = (e.target as HTMLInputElement).value.trim();
            if (!metadata.tags.includes(newTag)) {
                onMetadataChange({
                    ...metadata,
                    tags: [...metadata.tags, newTag]
                });
            }
            (e.target as HTMLInputElement).value = '';
        }
    };

    const removeTag = (tag: string) => {
        onMetadataChange({
            ...metadata,
            tags: metadata.tags.filter(t => t !== tag)
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="font-medium text-gray-800 dark:text-white mb-4">
                    {isEditing ? '编辑文档信息' : '填写文档信息'}
                </h3>
                <div className="space-y-4">
                    {file && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">文件名</label>
                            <div className="text-sm text-gray-600 dark:text-gray-300">{file.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatFileSize(file.size)}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标题</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            value={metadata.title}
                            onChange={(e) => onMetadataChange({ ...metadata, title: e.target.value })}
                            placeholder="输入文档标题"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">描述</label>
                        <textarea
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                            value={metadata.description}
                            onChange={(e) => onMetadataChange({ ...metadata, description: e.target.value })}
                            placeholder="输入文档描述"
                            rows={3}
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标签</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {metadata.tags.map(tag => (
                                <span key={tag} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full flex items-center">
                                    {tag}
                                    <button
                                        className="ml-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                        onClick={() => removeTag(tag)}
                                    >
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
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
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                            {isEditing ? '保存更改' : '上传'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
