import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '@/utils/config'
import { Message, Thread } from '@/context/ChatContext'

let counter = 0
const get_message_id = () => `msg-${Date.now()}-${counter++}`

const mockMessages: Message[] = [
    {
        model: 'gpt-4o',
        block_type: 'question',
        request_id: 'req1',
        message_id: 'msg-1',
        favorite_id: '',
        role: 'user',
        text: '什么是 AI？',
        message_type: 'text',
        created_at: 1713235200000,
        completed_at: 1713235200000,
    },
    {
        model: 'gpt-4o',
        block_type: 'answer',
        request_id: 'req2',
        message_id: 'msg-2',
        favorite_id: '',
        role: 'assistant',
        text: 'AI 是...',
        message_type: 'text',
        created_at: 1713235202000,
        completed_at: 1713235400000,
    },
    {
        model: 'gpt-4o',
        block_type: 'question',
        request_id: 'req3',
        message_id: 'msg-3',
        favorite_id: '',
        role: 'user',
        text: '什么是 AI？',
        message_type: 'text',
        created_at: 1713235206000,
        completed_at: 17132352080000,
    },
    {
        model: 'gpt-4o',
        block_type: 'answer',
        request_id: 'req4',
        message_id: 'msg-4',
        favorite_id: '',
        role: 'assistant',
        text: 'AI 是...',
        message_type: 'text',
        created_at: 1713235210000,
        completed_at: 1713235212000,
    },
]

const mockHistory: Thread[] = [
    {
        thread_id: "thread-1",
        title: "关于 AI 的讨论",
        created_at: 1713235200000
    },
    {
        thread_id: "thread-2",
        title: "你是什么模型？",
        created_at: 1713235200000
    }
]
const allThreads: string[] = mockHistory.map(thread => thread.thread_id)

export const chatHandlers = [
    // 创建新对话
    http.post(`${API_BASE_URL}/chat/threads`, () => {
        const newThread = {
            thread_id: 'thread-new',
            title: '新对话 ...',
            created_at: Date.now()
        }
        return HttpResponse.json(newThread)
    }),

    // 获取对话列表
    http.get(`${API_BASE_URL}/chat/threads`, () => {
        return HttpResponse.json(mockHistory)
    }),

    // 获取特定对话的消息
    http.get(`${API_BASE_URL}/chat/threads/:threadId/messages`, ({ params }) => {
        const { threadId } = params
        if (typeof threadId !== 'string') {
            return HttpResponse.json({ error: 'Thread ID is not a string' }, { status: 400 })
        }

        if (allThreads.includes(threadId)) {
            if (threadId === 'thread-1') {
                return HttpResponse.json(mockMessages)
            } else {
                return HttpResponse.json(mockMessages.slice(0, 2))
            }
        } else if (threadId === 'thread-new') {
            return HttpResponse.json([])
        } else {
            return HttpResponse.json({ error: 'Thread not found' }, { status: 404 })
        }
    }),

    // 切换收藏状态
    http.post(`${API_BASE_URL}/chat/messages/:requestId/favorite`, () => {
        return HttpResponse.json({})
    }),

    // 发送消息
    http.post(`${API_BASE_URL}/chat/complete`, async ({ request }) => {
        console.log("POST chat/complete >>> ", request)

        const requestId = `req-${Date.now()}`
        const chunks = [
            "这是第一个",
            "消息块，",
            "它会被",
            "分段发送。"
        ]

        const create_stream = (messageId: string) => new ReadableStream({
            start(controller) {
                let chunkIndex = 0
                console.log("create_stream >>> ", messageId)

                const pushChunk = () => {
                    if (chunkIndex >= chunks.length) {
                        // 发送一个空行标记流结束
                        controller.enqueue(new TextEncoder().encode('\n'))
                        controller.close()
                        return
                    }

                    const isLastChunk = chunkIndex === chunks.length - 1

                    const msg = {
                        model: 'gpt-4o',
                        block_type: 'answer',
                        request_id: requestId,
                        message_id: isLastChunk ? `${messageId}-text` : `${messageId}-chunk`,
                        favorite_id: '',
                        role: 'assistant',
                        text: chunks[chunkIndex],
                        message_type: isLastChunk ? 'text' : 'text_chunk',
                        created_at: Date.now(),
                        completed_at: Date.now()
                    }

                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify(msg)}\n\n`)
                    )
                    chunkIndex++

                    if (chunkIndex < chunks.length) {
                        setTimeout(pushChunk, 300)
                    }
                }
                pushChunk()
            }
        })

        return new Response(create_stream(get_message_id()), {
            status: 200,
            headers: {
                'text-Type': 'text/event-stream',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            },
        })
    })
]
