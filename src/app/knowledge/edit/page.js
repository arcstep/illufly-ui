'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { get_markmeta_file, update_markmeta_file } from '../../../utils/markmeta';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import MarkdownRenderer from '../../../components/MarkMeta/MarkdownRenderer';
import SaveButton from '../../../components/Common/SaveButton';

export default function KnowledgeEdit() {
    const { user, logout, fetchUser, refreshToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [markdownContent, setMarkdownContent] = useState('');
    const [knowledgeId, setKnowledgeId] = useState(null);
    const previewRef = useRef(null);
    const [isContentChanged, setIsContentChanged] = useState(false);
    const [initialContent, setInitialContent] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const { searchParams } = new URL(window.location.href);
            const id = searchParams.get('knowledge_id');
            setKnowledgeId(id);
            loadFileContent(id);
        }
    }, [fetchUser]);

    const loadFileContent = (id) => {
        if (!id) return;

        get_markmeta_file(
            id,
            (response) => {
                try {
                    if (response?.data?.content) {
                        const content = response.data.content;
                        setMarkdownContent(content);
                        setInitialContent(content);
                        setIsContentChanged(false);
                    }
                } catch (err) {
                    console.error('Error processing files:', err);
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error('Error loading file content:', error);
            },
        );
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

    const handleSave = async (event) => {
        if (!knowledgeId) {
            console.error('Knowledge ID is not set');
            throw new Error('Knowledge ID is not set');
        }

        return new Promise((resolve, reject) => {
            update_markmeta_file(
                knowledgeId,
                markdownContent,
                (response) => {
                    console.log('文件更新成功:', response);
                    setInitialContent(markdownContent);
                    setIsContentChanged(false);
                    resolve(response);
                },
                (error) => {
                    console.error('文件更新失败:', error);
                    reject(error);
                }
            );
        });
    };

    const handleCancel = () => {
        console.log('取消编辑');
    };

    return (
        <div className="p-5 h-screen flex flex-col bg-gray-50">
            <div className="h-10"></div>
            <Header
                username={user?.username || '加载中...'}
                onLogout={logout}
                onFetchUser={fetchUser}
                onRefreshToken={refreshToken}
                currentPath="/knowledge"
            />
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
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
                        <div className="flex space-x-3">
                            <SaveButton
                                onClick={handleSave}
                                isContentChanged={isContentChanged}
                            />
                        </div>
                    </div>
                </div>
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-gray-500">加载中...</div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                        <div className="flex-1 flex flex-col h-[calc(50vh-8rem)] lg:h-[calc(100vh-12rem)]">
                            <div className="mb-2 text-sm font-medium text-gray-700">编辑区</div>
                            <div className="flex-1 bg-white rounded-lg shadow-sm">
                                <textarea
                                    className="w-full h-full p-4 border-0 rounded-lg resize-none font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={markdownContent}
                                    onChange={handleMarkdownChange}
                                    onScroll={(e) => syncScroll(e.target)}
                                    placeholder="在此输入 Markdown 内容..."
                                />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col h-[calc(50vh-8rem)] lg:h-[calc(100vh-12rem)]">
                            <div className="mb-2 text-sm font-medium text-gray-700">预览区</div>
                            <div
                                ref={previewRef}
                                className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm p-4"
                            >
                                <MarkdownRenderer content={markdownContent} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}