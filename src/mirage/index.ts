import { createServer, Response } from 'miragejs'
import { API_BASE_URL } from '@/utils/config'

export function makeServer() {
    return createServer({
        routes() {
            this.post(`${API_BASE_URL}/auth/login`, (_schema, request) => {
                let attrs = JSON.parse(request.requestBody)
                const { username, password } = attrs
                if (username === 'test' && password === 'test123') {
                    return {
                        data: {
                            user_id: 'mock-user-1',
                            username,
                            email: `${username}@example.com`,
                            role: ['user'],
                            device_id: 'mock-device-1'
                        }
                    }
                } else {
                    return new Response(401, {}, { detail: '用户名或密码错误' })
                }
            })

            this.get(`${API_BASE_URL}/auth/profile`, () => {
                return {
                    data: {
                        user_id: 'mock-user-1',
                        username: 'test',
                        email: 'test@example.com',
                        role: 'user',
                        device_id: 'mock-device-1'
                    }
                }
            })
        }
    })
}