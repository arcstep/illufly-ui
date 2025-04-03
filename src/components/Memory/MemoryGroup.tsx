import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMemory, faBook, faSearch } from '@fortawesome/free-solid-svg-icons';
import { getRelativeTime } from '@/utils/time';

interface Memory {
    topic?: string;
    question: string;
    answer: string;
    question_hash: string;
    created_at: number;
}

interface MemoryGroupProps {
    memories: Array<{
        chunk_id: string;
        memory?: Memory;
        results?: any;
        created_at: number;
    }>;
    chunkType: 'memory_retrieve' | 'memory_extract' | 'kg_retrieve' | 'search_results';
}

export default function MemoryGroup({ memories, chunkType }: MemoryGroupProps) {
    const getIcon = () => {
        switch (chunkType) {
            case 'memory_retrieve':
            case 'memory_extract':
                return faMemory;
            case 'kg_retrieve':
                return faBook;
            case 'search_results':
                return faSearch;
            default:
                return faMemory;
        }
    };

    const getTitle = () => {
        switch (chunkType) {
            case 'memory_retrieve':
                return '相关记忆';
            case 'memory_extract':
                return '提取的记忆';
            case 'kg_retrieve':
                return '知识图谱检索结果';
            case 'search_results':
                return '搜索结果';
            default:
                return '记忆片段';
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
                <FontAwesomeIcon icon={getIcon()} className="text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getTitle()}
                </h3>
            </div>
            <div className="space-y-3">
                {memories.map((memory) => {
                    const memoryData = memory.memory || {
                        topic: '记忆片段',
                        question: '未找到问题',
                        answer: '未找到答案',
                        question_hash: memory.chunk_id,
                        created_at: memory.created_at
                    };

                    return (
                        <div
                            key={memory.chunk_id}
                            className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm"
                        >
                            {memoryData.topic && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {memoryData.topic}
                                </div>
                            )}
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                {memoryData.question}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {memoryData.answer}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                {getRelativeTime(memoryData.created_at)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 