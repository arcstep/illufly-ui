import { createServer, Response } from 'miragejs'
import { API_BASE_URL } from '@/utils/config'

export function chatRoutes(server) {
    server.post(`${API_BASE_URL}/chat/create_thread`, () => {
        return {
            data: {
                thread_id: 'mock-thread-1'
            }
        }
    })

    server.get(`${API_BASE_URL}/chat/threads`, () => {
        return {
            data: {
                threads: [
                    {
                        thread_id: 'mock-thread-1',
                        name: 'Mock Thread 1'
                    },
                    {
                        thread_id: 'mock-thread-2',
                        name: 'Mock Thread 2'
                    }
                ]
            }
        }
    })

    server.post(`${API_BASE_URL}/chat/mock-thread-1/send`, () => {
        return {
            data: {
                message: 'Hello, world!'
            }
        }
    })

    server.get(`${API_BASE_URL}/chat/mock-thread-1/messages`, () => {
        return {
            data: {
                messages: [
                    {
                        thread_id: 'mock-thread-1',
                        name: 'Mock Thread 1'
                    },
                    {
                        thread_id: 'mock-thread-2',
                        name: 'Mock Thread 2'
                    }
                ]
            }
        }
    })

    server.post(`${API_BASE_URL}/chat/mock-thread-1/send`, (_schema, request) => {
        let attrs = JSON.parse(request.requestBody)
        return {
            data: [
                {
                    role: 'assistant',
                    content: 'Hello, world!'
                },
            ]
        }
    })

    server.get(`${API_BASE_URL}/chat/mock-thread-1/messages`, () => {
        return {
            data: {
                messages: [
                    {
                        thread_id: 'mock-thread-1',
                        content: 'Hello, world!',
                        sender: 'user',
                        timestamp: '2024-01-01 12:00:00'
                    }
                ]
            }
        }
    })
}
