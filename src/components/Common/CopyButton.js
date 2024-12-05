import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

export default function CopyButton({ content }) {
    const [copySuccess, setCopySuccess] = useState({ show: false, position: { x: 0, y: 0 } });

    const handleCopy = (event) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopySuccess({
                show: true,
                position: { x: event.clientX, y: event.clientY }
            });
            setTimeout(() => setCopySuccess({ show: false, position: { x: 0, y: 0 } }), 500);
        }).catch(err => {
            console.error('复制失败:', err);
        });
    };

    return (
        <>
            <button
                className="ml-2 text-gray-400 hover:text-gray-600 focus:text-gray-800 transition-colors duration-200"
                onClick={handleCopy}
                title="复制内容"
            >
                <FontAwesomeIcon icon={faCopy} />
            </button>
            {copySuccess.show && (
                <div
                    className="absolute bg-green-500 text-white px-2 py-1 rounded shadow-lg"
                    style={{
                        top: copySuccess.position.y - 30,
                        left: copySuccess.position.x,
                        zIndex: 200
                    }}
                >
                    复制成功
                </div>
            )}
        </>
    );
}