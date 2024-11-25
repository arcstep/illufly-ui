export default function MessageHistory({ messages }) {
    return (
        <div className="flex-1 overflow-y-auto mb-4">
            <h3 className="text-md md:text-lg font-bold">消息</h3>
            <ul>
                {messages.map((message) => (
                    <li key={message.id} className="flex items-start mb-4">
                        <div className="mr-2">{message.logo}</div>
                        <div>
                            <div className="font-semibold">{message.name}</div>
                            {message.segments.map((segment, index) => {
                                const content = segment.content;
                                const displayContent = typeof content === 'string' ? content.toUpperCase() : '';
                                return (
                                    <div key={index} className="bg-white shadow-md p-2 mb-2 rounded">
                                        <div className="text-xs text-gray-500">[{segment.type.toUpperCase()}]</div>
                                        <div className="text-sm">{displayContent}</div>
                                        <div className="text-xs text-gray-500">{message.timestamp}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}