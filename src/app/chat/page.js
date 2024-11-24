'use client';

import { useEffect, useState } from 'react';
import { dashboardData } from '../../utils/dashboard';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
    const { user, loading, logout } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstColumnVisible, setIsFirstColumnVisible] = useState(false);
    const [isSecondColumnVisible, setIsSecondColumnVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await dashboardData();
                setData(data);
            } catch (error) {
                console.error('数据加载失败:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <p>加载中...</p>;
    console.log("user", user);
    if (!user) return null;

    return (
        <div className="p-8 h-screen flex flex-col">
            <header className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">对话应用</h1>
                <div>
                    <button
                        onClick={() => setIsFirstColumnVisible(!isFirstColumnVisible)}
                        className="mr-2 bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                    >
                        {isFirstColumnVisible ? '隐藏智能体清单' : '显示智能体清单'}
                    </button>
                    <button
                        onClick={() => setIsSecondColumnVisible(!isSecondColumnVisible)}
                        className="bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                    >
                        {isSecondColumnVisible ? '隐藏对话轮次历史' : '显示对话轮次历史'}
                    </button>
                </div>
            </header>
            <div className="flex flex-1">
                {isFirstColumnVisible && (
                    <div className="w-1/6 p-4 border-r">
                        <h2 className="text-xl font-bold mb-4">智能体清单</h2>
                        {/* 在这里添加智能体清单内容 */}
                    </div>
                )}
                {isSecondColumnVisible && (
                    <div className="w-1/6 p-4 border-r">
                        <h2 className="text-xl font-bold mb-4">对话轮次历史</h2>
                        {/* 在这里添加对话轮次历史内容 */}
                    </div>
                )}
                <div className="flex-1 p-4 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">对话过程</h2>
                    <div className="flex-1 overflow-y-auto mb-4">
                        <h3 className="text-lg font-bold">消息历史</h3>
                        {/* 在这里添加消息历史内容 */}
                    </div>
                    <div className="sticky bottom-0 bg-white">
                        <input
                            type="file"
                            className="mb-2"
                            onChange={(e) => {
                                const files = e.target.files;
                                // 在这里处理文件上传逻辑
                                console.log('上传的文件:', files);
                            }}
                        />
                        <div className="flex items-center">
                            <textarea
                                className="flex-1 p-2 border rounded"
                                rows="1"
                                style={{ maxHeight: '10em', resize: 'none', overflowY: 'auto' }}
                                placeholder="输入你的消息..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        // 在这里处理发送消息的逻辑
                                    }
                                }}
                                onInput={(e) => {
                                    const textarea = e.target;
                                    textarea.style.height = 'auto'; // 重置高度
                                    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`; // 动态调整高度，最大为 10 行
                                }}
                            ></textarea>
                            <button className="bg-blue-500 text-white px-4 py-2 ml-2 rounded hover:bg-blue-600">
                                发送
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}