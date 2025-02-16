import { API_BASE_URL } from '@/utils/config'
import { http, HttpResponse } from 'msw'


export const authHandlers = [
    http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
        try {
            const info = await request.json()

            // 检查请求体是否为空
            if (!info) {
                return HttpResponse.json(
                    { detail: '请求参数错误' },
                    { status: 400 }
                )
            }

            // 验证用户名和密码字段
            const { username, password } = info as { username: string, password: string }
            if (!username || !password ||
                typeof username !== 'string' ||
                typeof password !== 'string' ||
                username.trim() === '' ||
                password.trim() === '') {
                return HttpResponse.json(
                    { detail: '用户名和密码不能为空' },
                    { status: 400 }
                )
            }

            // 登录验证逻辑
            if (username === 'test' && password === 'test123') {
                return HttpResponse.json({
                    user_id: 'mock-user-1',
                    username,
                    email: `test@example.com`,
                    role: ['user'],
                    device_id: 'mock-device-1'
                })
            } else {
                return HttpResponse.json(
                    { detail: '用户名或密码错误' },
                    { status: 401 }
                )
            }
        } catch (error) {
            // 处理JSON解析错误
            return HttpResponse.json(
                { detail: '无效的请求格式' },
                { status: 400 }
            )
        }
    }),

    http.get(`${API_BASE_URL}/auth/profile`, () => {
        return HttpResponse.json({
            user_id: 'mock-user-1',
            username: 'test',
            email: 'test@example.com',
            role: ['user'],
            device_id: 'mock-device-1'
        })
    }),

    http.post(`${API_BASE_URL}/auth/logout`, () => {
        return HttpResponse.json({
            message: '退出成功'
        })
    })
]