import { useState, useEffect, useRef } from 'react';

export default function UserMenu({ username, onLogout }) {
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const menuRef = useRef(null);

    // 限制显示的用户名长度
    const displayName = username.length > 10 ? `${username.slice(0, 10)}...` : username;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsUserMenuVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsUserMenuVisible(!isUserMenuVisible)}
                className="bg-gray-300 text-black px-2 py-1 rounded hover:bg-gray-400"
                title={username} // 鼠标悬停时显示完整用户名
            >
                {displayName}
            </button>
            {isUserMenuVisible && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg">
                    <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                        退出
                    </button>
                </div>
            )}
        </div>
    );
}