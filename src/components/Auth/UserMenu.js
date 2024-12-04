import { useState, useEffect, useRef } from 'react';

export default function UserMenu({ username, onLogout, onFetchUser, onRefreshToken }) {
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
                className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600"
                title={username} // 鼠标悬停时显示完整用户名
            >
                {displayName}
            </button>
            {isUserMenuVisible && (
                <div
                    className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg z-50"
                >
                    <button
                        onClick={onFetchUser}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                    >
                        魔法师信息
                    </button>
                    <button
                        onClick={onRefreshToken}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                    >
                        更新魔法令牌
                    </button>
                    <hr className="border-gray-600" />
                    <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-700"
                    >
                        离开梦幻岛
                    </button>
                </div>
            )}
        </div>
    );
}