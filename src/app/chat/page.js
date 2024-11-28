'use client';

import { useEffect, useState, useRef } from 'react';
import { ask_agent } from '../../utils/chat';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Chat/Header';
import AgentList from '../../components/Chat/AgentList';
import HistoryList from '../../components/Chat/HistoryList';
import MessageHistory from '../../components/Chat/MessageHistory';
import MessageInput from '../../components/Chat/MessageInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot } from '@fortawesome/free-solid-svg-icons';

const CHUNK_BLOCK_TYPES = ["text", "chunk", "tool_resp_text", "tool_resp_chunk"];
const IGNORE_BLOCK_TYPES = ["final_text", "response", "user", "new_line", "runnable", "info"];

export default function Chat() {
    const { user, loading, logout } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAgentListVisible, setIsAgentListVisible] = useState(false);
    const [isHistoryListVisible, setIsHistoryListVisible] = useState(false);
    const [agent, setAgent] = useState('fake_llm');
    const [messages, setMessages] = useState([]);
    const messagesRef = useRef(messages); // 用于存储当前的 messages 状态
    const pendingUpdates = useRef([]); // 用于存储待处理的消息更新
    const updateTimer = useRef(null); // 定时器引用

    useEffect(() => {
        setIsLoading(false);
    }, []);

    // 确保 messagesRef 始终与 messages 同步
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const handleSendMessage = async (prompt) => {
        console.log("prompt >>> ", prompt);
        try {
            // Add the user's message to the messages list
            const newMessage = {
                id: `user-${Date.now()}`,
                sender: 'user',
                logo: <FontAwesomeIcon icon={faUser} />,
                name: user.username,
                segments: [{ type: 'text', content: prompt }],
                timestamp: new Date().toLocaleString(),
            };
            setMessages([...messagesRef.current, newMessage]);

            let tempChunkContent = '';

            await ask_agent(agent, prompt, (calling_id, data) => {
                const { block_type, content_id, content } = data;
                if (IGNORE_BLOCK_TYPES.includes(block_type)) {
                    return;
                }

                // 立即将新消息添加到 pendingUpdates
                pendingUpdates.current.push((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    const lastMessageIndex = updatedMessages.length - 1;
                    const lastMessage = updatedMessages[lastMessageIndex];

                    if (lastMessage && lastMessage.id === calling_id) {
                        const lastSegmentIndex = lastMessage.segments.length - 1;
                        const lastSegment = lastMessage.segments[lastSegmentIndex];

                        if (CHUNK_BLOCK_TYPES.includes(block_type)) {
                            if (!lastSegment || lastSegment.id !== content_id) {
                                tempChunkContent = content;
                            } else {
                                tempChunkContent += content;
                            }

                            const updatedSegment = {
                                type: block_type,
                                id: content_id,
                                content: tempChunkContent,
                            };

                            const updatedSegments = [...lastMessage.segments];
                            if (!lastSegment || lastSegment.id !== content_id) {
                                updatedSegments.push(updatedSegment);
                            } else {
                                updatedSegments[lastSegmentIndex] = updatedSegment;
                            }

                            const updatedLastMessage = {
                                ...lastMessage,
                                segments: updatedSegments,
                            };

                            updatedMessages[lastMessageIndex] = updatedLastMessage;
                        } else {
                            const newSegment = {
                                type: block_type,
                                id: content_id,
                                content,
                            };

                            const updatedSegments = [...lastMessage.segments, newSegment];
                            const updatedLastMessage = {
                                ...lastMessage,
                                segments: updatedSegments,
                            };

                            updatedMessages[lastMessageIndex] = updatedLastMessage;
                        }
                    } else {
                        updatedMessages.push({
                            id: calling_id,
                            sender: 'ai',
                            logo: <FontAwesomeIcon icon={faRobot} />,
                            name: 'AI',
                            segments: [{ type: block_type, id: content_id, content }],
                            timestamp: new Date().toLocaleString(),
                        });
                    }

                    return updatedMessages;
                });

                // 启动或重置定时器
                if (!updateTimer.current) {
                    updateTimer.current = setInterval(() => {
                        if (pendingUpdates.current.length > 0) {
                            let newMessages = messagesRef.current;
                            pendingUpdates.current.forEach((update) => {
                                newMessages = update(newMessages);
                            });
                            pendingUpdates.current = [];
                            setMessages(newMessages);
                        } else {
                            clearInterval(updateTimer.current);
                            updateTimer.current = null;
                        }
                    }, 300);
                }
            }, (error) => {
                console.error('SSE 错误:', error);
            });

        } catch (error) {
            console.error('发送消息失败:', error);
        }
    };

    if (isLoading) return <p>加载中...</p>;
    if (!user) return null;

    return (
        <div className="p-4 md:p-8 h-screen flex flex-col">
            <Header
                isAgentListVisible={isAgentListVisible}
                setIsAgentListVisible={setIsAgentListVisible}
                isHistoryListVisible={isHistoryListVisible}
                setIsHistoryListVisible={setIsHistoryListVisible}
                username={user.username}
                onLogout={logout}
            />
            <div className="flex flex-1 flex-col md:flex-row">
                {isAgentListVisible && <AgentList setAgent={setAgent} selected_agent={agent} />}
                {isHistoryListVisible && <HistoryList />}
                <div className="flex-1 p-4 flex flex-col">
                    <MessageHistory messages={messages} />
                    <MessageInput onSendMessage={handleSendMessage} />
                </div>
            </div>
        </div>
    );
}