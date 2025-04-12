'use client'

import { createContext, useState, useContext, useEffect, ReactNode } from 'react'

// 定义Settings类型
interface Settings {
    fontSize: number;
    theme: 'light' | 'dark';
    autoPlayTTS: boolean;
}

// 定义上下文类型
interface SettingsContextType {
    settings: Settings;
    updateFontSize: (size: number) => void;
    updateTheme: (theme: 'light' | 'dark') => void;
    updateAutoPlayTTS: (autoPlay: boolean) => void;
}

// 创建上下文
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider 组件
export function SettingsProvider({ children }: { children: ReactNode }) {
    // 尝试从localStorage加载设置
    const [settings, setSettings] = useState<Settings>(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        }
        return {
            fontSize: 14,
            theme: 'light',
            autoPlayTTS: false
        };
    });

    // 当设置改变时保存到 localStorage
    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));

        // 更新根元素的字体大小
        document.documentElement.style.fontSize = `${settings.fontSize}px`;

        // 更新主题
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(settings.theme);
    }, [settings]);

    // 更新字体大小
    const updateFontSize = (size: number) => {
        setSettings(prev => ({ ...prev, fontSize: size }));
    };

    const updateTheme = (theme: 'light' | 'dark') => {
        setSettings(prev => ({ ...prev, theme }));
    };

    const updateAutoPlayTTS = (autoPlay: boolean) => {
        setSettings(prev => ({ ...prev, autoPlayTTS: autoPlay }));
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateFontSize,
            updateTheme,
            updateAutoPlayTTS
        }}>
            {children}
        </SettingsContext.Provider>
    )
}

// Hook
export function useSettings() {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
} 