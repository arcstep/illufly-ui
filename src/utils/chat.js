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

export const get_agent_history_list = async (agent, onLoadHistoryList, onError) => {
    api.get(`/api/${agent || 'fake_llm'}/history/list`).then(onLoadHistoryList).catch(onError);
};

export const change_agent_history = async (agent, historyId, onLoadMessages, onError) => {
    const formData = new FormData();
    formData.append('history_id', historyId);

    api.post(`/api/${agent || 'fake_llm'}/history/change`, formData)
        .then(onLoadMessages)
        .catch(onError);
};

export const create_new_agent_history = async (agent, onNewHistoryId, onError) => {
    api.post(`/api/${agent || 'fake_llm'}/history/new`).then(onNewHistoryId).catch(onError);
};