'use client';

import { useState, useEffect, JSX, Suspense } from 'react';

import HistoryList from '@/components/Chat/HistoryList';
import MessageList from '@/components/Chat/MessageList';
import MessageInput from '@/components/Chat/MessageInput';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';

function Chat(): JSX.Element {
    const { isAuthenticated, changeCurrentPath } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // 处理历史面板折叠状态变化的回调
    const handleCollapseChange = (isCollapsed: boolean) => {
        setCollapsed(isCollapsed);
    };

    useEffect(() => {
        changeCurrentPath('/chat');
    }, []);

    if (!isAuthenticated) return <div>Loading...</div>;

    return (
        <div className="flex flex-1 h-full">
            <div className={`flex h-full ${collapsed ? 'w-auto' : 'w-full md:w-1/4'}`}>
                <HistoryList onCollapseChange={handleCollapseChange} />
            </div>
            <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 h-full">
                    <MessageList />
                </div>
                <MessageInput />
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