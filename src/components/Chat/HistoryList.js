export default function HistoryList({ historyId, historyList, onSelectHistory, onNewHistory }) {
    if (!Array.isArray(historyList)) {
        console.error("historyList is not an array");
        return null; // 或者返回一个空的 div
    }

    return (
        <div className="w-full max-w-xs p-4 border-b md:border-b-0 md:border-r flex flex-col h-full">
            <div className="flex justify-center mb-4">
                <button onClick={onNewHistory} className="w-full p-2 bg-gray-300 text-black rounded">
                    + 新建对话
                </button>
            </div>
            <div className="flex-1 overflow-y-auto md:max-h-none max-h-64 min-h-32">
                {historyList.map((history) => (
                    <button
                        key={history}
                        onClick={() => onSelectHistory(history)}
                        className={`p-2 rounded mb-1 ${history === historyId ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}
                    >
                        {history}
                    </button>
                ))}
            </div>
        </div>
    );
}