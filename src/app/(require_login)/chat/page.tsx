'use client';

import { useState, useEffect, JSX, Suspense } from 'react';

import { useAuth } from '@/context/AuthContext';
import HistoryList from '@/components/Chat/HistoryList';
import MessageList from '@/components/Chat/MessageList';
import MessageInput from '@/components/Chat/MessageInput';
import { useChat, ChatProvider } from '@/context/ChatContext';

function Chat(): JSX.Element {
    const { isAuthenticated, changeCurrentPath } = useAuth();
    const { currentThreadId, history, ask } = useChat();
    const [isHistoryListVisible] = useState(true);

    const currentMessages = currentThreadId ? history[currentThreadId]?.chat || [] : [];

    useEffect(() => {
        changeCurrentPath('/chat');
    }, []);

    if (!isAuthenticated) return <div>Loading...</div>;

    return (
        <div className="flex flex-1 flex-col md:flex-row h-full">
            {isHistoryListVisible && (
                <div className="w-full md:w-1/4 h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        <HistoryList />
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 h-full">
                    <MessageList messages={currentMessages} />
                </div>
                <MessageInput onSendMessage={ask} />
            </div>
        </div>

    );
}

// 外层组件只负责提供 Context
export default function ChatContainer() {
    return (
        <Suspense fallback={<div>Chat Loading...</div>}>
            <ChatProvider>
                <Chat />
            </ChatProvider>
        </Suspense>
    )
}