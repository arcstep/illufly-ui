'use client';

import { useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import AgentList from '../../components/Chat/AgentList';
import MiniAgentList from '../../components/Chat/MiniAgentList';
import Tabs from '../../components/Chat/Tabs';
import TabChat from '../../components/Chat/TabChat';
import TabModel from '../../components/Chat/TabModel';
import TabPrompt from '../../components/Chat/TabPrompt';

export default function Chat() {
    const { user, logout, fetchUser, refreshToken } = useAuth();
    const [isAgentListVisible, setIsAgentListVisible] = useState(true);
    const [isHistoryListVisible, setIsHistoryListVisible] = useState(false);
    const [agent, setAgent] = useState('fake_llm');
    const [selectedTab, setSelectedTab] = useState('chat');

    if (!user) return null;

    return (
        <div className="p-10 h-screen flex flex-col">
            <Header
                username={user.username}
                onLogout={logout}
                onFetchUser={fetchUser}
                onRefreshToken={refreshToken}
                currentPath="/chat"
            />
            <div className="flex flex-1 flex-col md:flex-row h-full">
                {isAgentListVisible ? (
                    <AgentList
                        onChangeAgent={setAgent}
                        selected_agent={agent}
                        setIsAgentListVisible={setIsAgentListVisible}
                        isAgentListVisible={isAgentListVisible}
                        setIsHistoryListVisible={setIsHistoryListVisible}
                        isHistoryListVisible={isHistoryListVisible}
                    />
                ) : (
                    <MiniAgentList
                        agents={[
                            { id: 'fake_llm', name: '模拟', icon: '🤖' },
                            { id: 'chat', name: '聊天', icon: '💬' },
                            { id: 'learn', name: '训练', icon: '🧑‍🎓' }
                        ]}
                        onChangeAgent={setAgent}
                        selected_agent={agent}
                        toggleAgentList={() => setIsAgentListVisible(!isAgentListVisible)}
                        toggleHistoryList={() => setIsHistoryListVisible(!isHistoryListVisible)}
                        isAgentListVisible={isAgentListVisible}
                        isHistoryListVisible={isHistoryListVisible}
                    />
                )}
                <div className="flex-1 flex flex-col overflow-y-auto h-full">
                    <Tabs
                        tabs={[
                            {
                                key: 'chat',
                                label: '对话',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabChat agent={agent} setAgent={setAgent} isHistoryListVisible={isHistoryListVisible} />
                                    </div>
                                ),
                            },
                            {
                                key: 'settings',
                                label: '模型',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabModel agent={agent} setAgent={setAgent} />
                                    </div>
                                ),
                            },
                            {
                                key: 'learn',
                                label: '提示语',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabPrompt agent={agent} setAgent={setAgent} />
                                    </div>
                                ),
                            },
                        ]}
                        selectedTab={selectedTab}
                        onSelectTab={setSelectedTab}
                    />
                </div>
            </div>
        </div>
    );
}