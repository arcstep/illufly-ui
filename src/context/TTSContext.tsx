'use client'

import { createContext, useContext, useState, useRef } from 'react';
import { API_BASE_URL } from '@/utils/config';

interface TTSContextType {
    isPlaying: boolean;
    isLoading: boolean;
    playAudio: (text: string) => Promise<void>;
    stopAudio: () => void;
}

export const TTSContext = createContext<TTSContextType>({
    isPlaying: false,
    isLoading: false,
    playAudio: async () => {
        throw new Error('TTSProvider not found');
    },
    stopAudio: () => {
        throw new Error('TTSProvider not found');
    },
});

export function TTSProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioQueue = useRef<HTMLAudioElement[]>([]);
    const currentAudioIndex = useRef(0);
    const isStopped = useRef(false);
    const audioProcessingPromises = useRef<Promise<void>[]>([]);

    // 分割文本为句子数组
    const splitText = (text: string): string[] => {
        // 使用正则表达式匹配中文和英文的句子分隔符
        const sentences = text.split(/([。！？.!?])/);
        const result: string[] = [];
        let currentSentence = '';

        for (let i = 0; i < sentences.length; i++) {
            currentSentence += sentences[i];
            if (i % 2 === 1) { // 分隔符
                result.push(currentSentence.trim());
                currentSentence = '';
            }
        }

        // 处理最后一个不完整的句子
        if (currentSentence.trim()) {
            result.push(currentSentence.trim());
        }

        return result.filter(s => s.length > 0);
    };

    const playNextAudio = () => {
        if (isStopped.current) {
            return;
        }

        if (currentAudioIndex.current < audioQueue.current.length) {
            const audio = audioQueue.current[currentAudioIndex.current];
            if (audio) {
                audio.onended = () => {
                    currentAudioIndex.current++;
                    playNextAudio();
                };
                audio.play().catch(error => {
                    console.error('播放音频失败:', error);
                    currentAudioIndex.current++;
                    playNextAudio();
                });
            } else {
                // 如果当前音频还未准备好，等待一下再试
                setTimeout(playNextAudio, 100);
            }
        } else {
            setIsPlaying(false);
            audioQueue.current = [];
            currentAudioIndex.current = 0;
        }
    };

    const processAudioData = async (sentence: string, index: number): Promise<void> => {
        try {
            console.log(`开始处理第 ${index + 1} 个句子:`, sentence);

            const response = await fetch(`${API_BASE_URL}/tts/stream`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([sentence]),
            });

            if (!response.ok) {
                throw new Error(`TTS API 请求失败: ${response.status} ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('响应体为空');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let audioData = new Uint8Array(0);
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log(`第 ${index + 1} 个句子的音频数据接收完成`);
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.audio) {
                                console.log(`收到第 ${index + 1} 个句子的音频数据片段`);
                                const newAudioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
                                const temp = new Uint8Array(audioData.length + newAudioData.length);
                                temp.set(audioData);
                                temp.set(newAudioData, audioData.length);
                                audioData = temp;
                            }
                        } catch (e) {
                            console.error(`解析第 ${index + 1} 个句子的 SSE 数据失败:`, e);
                            console.error('原始数据:', line);
                        }
                    }
                }
            }

            // 当整个句子的音频数据都接收完成后，再创建音频对象
            if (audioData.length > 0) {
                const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                // 等待前面的音频都处理完成
                while (audioQueue.current.length < index) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // 添加到队列
                audioQueue.current[index] = audio;
                console.log(`第 ${index + 1} 个句子的音频已添加到队列，当前队列长度: ${audioQueue.current.length}`);

                // 如果是第一个音频，开始播放
                if (index === 0) {
                    console.log('开始播放第一个音频片段');
                    playNextAudio();
                }
            }
        } catch (error) {
            console.error(`处理第 ${index + 1} 个句子的音频数据失败:`, error);
        }
    };

    const playAudio = async (text: string) => {
        try {
            if (isPlaying) {
                console.log('当前正在播放，先停止');
                stopAudio();
                return;
            }

            console.log('开始播放音频');
            setIsLoading(true);
            setIsPlaying(true);
            isStopped.current = false;
            audioQueue.current = [];
            currentAudioIndex.current = 0;
            audioProcessingPromises.current = [];

            const sentences = splitText(text);
            console.log('分割后的句子:', sentences);

            // 并行处理所有句子
            for (let i = 0; i < sentences.length; i++) {
                if (isStopped.current) {
                    console.log('播放已停止，不再处理剩余句子');
                    break;
                }
                const promise = processAudioData(sentences[i], i);
                audioProcessingPromises.current.push(promise);
            }

            // 等待所有音频处理完成
            await Promise.all(audioProcessingPromises.current);
            console.log('所有音频处理完成');
        } catch (error) {
            console.error('播放音频失败:', error);
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    };

    const stopAudio = () => {
        isStopped.current = true;
        if (audioQueue.current.length > 0) {
            audioQueue.current.forEach(audio => {
                audio.pause();
                URL.revokeObjectURL(audio.src);
            });
            audioQueue.current = [];
            currentAudioIndex.current = 0;
        }
        setIsPlaying(false);
    };

    return (
        <TTSContext.Provider value={{ isPlaying, isLoading, playAudio, stopAudio }}>
            {children}
        </TTSContext.Provider>
    );
}

export function useTTS() {
    const context = useContext(TTSContext);
    if (context === undefined) {
        throw new Error('useTTS must be used within a TTSProvider');
    }
    return context;
} 