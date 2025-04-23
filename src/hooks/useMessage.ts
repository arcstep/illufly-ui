import { useCallback } from 'react';

export interface MessageOptions {
    type: 'success' | 'error' | 'info' | 'warning';
    content: string;
    duration?: number;
}

/**
 * 消息通知Hook - 提供消息通知功能
 * 
 * 这个Hook可以连接到实际的UI通知组件，例如Toast或者Message组件
 */
export function useMessage() {
    // 显示消息
    const showMessage = useCallback((options: MessageOptions) => {
        // 在这里你可以连接到实际的通知系统
        // 例如 Ant Design的message或Toast组件等

        // 临时实现 - 使用控制台输出
        const { type, content } = options;
        console.log(`[${type.toUpperCase()}] ${content}`);

        // 如果在浏览器环境下，可以使用原生alert作为备用
        if (typeof window !== 'undefined') {
            // 仅在开发环境下使用alert，避免打扰用户
            if (process.env.NODE_ENV === 'development') {
                // alert(`${type.toUpperCase()}: ${content}`);
            }
        }
    }, []);

    return {
        showMessage
    };
} 