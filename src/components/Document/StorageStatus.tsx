import { StorageStatus as StorageStatusType } from '@/context/DocumentContext';

export default function StorageStatusCard({
    storageStatus
}: {
    storageStatus?: StorageStatusType | null
}) {
    if (!storageStatus) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-3 py-1.5 flex items-center text-xs">
            <span className="text-gray-500 dark:text-gray-400 mr-2">存储:</span>
            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mr-2">
                <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${storageStatus.usage_percentage > 90 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                    style={{ width: `${storageStatus.usage_percentage}%` }}
                />
            </div>
            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {storageStatus.usage_percentage.toFixed(1)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400 mx-2">|</span>
            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                <span className="text-gray-700 dark:text-gray-300">{storageStatus.file_count}</span> 个文件
            </span>
        </div>
    );
}
