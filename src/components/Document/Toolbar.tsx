import { faUpload, faSearch, faSort } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StorageStatus } from '@/context/DocumentContext';
import StorageStatusComponent from './StorageStatus';

export default function DocumentToolbar({
    storageStatus,
    titleFilter,
    setTitleFilter,
    sortOption,
    setSortOption,
    onFileSelect
}: {
    storageStatus?: StorageStatus | null;
    titleFilter: string;
    setTitleFilter: (value: string) => void;
    sortOption: string;
    setSortOption: (value: string) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
                {/* 存储状态 */}
                {storageStatus && <StorageStatusComponent storageStatus={storageStatus} />}

                {/* 搜索框 */}
                <div className="relative flex-grow max-w-xs">
                    <input
                        type="text"
                        placeholder="按标题过滤..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                        value={titleFilter}
                        onChange={(e) => setTitleFilter(e.target.value)}
                    />
                    <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"
                    />
                </div>

                {/* 排序选择器 */}
                <div className="flex-shrink-0">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faSort} className="text-gray-400 mr-1.5 text-xs" />
                        <select
                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm border border-gray-300 dark:border-gray-600 rounded-lg py-1.5 pl-2 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                        >
                            <option value="date-desc">最新日期</option>
                            <option value="date-asc">最早日期</option>
                            <option value="size-desc">最大尺寸</option>
                            <option value="size-asc">最小尺寸</option>
                            <option value="title-asc">标题 A-Z</option>
                            <option value="title-desc">标题 Z-A</option>
                        </select>
                    </div>
                </div>

                {/* 上传按钮 */}
                <label className="cursor-pointer bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors text-sm ml-auto">
                    <FontAwesomeIcon icon={faUpload} className="mr-1.5" />
                    上传文档
                    <input type="file" className="hidden" onChange={onFileSelect} />
                </label>
            </div>
        </div>
    );
}
