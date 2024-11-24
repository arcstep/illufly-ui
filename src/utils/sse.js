import api from './api'; // 使用 axios 实例

export const startSSE = (endpoint, onMessage, onError, options = {}) => {
    let lastEventId = null;
    let retryCount = 0;
    const maxRetries = 1;
    let shouldContinue = true; // 控制轮询的标志

    const fetchData = () => {
        if (!shouldContinue) return; // 如果不应该继续，直接返回

        api.get(endpoint, {
            headers: {
                'Accept': 'text/event-stream',
                'Last-Event-ID': lastEventId,
            },
            params: options.params,
            responseType: 'text',
        })
            .then(response => {
                const events = response.data.split('\n\n');
                events.forEach(eventStr => {
                    if (eventStr.trim()) {
                        const event = parseEvent(eventStr);
                        if (event && event.data) {
                            console.log('接收到的原始数据:', event.data);
                            try {
                                const jsonObjects = event.data.split('\n').filter(line => line.trim());
                                jsonObjects.forEach(jsonStr => {
                                    const parsedData = JSON.parse(jsonStr);
                                    onMessage(parsedData);
                                });
                            } catch (error) {
                                console.error('JSON 解析错误:', error);
                                if (onError) onError(error);
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Axios 请求失败:', error);
                retryCount++;
                if (retryCount < maxRetries) {
                    // 继续轮询
                    setTimeout(fetchData, 1000);
                } else {
                    console.error('已达到最大重试次数，停止重试');
                    if (onError) onError(new Error('已达到最大重试次数'));
                }
            });
    };

    const parseEvent = (eventStr) => {
        const lines = eventStr.split('\n');
        const event = {};
        for (const line of lines) {
            const [field, ...rest] = line.split(':');
            const value = rest.join(':').trim();
            if (field === 'data') {
                event.data = (event.data ? event.data + '\n' : '') + value;
            } else if (field === 'id') {
                lastEventId = value;
            } else if (field) {
                event[field] = value;
            }
        }
        return event;
    };

    // 提供一个方法来停止轮询
    const stop = () => {
        shouldContinue = false;
    };

    // 开始轮询
    fetchData();

    return { stop }; // 返回停止方法
};
