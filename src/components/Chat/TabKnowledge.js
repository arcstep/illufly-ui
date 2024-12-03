import React, { useState, useEffect } from 'react';
import { get_markmeta_files, get_markmeta_file } from '../../utils/markmeta';
import MarkdownRenderer from '../MarkMeta/MarkdownRenderer';

export default function TabKnowledge({ agent, setAgent }) {
    const [files, setFiles] = useState([]);
    const [fileContents, setFileContents] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = () => {
        setLoading(true);
        setError(null);

        get_markmeta_files(
            (response) => {
                try {
                    if (!response?.data?.files) {
                        throw new Error('Invalid API response structure');
                    }

                    const filePaths = response.data.files;
                    if (!Array.isArray(filePaths)) {
                        throw new Error('Files is not an array');
                    }

                    const fileObjects = filePaths.map(path => ({
                        path: path,
                        name: path.split('/').pop(),
                        lastModified: new Date().toISOString()
                    }));

                    setFiles(fileObjects);
                    fileObjects.forEach(file => loadFileContent(file));
                } catch (err) {
                    console.error('Error processing files:', err);
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error('API Error:', error);
                setError(error.message || '获取文件列表失败');
                setLoading(false);
            }
        );
    };

    const loadFileContent = (file) => {
        if (!file?.path) return;

        get_markmeta_file(
            file.path,
            (response) => {
                if (response?.data?.content) {
                    setFileContents(prev => ({
                        ...prev,
                        [file.path]: response.data.content
                    }));
                }
            },
            (error) => {
                console.error('Error loading file content:', error);
            }
        );
    };

    if (error) {
        return (
            <div className="flex-1 p-4">
                <div className="text-red-500">错误: {error}</div>
                <button
                    onClick={loadFiles}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
            <h2 className="text-xl font-bold mb-4">知识库</h2>

            {loading ? (
                <div className="text-center py-4">加载中...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {files.map((file) => (
                        <div
                            key={file.path}
                            className="border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 bg-white"
                        >
                            <div className="mb-2">
                                <h3 className="font-medium text-gray-900 truncate">
                                    {file.name}
                                </h3>
                                <div className="text-xs text-gray-500 flex justify-between">
                                    <span>{new Date(file.lastModified).toLocaleString()}</span>
                                    <span>{fileContents[file.path]?.length || 0} 字</span>
                                </div>
                            </div>

                            <div className="h-32 overflow-hidden relative">
                                <MarkdownRenderer
                                    content={fileContents[file.path] || '加载中...'}
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8">
                <form>
                    <div>
                        <p><label>经验知识清单</label></p>
                        <p><label>从其他智能体分享知识</label></p>
                        <p><label>从已有网站获取知识</label></p>
                        <p><label>上传文件并转化为知识</label></p>
                        <p><label>从其他对话学习知识</label></p>
                        <p><input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} /></p>
                    </div>
                </form>
            </div>
        </div>
    );
}