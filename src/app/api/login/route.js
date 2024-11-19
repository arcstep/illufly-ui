"use strict";

import { NextResponse } from 'next/server';
import { authenticate } from './auth';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 从环境变量中获取 JWT 配置
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// 示例用户数据库（在实际项目中应使用真实的数据库）
const users = [
    {
        id: 1,
        email: 'user@example.com',
        // 密码是 "password123" 的 bcrypt 哈希
        passwordHash: '$2b$10$Wq1JzU6x3H5eG7Lk6YQBoOmHYU3pXKXhU8/lLzsNn.IKkDqjZ6e3K'
    }
];

// 生成 JWT 令牌
const generateToken = (user, expiresIn) => {
    const payload = {
        sub: user.id,
        email: user.email
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

import { authenticate } from '../../../middleware/auth';

export const GET = authenticate(async (req, res) => {
    const user = req.user;
    return NextResponse.json({ message: `Hello, ${user.email}!` });
});

// POST 请求处理函数
export async function POST(request) {
    try {
        const { email, password } = await request.json();

        // 查找用户
        const user = users.find(u => u.email === email);
        if (!user) {
            return NextResponse.json(
                { message: '邮箱或密码错误' },
                { status: 401 }
            );
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { message: '邮箱或密码错误' },
                { status: 401 }
            );
        }

        // 生成访问令牌和刷新令牌
        const accessToken = generateToken(user, JWT_EXPIRES_IN);
        const refreshToken = generateToken(user, JWT_REFRESH_EXPIRES_IN);

        // 创建响应对象
        const response = NextResponse.json(
            { message: '登录成功' },
            { status: 200 }
        );

        // 设置 HTTP-only Cookie
        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 30, // 30 分钟
            path: '/'
        });

        response.cookies.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 天
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('登录错误:', error);
        return NextResponse.json(
            { message: '服务器错误' },
            { status: 500 }
        );
    }
} 