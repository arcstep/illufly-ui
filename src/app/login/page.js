'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userData = await login(email, password);
            // console.log("user >>> ", userData);
            if (userData) {
                router.push('/chat');
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('进入梦幻岛失败，请稍后再试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-4xl font-bold mb-6 text-center">✨🦋 欢迎魔法师归来</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-700 mb-2">
                            邮箱
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="输入您的邮箱"
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-gray-700 mb-2">
                            密码
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="输入您的密码"
                        />
                    </div>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? '传送中...' : '进入梦幻岛'}
                    </button>
                </form>
                <div className="mt-4 flex justify-between items-center">
                    <a href="#" className="text-blue-500 hover:text-blue-700 underline">
                        忘记密码？
                    </a>
                    <a href="/register" className="text-blue-500 hover:text-blue-700 underline">
                        注册新账户
                    </a>
                </div>
            </div>
        </div>
    );
}