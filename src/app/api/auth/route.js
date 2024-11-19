import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '30m';
const JWT_REFRESH_EXPIRES_IN = '7d';

// 示例用户数据库（实际项目应使用真实数据库）
const users = [
    {
        id: 1,
        email: 'user@example.com',
        passwordHash: '$2b$10$Wq1JzU6x3H5eG7Lk6YQBoOmHYU3pXKXhU8/lLzsNn.IKkDqjZ6e3K' // password123
    }
];

const generateToken = (user, expiresIn) => {
    const payload = { sub: user.id, email: user.email };
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        const user = users.find(u => u.email === email);
        if (!user) {
            return NextResponse.json({ message: '邮箱或密码错误' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ message: '邮箱或密码错误' }, { status: 401 });
        }

        const accessToken = generateToken(user, JWT_EXPIRES_IN);
        const refreshToken = generateToken(user, JWT_REFRESH_EXPIRES_IN);

        const response = NextResponse.json({ message: '登录成功' }, { status: 200 });

        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 30, // 30 分钟
            path: '/',
            sameSite: 'lax',
        });

        response.cookies.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 天
            path: '/',
            sameSite: 'lax',
        });

        return response;
    } catch (error) {
        console.error('登录错误:', error);
        return NextResponse.json({ message: '服务器错误' }, { status: 500 });
    }
}

// 获取当前用户信息
export async function GET(request) {
    try {
        const token = request.cookies.get('access_token');
        if (!token) {
            return NextResponse.json({ message: '未认证' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.sub);

        if (!user) {
            return NextResponse.json({ message: '用户不存在' }, { status: 401 });
        }

        return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 200 });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        return NextResponse.json({ message: '无效的令牌' }, { status: 401 });
    }
}

// 登出
export async function DELETE(request) {
    const response = NextResponse.json({ message: '登出成功' }, { status: 200 });

    response.cookies.set('access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
    });

    response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
    });

    return response;
}