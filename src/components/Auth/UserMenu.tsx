import { useState, useEffect, useRef, JSX } from 'react';

interface UserMenuProps {
    username?: string;
    onLogout: () => void;
}

export default function UserMenu({ username, onLogout }: UserMenuProps): JSX.Element {
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    // 限制显示的用户名长度
    useEffect(() => {
        if (username) {
            setDisplayName(username.length > 10 ? `${username.slice(0, 10)}...` : username);
        } else {
            setDisplayName('未登录');
        }
    }, [username]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
                    <hr className="border-gray-600" />
                    <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-700"
                    >
                        退出
                    </button>
                </div>
            )}
        </div>
    );
}