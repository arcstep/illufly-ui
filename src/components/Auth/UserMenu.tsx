import { useState, useEffect, useRef, JSX } from 'react';
import { useSettings } from '@/context/SettingsContext';

interface UserMenuProps {
    username?: string;
    onLogout: () => void;
}

export default function UserMenu({ username, onLogout }: UserMenuProps): JSX.Element {
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const [isFontSettingVisible, setIsFontSettingVisible] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const { settings, updateFontSize } = useSettings();

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
                setIsFontSettingVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseInt(e.target.value, 10);
        updateFontSize(newSize);
    };

    const toggleFontSetting = () => {
        setIsFontSettingVisible(!isFontSettingVisible);
    };

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
                    <div
                        className="px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onClick={toggleFontSetting}
                    >
                        <span>字体大小</span>
                        <i className="text-gray-400 fas fa-font"></i>
                    </div>

                    {isFontSettingVisible && (
                        <div className="px-4 py-3 bg-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">小</span>
                                <span className="text-white text-sm">{settings.fontSize}px</span>
                                <span className="text-lg text-gray-400">大</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="20"
                                step="1"
                                value={settings.fontSize}
                                onChange={handleFontSizeChange}
                                className="w-full"
                            />
                        </div>
                    )}

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