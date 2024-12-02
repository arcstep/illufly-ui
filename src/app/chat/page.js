'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Chat/Header';
import AgentList from '../../components/Chat/AgentList';
import Tabs from '../../components/Chat/Tabs';
import TabChat from '../../components/Chat/TabChat';
import TabSettings from '../../components/Chat/TabSettings';
import TabLearn from '../../components/Chat/TabLearn';
import TabKnowledge from '../../components/Chat/TabKnowledge';
import TabData from '../../components/Chat/TabData';

export default function Chat() {
    const { user, logout, fetchUser, refreshToken } = useAuth();
    const [isAgentListVisible, setIsAgentListVisible] = useState(true);
    const [isHistoryListVisible, setIsHistoryListVisible] = useState(true);
    const [agent, setAgent] = useState('fake_llm');
    const [selectedTab, setSelectedTab] = useState('chat');

    if (!user) return null;

    return (
        <div className="p-4 md:p-8 h-screen flex flex-col">
            <Header
                isAgentListVisible={isAgentListVisible}
                setIsAgentListVisible={setIsAgentListVisible}
                isHistoryListVisible={isHistoryListVisible}
                setIsHistoryListVisible={setIsHistoryListVisible}
                username={user.username}
                onLogout={logout}
                onFetchUser={fetchUser}
                onRefreshToken={refreshToken}
            />
            <div className="flex flex-1 flex-col md:flex-row h-full">
                {isAgentListVisible && (
                    <AgentList
                        onChangeAgent={setAgent}
                        selected_agent={agent}
                        className="min-h-[100px] flex-shrink-0 overflow-y-auto max-h-full"
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
                                label: '设置',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabSettings agent={agent} setAgent={setAgent} />
                                    </div>
                                ),
                            },
                            {
                                key: 'learn',
                                label: '训练',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabLearn agent={agent} setAgent={setAgent} />
                                    </div>
                                ),
                            },
                            {
                                key: 'knowledge',
                                label: '知识',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabKnowledge agent={agent} setAgent={setAgent} />
                                    </div>
                                ),
                            },
                            {
                                key: 'data',
                                label: '数据',
                                content: (
                                    <div className="flex-1 overflow-y-auto h-full">
                                        <TabData agent={agent} setAgent={setAgent} />
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