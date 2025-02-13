import { useState, JSX } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faHistory } from '@fortawesome/free-solid-svg-icons';

export default function AgentList({ onChangeAgent, selected_agent, setIsAgentListVisible, isAgentListVisible, setIsHistoryListVisible, isHistoryListVisible }) {
    const agents = [
        { id: 'fake_llm', name: '模拟', icon: '🤖' },
        { id: 'chat', name: '聊天', icon: '💬' },
        { id: 'learn', name: '训练', icon: '🧑‍🎓' }
        // { id: 'team', name: '智能体团队', icon: '👥' },
        // { id: 'react', name: 'ReAct长推理', icon: '🔍' },
    ];

    return (
        <div className="w-full md:w-1/6 p-4 border-b md:border-b-0 md:border-r flex flex-col">
            <div className={`mt-12 flex ${isAgentListVisible ? 'flex-row' : 'flex-col'}`}>
                {setIsAgentListVisible && (
                    <button
                        onClick={() => setIsAgentListVisible(!isAgentListVisible)}
                        className={`mr-2 px-3 py-1 rounded-full transition-all duration-300 ${isAgentListVisible ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                        <FontAwesomeIcon
                            icon={faRobot}
                            style={{ color: isAgentListVisible ? 'white' : 'lightgray' }}
                        />
                    </button>
                )}
                {setIsHistoryListVisible && (
                    <button
                        onClick={() => setIsHistoryListVisible(!isHistoryListVisible)}
                        className={`mr-2 px-3 py-1 rounded-full transition-all duration-300 ${isHistoryListVisible ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                        <FontAwesomeIcon
                            icon={faHistory}
                            style={{ color: isHistoryListVisible ? 'white' : 'lightgray' }}
                        />
                    </button>
                )}
            </div>
            <ul className="mt-4 flex-1 overflow-y-auto md:max-h-none max-h-64 min-h-32">
                {agents.map(agent => (
                    <li
                        key={agent.id}
                        className={`cursor-pointer p-2 mb-2 flex items-center rounded-full transition-all duration-300 ${selected_agent === agent.id ? 'bg-blue-300 text-white shadow-md' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'}`}
                        onClick={() => onChangeAgent(agent.id)}
                    >
                        <span className="mr-2">{agent.icon}</span>
                        <span>{agent.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}