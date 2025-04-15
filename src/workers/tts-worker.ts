const worker: Worker = self as any;

// 接收来自主线程的消息
worker.addEventListener('message', async (event) => {
    const { id, action, payload } = event.data;

    if (action === 'decodeAudio') {
        try {
            // 解码base64音频数据
            const base64 = payload.audio_base64;
            const binaryString = atob(base64);
            const audioData = new Uint8Array(binaryString.length);

            // 耗时操作，但在worker中不会阻塞主线程
            for (let i = 0; i < binaryString.length; i++) {
                audioData[i] = binaryString.charCodeAt(i);
            }

            // 返回处理结果
            worker.postMessage({
                id,
                success: true,
                audioData: audioData,
                index: payload.index
            });
        } catch (error) {
            worker.postMessage({
                id,
                success: false,
                error: (error as Error).message,
                index: payload.index
            });
        }
    }
});

export { };
