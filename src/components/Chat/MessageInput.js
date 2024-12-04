import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function MessageInput({ onSendMessage }) {
    const [text, setText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleSendMessage = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) {
                onSendMessage(text);
                setText(''); // 清空输入框
                e.target.style.height = 'auto'; // 重置高度
            }
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    };

    const handleRemoveFile = (fileName) => {
        setSelectedFiles((prevFiles) => prevFiles.filter(file => file.name !== fileName));
    };

    const handleUploadFile = (file) => {
        // 在这里处理单个文件上传逻辑
        console.log('上传文件:', file);
    };

    return (
        <div className="sticky bottom-0 bg-gray-100 p-4 shadow-inner">
            <div className="flex flex-col bg-white p-3 rounded-lg shadow-md">
                {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap mb-2">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600 mr-2 mb-1">
                                <span className="mr-1">{file.name}</span>
                                <button
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => handleRemoveFile(file.name)}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center">
                    <label className="flex items-center cursor-pointer text-blue-500 hover:text-blue-600 mr-2">
                        <FontAwesomeIcon icon={faPaperclip} />
                        <input
                            type="file"
                            className="hidden"
                            multiple
                            onChange={handleFileChange}
                        />
                    </label>
                    <textarea
                        className="flex-1 p-3 m-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition duration-150 ease-in-out"
                        rows="1"
                        style={{ maxHeight: '10em', resize: 'none', overflowY: 'auto' }}
                        placeholder="输入你的消息..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleSendMessage}
                        onInput={(e) => {
                            const textarea = e.target;
                            textarea.style.height = 'auto'; // 重置高度
                            textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`; // 动态调整高度，最大为 10 行
                        }}
                    ></textarea>
                    <button
                        className="bg-blue-400 text-white px-4 py-2 ml-2 rounded-lg shadow-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 transition duration-150 ease-in-out"
                        onClick={(e) => {
                            if (text.trim()) {
                                onSendMessage(text);
                                setText(''); // 清空输入框
                                e.target.previousSibling.style.height = 'auto'; // 重置高度
                            }
                        }}
                    >
                        发送
                    </button>
                </div>
            </div>
        </div>
    );
}