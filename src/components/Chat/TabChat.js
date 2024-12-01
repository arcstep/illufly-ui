import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot } from '@fortawesome/free-solid-svg-icons';
import HistoryList from './HistoryList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { chat_with_agent, get_agent_history_list, change_agent_history, create_new_agent_history } from '../../utils/chat';

const CHUNK_BLOCK_TYPES = ["text", "chunk", "tool_resp_text", "tool_resp_chunk"];
const IGNORE_BLOCK_TYPES = [];

export default function TabChat({ agent, setAgent, isHistoryListVisible }) {
    const [historyList, setHistoryList] = useState([]);
    const [historyId, setHistoryId] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesRef = useRef(messages);
    const pendingUpdates = useRef([]);
    const updateTimer = useRef(null);

    useEffect(() => {
        handleSelectAgent(agent);
    }, [agent]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const handleSelectAgent = async (agent) => {
        setAgent(agent);
        get_agent_history_list(agent, (historyList) => {
            change_history(agent, historyList.data.history_id);

            if (Array.isArray(historyList.data.history_list)) {
                setHistoryList(historyList.data.history_list);
            } else {
                console.error("获取的历史记录列表不是数组:", historyList.data);
                setHistoryList([]);
            }
        }, (error) => {
            console.log('获取历史记录列表失败:', error);
        });
    };

    const handleNewHistory = async () => {
        await create_new_agent_history(agent, (newHistoryId) => {
            setHistoryList((lastHistoryList) => [newHistoryId.data, ...lastHistoryList]);
            setHistoryId(newHistoryId.data);
            setMessages([]);
        });
    };

    const handleSelectHistory = async (selectedHistoryId) => {
        change_history(agent, selectedHistoryId);
    };

    const change_history = async (selectedAgent, selectedHistoryId) => {
        setHistoryId(selectedHistoryId);
        try {
            await change_agent_history(selectedAgent, selectedHistoryId, (historyData) => {
                const parsedMessages = [];
                for (const callingId in historyData.data.history) {
                    const events = historyData.data.history[callingId];
                    let humanMessage = null;
                    let aiMessage = null;

                    events.forEach((entry) => {
                        const { block_type, content, content_id, created_at } = JSON.parse(entry.data);

                        if (block_type === 'human') {
                            if (!humanMessage) {
                                humanMessage = {
                                    id: `${callingId}-human`,
                                    sender: 'user',
                                    logo: <FontAwesomeIcon icon={faUser} />,
                                    name: '你',
                                    segments: [{ type: block_type, content }],
                                    timestamp: new Date(created_at).toLocaleString(),
                                };
                            }
                        } else {
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
                                aiMessage.segments.push({
                                    type: block_type,
                                    id: content_id,
                                    content,
                                });
                            }
                        }
                    });

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
        try {
            const newMessage = {
                id: `user-${Date.now()}`,
                sender: 'user',
                logo: <FontAwesomeIcon icon={faUser} />,
                name: '你',
                segments: [{ type: 'human', content: prompt }],
                timestamp: new Date().toLocaleString(),
            };
            setMessages([...messagesRef.current, newMessage]);

            let tempChunkContent = '';

            await chat_with_agent(agent, prompt, (calling_id, data) => {
                const { block_type, content_id, content } = data;
                if (IGNORE_BLOCK_TYPES.includes(block_type)) {
                    return;
                }

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

    return (
        <div className="flex flex-1 h-full">
            {isHistoryListVisible && (
                <div className="w-1/4 h-full flex flex-col border-r">
                    <div className="flex-1 overflow-y-auto">
                        <HistoryList
                            historyId={historyId}
                            historyList={historyList}
                            onSelectHistory={handleSelectHistory}
                            onNewHistory={handleNewHistory}
                        />
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4">
                    <MessageList messages={messages} />
                </div>
                <MessageInput onSendMessage={handleSendMessage} className="bg-white p-2" />
            </div>
        </div>
    );
}