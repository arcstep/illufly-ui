import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faHistory } from '@fortawesome/free-solid-svg-icons';

export default function MiniAgentList({ agents, onChangeAgent, selected_agent, toggleAgentList, toggleHistoryList, isAgentListVisible, isHistoryListVisible }) {
    return (
        <div className="mt-12 flex flex-col items-center space-y-2">
            <button
                onClick={toggleAgentList}
                className={`px-3 py-1 rounded-full transition-all duration-300 ${isAgentListVisible ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
                <FontAwesomeIcon icon={faRobot} style={{ color: isAgentListVisible ? 'white' : 'lightgray' }} />
            </button>
            <button
                onClick={toggleHistoryList}
                className={`px-3 py-1 rounded-full transition-all duration-300 ${isHistoryListVisible ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
                <FontAwesomeIcon icon={faHistory} style={{ color: isHistoryListVisible ? 'white' : 'lightgray' }} />
            </button>
            {agents.map(agent => (
                <div
                    key={agent.id}
                    className={`cursor-pointer p-2 mb-2 flex items-center rounded-full transition-all duration-300 ${selected_agent === agent.id ? 'bg-blue-300 text-white shadow-md' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'}`}
                    onClick={() => onChangeAgent(agent.id)}
                >
                    <span className="mr-2">{agent.icon}</span>
                </div>
            ))}
        </div>
    );
}