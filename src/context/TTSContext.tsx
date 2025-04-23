'use client';

import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useApiBase } from '@/hooks/useApiBase';
import { useSettings } from '@/context/SettingsContext';

interface TTSContextType {
    isPlaying: boolean;
    isLoading: boolean;
    playAudio: (text: string) => Promise<void>;
    stopAudio: () => void;
    processStreamingText: (text: string) => void;
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
    processStreamingText: () => {
        throw new Error('TTSProvider not found');
    },
});

// Worker 相关代码
let ttsWorker: Worker | null = null;
let workerCallbacks: Map<string, (data: any) => void> = new Map();

// 确保只在客户端创建Worker
const initWorker = () => {
    if (typeof window === 'undefined') return;

    if (!ttsWorker) {
        // 动态导入Worker
        ttsWorker = new Worker(new URL('../workers/tts-worker.ts', import.meta.url));

        ttsWorker.onmessage = (event) => {
            const { id, success, audioData, error, index } = event.data;
            const callback = workerCallbacks.get(id);

            if (callback) {
                callback({ success, audioData, error, index });
                workerCallbacks.delete(id);
            }
        };
    }

    return ttsWorker;
};

// 发送消息到Worker并返回Promise
const sendToWorker = (action: string, payload: any): Promise<any> => {
    const worker = initWorker();
    if (!worker) return Promise.reject('Worker未初始化');

    return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString();

        workerCallbacks.set(id, (data) => {
            if (data.success) {
                resolve(data);
            } else {
                reject(data.error);
            }
        });

        worker.postMessage({ id, action, payload });
    });
};

export function TTSProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { API_BASE_URL } = useApiBase();

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

    // 新增流式文本缓冲区和计时器
    const streamBuffer = useRef<string>('');
    const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { settings } = useSettings(); // 导入设置

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

    // 仅重置播放状态，保留缓冲区
    const resetPlaybackState = () => {
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

        // 重置播放相关状态引用，但不清空缓冲区
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
        // 检查是否停止状态
        if (isStopped.current) {
            console.log(`TTS: 播放已被停止，重置停止状态准备新播放`);
            isStopped.current = false; // 重置停止状态，以便开始新的播放序列
        }

        // 检查是否已有音频在播放
        if (playingIndex.current !== null) {
            console.log(`TTS: 当前已有音频正在播放: ${playingIndex.current + 1}/${totalAudioCount.current}`);
            return; // 已有音频正在播放
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

                // 检查是否被停止
                if (isStopped.current) {
                    console.log(`TTS: 检测到已停止状态，不继续播放后续音频`);
                    return;
                }

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

                // 检查是否被停止
                if (isStopped.current) {
                    return;
                }

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

                                        // 检查是否被停止
                                        if (!isStopped.current) {
                                            setTimeout(() => playNextInSequence(), 50);
                                        }
                                    });
                                } catch (playError) {
                                    console.error('TTS: 播放时出现异常:', playError);
                                    audio._played = true;
                                    playingIndex.current = null;

                                    // 检查是否被停止
                                    if (!isStopped.current) {
                                        setTimeout(() => playNextInSequence(), 50);
                                    }
                                }
                            }, 200);
                        } else {
                            audio._played = true;
                            playingIndex.current = null;

                            // 检查是否被停止
                            if (!isStopped.current) {
                                setTimeout(() => playNextInSequence(), 50);
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('TTS: 播放尝试出现异常:', e);
                audio._played = true;
                playingIndex.current = null;

                // 检查是否被停止
                if (!isStopped.current) {
                    setTimeout(() => playNextInSequence(), 50);
                }
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
            console.log(`TTS: 处理第 ${index + 1}/${totalAudioCount.current} 个句子`);

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
                throw new Error(`TTS API 请求失败: ${response.status}`);
            }

            // 解析响应JSON
            const data: TTSResponse = await response.json();

            if (data.status !== 'success' || !data.audio_base64) {
                throw new Error('音频数据无效');
            }

            // 使用Worker解码音频数据
            const workerResult = await sendToWorker('decodeAudio', {
                audio_base64: data.audio_base64,
                index: index
            });

            // 创建音频对象
            createAudioObject(workerResult.audioData, index);

        } catch (error) {
            console.error(`TTS: 处理第 ${index + 1}/${totalAudioCount.current} 个句子音频失败:`, error);
            // 即使失败也从待处理集合中移除
            pendingIndices.current.delete(index);
            // 检查播放状态
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

            // 重置所有状态但保留缓冲区
            const oldBuffer = streamBuffer.current;
            resetState();
            streamBuffer.current = oldBuffer;

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
                }, 1000); // 超时时间缩短到1秒
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

    // 新增流式处理方法
    const processStreamingText = (text: string) => {
        // 如果未启用自动播放，直接返回
        if (!settings.autoPlayTTS) return;

        console.log(`TTS流式处理: 收到文本(${text.length}字): ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`);

        // 把新文本添加到缓冲区
        streamBuffer.current += text;

        // 防抖处理，降低到100ms使其更快响应
        if (streamTimerRef.current) {
            clearTimeout(streamTimerRef.current);
        }

        streamTimerRef.current = setTimeout(() => {
            const fullText = streamBuffer.current;
            console.log(`TTS流式处理: 缓冲区文本(${fullText.length}字): ${fullText.substring(0, 30)}${fullText.length > 30 ? '...' : ''}`);

            // 更激进的处理策略: 
            // 1. 如果有完整句子，优先处理完整句子
            // 2. 如果没有完整句子但积累了足够多的字符，也进行处理
            if (fullText.match(/[。！？.!?]/) || fullText.length > 30) {

                // 尝试分割成句子
                const sentences = splitText(fullText);
                console.log(`TTS流式处理: 分割为${sentences.length}个句子`);

                if (sentences.length > 0) {
                    // 只保留最后一个可能不完整的句子
                    const lastSentence = sentences[sentences.length - 1];
                    const sentenceEndRegex = /[。！？.!?]$/;
                    const lastIsComplete = sentenceEndRegex.test(lastSentence);

                    // 处理策略分支
                    if (sentences.length > 1 || lastIsComplete) {
                        // 有完整句子可以处理
                        let textToProcess;

                        if (!lastIsComplete && sentences.length > 1) {
                            // 保留最后不完整的句子在缓冲区
                            textToProcess = sentences.slice(0, -1).join(' ');
                            streamBuffer.current = lastSentence;
                            console.log(`TTS流式处理: 处理完整句子，保留未完成句子: ${lastSentence.substring(0, 20)}${lastSentence.length > 20 ? '...' : ''}`);
                        } else {
                            // 所有句子都完整
                            textToProcess = fullText;
                            streamBuffer.current = '';
                            console.log(`TTS流式处理: 处理所有句子，清空缓冲区`);
                        }

                        // 处理可播放的文本
                        if (textToProcess && textToProcess.trim().length > 0) {
                            // 不以isPlaying为准，只要有新内容就创建新音频
                            console.log(`TTS流式处理: 发送文本到TTS API: ${textToProcess.substring(0, 30)}${textToProcess.length > 30 ? '...' : ''}`);

                            // 分离创建一个单独的异步处理
                            (async () => {
                                try {
                                    if (isPlaying) {
                                        console.log('TTS流式处理: 当前有音频正在播放，优雅地打断');
                                        // 标记当前播放为终止状态，但不立即中断
                                        // 在下一个音频准备好时会自动切换
                                        isStopped.current = true;
                                        // 给时间让当前播放逻辑感知到停止状态
                                        await new Promise(resolve => setTimeout(resolve, 50));
                                    }

                                    // 重置播放状态但保留缓冲区
                                    let oldStreamBuffer = streamBuffer.current;
                                    resetPlaybackState();
                                    streamBuffer.current = oldStreamBuffer;

                                    // 初始化新的播放
                                    console.log('TTS流式处理: 开始处理新的音频播放');
                                    setIsLoading(true);
                                    setIsPlaying(true);

                                    // 分割要处理的文本
                                    const textSentences = splitText(textToProcess);
                                    const total = textSentences.length;
                                    console.log(`TTS流式处理: 文本已分割为 ${total} 个句子`);

                                    // 设置总音频数量
                                    totalAudioCount.current = total;
                                    // 创建播放序列
                                    playSequence.current = Array.from({ length: total }, (_, i) => i);

                                    // 为每个句子创建处理任务
                                    const promises = textSentences.map((sentence, i) =>
                                        processAudioData(sentence, i).catch(err => {
                                            console.error(`TTS流式处理: 句子处理异常 (${i + 1}/${total}):`, err);
                                            return Promise.resolve();
                                        })
                                    );

                                    // 设置较短的超时启动播放
                                    setTimeout(() => {
                                        if (!playbackStarted.current && readyIndices.current.size > 0) {
                                            console.log(`TTS流式处理: 快速开始播放已准备好的 ${readyIndices.current.size} 个音频`);
                                            playbackStarted.current = true;
                                            playNextInSequence();
                                        }
                                    }, 300);

                                    // 等待所有处理完成
                                    await Promise.all(promises);
                                    setIsLoading(false);

                                } catch (error) {
                                    console.error('TTS流式处理: 错误:', error);
                                    setIsLoading(false);
                                }
                            })();
                        }
                    } else if (lastSentence.length > 50) {
                        // 特殊情况: 单句过长但没有标点，强制处理
                        console.log(`TTS流式处理: 单句过长(${lastSentence.length}字)但无标点，强制处理`);
                        const textToProcess = lastSentence;
                        streamBuffer.current = '';

                        (async () => {
                            try {
                                if (isPlaying) {
                                    console.log('TTS流式处理: 当前有音频正在播放，优雅地打断');
                                    isStopped.current = true;
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                }

                                resetPlaybackState();
                                console.log('TTS流式处理: 开始处理长句音频');
                                setIsLoading(true);
                                setIsPlaying(true);

                                // 手动切分长句为短句
                                const shortSentences = [];
                                let start = 0;
                                while (start < textToProcess.length) {
                                    const end = Math.min(start + 20, textToProcess.length);
                                    shortSentences.push(textToProcess.substring(start, end));
                                    start = end;
                                }

                                totalAudioCount.current = shortSentences.length;
                                playSequence.current = Array.from({ length: shortSentences.length }, (_, i) => i);

                                const promises = shortSentences.map((sentence, i) =>
                                    processAudioData(sentence, i).catch(err => {
                                        console.error(`TTS流式处理: 长句分段处理异常 (${i + 1}/${shortSentences.length}):`, err);
                                        return Promise.resolve();
                                    })
                                );

                                setTimeout(() => {
                                    if (!playbackStarted.current && readyIndices.current.size > 0) {
                                        playbackStarted.current = true;
                                        playNextInSequence();
                                    }
                                }, 300);

                                await Promise.all(promises);
                                setIsLoading(false);

                            } catch (error) {
                                console.error('TTS流式处理: 长句处理错误:', error);
                                setIsLoading(false);
                            }
                        })();
                    }
                }
            }
        }, 100); // 降低防抖时间到100ms
    };

    // 在组件卸载时清理资源
    useEffect(() => {
        // 监听路由变化
        const handleRouteChange = () => {
            console.log('路由变化，停止TTS播放');
            stopAudio();
            resetState();
        };

        // 监听浏览器事件
        window.addEventListener('beforeunload', handleRouteChange);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handleRouteChange();
            }
        });

        // 尝试监听Next.js路由事件（如果可用）
        if (typeof window !== 'undefined') {
            // Next.js路由事件监听
            const nextRouter = (window as any).__NEXT_DATA__?.router;
            if (nextRouter) {
                document.addEventListener('routeChangeStart', handleRouteChange);
            }
        }

        return () => {
            window.removeEventListener('beforeunload', handleRouteChange);
            document.removeEventListener('visibilitychange', handleRouteChange);
            document.removeEventListener('routeChangeStart', handleRouteChange);

            // 清理Worker
            if (ttsWorker) {
                ttsWorker.terminate();
                ttsWorker = null;
                workerCallbacks.clear();
            }

            // 清理其他资源...
            Object.values(audioObjects.current).forEach(audio => {
                try {
                    if (audio.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audio.src);
                    }
                } catch (e) {
                    console.error('TTS: 清理音频资源时出错:', e);
                }
            });

            // 清理定时器
            if (streamTimerRef.current) {
                clearTimeout(streamTimerRef.current);
            }
        };
    }, []);

    return (
        <TTSContext.Provider value={{
            isPlaying,
            isLoading,
            playAudio,
            stopAudio,
            processStreamingText
        }}>
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