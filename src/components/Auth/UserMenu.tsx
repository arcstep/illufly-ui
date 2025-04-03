import { useState, useEffect, useRef, JSX } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFont, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface UserMenuProps {
    username?: string;
    onLogout: () => void;
}

export default function UserMenu({ username, onLogout }: UserMenuProps): JSX.Element {
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const [isFontSettingVisible, setIsFontSettingVisible] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const { settings, updateFontSize, updateTheme } = useSettings();

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

    const toggleTheme = () => {
        updateTheme(settings.theme === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsUserMenuVisible(!isUserMenuVisible)}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                title={username}
            >
                {displayName}
            </button>
            {isUserMenuVisible && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                    <div
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onClick={toggleFontSetting}
                    >
                        <span>字体大小</span>
                        <FontAwesomeIcon icon={faFont as IconProp} className="text-gray-400 dark:text-gray-500" />
                    </div>

                    {isFontSettingVisible && (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">小</span>
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{settings.fontSize}px</span>
                                <span className="text-lg text-gray-500 dark:text-gray-400">大</span>
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

                    <div
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onClick={toggleTheme}
                    >
                        <span>{settings.theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}</span>
                        <FontAwesomeIcon
                            icon={settings.theme === 'light' ? faMoon as IconProp : faSun as IconProp}
                            className="text-gray-400 dark:text-gray-500"
                        />
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />
                    <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        退出
                    </button>
                </div>
            )}
        </div>
    );
}