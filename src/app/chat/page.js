'use client';

import { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot } from '@fortawesome/free-solid-svg-icons';

import { chat_with_agent, get_agent_history, get_agent_history_list } from '../../utils/chat';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Chat/Header';
import AgentList from '../../components/Chat/AgentList';
import HistoryList from '../../components/Chat/HistoryList';
import MessageHistory from '../../components/Chat/MessageHistory';
import MessageInput from '../../components/Chat/MessageInput';

const CHUNK_BLOCK_TYPES = ["text", "chunk", "tool_resp_text", "tool_resp_chunk"];
const IGNORE_BLOCK_TYPES = [];

export default function Chat() {
    const { user, logout, fetchUser, refreshToken } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isAgentListVisible, setIsAgentListVisible] = useState(false);
    const [isHistoryListVisible, setIsHistoryListVisible] = useState(false);
    const [agent, setAgent] = useState('fake_llm');
    const [historyList, setHistoryList] = useState([]);
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

    const handleSelectAgent = (agent) => {
        setAgent(agent);
        get_agent_history_list(agent, (historyList) => {
            if (Array.isArray(historyList.data)) {
                setHistoryList(historyList.data);
            } else {
                console.error("获取的历史记录列表不是数组:", historyList.data);
                setHistoryList([]); // 设置为空数组以避免错误
            }
        }, (error) => {
            console.error('获取历史记录列表失败:', error);
        });
    };

    const handleGetHistory = async () => {
        try {
            get_agent_history(agent, (historyData) => {
                const parsedMessages = [];
                // console.log("historyData >>> ", historyData);

                for (const callingId in historyData.data.history) {
                    const events = historyData.data.history[callingId];
                    let humanMessage = null;
                    let aiMessage = null;

                    events.forEach((entry) => {
                        const { id, event, data } = entry;
                        const parsedData = JSON.parse(data);
                        const { block_type, content, content_id, created_at } = parsedData;

                        if (block_type === 'human') {
                            // 人类消息
                            if (!humanMessage) {
                                humanMessage = {
                                    id: `${callingId}-human`,
                                    sender: 'user',
                                    logo: <FontAwesomeIcon icon={faUser} />,
                                    name: user.username,
                                    segments: [{ type: block_type, content }],
                                    timestamp: new Date(created_at).toLocaleString(),
                                };
                            }
                        } else {
                            // AI消息
                            if (!aiMessage) {
                                aiMessage = {
                                    id: `${callingId}-ai`,
                                    sender: 'ai',
                                    logo: <FontAwesomeIcon icon={faRobot} />,
                                    name: 'AI',
                                    segments: [],
                                    timestamp: new Date(created_at).toLocaleString(),
                                };
                            }

                            if (CHUNK_BLOCK_TYPES.includes(block_type)) {
                                // 处理chunk类型
                                const existingSegment = aiMessage.segments.find(segment => segment.id === content_id);
                                if (existingSegment) {
                                    existingSegment.content += content;
                                } else {
                                    aiMessage.segments.push({
                                        type: block_type,
                                        id: content_id,
                                        content,
                                    });
                                }
                            } else {
                                // 处理其他AI消息
                                aiMessage.segments.push({
                                    type: block_type,
                                    id: content_id,
                                    content,
                                });
                            }
                        }
                    });

                    // 确保human消息在ai消息之前
                    if (humanMessage) {
                        parsedMessages.push(humanMessage);
                    }
                    if (aiMessage) {
                        parsedMessages.push(aiMessage);
                    }
                }

                setMessages(parsedMessages);
            }, (error) => {
                console.error('获取历史记录失败:', error);
            });
        } catch (error) {
            console.error('处理历史记录失败:', error);
        }
    };

    const handleSendMessage = async (prompt) => {
        // console.log("prompt >>> ", prompt);
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

            await chat_with_agent(agent, prompt, (calling_id, data) => {
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
                onFetchUser={fetchUser}
                onRefreshToken={refreshToken}
            />
            <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
                {isAgentListVisible && <AgentList onChangeAgent={handleSelectAgent} selected_agent={agent} />}
                {isHistoryListVisible && <HistoryList historyList={historyList} onSelectHistory={handleGetHistory} />}
                <div className="flex-1 p-4 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        <MessageHistory messages={messages} />
                    </div>
                    <MessageInput onSendMessage={handleSendMessage} />
                </div>
            </div>
        </div>
    );
}