import { useState, useCallback } from 'react';
import { useApiBase } from './useApiBase';

// 存储状态接口
export interface StorageStatus {
    used: number;
    limit: number;
    available: number;
    usage_percentage: number;
    file_count: number;
    last_updated: number;
}

/**
 * 存储状态Hook - 负责获取和管理存储空间使用信息
 */
export function useStorageStatus() {
    const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { API_BASE_URL } = useApiBase();

    // 获取存储状态
    const getStorageStatus = useCallback(async (): Promise<StorageStatus> => {
        setIsLoading(true);
        try {
            const api_url = `${API_BASE_URL}/oculith/files/storage/status`;
            const res = await fetch(api_url, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('获取存储状态失败');

            const data = await res.json();
            setStorageStatus(data);
            return data;
        } catch (error) {
            console.error('获取存储状态失败:', error);

            // 失败时返回默认数据作为备用
            const mockData: StorageStatus = {
                used: 0,
                limit: 1024 * 1024 * 1024, // 1GB
                available: 1024 * 1024 * 1024,
                usage_percentage: 0,
                file_count: 0,
                last_updated: Date.now() / 1000
            };

            setStorageStatus(mockData);
            return mockData;
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL]);

    return {
        storageStatus,
        getStorageStatus,
        isLoading
    };
} 