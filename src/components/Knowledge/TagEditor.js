import React, { useState, useRef, useEffect } from 'react';

export default function TagEditor({ tags = [], onChange }) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                onChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (indexToRemove) => {
        onChange(tags.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="flex items-center flex-wrap gap-2">
            {tags.map((tag, index) => (
                <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs flex items-center group"
                >
                    {tag}
                    <button
                        onClick={() => removeTag(index)}
                        className="ml-1 text-blue-400 hover:text-blue-600"
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="outline-none border-none bg-transparent text-sm min-w-20 flex-grow"
                placeholder={tags.length === 0 ? "输入标签后按回车添加" : ""}
            />
        </div>
    );
}