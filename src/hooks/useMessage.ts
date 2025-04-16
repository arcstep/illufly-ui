/**
 * 简单的消息提示hook，可以根据需要替换为更复杂的实现
 */
export function useMessage() {
    const showMessage = (message: { type: string; content: string }) => {
        // 控制台打印消息
        if (message.type === 'error') {
            console.error(message.content);
        } else if (message.type === 'success') {
            console.log(message.content);
        } else {
            console.info(message.content);
        }

        // 如果项目中有消息组件，可以调用显示消息
        // toast.open(message);
    };

    return { showMessage };
} 