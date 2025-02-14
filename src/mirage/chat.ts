import { Server, Response } from 'miragejs'
import { API_BASE_URL } from '@/utils/config'

// 模拟数据
const mockThreads = [
    {
        thread_id: 'mock-thread-1',
        title: '关于 AI 的对话',
        last_message: '你能解释一下什么是人工智能吗？',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
    },
    {
        thread_id: 'mock-thread-2',
        title: '编程学习讨论',
        last_message: '请问如何开始学习 Python？',
        created_at: '2024-01-02T14:00:00Z',
        updated_at: '2024-01-02T14:15:00Z'
    }
]

const mockMessages = {
    'mock-thread-1': [
        {
            request_id: 'req-1',
            favorite: false,
            request: [
                { role: 'user', content: '你能解释一下什么是人工智能吗？' }
            ],
            reply: [
                { role: 'assistant', content: '人工智能是一门研究如何使计算机模拟人类智能的科学...' }
            ]
        }
    ],
    'mock-thread-2': [
        {
            request_id: 'req-2',
            favorite: true,
            request: [
                { role: 'user', content: '请问如何开始学习 Python？' }
            ],
            reply: [
                { role: 'assistant', content: '学习 Python 可以从以下几个步骤开始...' }
            ]
        }
    ]
}

export function chatRoutes(server: Server) {
    // 创建新对话
    server.post(`${API_BASE_URL}/chat/threads`, () => {
        const newThreadId = `mock-thread-${Date.now()}`
        return {
            thread_id: newThreadId
        }
    })

    // 获取对话列表
    server.get(`${API_BASE_URL}/chat/threads`, () => {
        return {
            threads: mockThreads
        }
    })

    // 获取特定对话的消息
    server.get(`${API_BASE_URL}/chat/threads/:threadId/messages`, (_schema, request) => {
        const { threadId } = request.params
        return {
            messages: mockMessages[threadId as keyof typeof mockMessages] || []
        }
    })

    // 发送新消息
    server.post(`${API_BASE_URL}/chat/threads/:threadId/messages`, (_schema, request) => {
        const { messages } = JSON.parse(request.requestBody)
        const requestId = `req-${Date.now()}`

        const newMessage = {
            request_id: requestId,
            favorite: false,
            request: messages,
            reply: [
                {
                    role: 'assistant',
                    content: '这是一个模拟的回复消息。'
                }
            ]
        }

        return {
            message: newMessage
        }
    })

    // 切换收藏状态
    server.post(`${API_BASE_URL}/chat/messages/:requestId/favorite`, (_schema, _request) => {
        return new Response(200)
    })
}
