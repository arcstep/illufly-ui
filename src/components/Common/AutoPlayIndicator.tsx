'use client';

import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface AutoPlayIndicatorProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function AutoPlayIndicator({ className = '', size = 'md' }: AutoPlayIndicatorProps) {
    const { settings, updateAutoPlayTTS } = useSettings();

    const toggleAutoPlay = () => {
        updateAutoPlayTTS(!settings.autoPlayTTS);
    };

    const sizeClasses = {
        sm: 'p-1 text-xs',
        md: 'p-2 text-sm',
        lg: 'p-3 text-base'
    };

    return (
        <div
            onClick={toggleAutoPlay}
            className={`flex items-center cursor-pointer rounded-md transition-all duration-200 select-none ${settings.autoPlayTTS
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                } ${sizeClasses[size]} ${className}`}
            title={settings.autoPlayTTS ? '自动语音已开启（点击关闭）' : '自动语音已关闭（点击开启）'}
        >
            <FontAwesomeIcon
                icon={(settings.autoPlayTTS ? faVolumeUp : faVolumeMute) as IconProp}
                className={size !== 'sm' ? 'mr-2' : ''}
                size={size === 'sm' ? 'xs' : 'sm'}
            />
            {size !== 'sm' && (
                <span className="font-medium">
                    {settings.autoPlayTTS ? '自动播放已开启' : '自动播放已关闭'}
                </span>
            )}
        </div>
    );
}
