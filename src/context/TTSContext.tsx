'use client'

import { createContext, useContext, useState, useRef } from 'react';

const API_BASE_URL = 'http://0.0.0.0:31572';

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
    const audioQueue = useRef<(HTMLAudioElement | null)[]>([]);
    const currentAudioIndex = useRef(0);
    const isStopped = useRef(false);
    const audioProcessingComplete = useRef(false);
    const processedSentences = useRef(0);
    const totalSentences = useRef(0);
    const actualAudioCount = useRef(0);
    const skippedIndices = useRef<number[]>([]);
    const playedIndices = useRef<Set<number>>(new Set());

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

    // 检查是否应该开始播放
    const maybeStartPlayback = () => {
        // 如果已经决定开始播放或者已经停止，则不处理
        if (audioProcessingComplete.current || isStopped.current) {
            return;
        }

        // 确保计数器不超过总数
        if (processedSentences.current > totalSentences.current) {
            console.warn(`TTS: 计数器异常，处理数(${processedSentences.current})超过总数(${totalSentences.current})，重置为总数`);
            processedSentences.current = totalSentences.current;
        }

        // 条件1: 至少有2个实际音频已准备好 或 已处理了25%以上的句子
        // 条件2: 所有句子都已处理完成
        if ((actualAudioCount.current >= 2 || actualAudioCount.current >= totalSentences.current * 0.25) &&
            actualAudioCount.current > 0) {
            console.log(`TTS: 已有 ${actualAudioCount.current}/${totalSentences.current} 个音频准备就绪，开始播放`);
            audioProcessingComplete.current = true;
            playNextAudio();
        } else if (processedSentences.current >= totalSentences.current) {
            console.log(`TTS: 所有 ${totalSentences.current} 个音频已准备就绪，开始播放`);
            audioProcessingComplete.current = true;
            playNextAudio();
        } else {
            console.log(`TTS: 已处理 ${processedSentences.current}/${totalSentences.current} 个音频，继续等待...`);
        }
    };

    const playNextAudio = () => {
        if (isStopped.current) {
            console.log('TTS: 播放已停止，不继续播放下一个音频');
            return;
        }

        // 首先尝试播放当前索引的音频
        if (currentAudioIndex.current < audioQueue.current.length) {
            const audio = audioQueue.current[currentAudioIndex.current];
            if (audio) {
                // 确保音量设置正确
                audio.volume = 1.0;

                console.log(`TTS: 开始播放第 ${currentAudioIndex.current + 1}/${audioQueue.current.length} 个音频`);

                // 标记此索引为已播放
                playedIndices.current.add(currentAudioIndex.current);

                // 如果此索引在跳过列表中，从跳过列表中移除
                const skipIndex = skippedIndices.current.indexOf(currentAudioIndex.current);
                if (skipIndex !== -1) {
                    skippedIndices.current.splice(skipIndex, 1);
                }

                audio.onended = () => {
                    console.log(`TTS: 第 ${currentAudioIndex.current + 1}/${audioQueue.current.length} 个音频播放完成`);
                    currentAudioIndex.current++;
                    // 简单的延迟以确保稳定性
                    setTimeout(() => playNextAudio(), 50);
                };

                audio.onerror = (err) => {
                    console.error(`TTS: 第 ${currentAudioIndex.current + 1}/${audioQueue.current.length} 个音频播放错误:`, err);
                    // 即使出错也标记为已播放，防止重试
                    playedIndices.current.add(currentAudioIndex.current);
                    currentAudioIndex.current++;
                    setTimeout(() => playNextAudio(), 50);
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
                                            // 即使出错也标记为已播放，防止重试
                                            playedIndices.current.add(currentAudioIndex.current);
                                            currentAudioIndex.current++;
                                            playNextAudio();
                                        });
                                    } catch (playError) {
                                        console.error('TTS: 播放时出现异常:', playError);
                                        // 即使出错也标记为已播放，防止重试
                                        playedIndices.current.add(currentAudioIndex.current);
                                        currentAudioIndex.current++;
                                        playNextAudio();
                                    }
                                }, 200);
                            } else {
                                // 即使出错也标记为已播放，防止重试
                                playedIndices.current.add(currentAudioIndex.current);
                                currentAudioIndex.current++;
                                playNextAudio();
                            }
                        });
                    }
                } catch (e) {
                    console.error('TTS: 播放尝试出现异常:', e);
                    // 即使出错也标记为已播放，防止重试
                    playedIndices.current.add(currentAudioIndex.current);
                    currentAudioIndex.current++;
                    setTimeout(() => playNextAudio(), 50);
                }
            } else {
                // 当前音频不可用，将索引添加到跳过列表并继续
                console.log(`TTS: 第 ${currentAudioIndex.current + 1} 个音频为空，暂时跳过...`);
                if (!playedIndices.current.has(currentAudioIndex.current)) {
                    skippedIndices.current.push(currentAudioIndex.current);
                }
                currentAudioIndex.current++;

                // 检查是否所有音频都已处理完毕
                if (currentAudioIndex.current >= audioQueue.current.length) {
                    // 如果有跳过的音频索引，尝试再次播放它们
                    if (skippedIndices.current.length > 0) {
                        checkSkippedAudios();
                    } else {
                        finishPlayback();
                    }
                } else {
                    // 继续播放下一个音频
                    setTimeout(playNextAudio, 50);
                }
            }
        } else {
            // 检查是否有跳过的音频需要重新播放
            if (skippedIndices.current.length > 0) {
                checkSkippedAudios();
            } else {
                finishPlayback();
            }
        }
    };

    // 检查跳过的音频是否已准备好
    const checkSkippedAudios = () => {
        if (isStopped.current) {
            return;
        }

        console.log(`TTS: 检查 ${skippedIndices.current.length} 个被跳过的音频是否已准备好`);

        // 过滤掉已播放的索引
        skippedIndices.current = skippedIndices.current.filter(idx => !playedIndices.current.has(idx));

        if (skippedIndices.current.length === 0) {
            console.log('TTS: 所有跳过的音频已经播放完毕');
            finishPlayback();
            return;
        }

        // 找到第一个不为空且未播放的跳过索引
        for (let i = 0; i < skippedIndices.current.length; i++) {
            const index = skippedIndices.current[i];
            if (audioQueue.current[index] && !playedIndices.current.has(index)) {
                console.log(`TTS: 第 ${index + 1} 个音频现在已准备好，开始播放`);
                currentAudioIndex.current = index;
                // 从跳过列表中移除此索引
                skippedIndices.current.splice(i, 1);
                // 播放此音频
                setTimeout(playNextAudio, 50);
                return;
            }
        }

        // 如果所有跳过的音频仍然不可用，检查是否应该等待或结束
        if (processedSentences.current < totalSentences.current && actualAudioCount.current < totalSentences.current) {
            // 仍有音频在处理中，稍后再检查
            console.log(`TTS: 仍有音频在处理中，500ms后再次检查跳过的索引`);
            setTimeout(checkSkippedAudios, 500);
        } else {
            // 所有音频已处理完毕，结束播放
            finishPlayback();
        }
    };

    // 完成播放过程
    const finishPlayback = () => {
        console.log(`TTS: 所有音频播放完成，总共 ${audioQueue.current.length} 个音频`);
        setIsPlaying(false);
        audioQueue.current = [];
        currentAudioIndex.current = 0;
        audioProcessingComplete.current = false;
        processedSentences.current = 0;
        actualAudioCount.current = 0;
        skippedIndices.current = [];
        playedIndices.current = new Set();
    };

    const createAudioObject = (audioData: Uint8Array, index: number, total: number): HTMLAudioElement | null => {
        try {
            console.log(`TTS: 创建第 ${index + 1}/${total} 个音频对象，大小: ${audioData.length} 字节`);

            // 创建音频对象
            const audioBlob = new Blob([audioData], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio();

            // 设置音频来源
            audio.src = audioUrl;
            audio.volume = 1.0;
            audio.preload = 'auto'; // 预加载音频

            // 添加到队列
            audioQueue.current[index] = audio;
            actualAudioCount.current++; // 增加实际音频计数
            console.log(`TTS: 第 ${index + 1}/${total} 个音频已添加到队列，当前队列长度: ${actualAudioCount.current}`);

            // 标记处理完成
            // 确保计数器不超过总数
            if (processedSentences.current < total) {
                processedSentences.current++;
                console.log(`TTS: 已处理 ${processedSentences.current}/${total} 个音频`);
            }

            // 尝试开始播放
            maybeStartPlayback();

            return audio;
        } catch (error) {
            console.error(`TTS: 创建音频对象失败 (${index + 1}/${total}):`, error);
            // 标记处理完成，即使失败，但确保不超过总数
            if (processedSentences.current < total) {
                processedSentences.current++;
            }
            maybeStartPlayback();
            return null;
        }
    };

    const processAudioData = async (sentence: string, index: number, total: number): Promise<void> => {
        try {
            console.log(`TTS: 处理第 ${index + 1}/${total} 个句子: ${sentence.substring(0, 20)}${sentence.length > 20 ? '...' : ''}`);

            const response = await fetch(`${API_BASE_URL}/api/tts`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: sentence, voice: 'zf_001' }),
            });

            if (!response.ok) {
                console.error(`TTS: API请求失败: ${response.status} ${response.statusText}`);
                throw new Error(`TTS API 请求失败: ${response.status} ${response.statusText}`);
            }

            console.log(`TTS: 第 ${index + 1}/${total} 个句子API请求成功，正在解析响应`);

            // 解析响应JSON
            const data: TTSResponse = await response.json();

            if (data.status !== 'success' || !data.audio_base64) {
                console.error(`TTS: 音频数据无效: ${data.status}`);
                throw new Error('音频数据无效');
            }

            console.log(`TTS: 第 ${index + 1}/${total} 个句子收到音频数据，长度: ${data.audio_base64.length}，task_id: ${data.task_id}`);

            try {
                // 解码base64音频数据
                const binaryString = atob(data.audio_base64);
                const audioData = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    audioData[i] = binaryString.charCodeAt(i);
                }

                console.log(`TTS: 第 ${index + 1}/${total} 个句子音频解码完成，大小: ${audioData.length} 字节`);

                // 创建音频对象
                const audio = createAudioObject(audioData, index, total);

                if (!audio) {
                    console.error(`TTS: 第 ${index + 1}/${total} 个句子音频对象创建失败`);
                }

                console.log(`TTS: 第 ${index + 1}/${total} 个句子音频处理完成`);

            } catch (decodeError) {
                console.error(`TTS: 第 ${index + 1}/${total} 个句子Base64解码或音频创建失败:`, decodeError);
                // 标记处理完成，即使失败，但确保不超过总数
                if (processedSentences.current < total) {
                    processedSentences.current++;
                }
                maybeStartPlayback();
                throw decodeError;
            }
        } catch (error) {
            console.error(`TTS: 处理第 ${index + 1}/${total} 个句子音频失败:`, error);
            // 标记处理完成，即使失败，但确保不超过总数
            if (processedSentences.current < total) {
                processedSentences.current++;
            }
            maybeStartPlayback();
            // 不抛出异常，确保不会影响其他句子的处理
        }
    };

    const playAudio = async (text: string) => {
        try {
            if (isPlaying) {
                console.log('TTS: 当前正在播放，先停止');
                stopAudio();
                // 给停止操作一些时间
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            setIsLoading(true);
            setIsPlaying(true);
            isStopped.current = false;
            audioQueue.current = [];
            currentAudioIndex.current = 0;
            audioProcessingComplete.current = false;
            processedSentences.current = 0;
            actualAudioCount.current = 0;
            skippedIndices.current = [];
            playedIndices.current = new Set();

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

            // 初始化计数器
            totalSentences.current = total;

            // 不再预先填充null，而是按需创建音频对象
            audioQueue.current = new Array(total);

            // 顺序处理所有句子
            const promises = sentences.map((sentence, i) =>
                processAudioData(sentence, i, total).catch(err => {
                    console.error(`TTS: 句子处理异常被捕获 (${i + 1}/${total}):`, err);
                    // 返回resolved promise，确保Promise.all不会因为单个句子失败而终止
                    return Promise.resolve();
                })
            );

            // 设置更短的超时，更积极地开始播放
            const timeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                    console.log(`TTS: 处理超时检查 - 已处理 ${processedSentences.current}/${total} 个音频，有效音频: ${actualAudioCount.current}`);
                    if (!audioProcessingComplete.current && actualAudioCount.current > 0) {
                        // 只要有音频准备好就开始播放
                        console.log(`TTS: 超时触发，开始播放已准备好的 ${actualAudioCount.current} 个音频`);
                        audioProcessingComplete.current = true;
                        playNextAudio();
                    }
                    resolve();
                }, 1500); // 1.5秒超时，更快地开始播放
            });

            // 同时等待所有音频处理和超时
            await Promise.race([Promise.all(promises), timeoutPromise]);

            // 再次检查是否应该开始播放
            if (!audioProcessingComplete.current) {
                console.log('TTS: 所有音频处理已完成，但尚未开始播放，现在开始播放');
                audioProcessingComplete.current = true;
                playNextAudio();
            }

        } catch (error) {
            console.error('TTS: 播放音频失败:', error);
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    };

    const stopAudio = () => {
        console.log('TTS: 停止播放');
        isStopped.current = true;
        audioProcessingComplete.current = false;

        if (audioQueue.current.length > 0) {
            console.log(`TTS: 清理 ${audioQueue.current.length} 个音频资源`);
            audioQueue.current.forEach(audio => {
                if (audio) {
                    try {
                        // 确保暂停播放
                        audio.pause();
                        // 移除事件监听器
                        audio.onended = null;
                        audio.onerror = null;

                        // 如果使用的是Blob URL，释放
                        if (audio.src.startsWith('blob:')) {
                            URL.revokeObjectURL(audio.src);
                        }
                    } catch (e) {
                        console.error('TTS: 清理音频资源时出错:', e);
                    }
                }
            });
            audioQueue.current = [];
            currentAudioIndex.current = 0;
            processedSentences.current = 0;
            actualAudioCount.current = 0;
            skippedIndices.current = [];
            playedIndices.current = new Set();
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