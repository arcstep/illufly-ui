import { NextResponse } from 'next/server';

export function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.cookies.get('access_token'); // 使用正确的 cookie 名称

    // 定义需要鉴权的路径
    const protectedPaths = ['/dashboard', '/profile', '/settings'];

    // 检查请求路径是否需要鉴权
    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

    // 如果路径需要鉴权且没有 token，则重定向到登录页
    if (isProtectedPath && !token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // 继续处理请求
    return NextResponse.next();
} 