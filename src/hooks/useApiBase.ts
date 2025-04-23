/**
 * API基础URL管理Hook - 提供API基础URL
 * 
 * 这个Hook可以在未来扩展实现动态API基址、API版本管理等功能
 */
export function useApiBase() {
    // 在实际环境中，这可能从环境变量或配置中获取
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

    return {
        API_BASE_URL
    };
} 