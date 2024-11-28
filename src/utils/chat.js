import { startSSE } from './sse';

// 使用 startSSE 处理 SSE 消息
export const ask_agent = async (agent, prompt, onMessage, onError) => {
    // 将 prompt 作为查询参数传递
    const params = { prompt };

    // 使用 startSSE 处理 SSE 消息
    startSSE(`/api/${agent || 'fake_llm'}`, onMessage, onError, {
        params, // 传递查询参数
    });
};
