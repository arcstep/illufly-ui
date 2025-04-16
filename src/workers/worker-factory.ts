// Worker工厂，管理Worker实例的创建和通信
// 这个模块确保Worker在页面切换时持续运行，并且能够恢复通信

type MessageHandler = (event: MessageEvent) => void;

class WorkerInstance {
    private worker: Worker | null = null;
    private apiBaseUrl: string = '';
    private isInitialized: boolean = false;
    private messageHandlers: Set<MessageHandler> = new Set();
    private pendingMessages: Array<any> = [];
    private initPromise: Promise<boolean> | null = null;
    private initialized = false;

    // 获取Worker实例（单例模式）
    private getWorker(): Worker {
        if (!this.worker) {
            try {
                this.worker = new Worker(new URL('./upload-worker.ts', import.meta.url));
                this.setupWorkerListeners();
            } catch (error) {
                console.error('创建Worker失败:', error);
                throw error;
            }
        }
        return this.worker;
    }

    // 初始化Worker
    async init(apiBaseUrl: string): Promise<boolean> {
        if (this.initialized && this.apiBaseUrl === apiBaseUrl) {
            return true;
        }

        this.apiBaseUrl = apiBaseUrl;

        // 如果已经有初始化过程在进行，返回那个Promise
        if (this.initPromise) {
            return this.initPromise;
        }

        // 创建新的初始化Promise
        this.initPromise = new Promise<boolean>((resolve, reject) => {
            try {
                const worker = this.getWorker();

                // 设置一次性监听器处理初始化响应
                const handleInitResponse = (event: MessageEvent) => {
                    const { action, success } = event.data;
                    if (action === 'init') {
                        // 移除初始化特定的监听器
                        worker.removeEventListener('message', handleInitResponse);

                        if (success) {
                            this.initialized = true;
                            console.log('Worker初始化成功');

                            // 发送所有挂起的消息
                            this.sendPendingMessages();

                            resolve(true);
                        } else {
                            console.error('Worker初始化失败:', event.data.error);
                            reject(new Error(event.data.error || 'Worker初始化失败'));
                        }
                    }
                };

                // 添加初始化特定的监听器
                worker.addEventListener('message', handleInitResponse);

                // 发送初始化消息
                worker.postMessage({
                    id: `init_${Date.now()}`,
                    action: 'init',
                    payload: { apiBaseUrl }
                });

                // 设置超时
                setTimeout(() => {
                    if (!this.initialized) {
                        worker.removeEventListener('message', handleInitResponse);
                        reject(new Error('Worker初始化超时'));
                    }
                }, 10000);
            } catch (error) {
                reject(error);
            }
        });

        try {
            await this.initPromise;
            this.initPromise = null;
            return true;
        } catch (error) {
            this.initPromise = null;
            throw error;
        }
    }

    // 设置Worker的事件监听器
    private setupWorkerListeners() {
        if (!this.worker) return;

        this.worker.onmessage = (event) => {
            // 将消息分发给所有注册的处理程序
            this.messageHandlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    console.error('处理Worker消息时出错:', error);
                }
            });
        };

        this.worker.onerror = (error) => {
            console.error('Worker错误:', error);
        };
    }

    // 发送挂起的消息
    private sendPendingMessages() {
        if (this.pendingMessages.length > 0 && this.worker) {
            console.log(`发送${this.pendingMessages.length}个挂起的消息`);
            this.pendingMessages.forEach(message => {
                this.worker?.postMessage(message);
            });
            this.pendingMessages = [];
        }
    }

    // 向Worker发送消息
    postMessage(message: any) {
        if (!this.initialized) {
            // 如果Worker尚未初始化，将消息添加到挂起队列
            this.pendingMessages.push(message);
            console.log('Worker尚未初始化，消息已加入挂起队列', message);
            return;
        }

        try {
            const worker = this.getWorker();
            worker.postMessage(message);
        } catch (error) {
            console.error('发送消息到Worker失败:', error);
            throw error;
        }
    }

    // 添加消息处理程序
    addEventListener(type: string, handler: MessageHandler) {
        if (type !== 'message') {
            console.warn(`Worker仅支持'message'事件，但收到了'${type}'`);
            return;
        }
        this.messageHandlers.add(handler);
    }

    // 移除消息处理程序
    removeEventListener(type: string, handler: MessageHandler) {
        if (type !== 'message') return;
        this.messageHandlers.delete(handler);
    }

    // 重置Worker实例（用于测试）
    reset() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.initialized = false;
        this.initPromise = null;
        this.messageHandlers.clear();
        this.pendingMessages = [];
    }
}

// 导出单例实例
export const DocumentWorker = new WorkerInstance(); 