'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { API_BASE_URL } from '@/utils/config'

interface MemoryTopic {
    topic_id: string
    title: string
    content: string
    created_at: number
}

interface TopicQA {
    memory_id: string
    question: string
    answer: string
    created_at: number
}

// 临时测试数据
const MOCK_TOPICS: MemoryTopic[] = [
    {
        topic_id: 'topic-1',
        title: '人工智能基础知识',
        content: '关于AI的基本概念和应用场景的讨论',
        created_at: Date.now() - 86400000 * 5
    },
    {
        topic_id: 'topic-2',
        title: '机器学习模型比较',
        content: '不同机器学习算法的优缺点分析',
        created_at: Date.now() - 86400000 * 3
    },
    {
        topic_id: 'topic-3',
        title: '编程语言学习路线',
        content: '从入门到精通的编程学习建议',
        created_at: Date.now() - 86400000
    },
    {
        topic_id: 'topic-4',
        title: '网络安全基础知识',
        content: '常见的网络安全威胁和防护措施',
        created_at: Date.now() - 3600000
    }
];

// 为每个话题生成测试问答数据
const MOCK_QAS: { [key: string]: TopicQA[] } = {
    'topic-1': [
        {
            memory_id: 'qa-1-1',
            question: '什么是人工智能？',
            answer: '人工智能是计算机科学的一个分支，旨在开发能够模拟人类智能行为的系统。它包括机器学习、自然语言处理、计算机视觉等多个领域。',
            created_at: Date.now() - 86400000 * 4
        },
        {
            memory_id: 'qa-1-2',
            question: 'AI与机器学习有什么区别？',
            answer: 'AI是一个更广泛的概念，机器学习是AI的一个子集。机器学习专注于通过数据训练算法，使计算机能够从经验中学习并改进。',
            created_at: Date.now() - 86400000 * 4
        }
    ],
    'topic-2': [
        {
            memory_id: 'qa-2-1',
            question: '监督学习和无监督学习的区别是什么？',
            answer: '监督学习使用带标签的数据集进行训练，而无监督学习使用无标签数据发现潜在模式。监督学习适用于分类和回归问题，无监督学习适用于聚类和关联规则学习。',
            created_at: Date.now() - 86400000 * 2
        },
        {
            memory_id: 'qa-2-2',
            question: '什么情况下应该使用深度学习？',
            answer: '当有大量数据、复杂问题（如图像识别、自然语言处理）、足够的计算资源，且传统机器学习方法效果不佳时，深度学习通常是更好的选择。',
            created_at: Date.now() - 86400000 * 2
        }
    ],
    'topic-3': [
        {
            memory_id: 'qa-3-1',
            question: '初学者应该先学习哪种编程语言？',
            answer: 'Python是初学者的不错选择，因为它语法简洁、可读性强，有丰富的库和资源。JavaScript也是不错的选择，特别是对网页开发感兴趣的人。',
            created_at: Date.now() - 86400000
        }
    ],
    'topic-4': [
        {
            memory_id: 'qa-4-1',
            question: '什么是SQL注入攻击？',
            answer: 'SQL注入是一种常见的网络攻击方式，攻击者通过在用户输入字段中插入恶意SQL代码，如果应用程序直接将这些输入拼接到SQL查询中而不进行适当过滤，就可能导致数据库被非法访问或损坏。',
            created_at: Date.now() - 3600000
        },
        {
            memory_id: 'qa-4-2',
            question: '如何防范XSS攻击？',
            answer: '防范XSS（跨站脚本）攻击的方法包括：输入验证和净化、使用内容安全策略(CSP)、输出编码、使用现代框架自动转义、使用HttpOnly和Secure标记保护cookie等。',
            created_at: Date.now() - 3600000
        }
    ]
};

export interface MemoryContextType {
    topics: MemoryTopic[]
    selectedTopic: string | null
    selectedQAs: TopicQA[]
    listTopics: () => Promise<void>
    listQAs: (topic_id: string) => Promise<void>
}

export const MemroyContext = createContext<MemoryContextType>({
    topics: [],
    selectedTopic: null,
    selectedQAs: [],
    listTopics: async () => {
        throw new Error('MemoryProvider not found')
    },
    listQAs: async () => {
        throw new Error('MemoryProvider not found')
    }
})

export function MemoryProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [topics, setTopics] = useState<MemoryTopic[]>([])
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
    const [selectedQAs, setSelectedQAs] = useState<TopicQA[]>([])

    useEffect(() => {
        if (typeof window === 'undefined') return;

        listTopics();
    }, []);

    const listTopics = async () => {
        setIsLoading(true)
        try {
            // 临时使用测试数据，API实现后可移除
            setTopics(MOCK_TOPICS);

            // 当API实现后取消注释
            /*
            const api_url = `${API_BASE_URL}/memory/topics`
            const res = await fetch(api_url, {
                method: 'GET',
                credentials: 'include',
            })

            if (res.ok) {
                const data = await res.json()
                console.log('remember >>> ', data)
                setTopics(data)
            } else {
                console.error('回忆失败', res.status)
                setTopics([])
            }
            */
        } catch (error) {
            console.error('回忆失败:', error)
            setTopics([])
        } finally {
            setIsLoading(false)
        }
    }

    const listQAs = async (topic_id: string) => {
        try {
            setIsLoading(true)
            setSelectedTopic(topic_id)

            // 临时使用测试数据，API实现后可移除
            setSelectedQAs(MOCK_QAS[topic_id] || []);

            // 当API实现后取消注释
            /*
            const api_url = `${API_BASE_URL}/memory/${topic_id}/topics`
            const res = await fetch(api_url, {
                method: 'GET',
                credentials: 'include',
            })

            if (res.ok) {
                const data = await res.json()
                console.log('remember >>> ', data)
                setSelectedQAs(data)
            } else {
                console.error('回忆失败', res.status)
                setSelectedQAs([])
            }
            */
        } catch (error) {
            console.error('回忆失败:', error)
            setSelectedQAs([])
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <MemroyContext.Provider value={{
            topics,
            selectedTopic,
            selectedQAs,
            listQAs, listTopics
        }}>
            {children}
        </MemroyContext.Provider>
    )
}

export function useMemory() {
    const context = useContext(MemroyContext);
    if (context === undefined) {
        throw new Error('useMemory must be used within an MemoryProvider');
    }
    return context;
}