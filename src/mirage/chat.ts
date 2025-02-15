import { Server, Response } from 'miragejs'
import { API_BASE_URL } from '@/utils/config'
import { Message } from '@/context/ChatContext'

const mockNewThread: Object = {
    thread_id: 'thread-1',
    title: '',
    created_at: '2024-01-01T00:00:00Z'
}

const mockMessages: Message[] = [
    {
        request_id: 'req1',
        message_id: 'msg-1',
        favorite: null,
        role: 'user',
        content: '什么是 AI？',
        message_type: 'text',
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        request_id: 'req2',
        message_id: 'msg-2',
        favorite: null,
        role: 'assistant',
        content: 'AI 是...',
        message_type: 'text',
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        request_id: 'req3',
        message_id: 'msg-3',
        favorite: null,
        role: 'user',
        content: '什么是 AI？',
        message_type: 'text',
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        request_id: 'req4',
        message_id: 'msg-4',
        favorite: null,
        role: 'assistant',
        content: 'AI 是...',
        message_type: 'text',
        created_at: '2024-01-01T00:00:00Z'
    },
]

const mockHistory: Object = {
    "thread-1": {
        thread_id: "thread-1",
        title: "关于 AI 的讨论",
        created_at: "2024-01-01T00:00:00Z"
    },
    "thread-2": {
        thread_id: "thread-2",
        title: "你是什么模型？",
        created_at: "2024-01-01T00:00:00Z"
    }
}

export function chatRoutes(server: Server) {
    // 创建新对话
    server.post(`${API_BASE_URL}/chat/threads`, () => {
        return mockNewThread
    })

    // 获取对话列表
    server.get(`${API_BASE_URL}/chat/threads`, () => {
        return mockHistory
    })

    // 获取特定对话的消息
    server.get(`${API_BASE_URL}/chat/threads/:threadId/messages`, (_schema, request) => {
        const { threadId } = request.params
        if (threadId in mockHistory) {
            if (threadId === 'thread-1') {
                return mockMessages
            } else {
                return mockMessages.slice(0, 2)
            }
        } else {
            return new Response(404, {}, { error: 'Thread not found' })
        }
    })

    // 切换收藏状态
    server.post(`${API_BASE_URL}/chat/messages/:requestId/favorite`, (_schema, _request) => {
        return new Response(200)
    })

    // SSE 聊天路由
    server.post(`${API_BASE_URL}/chat/threads/:threadId/chat`, (_schema, _request) => {
        const chunks = [
            "这是第一个",
            "消息块，",
            "它会被",
            "分段发送。"
        ]

        return new Response(
            200,
            {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            (sink: any) => {
                let chunkIndex = 0

                const interval = setInterval(() => {
                    if (chunkIndex >= chunks.length) {
                        sink.close()
                        clearInterval(interval)
                        return
                    }

                    const chunk: Message = {
                        request_id: `req-${Date.now()}`,
                        message_id: `msg-${Date.now()}`,
                        favorite: null,
                        role: 'assistant',
                        content: chunks[chunkIndex],
                        message_type: 'text_chunk',
                        created_at: '2024-01-01T00:00:00Z'
                    }

                    sink.send(`data: ${JSON.stringify(chunk)}\n\n`)
                    chunkIndex++
                }, 300) // 每300ms发送一个块
            }
        )
    })
}
