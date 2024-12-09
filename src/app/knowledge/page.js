'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import { get_knowledge_list, get_knowledge } from '../../utils/knowledge';
import KnowledgeCard from '../../components/Knowledge/KnowledgeCard';

export default function KnowledgePage() {
    const { user, logout, fetchUser, refreshToken } = useAuth();
    const [state, setState] = useState({
        knowledgeList: [],
        knowledgeContents: {},
        loading: true,
        error: null,
        pagination: {
            total: 0,
            totalPages: 1,
            currentPage: 1
        },
        filters: {
            tags: [],
            matchAllTags: true
        }
    });
    const [pageSize] = useState(10);

    useEffect(() => {
        loadKnowledgeList();
    }, [state.pagination.currentPage]);

    const loadKnowledgeList = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const params = {
                page: state.pagination.currentPage,
                pageSize,
                sortBy: 'id',
                reverse: false,
                tags: state.filters.tags.length > 0 ? state.filters.tags : null,
                matchAllTags: state.filters.matchAllTags
            };

            const data = await get_knowledge_list(params);

            setState(prev => ({
                ...prev,
                knowledgeList: data.items,
                pagination: {
                    total: data.total || 0,
                    totalPages: data.total_pages || 1,
                    currentPage: data.current_page || 1
                },
                filters: {
                    tags: data.filters?.tags || [],
                    matchAllTags: data.filters?.match_all_tags ?? true
                }
            }));
        } catch (err) {
            console.error('加载知识列表失败:', err);
            setState(prev => ({
                ...prev,
                error: err.message || '加载知识列表失败'
            }));
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    const loadKnowledgeContent = async (knowledgeId) => {
        if (!knowledgeId) return;

        try {
            const data = await get_knowledge(knowledgeId);
            setState(prev => ({
                ...prev,
                knowledgeContents: {
                    ...prev.knowledgeContents,
                    [knowledgeId]: data
                }
            }));
        } catch (err) {
            console.error(`加载知识内容[${knowledgeId}]失败:`, err);
        }
    };

    const handlePageChange = (newPage) => {
        setState(prev => ({
            ...prev,
            pagination: { ...prev.pagination, currentPage: newPage }
        }));
    };

    // 添加标签筛选功能
    const handleTagFilter = (tags, matchAll = true) => {
        setState(prev => ({
            ...prev,
            filters: {
                tags,
                matchAllTags: matchAll
            },
            pagination: { ...prev.pagination, currentPage: 1 }
        }));
    };

    if (!user) return null;

    return (
        <div className="p-5 pt-12 h-screen flex flex-col">
            <Header
                username={user.username}
                onLogout={logout}
                onFetchUser={fetchUser}
                onRefreshToken={refreshToken}
                currentPath="/knowledge"
            />

            {/* 添加标签筛选器 */}
            <div className="px-4 py-2">
                <TagFilter
                    selectedTags={state.filters.tags}
                    matchAllTags={state.filters.matchAllTags}
                    onFilter={handleTagFilter}
                />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
                {state.error ? (
                    <ErrorDisplay error={state.error} onRetry={loadKnowledgeList} />
                ) : state.loading ? (
                    <LoadingSpinner />
                ) : (
                    <KnowledgeGrid
                        knowledgeList={state.knowledgeList}
                        knowledgeContents={state.knowledgeContents}
                        pagination={state.pagination}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    );
}

// 新增的组件
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
    <div className="flex flex-col items-center py-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
            重试
        </button>
    </div>
);

const KnowledgeGrid = ({ knowledgeList, knowledgeContents, pagination, onPageChange }) => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeList.map((knowledge) => (
                <KnowledgeCard
                    key={knowledge.id}
                    knowledge={knowledge}
                />
            ))}
        </div>

        {pagination.totalPages > 1 && (
            <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
            />
        )}
    </>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
    <div className="mt-4 flex justify-center">
        {Array.from({ length: totalPages }, (_, i) => (
            <button
                key={i + 1}
                onClick={() => onPageChange(i + 1)}
                className={`mx-1 px-3 py-1 rounded transition-colors ${currentPage === i + 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                    }`}
            >
                {i + 1}
            </button>
        ))}
    </div>
);

// 添加 TagFilter 组件
const TagFilter = ({ selectedTags, matchAllTags, onFilter }) => {
    const [tags, setTags] = useState(selectedTags);
    const [matchAll, setMatchAll] = useState(matchAllTags);

    // 预设的标签列表，你可以根据需要修改
    const availableTags = [
        'chat_learn',
        'ChatQwen',
        // ... 其他标签
    ];

    const handleTagClick = (tag) => {
        const newTags = tags.includes(tag)
            ? tags.filter(t => t !== tag)
            : [...tags, tag];
        setTags(newTags);
        onFilter(newTags, matchAll);
    };

    const handleMatchAllChange = (e) => {
        const newMatchAll = e.target.checked;
        setMatchAll(newMatchAll);
        onFilter(tags, newMatchAll);
    };

    return (
        <div className="mb-4">
            <div className="flex items-center mb-2">
                <label className="flex items-center text-sm text-gray-600 mr-4">
                    <input
                        type="checkbox"
                        checked={matchAll}
                        onChange={handleMatchAllChange}
                        className="mr-2"
                    />
                    匹配所有标签
                </label>
            </div>
            <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${tags.includes(tag)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>
    );
};