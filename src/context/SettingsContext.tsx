'use client'

import { createContext, useState, useContext, useEffect } from 'react'

// 定义Settings类型
interface Settings {
    fontSize: number;
}

// 定义上下文类型
interface SettingsContextType {
    settings: Settings;
    updateFontSize: (size: number) => void;
}

// 创建上下文
const SettingsContext = createContext<SettingsContextType>({
    settings: {
        fontSize: 14, // 默认字体大小
    },
    updateFontSize: () => { throw new Error('SettingsProvider not found') },
})

// Provider 组件
export function SettingsProvider({ children }: { children: React.ReactNode }) {
    // 尝试从localStorage加载设置
    const [settings, setSettings] = useState<Settings>(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('illufly-settings');
            if (savedSettings) {
                try {
                    return JSON.parse(savedSettings);
                } catch (e) {
                    console.error('Failed to parse saved settings:', e);
                }
            }
        }
        return { fontSize: 14 }; // 默认设置
    });

    // 更新字体大小
    const updateFontSize = (size: number) => {
        setSettings(prev => ({ ...prev, fontSize: size }));
    };

    // 当设置变化时，保存到localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('illufly-settings', JSON.stringify(settings));
        }
    }, [settings]);

    return (
        <SettingsContext.Provider value={{
            settings,
            updateFontSize,
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