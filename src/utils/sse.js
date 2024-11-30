// import api from './api'; // 使用 axios 实例
import { API_BASE_URL } from './config';

export const startSSE = (endpoint, onMessage, onError, options = {}) => {
    let eventSource = null;
    let retryCount = 0;
    let lastEventId = null;
    const maxRetries = 1;

    const start = () => {
        // 如果请求成功，使用 EventSource 处理流式数据
        const url = new URL(API_BASE_URL + endpoint);
        if (options.params) {
            Object.keys(options.params).forEach(key => url.searchParams.append(key, options.params[key]));
        }
        eventSource = new EventSource(url, { withCredentials: true });
        console.log("eventSource.withCredentials", eventSource.withCredentials);

        eventSource.onmessage = (event) => {
            // console.log("event >>> ", event);
            try {
                const parsedData = JSON.parse(event.data);
                onMessage(parsedData.calling_id, parsedData);
            } catch (error) {
                console.error('JSON 解析错误:', error);
                if (onError) onError(error);
            }
        };

        eventSource.onerror = (error) => {
            eventSource.close();
        };
    };

    // 开始连接
    start();

    // 提供一个方法来停止连接
    const stop = () => {
        if (eventSource) {
            eventSource.close();
        }
    };

    return { stop }; // 返回停止方法
};
