import { useCallback } from 'react';

export function useDateTime() {
    const parseTimestamp = useCallback((timestamp: string | number | Date): Date => {
        if (!timestamp) return new Date(0);

        if (typeof timestamp === 'object' && timestamp instanceof Date) {
            return timestamp;
        }

        const timeStr = String(timestamp).split('.')[0];

        if (typeof timestamp === 'string' && isNaN(Number(timestamp)) && timestamp.includes('-')) {
            return new Date(timestamp);
        }

        const digits = timeStr.length;
        const numericValue = parseInt(timeStr, 10);

        if (digits <= 10) { // 秒级时间戳
            return new Date(numericValue * 1000);
        } else if (digits <= 13) { // 毫秒级时间戳
            return new Date(numericValue);
        } else { // 微秒/纳秒级时间戳
            return new Date(numericValue / Math.pow(10, digits - 13));
        }
    }, []);

    const formatDate = useCallback((date: Date, options: Intl.DateTimeFormatOptions = {}) => {
        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };

        return date.toLocaleDateString('zh-CN', defaultOptions);
    }, []);

    return {
        parseTimestamp,
        formatDate,
    };
}
