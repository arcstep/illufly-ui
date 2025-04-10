export function getRelativeTime(timestamp: number | string): string {
    if (!timestamp) {
        return '未知时间';
    }

    // 处理传入的时间戳
    let date: Date;

    if (typeof timestamp === 'number') {
        // 检测是否为秒级时间戳 (Unix时间戳通常为10位数字，表示秒)
        // 如果是秒级时间戳(长度约为10位)，则转换为毫秒
        if (timestamp < 10000000000) {
            date = new Date(timestamp * 1000);
        } else {
            // 已经是毫秒级时间戳
            date = new Date(timestamp);
        }
    } else {
        // 字符串时间戳，尝试直接解析
        date = new Date(timestamp);
    }

    // 验证日期是否有效
    if (isNaN(date.getTime())) {
        console.warn('无效的时间戳:', timestamp);
        return '未知时间';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // 未来时间
    if (diffInSeconds < 0) {
        return '未来时间';
    }

    if (diffInSeconds < 60) {
        return '刚刚';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}小时前`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays}天前`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths}个月前`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}年前`;
} 