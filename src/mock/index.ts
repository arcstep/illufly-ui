import { authHandlers } from './auth'
import { chatHandlers } from './chat'

let isInitialized = false

export async function initMockServer() {
    // 开发环境且未初始化过
    if (process.env.NODE_ENV !== 'development' || isInitialized) {
        return
    }

    console.log('[MSW] 开始初始化')
    const startTime = Date.now()

    try {
        const { setupWorker } = await import('msw/browser')
        await setupWorker(
            ...authHandlers,
            ...chatHandlers
        ).start({
            serviceWorker: {
                url: '/mockServiceWorker.js',
                options: {
                    // 强制更新Service Worker
                    scope: '/'
                }
            },
            onUnhandledRequest(req: any) {
                // 对未mock的API请求保持警告
                if (req.url.includes('/api/')) {
                    console.warn('未mock的API请求:', req.method, req.url)
                }

                // 其他所有请求自动透传
                return 'bypass' // 关键策略配置
            }
        })

        isInitialized = true
        console.log(`[MSW] 初始化完成，耗时 ${Date.now() - startTime}ms`)
    } catch (error) {
        console.error('[MSW] 初始化失败:', error)
        throw error
    }
}
