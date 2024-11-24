'use client';

import { useEffect, useState } from 'react';
import { ask_agent } from '../../utils/chat';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Chat/Header';
import AgentList from '../../components/Chat/AgentList';
import HistoryList from '../../components/Chat/HistoryList';
import MessageHistory from '../../components/Chat/MessageHistory';
import MessageInput from '../../components/Chat/MessageInput';

export default function Chat() {
    const { user, loading, logout } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstColumnVisible, setIsFirstColumnVisible] = useState(false);
    const [isSecondColumnVisible, setIsSecondColumnVisible] = useState(false);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    const handleSendMessage = async (text) => {
        try {
            const response = await ask_agent(text, (result) => {
                console.log("result", result);
                setMessages((prevMessages) => [...prevMessages, result]);
            }, (error) => {
                console.error('SSE 错误:', error);
            });

            if (response && response.json) {
                const result = await response.json();
                console.log("result", result);
                setMessages((prevMessages) => [...prevMessages, result]);
            }
        } catch (error) {
            console.error('发送消息失败:', error);
        }
    };

    if (isLoading) return <p>加载中...</p>;
    console.log("user", user);
    if (!user) return null;

    return (
        <div className="p-4 md:p-8 h-screen flex flex-col">
            <Header
                isFirstColumnVisible={isFirstColumnVisible}
                setIsFirstColumnVisible={setIsFirstColumnVisible}
                isSecondColumnVisible={isSecondColumnVisible}
                setIsSecondColumnVisible={setIsSecondColumnVisible}
                username={user.username}
                onLogout={logout}
            />
            <div className="flex flex-1 flex-col md:flex-row">
                {isFirstColumnVisible && <AgentList />}
                {isSecondColumnVisible && <HistoryList />}
                <div className="flex-1 p-4 flex flex-col">
                    <MessageHistory messages={messages} />
                    <MessageInput onSendMessage={handleSendMessage} />
                </div>
            </div>
        </div>
    );
}