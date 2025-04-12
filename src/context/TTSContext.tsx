'use client'

import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/utils/config';

interface TTSContextType {
    isPlaying: boolean;
    isLoading: boolean;
    playAudio: (text: string) => Promise<void>;
    stopAudio: () => void;
}

interface TTSResponse {
    status: string;
    task_id: string;
    audio_base64: string;
    sample_rate: number;
    created_at: number;
    completed_at: number;
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

    // 新的状态管理
    const audioObjects = useRef<{ [index: number]: HTMLAudioElement }>({});
    const pendingIndices = useRef<Set<number>>(new Set());
    const readyIndices = useRef<Set<number>>(new Set());
    const playingIndex = useRef<number | null>(null);
    const audioCount = useRef<number>(0);
    const totalAudioCount = useRef<number>(0);
    const playbackStarted = useRef<boolean>(false);
    const isStopped = useRef<boolean>(false);
    const playSequence = useRef<number[]>([]);

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

    // 重置所有状态
    const resetState = () => {
        // 清理所有音频资源
        Object.values(audioObjects.current).forEach(audio => {
            try {
                audio.pause();
                audio.onended = null;
                audio.onerror = null;
                if (audio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audio.src);
                }
            } catch (e) {
                console.error('TTS: 清理音频资源时出错:', e);
            }
        });

        // 重置所有状态引用
        audioObjects.current = {};
        pendingIndices.current.clear();
        readyIndices.current.clear();
        playingIndex.current = null;
        audioCount.current = 0;
        totalAudioCount.current = 0;
        playbackStarted.current = false;
        isStopped.current = false;
        playSequence.current = [];
    };

    // 尝试按顺序播放下一个音频
    const playNextInSequence = () => {
        if (isStopped.current || playingIndex.current !== null) {
            return; // 已停止或当前有音频正在播放
        }

        // 找到下一个待播放的索引
        const nextIndex = playSequence.current.find(idx =>
            readyIndices.current.has(idx) && !audioObjects.current[idx]._played
        );

        if (nextIndex !== undefined) {
            const audio = audioObjects.current[nextIndex];
            if (!audio) {
                console.error(`TTS: 索引 ${nextIndex} 的音频不存在，但已标记为准备就绪`);
                // 继续尝试下一个
                playNextInSequence();
                return;
            }

            // 设置当前播放索引
            playingIndex.current = nextIndex;
            console.log(`TTS: 开始播放第 ${nextIndex + 1}/${totalAudioCount.current} 个音频`);

            // 设置播放完成回调
            audio.onended = () => {
                console.log(`TTS: 第 ${nextIndex + 1}/${totalAudioCount.current} 个音频播放完成`);
                // 标记为已播放
                audio._played = true;
                // 清除当前播放索引
                playingIndex.current = null;

                // 检查是否所有音频都已播放完毕
                const allPlayed = playSequence.current.every(idx =>
                    !readyIndices.current.has(idx) || audioObjects.current[idx]?._played
                );

                if (allPlayed && readyIndices.current.size === totalAudioCount.current) {
                    // 所有音频都已播放完毕
                    console.log(`TTS: 所有音频播放完成，总共 ${totalAudioCount.current} 个音频`);
                    setIsPlaying(false);
                    // 不重置状态，因为可能还有cleanup操作
                } else {
                    // 继续播放序列中的下一个
                    setTimeout(() => playNextInSequence(), 50);
                }
            };

            // 设置播放错误回调
            audio.onerror = () => {
                console.error(`TTS: 第 ${nextIndex + 1}/${totalAudioCount.current} 个音频播放错误`);
                // 标记为已播放，避免重试
                audio._played = true;
                // 清除当前播放索引
                playingIndex.current = null;
                // 继续播放序列中的下一个
                setTimeout(() => playNextInSequence(), 50);
            };

            // 尝试播放
            try {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error(`TTS: 播放音频失败:`, error);

                        // 如果是自动播放受限，再次尝试
                        if (error.name === 'NotAllowedError') {
                            console.log('TTS: 自动播放受限，200ms后再次尝试');
                            setTimeout(() => {
                                try {
                                    audio.play().catch(e => {
                                        console.error('TTS: 二次尝试播放失败:', e);
                                        audio._played = true;
                                        playingIndex.current = null;
                                        setTimeout(() => playNextInSequence(), 50);
                                    });
                                } catch (playError) {
                                    console.error('TTS: 播放时出现异常:', playError);
                                    audio._played = true;
                                    playingIndex.current = null;
                                    setTimeout(() => playNextInSequence(), 50);
                                }
                            }, 200);
                        } else {
                            audio._played = true;
                            playingIndex.current = null;
                            setTimeout(() => playNextInSequence(), 50);
                        }
                    });
                }
            } catch (e) {
                console.error('TTS: 播放尝试出现异常:', e);
                audio._played = true;
                playingIndex.current = null;
                setTimeout(() => playNextInSequence(), 50);
            }
        } else {
            // 当前没有准备好可播放的音频
            const allReady = pendingIndices.current.size === 0 &&
                readyIndices.current.size === totalAudioCount.current;

            const allPlayed = Array.from(readyIndices.current).every(idx =>
                audioObjects.current[idx]?._played
            );

            if (allReady && allPlayed) {
                // 所有音频都已播放完毕
                console.log(`TTS: 所有音频播放完成，总共 ${totalAudioCount.current} 个音频`);
                setIsPlaying(false);
            }
        }
    };

    // 创建音频对象并纳入管理
    const createAudioObject = (audioData: Uint8Array, index: number): HTMLAudioElement => {
        console.log(`TTS: 创建第 ${index + 1}/${totalAudioCount.current} 个音频对象，大小: ${audioData.length} 字节`);

        // 创建音频对象
        const audioBlob = new Blob([audioData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio();
        // 添加一个自定义属性标记是否已播放
        audio._played = false;

        // 设置音频来源
        audio.src = audioUrl;
        audio.volume = 1.0;
        audio.preload = 'auto'; // 预加载音频

        // 保存音频对象
        audioObjects.current[index] = audio;

        // 更新状态
        pendingIndices.current.delete(index); // 从待处理集合移除
        readyIndices.current.add(index);      // 添加到准备就绪集合
        audioCount.current++;                 // 增加音频计数

        console.log(`TTS: 第 ${index + 1}/${totalAudioCount.current} 个音频已准备就绪，当前就绪数量: ${readyIndices.current.size}/${totalAudioCount.current}`);

        // 检查是否应该开始播放
        checkPlaybackStatus();

        return audio;
    };

    // 检查是否应该开始或继续播放
    const checkPlaybackStatus = () => {
        // 如果已停止或已经开始播放，不处理
        if (isStopped.current || playbackStarted.current) return;

        // 必要条件：第一个音频必须准备好才能开始播放
        const firstAudioReady = readyIndices.current.has(0);

        if (!firstAudioReady) {
            console.log(`TTS: 等待第一个音频准备就绪，当前就绪数量: ${readyIndices.current.size}/${totalAudioCount.current}`);
            return;
        }

        // 条件1: 所有音频都已准备就绪
        // 条件2: 至少有两个音频准备就绪或准备就绪的比例超过25%
        const readyRatio = readyIndices.current.size / totalAudioCount.current;
        const shouldStart =
            readyIndices.current.size === totalAudioCount.current ||
            (readyIndices.current.size >= 2 || readyRatio >= 0.25);

        if (shouldStart && readyIndices.current.size > 0) {
            console.log(`TTS: 开始播放音频，当前就绪数量: ${readyIndices.current.size}/${totalAudioCount.current}`);
            playbackStarted.current = true;
            playNextInSequence();
        }
    };

    // 处理单个句子的音频生成
    const processAudioData = async (sentence: string, index: number): Promise<void> => {
        // 先将此索引添加到待处理集合
        pendingIndices.current.add(index);

        try {
            console.log(`TTS: 处理第 ${index + 1}/${totalAudioCount.current} 个句子: ${sentence.substring(0, 20)}${sentence.length > 20 ? '...' : ''}`);

            const response = await fetch(`${API_BASE_URL}/tts`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: sentence, voice: 'zf_001' }),
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`TTS API 请求失败: ${response.status} ${response.statusText}`);
            }

            console.log(`TTS: 第 ${index + 1}/${totalAudioCount.current} 个句子API请求成功，正在解析响应`);

            // 解析响应JSON
            const data: TTSResponse = await response.json();

            if (data.status !== 'success' || !data.audio_base64) {
                throw new Error('音频数据无效');
            }

            console.log(`TTS: 第 ${index + 1}/${totalAudioCount.current} 个句子收到音频数据，长度: ${data.audio_base64.length}，task_id: ${data.task_id}`);

            // 解码base64音频数据
            const binaryString = atob(data.audio_base64);
            const audioData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                audioData[i] = binaryString.charCodeAt(i);
            }

            console.log(`TTS: 第 ${index + 1}/${totalAudioCount.current} 个句子音频解码完成，大小: ${audioData.length} 字节`);

            // 创建音频对象
            createAudioObject(audioData, index);

            console.log(`TTS: 第 ${index + 1}/${totalAudioCount.current} 个句子音频处理完成`);

        } catch (error) {
            console.error(`TTS: 处理第 ${index + 1}/${totalAudioCount.current} 个句子音频失败:`, error);
            // 即使失败也从待处理集合中移除
            pendingIndices.current.delete(index);
            // 检查播放状态，可能需要开始播放其他准备好的音频
            checkPlaybackStatus();
        }
    };

    // 主播放函数
    const playAudio = async (text: string) => {
        try {
            if (isPlaying) {
                console.log('TTS: 当前正在播放，先停止');
                stopAudio();
                // 给停止操作一些时间
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // 重置所有状态
            resetState();
            setIsLoading(true);
            setIsPlaying(true);

            // 分割文本
            const sentences = splitText(text);
            const total = sentences.length;
            console.log(`TTS: 文本已分割为 ${total} 个句子`);

            // 如果没有句子，提前结束
            if (total === 0) {
                console.log('TTS: 没有可播放的句子');
                setIsLoading(false);
                setIsPlaying(false);
                return;
            }

            // 设置总音频数量
            totalAudioCount.current = total;

            // 创建播放序列（按照索引顺序）
            playSequence.current = Array.from({ length: total }, (_, i) => i);

            // 处理所有句子
            const promises = sentences.map((sentence, i) =>
                processAudioData(sentence, i).catch(err => {
                    console.error(`TTS: 句子处理异常被捕获 (${i + 1}/${total}):`, err);
                    return Promise.resolve(); // 确保Promise.all不会因单个失败而终止
                })
            );

            // 设置超时开始播放的机制
            const timeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                    console.log(`TTS: 检查是否应该开始播放 - 已就绪: ${readyIndices.current.size}/${total}`);
                    // 只有当第一个音频准备好时才开始播放
                    if (!playbackStarted.current && readyIndices.current.has(0)) {
                        console.log(`TTS: 超时触发，开始播放已准备好的 ${readyIndices.current.size} 个音频`);
                        playbackStarted.current = true;
                        playNextInSequence();
                    } else if (!readyIndices.current.has(0)) {
                        console.log(`TTS: 超时检查，但第一个音频尚未准备好，继续等待`);
                    }
                    resolve();
                }, 2000); // 2秒超时
            });

            // 等待所有处理完成或超时
            await Promise.race([Promise.all(promises), timeoutPromise]);

            // 确保开始播放
            if (!playbackStarted.current && readyIndices.current.size > 0) {
                console.log(`TTS: 所有音频处理已完成，开始播放`);
                playbackStarted.current = true;
                playNextInSequence();
            }

        } catch (error) {
            console.error('TTS: 播放音频失败:', error);
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    };

    // 停止播放
    const stopAudio = () => {
        console.log('TTS: 停止播放');
        isStopped.current = true;
        playbackStarted.current = false;

        // 停止所有正在播放的音频
        Object.values(audioObjects.current).forEach(audio => {
            try {
                audio.pause();
            } catch (e) {
                console.error('TTS: 暂停音频时出错:', e);
            }
        });

        // 重置播放索引
        playingIndex.current = null;
        setIsPlaying(false);
    };

    // 在组件卸载时清理资源
    useEffect(() => {
        return () => {
            // 清理所有音频资源
            Object.values(audioObjects.current).forEach(audio => {
                try {
                    if (audio.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audio.src);
                    }
                } catch (e) {
                    console.error('TTS: 清理音频资源时出错:', e);
                }
            });
        };
    }, []);

    return (
        <TTSContext.Provider value={{ isPlaying, isLoading, playAudio, stopAudio }}>
            {children}
        </TTSContext.Provider>
    );
}

// 扩展HTMLAudioElement类型，添加自定义属性
declare global {
    interface HTMLAudioElement {
        _played?: boolean;
    }
}

export function useTTS() {
    const context = useContext(TTSContext);
    if (context === undefined) {
        throw new Error('useTTS must be used within a TTSProvider');
    }
    return context;
} 