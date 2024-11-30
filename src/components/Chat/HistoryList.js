export default function HistoryList({ historyList, onSelectHistory }) {
    if (!Array.isArray(historyList)) {
        console.error("historyList is not an array");
        return null; // 或者返回一个空的 div
    }

    return (
        <div className="w-full md:w-1/6 p-4 border-b md:border-b-0 md:border-r">
            <h2 className="text-lg md:text-xl font-bold mb-4">历史</h2>
            {historyList.map((history) => (
                <button key={history} onClick={() => onSelectHistory(history)}>
                    {history}
                </button>
            ))}
        </div>
    );
}