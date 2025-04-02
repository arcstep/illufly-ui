'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMemory, MemoryProvider } from '@/context/MemoryContext';
import { format } from 'date-fns';

function TopicCard({ topic, isSelected, onSelect }: { topic: any, isSelected: boolean, onSelect: (topicId: string) => void }) {
    const topicDate = new Date(topic.created_at);

    return (
        <div
            className={`mb-4 p-4 rounded-lg shadow-md transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white hover:bg-gray-50'
                }`}
            onClick={() => onSelect(topic.topic_id)}
        >
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">{topic.title}</h3>
                <span className="text-sm text-gray-500">{format(topicDate, 'yyyy-MM-dd HH:mm')}</span>
            </div>
            <p className="text-gray-600 mt-2">{topic.content}</p>
        </div>
    );
}

function QACard({ qa }: { qa: any }) {
    const qaDate = new Date(qa.created_at);

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-3 ml-8 border-l-2 border-gray-200">
            <div className="mb-2">
                <span className="font-medium text-gray-800">问：</span>
                <span>{qa.question}</span>
            </div>
            <div className="mb-2">
                <span className="font-medium text-gray-800">答：</span>
                <span>{qa.answer}</span>
            </div>
            <div className="text-right">
                <span className="text-xs text-gray-500">{format(qaDate, 'yyyy-MM-dd HH:mm')}</span>
            </div>
        </div>
    );
}

function MemoryContent() {
    const { changeCurrentPath } = useAuth();
    const { topics, selectedTopic, selectedQAs, listTopics, listQAs } = useMemory();
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

    useEffect(() => {
        changeCurrentPath('/memory');
        listTopics();
    }, []);

    const handleTopicClick = (topicId: string) => {
        if (expandedTopicId === topicId) {
            // 如果已经展开，则关闭
            setExpandedTopicId(null);
        } else {
            // 否则展开并加载问答
            setExpandedTopicId(topicId);
            listQAs(topicId);
        }
    };

    return (
        <div className="p-5 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">记忆库</h1>

            {topics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    暂无记忆话题，开始对话创建新记忆吧
                </div>
            ) : (
                <div>
                    {topics.map(topic => (
                        <div key={topic.topic_id}>
                            <TopicCard
                                topic={topic}
                                isSelected={expandedTopicId === topic.topic_id}
                                onSelect={handleTopicClick}
                            />

                            {expandedTopicId === topic.topic_id && (
                                <div className="mb-6 animate-fadeIn">
                                    {selectedQAs.length > 0 ? (
                                        selectedQAs.map(qa => (
                                            <QACard key={qa.memory_id} qa={qa} />
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500 ml-8">
                                            该话题暂无问答记录
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
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
