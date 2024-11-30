import { startSSE } from './sse';
import api from './api';

// 使用 startSSE 处理 SSE 消息
export const chat_with_agent = async (agent, prompt, onMessage, onError) => {
    // 将 prompt 作为查询参数传递
    const params = { prompt };

    // 使用 startSSE 处理 SSE 消息
    await startSSE(`/api/${agent || 'fake_llm'}`, onMessage, onError, {
        params, // 传递查询参数
    });
};

export const get_agent_history = async (agent, onLoadMessages, onError) => {
    api.get(`/api/${agent || 'fake_llm'}/history`).then(onLoadMessages).catch(onError);
};

export const get_agent_history_list = async (agent, onLoaded, onError) => {
    api.get(`/api/${agent || 'fake_llm'}/history/list`).then(onLoaded).catch(onError);
};
