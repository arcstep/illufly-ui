import React, { useState, useEffect } from 'react';

export default function SaveButton({ onClick, isContentChanged = true }: { onClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>, isContentChanged: boolean }) {
    const [saveMessage, setSaveMessage] = useState({ show: false, type: 'success', position: { x: 0, y: 0 } });
    const [showButton, setShowButton] = useState(isContentChanged);

    useEffect(() => {
        if (isContentChanged) {
            setShowButton(true);
        }
    }, [isContentChanged]);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        try {
            await onClick?.(event);
            // 显示成功消息
            setSaveMessage({
                show: true,
                type: 'success',
                position: { x: event.clientX, y: event.clientY }
            });
            // 1500ms 后隐藏消息，然后隐藏按钮
            setTimeout(() => {
                setSaveMessage({ show: false, type: 'success', position: { x: 0, y: 0 } });
                setTimeout(() => setShowButton(false), 200); // 在消息消失后再隐藏按钮
            }, 1500);
        } catch (error) {
            // 显示错误消息
            setSaveMessage({
                show: true,
                type: 'error',
                position: { x: event.clientX, y: event.clientY }
            });
            // 1500ms 后隐藏消息
            setTimeout(() => setSaveMessage({ show: false, type: 'error', position: { x: 0, y: 0 } }), 1500);
        }
    };

    if (!showButton) return null;

    return (
        <>
            <button
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                onClick={handleClick}
            >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                保存
            </button>
            {saveMessage.show && (
                <div
                    className={`absolute text-white px-2 py-1 rounded shadow-lg ${saveMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    style={{
                        top: saveMessage.position.y - 30,
                        left: saveMessage.position.x,
                        zIndex: 200
                    }}
                >
                    {saveMessage.type === 'success' ? '保存成功' : '保存失败'}
                </div>
            )}
        </>
    );
}