import { useState, useEffect, useRef, JSX } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFont, faSun, faMoon, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useAuth } from '@/context/AuthContext';

export default function UserMenu(): JSX.Element {
    const { user, logout } = useAuth();
    const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
    const [isFontSettingVisible, setIsFontSettingVisible] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [tempFontSize, setTempFontSize] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { settings, updateFontSize, updateTheme, updateAutoPlayTTS } = useSettings();

    // 固定样式
    const rootStyle = {
        fontSize: '14px',
    };

    const menuButtonStyle = {
        fontSize: '14px',
    };

    const menuItemStyle = {
        fontSize: '14px',
    };

    const fontSettingStyle = {
        fontSize: '14px',
    };

    // 限制显示的用户名长度
    useEffect(() => {
        console.log("UserMenu接收用户信息:", user);
        const username = user?.username;
        if (username) {
            setDisplayName(username.length > 10 ? `${username.slice(0, 10)}...` : username);
        } else {
            setDisplayName('未登录');
        }
    }, [user]);

    // 初始化临时字体大小
    useEffect(() => {
        if (tempFontSize === null && settings.fontSize) {
            setTempFontSize(settings.fontSize);
        }
    }, [settings.fontSize, tempFontSize]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                // 关闭菜单时，应用临时字体大小
                if (isUserMenuVisible && tempFontSize !== null && tempFontSize !== settings.fontSize) {
                    updateFontSize(tempFontSize);
                }
                setIsUserMenuVisible(false);
                setIsFontSettingVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuVisible, tempFontSize, settings.fontSize, updateFontSize]);

    // 处理字体大小的临时更改
    const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setTempFontSize(newSize);
    };

    const toggleFontSetting = () => {
        setIsFontSettingVisible(!isFontSettingVisible);
    };

    const toggleTheme = () => {
        updateTheme(settings.theme === 'light' ? 'dark' : 'light');
        // 切换主题后立即关闭菜单
        setIsUserMenuVisible(false);
        setIsFontSettingVisible(false);
    };

    // 关闭菜单并应用字体大小设置
    const closeMenuAndApplySettings = () => {
        if (tempFontSize !== null && tempFontSize !== settings.fontSize) {
            updateFontSize(tempFontSize);
        }
        setIsUserMenuVisible(false);
        setIsFontSettingVisible(false);
    };

    // 添加切换自动播放语音的处理函数
    const toggleAutoPlayTTS = () => {
        updateAutoPlayTTS(!settings.autoPlayTTS);
        setIsUserMenuVisible(false);
    };

    return (
        <div className="relative flex items-center" ref={menuRef} style={rootStyle}>
            {/* 自动播放状态指示器 */}
            {settings.autoPlayTTS && (
                <div className="mr-2 flex items-center text-blue-500 dark:text-blue-400 rounded-full p-1" title="自动播放语音已开启">
                    <FontAwesomeIcon icon={faVolumeUp as IconProp} size="xs" />
                </div>
            )}

            <button
                onClick={() => setIsUserMenuVisible(!isUserMenuVisible)}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center"
                title={displayName || undefined}
                style={menuButtonStyle}
            >
                {displayName}
            </button>
            {isUserMenuVisible && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 top-full">
                    <div
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onClick={toggleFontSetting}
                        style={menuItemStyle}
                    >
                        <span>字体大小</span>
                        <FontAwesomeIcon icon={faFont as IconProp} className="text-gray-400 dark:text-gray-500" />
                    </div>

                    {isFontSettingVisible && (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700" style={fontSettingStyle}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">小</span>
                                <span className="text-gray-700 dark:text-gray-300 text-sm">{tempFontSize}px</span>
                                <span className="text-lg text-gray-500 dark:text-gray-400">大</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="20"
                                step="1"
                                value={tempFontSize ?? settings.fontSize}
                                onChange={handleFontSizeChange}
                                className="w-full"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={closeMenuAndApplySettings}
                                    className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                >
                                    应用
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onClick={toggleTheme}
                        style={menuItemStyle}
                    >
                        <span>{settings.theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}</span>
                        <FontAwesomeIcon
                            icon={settings.theme === 'light' ? faMoon as IconProp : faSun as IconProp}
                            className="text-gray-400 dark:text-gray-500"
                        />
                    </div>

                    <div
                        className={`px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between ${settings.autoPlayTTS ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                        onClick={toggleAutoPlayTTS}
                        style={menuItemStyle}
                    >
                        <span>{settings.autoPlayTTS ? '关闭自动播放语音' : '开启自动播放语音'}</span>
                        <FontAwesomeIcon
                            icon={(settings.autoPlayTTS ? faVolumeUp : faVolumeMute) as IconProp}
                            className={`${settings.autoPlayTTS ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
                        />
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />
                    <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        style={menuItemStyle}
                    >
                        退出
                    </button>
                </div>
            )}
        </div>
    );
}