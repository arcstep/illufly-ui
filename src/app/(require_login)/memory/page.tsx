'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMemory, MemoryProvider } from '@/context/MemoryContext';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSettings } from '@/context/SettingsContext';

// 记忆话题卡片组件
function TopicCard({ topic, memories, isExpanded, onToggle }: { topic: string, memories: any[], isExpanded: boolean, onToggle: () => void }) {
    // 获取最新的记忆项来显示更新时间
    const latestMemory = memories.sort((a, b) => b.created_at - a.created_at)[0];
    const topicDate = new Date(latestMemory.created_at * 1000);
    const { settings } = useSettings();

    // 计算问答数量
    const count = memories.length;

    return (
        <div className="rounded-lg shadow-sm transition-all overflow-hidden h-full">
            {/* 卡片头部 */}
            <div
                className={`p-4 cursor-pointer ${isExpanded ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white hover:bg-gray-50 border-l-4 border-transparent'}`}
                onClick={onToggle}
                style={{ fontSize: `${settings.fontSize}px` }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <h3 className="text-lg font-semibold">{topic}</h3>
                        <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            {count} 条记忆
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">{format(topicDate, 'yyyy-MM-dd HH:mm')}</span>
                        <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>

            {/* 卡片展开内容 */}
            {isExpanded && (
                <div className="bg-gray-50 px-3 py-2 animate-fadeIn border-t border-gray-200">
                    {memories.map(memory => (
                        <MemoryCard
                            key={memory.question_hash}
                            memory={memory}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// 记忆问答卡片组件
function MemoryCard({ memory }: { memory: any }) {
    const memoryDate = new Date(memory.created_at * 1000);
    const { settings } = useSettings();

    return (
        <div
            className="bg-white p-3 rounded-lg shadow-sm mb-2 border-l-2 border-gray-200"
            style={{ fontSize: `${settings.fontSize}px` }}
        >
            <div className="mb-2">
                <span className="font-medium text-gray-800">问：</span>
                <span className="text-gray-700">{memory.question}</span>
            </div>
            <div className="mb-2">
                <span className="font-medium text-gray-800">答：</span>
                <span className="text-gray-700">{memory.answer}</span>
            </div>
            <div className="text-right">
                <span className="text-xs text-gray-500">{format(memoryDate, 'yyyy-MM-dd HH:mm')}</span>
            </div>
        </div>
    );
}

function MemoryContent() {
    const { changeCurrentPath } = useAuth();
    const { memories, isLoading, topicGroups, fetchMemories } = useMemory();
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

    useEffect(() => {
        changeCurrentPath('/memory');
        fetchMemories();
    }, []);

    const handleTopicToggle = (topic: string) => {
        setExpandedTopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(topic)) {
                newSet.delete(topic);
            } else {
                newSet.add(topic);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>;
    }

    const topics = Array.from(topicGroups.keys());

    return (
        <div className="p-5 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">记忆库</h1>

            {topics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    暂无记忆，开始对话创建新记忆吧
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topics.map(topic => {
                        const topicMemories = topicGroups.get(topic) || [];
                        const isExpanded = expandedTopics.has(topic);

                        return (
                            <div key={topic} className="mb-4">
                                <TopicCard
                                    topic={topic}
                                    memories={topicMemories}
                                    isExpanded={isExpanded}
                                    onToggle={() => handleTopicToggle(topic)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function MemoryPage() {
    return (
        <MemoryProvider>
            <div className="flex flex-1 flex-col h-full">
                <MemoryContent />
            </div>
        </MemoryProvider>
    );
}
