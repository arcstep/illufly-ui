'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMemory, MemoryProvider } from '@/context/MemoryContext';
import { format } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';

// 记忆编辑对话框组件
function EditMemoryDialog({ memory, isOpen, onClose, onSave }: {
    memory: any,
    isOpen: boolean,
    onClose: () => void,
    onSave: (updatedMemory: any) => void
}) {
    const [topic, setTopic] = useState(memory?.topic || '');
    const [question, setQuestion] = useState(memory?.question || '');
    const [answer, setAnswer] = useState(memory?.answer || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (memory) {
            setTopic(memory.topic || '');
            setQuestion(memory.question || '');
            setAnswer(memory.answer || '');
        }
    }, [memory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const updatedMemory = {
            ...memory,
            topic,
            question,
            answer
        };

        await onSave(updatedMemory);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">编辑记忆</h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            主题
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            问题
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="w-full p-2 border rounded-lg h-24"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            答案
                        </label>
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            className="w-full p-2 border rounded-lg h-32"
                            required
                        />
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded-lg"
                            disabled={isSaving}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            disabled={isSaving}
                        >
                            {isSaving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// 删除确认对话框组件
function DeleteConfirmDialog({ isOpen, onClose, onConfirm, isDeleting }: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => void,
    isDeleting: boolean
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">确认删除</h2>
                <p className="mb-6">确定要删除这条记忆吗？此操作无法撤销。</p>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded-lg"
                        disabled={isDeleting}
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        disabled={isDeleting}
                    >
                        {isDeleting ? '删除中...' : '删除'}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
                            key={memory.memory_id}
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
    const { updateMemory, deleteMemory } = useMemory();
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleEdit = () => {
        setShowEditDialog(true);
    };

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

    const handleSave = async (updatedMemory: any) => {
        const success = await updateMemory(updatedMemory);
        if (success) {
            // 可以在这里显示提示信息
            console.log('记忆更新成功');
        } else {
            console.error('记忆更新失败');
            // 可以在这里显示错误提示
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        const success = await deleteMemory(memory.memory_id);
        setIsDeleting(false);

        if (success) {
            console.log('记忆删除成功');
            setShowDeleteDialog(false);
        } else {
            console.error('记忆删除失败');
            // 显示错误提示
        }
    };

    return (
        <div
            className="bg-white p-3 rounded-lg shadow-sm mb-2 border-l-2 border-gray-200 relative"
            style={{ fontSize: `${settings.fontSize}px` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 显示距离信息（优先） */}
            {memory.distance !== undefined && memory.distance != null && (
                <div className="absolute top-0 right-0 bg-green-100 text-green-800 text-xs px-2 py-1 m-1 rounded-full">
                    距离: {memory.distance.toFixed(3)}
                </div>
            )}

            <div className="mb-2">
                <span className="font-medium text-gray-800">问：</span>
                <span className="text-gray-700">{memory.question}</span>
            </div>
            <div className="mb-2">
                <span className="font-medium text-gray-800">答：</span>
                <span className="text-gray-700">{memory.answer}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{format(memoryDate, 'yyyy-MM-dd HH:mm')}</span>

                <div className={`flex space-x-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button
                        onClick={handleEdit}
                        className="text-xs text-blue-600 hover:text-blue-800"
                    >
                        编辑
                    </button>
                    <button
                        onClick={handleDelete}
                        className="text-xs text-red-600 hover:text-red-800"
                    >
                        删除
                    </button>
                </div>
            </div>

            {/* 编辑对话框 */}
            <EditMemoryDialog
                memory={memory}
                isOpen={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                onSave={handleSave}
            />

            {/* 删除确认对话框 */}
            <DeleteConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}

// 搜索结果组件
function SearchResults({ results, onClearSearch }: { results: any[], onClearSearch: () => void }) {
    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">搜索结果 ({results.length})</h2>
                <button
                    onClick={onClearSearch}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    返回所有记忆
                </button>
            </div>

            {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    没有找到相关记忆
                </div>
            ) : (
                <div className="space-y-3">
                    {results.map((memory) => (
                        <MemoryCard
                            key={memory.memory_id}
                            memory={memory}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function MemoryContent() {
    const { changeCurrentPath } = useAuth();
    const { isLoading, topicGroups, fetchMemories, searchMemories, isSearching } = useMemory();
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [threshold, setThreshold] = useState(1.5);
    const [topK, setTopK] = useState(15);
    const [showAdvanced, setShowAdvanced] = useState(false);

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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        const results = await searchMemories(searchQuery, threshold, topK);
        setSearchResults(results);
        setHasSearched(true);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setHasSearched(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // 回车键且没有按Shift键
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // 阻止默认的换行行为
            if (searchQuery.trim() && !isSearching) {
                handleSearch(e as any);
            }
        }
        // Shift+回车会默认处理，插入一个换行符
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>;
    }

    const topics = Array.from(topicGroups.keys());

    return (
        <div className="p-5 h-full overflow-y-auto">
            {/* 搜索部分 - 居中显示 */}
            <div className="max-w-2xl mx-auto mb-8">
                <form onSubmit={handleSearch} className="w-full">
                    <div className="relative">
                        <textarea
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="输入问题或关键词搜索相似记忆... (回车搜索，Shift+回车换行)"
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            style={{
                                minHeight: '2.5rem',
                                maxHeight: 'calc(5 * 1.5rem + 1.5rem)',
                                height: 'auto',
                                overflowY: searchQuery.split('\n').length > 5 ? 'scroll' : 'hidden'
                            }}
                            rows={Math.min(5, Math.max(1, searchQuery.split('\n').length))}
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 focus:outline-none transition-colors duration-200"
                            disabled={isSearching || !searchQuery.trim()}
                            title="基于语义相似度搜索"
                        >
                            {isSearching ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* 高级搜索选项切换按钮 */}
                    <div className="flex justify-end mt-1">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
                        </button>
                    </div>

                    {/* 高级搜索选项 */}
                    {showAdvanced && (
                        <div className="mt-2 grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                    距离阈值 (0.1-2.0)
                                    <span className="ml-1 text-gray-400">小值=更相似</span>
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="2.0"
                                        step="0.1"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        className="w-full mr-2"
                                    />
                                    <span className="text-xs w-10 text-center bg-white px-1 py-0.5 rounded border">{threshold}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                    结果数量 (1-50)
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        step="1"
                                        value={topK}
                                        onChange={(e) => setTopK(parseInt(e.target.value))}
                                        className="w-full mr-2"
                                    />
                                    <span className="text-xs w-10 text-center bg-white px-1 py-0.5 rounded border">{topK}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {hasSearched ? (
                <SearchResults
                    results={searchResults}
                    onClearSearch={handleClearSearch}
                />
            ) : (
                topics.length === 0 ? (
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
                )
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
