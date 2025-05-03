/**
 * 统一处理API请求中的401认证错误，将用户重定向到登录页面并保留当前页面地址
 * 
 * @param status HTTP状态码
 * @param message 可选的错误信息，用于控制台输出
 * @returns 如果是401错误，返回true表示已处理；否则返回false
 */
export function handleAuthError(status: number, message?: string): boolean {
    if (status === 401) {
        // 获取当前URL路径
        const currentPath = window.location.pathname
        // 暂时注释掉重定向逻辑
        // window.location.href = `/login?from=${encodeURIComponent(currentPath)}`
        console.log('暂时禁用401重定向，当前路径:', currentPath)

        if (message) {
            console.error(message)
        } else {
            console.error('未登录或会话已过期，但暂时不重定向')
        }

        return true
    }

    return false
}

/**
 * 检查并处理常见的API错误，如认证错误、网络错误等
 * 
 * @param error 捕获到的错误对象
 * @param defaultMessage 默认错误信息
 * @returns 如果是特殊错误且已处理，返回true；否则返回false
 */
export function handleApiError(error: unknown, defaultMessage: string = '请求失败'): boolean {
    console.error(defaultMessage, error)

    // 处理Response对象
    if (error instanceof Response) {
        return handleAuthError(error.status, `${defaultMessage}: HTTP ${error.status}`)
    }

    // 处理包含Response属性的错误对象
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response
        if (response && typeof response === 'object' && 'status' in response) {
            return handleAuthError(response.status, `${defaultMessage}: HTTP ${response.status}`)
        }
    }

    // 处理网络错误
    if (error instanceof Error) {
        if (error.name === 'NetworkError' || error.message.includes('network')) {
            console.error('网络连接错误，请检查您的网络连接')
            return true
        }
    }

    return false
} 