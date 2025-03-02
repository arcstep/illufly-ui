'use client';

import React, { useState, useEffect } from 'react';
import CopyButton from '@/components/Common/CopyButton';
import { useApikeys, ApikeysProvider } from '@/context/ApikeysContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function ApikeysPageWrapper() {
    return (
        <div className="p-5 h-screen flex flex-col">
            <ApikeysProvider>
                <ApikeysPageContent />
            </ApikeysProvider>
        </div>
    );
}

function ApikeysPageContent() {
    const { changeCurrentPath } = useAuth();
    const { apikeys, imitators, createApikey, listApikeys, revokeApikey } = useApikeys();
    const [description, setDescription] = useState('');
    const [selectedImitator, setSelectedImitator] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        changeCurrentPath('/apikeys');
    }, [changeCurrentPath]);

    // 当 imitators 加载完成后设置默认值
    useEffect(() => {
        if (imitators && imitators.length > 0 && !selectedImitator) {
            setSelectedImitator(imitators[0]);
        }
    }, [imitators, selectedImitator]);

    const handleCreateApikey = async () => {
        if (!description.trim() || !selectedImitator) return;

        setIsCreating(true);
        try {
            const apiKey = await createApikey(description, selectedImitator);
            console.log('apiKey >>> ', apiKey);
            setDescription('');
            await listApikeys();
        } catch (error) {
            console.error('创建API密钥失败:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevokeApikey = async (key: string) => {
        if (window.confirm('确定要撤销此API密钥吗？此操作无法撤销。')) {
            await revokeApikey(key);
            await listApikeys();
        }
    };

    console.log('apikeys >>> ', apikeys);

    return (
        <>
            <h1 className="text-2xl font-bold mb-4">OpenAI 兼容接口的 API密钥管理</h1>

            {/* 创建新API密钥 */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-2">创建新API密钥</h2>
                <div className="flex flex-col space-y-4">
                    {/* Imitator 选择 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">API兼容模式</label>
                        <div className="flex flex-wrap gap-4">
                            {imitators && imitators.map((imitator) => (
                                <label key={imitator} className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="imitator"
                                        value={imitator}
                                        checked={selectedImitator === imitator}
                                        onChange={() => setSelectedImitator(imitator)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2">{imitator}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">描述（用途）</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="例如：网站集成、移动应用等"
                        />
                    </div>
                    <button
                        onClick={handleCreateApikey}
                        disabled={isCreating || !description.trim() || !selectedImitator}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
                    >
                        {isCreating ? '创建中...' : '创建API密钥'}
                    </button>
                </div>
            </div>

            {/* API密钥列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <h2 className="text-xl font-semibold p-4 border-b">您的API密钥</h2>

                {(apikeys == undefined || apikeys.length === 0) ? (
                    <div className="p-6 text-center text-gray-500">
                        您还没有创建任何API密钥
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用途</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API_KEY</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BASE_URL</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">过期时间</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {apikeys.map((ak) => (
                                    <tr key={ak.api_key}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {ak.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="mr-2 text-sm flex-1 overflow-x-auto">{ak.api_key.slice(0, 8)}...{ak.api_key.slice(-8)}</span>
                                            <CopyButton content={ak.api_key} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="mr-2 text-sm flex-1 overflow-x-auto">{ak.base_url}</span>
                                            <CopyButton content={ak.base_url} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {ak.expires_at ? format(new Date(ak.expires_at * 1000), 'yyyy-MM-dd HH:mm') : '永不过期'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ak.is_expired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {ak.is_expired ? '已过期' : '有效'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleRevokeApikey(ak.api_key)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                撤销
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}