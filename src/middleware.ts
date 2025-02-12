import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 需要认证的路由
const AUTH_ROUTES = ['/chat', '/settings', '/profile']
// 认证页面
const AUTH_PAGES = ['/login', '/register']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const authCookie = request.cookies.get('auth_token')

    // 检查是否需要认证
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))
    const isAuthPage = AUTH_PAGES.some(page => pathname.startsWith(page))

    // 未登录访问需认证路由
    if (isAuthRoute && !authCookie) {
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }

    // 已登录访问认证页面
    if (isAuthPage && authCookie) {
        return NextResponse.redirect(new URL('/chat', request.url))
    }

    return NextResponse.next()
} 