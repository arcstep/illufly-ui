'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { get_knowledge, update_knowledge } from '@/utils/knowledge';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import MarkdownRenderer from '@/components/Knowledge/MarkdownRenderer';
import SaveButton from '@/components/Common/SaveButton';
import TagEditor from '@/components/Knowledge/TagEditor';

export default function KnowledgeEdit() {
    const { isAuthenticated, changeCurrentPath } = useAuth();

    const [loading, setLoading] = useState(true);
    const [knowledge, setKnowledge] = useState(null);
    const [markdownContent, setMarkdownContent] = useState('');
    const [knowledgeId, setKnowledgeId] = useState(null);
    const previewRef = useRef(null);
    const [isContentChanged, setIsContentChanged] = useState(false);
    const [initialContent, setInitialContent] = useState('');
    const [tags, setTags] = useState([]);
    const [isTagsChanged, setIsTagsChanged] = useState(false);
    const [summaryContent, setSummaryContent] = useState('');
    const [initialSummary, setInitialSummary] = useState('');
    const [isSummaryChanged, setIsSummaryChanged] = useState(false);
    const summaryPreviewRef = useRef(null);
    const [activeEditor, setActiveEditor] = useState(null);

    useEffect(() => {
        changeCurrentPath('/knowledge');

        if (typeof window !== 'undefined') {
            const { searchParams } = new URL(window.location.href);
            const id = searchParams.get('knowledge_id');
            setKnowledgeId(id);
            loadKnowledgeContent(id);
        }
    }, [fetchUser]);

    const loadKnowledgeContent = async (id) => {
        if (!id) return;

        setLoading(true);
        try {
            const response = await get_knowledge(id);
            if (response?.content) {
                const content = response.content.text;
                const summary = response.content.meta.summary || '';
                const currentTags = response.content.meta.tags || [];
                setKnowledge(response);
                setMarkdownContent(content);
                setInitialContent(content);
                setSummaryContent(summary);
                setInitialSummary(summary);
                setTags(currentTags);
                setIsContentChanged(false);
                setIsSummaryChanged(false);
                setIsTagsChanged(false);
            }
        } catch (err) {
            console.error('Error loading knowledge content:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkdownChange = (event) => {
        const newContent = event.target.value;
        setMarkdownContent(newContent);
        setIsContentChanged(newContent !== initialContent);
        syncScroll(event.target);
    };

    const syncScroll = (textarea) => {
        if (previewRef.current) {
            const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
            const previewScrollHeight = previewRef.current.scrollHeight - previewRef.current.clientHeight;
            previewRef.current.scrollTop = scrollPercentage * previewScrollHeight;
        }
    };

    const handleTagsChange = (newTags) => {
        const originalTags = knowledge?.content?.meta?.tags || [];
        const tagsChanged = JSON.stringify(newTags) !== JSON.stringify(originalTags);
        setTags(newTags);
        setIsTagsChanged(tagsChanged);
    };

    const handleSummaryChange = (event) => {
        const newSummary = event.target.value;
        setSummaryContent(newSummary);
        setIsSummaryChanged(newSummary !== initialSummary);
        syncSummaryScroll(event.target);
    };

    const syncSummaryScroll = (textarea) => {
        if (summaryPreviewRef.current) {
            const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
            const previewScrollHeight = summaryPreviewRef.current.scrollHeight - summaryPreviewRef.current.clientHeight;
            summaryPreviewRef.current.scrollTop = scrollPercentage * previewScrollHeight;
        }
    };

    const handleSave = async () => {
        if (!knowledgeId) {
            console.error('Knowledge ID is not set');
            throw new Error('Knowledge ID is not set');
        }

        try {
            await update_knowledge(
                knowledgeId,
                {
                    content: isContentChanged ? markdownContent : null,
                    tags: isTagsChanged ? tags : null,
                    summary: isSummaryChanged ? summaryContent : null,
                }
            );
            setInitialContent(markdownContent);
            setInitialSummary(summaryContent);
            setIsContentChanged(false);
            setIsSummaryChanged(false);
            setIsTagsChanged(false);
            await loadKnowledgeContent(knowledgeId);
            return true;
        } catch (error) {
            console.error('知识更新失败:', error);
            throw error;
        }
    };

    if (!isAuthenticated) return <div>Loading...</div>;

    return (
        <main className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <div className="flex flex-col space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-6">
                                <Link
                                    href="/knowledge"
                                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    返回
                                </Link>
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <span className="font-medium">文档ID:</span>
                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">{knowledgeId}</code>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 px-2">
                            <span className="font-medium text-gray-600">标签:</span>
                            <div className="flex-1">
                                <TagEditor
                                    tags={tags}
                                    onChange={handleTagsChange}
                                />
                            </div>
                            <SaveButton
                                onClick={handleSave}
                                isContentChanged={isContentChanged || isTagsChanged || isSummaryChanged}
                            />
                        </div>
                    </div>
                </div>
                {!loading && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h2 className="text-sm font-medium text-gray-700">文档摘要</h2>
                                <button
                                    onClick={() => setActiveEditor(activeEditor === 'summary' ? null : 'summary')}
                                    className={`text-sm px-3 py-1 rounded-md transition-colors ${activeEditor === 'summary'
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {activeEditor === 'summary' ? '完成编辑' : '编辑摘要'}
                                </button>
                            </div>
                            <div className="p-4">
                                {activeEditor === 'summary' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div
                                            ref={summaryPreviewRef}
                                            className="prose prose-sm max-w-none"
                                        >
                                            <MarkdownRenderer content={summaryContent} />
                                        </div>
                                        <div className="flex flex-col">
                                            <textarea
                                                className="w-full h-[200px] p-4 border rounded-lg resize-none 
                                                            font-mono text-sm focus:ring-1 focus:ring-blue-500
                                                            focus:border-blue-500"
                                                value={summaryContent}
                                                onChange={handleSummaryChange}
                                                onScroll={(e) => syncSummaryScroll(e.target)}
                                                placeholder="在此输入文档摘要..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none">
                                        <MarkdownRenderer content={summaryContent} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h2 className="text-sm font-medium text-gray-700">正文内容</h2>
                                <button
                                    onClick={() => setActiveEditor(activeEditor === 'content' ? null : 'content')}
                                    className={`text-sm px-3 py-1 rounded-md transition-colors ${activeEditor === 'content'
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {activeEditor === 'content' ? '完成编辑' : '编辑正文'}
                                </button>
                            </div>
                            <div className="p-4">
                                {activeEditor === 'content' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div
                                            ref={previewRef}
                                            className="prose prose-sm max-w-none"
                                        >
                                            <MarkdownRenderer content={markdownContent} />
                                        </div>
                                        <div className="flex flex-col">
                                            <textarea
                                                className="w-full h-[500px] p-4 border rounded-lg resize-none 
                                                            font-mono text-sm focus:ring-1 focus:ring-blue-500
                                                            focus:border-blue-500"
                                                value={markdownContent}
                                                onChange={handleMarkdownChange}
                                                onScroll={(e) => syncScroll(e.target)}
                                                placeholder="在此输入正文内容..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none">
                                        <MarkdownRenderer content={markdownContent} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}