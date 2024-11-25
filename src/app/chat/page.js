'use client';

import { useEffect, useState } from 'react';
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
const IGNORE_BLOCK_TYPES = ["final_text", "response", "user", "new_line"];

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

    const handleSendMessage = async (prompt) => {
        let tempChunkContent = '';
        console.log("prompt", prompt);

        try {
            // Add the user's message to the messages list
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    id: `user-${Date.now()}`,
                    sender: 'user',
                    logo: <FontAwesomeIcon icon={faUser} />,
                    name: user.username,
                    segments: [{ type: 'text', content: prompt }],
                    timestamp: new Date().toLocaleString(),
                },
            ]);

            await ask_agent(prompt, (calling_id, content_id, data) => {
                const { block_type, content } = data;
                console.log(calling_id, block_type, content);
                if (IGNORE_BLOCK_TYPES.includes(block_type)) {
                    return;
                }

                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    const lastMessageIndex = updatedMessages.length - 1;
                    const lastMessage = updatedMessages[lastMessageIndex];

                    if (lastMessage && lastMessage.id === calling_id) {
                        const lastSegmentIndex = lastMessage.segments.length - 1;
                        const lastSegment = lastMessage.segments[lastSegmentIndex];

                        if (CHUNK_BLOCK_TYPES.includes(block_type)) {
                            // 如果是 chunk 类型，追加到临时变量
                            if (!lastSegment || lastSegment.id !== content_id) {
                                // 如果 content_id 更换，重置临时变量
                                tempChunkContent = content;
                            } else {
                                tempChunkContent += content;
                            }

                            // 更新或创建新的段落
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
                            // 处理非 chunk 类型的内容
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
                        // 如果没有找到匹配的消息，创建一个新的消息
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
            }, (error) => {
                console.error('SSE 错误:', error);
            });

            console.log("Updated messages:", messages);

        } catch (error) {
            console.error('发送消息失败:', error);
        }
    };

    if (isLoading) return <p>加载中...</p>;
    console.log("user", user);
    console.log("Updated messages:", messages);
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