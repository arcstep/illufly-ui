import { createServer } from 'miragejs'
import { authRoutes } from './auth'
import { chatRoutes } from './chat'

let server: any = null

export function makeServer() {
    if (server) {
        server.shutdown()
    }

    server = createServer({
        routes() {
            // 设置命名空间
            this.namespace = ''

            // 注册各模块的路由
            authRoutes(this)
            chatRoutes(this)

            // 对未处理的请求放行
            this.passthrough()
        }
    })

    return server
}

export function initMirage() {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
        makeServer()
        console.log('使用 Mirage 模拟 API')
        return Promise.resolve()
    } else {
        console.log('使用 illufly 后台 API')
        return Promise.resolve()
    }
}
