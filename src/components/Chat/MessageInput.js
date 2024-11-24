export default function MessageInput() {
    return (
        <div className="sticky bottom-0 bg-white">
            <input
                type="file"
                className="mb-2"
                onChange={(e) => {
                    const files = e.target.files;
                    // 在这里处理文件上传逻辑
                    console.log('上传的文件:', files);
                }}
            />
            <div className="flex items-center">
                <textarea
                    className="flex-1 p-2 border rounded"
                    rows="1"
                    style={{ maxHeight: '10em', resize: 'none', overflowY: 'auto' }}
                    placeholder="输入你的消息..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            // 在这里处理发送消息的逻辑
                        }
                    }}
                    onInput={(e) => {
                        const textarea = e.target;
                        textarea.style.height = 'auto'; // 重置高度
                        textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`; // 动态调整高度，最大为 10 行
                    }}
                ></textarea>
                <button className="bg-blue-500 text-white px-4 py-2 ml-2 rounded hover:bg-blue-600">
                    发送
                </button>
            </div>
        </div>
    );
}