export default function HistoryList({ historyId, historyList, onSelectHistory, onNewHistory }) {
    if (!Array.isArray(historyList)) {
        console.error("historyList is not an array");
        return null; // 或者返回一个空的 div
    }

    return (
        <div className="w-full md:w-1/6 p-4 border-b md:border-b-0 md:border-r">
            <div className="flex justify-center mb-4">
                <button onClick={onNewHistory} className="w-full p-2 bg-gray-300 text-black rounded">
                    +
                </button>
            </div>
            {historyList.map((history) => (
                <button
                    key={history}
                    onClick={() => onSelectHistory(history)}
                    className={`p-2 rounded ${history === historyId ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}
                >
                    {history}
                </button>
            ))}
        </div>
    );
}