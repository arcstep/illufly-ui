import { useState } from 'react';

export default function AgentList({ onChangeAgent, selected_agent }) {
    const agents = [
        { id: 'fake_llm', name: '模拟', icon: '🤖' },
        { id: 'chat', name: '聊天', icon: '💬' },
        { id: 'learn', name: '训练', icon: '🧑‍🎓' }
        // { id: 'team', name: '智能体团队', icon: '👥' },
        // { id: 'react', name: 'ReAct长推理', icon: '🔍' },
    ];

    return (
        <div className="w-full md:w-1/6 p-4 border-b md:border-b-0 md:border-r flex flex-col">
            <ul className="flex-1 overflow-y-auto md:max-h-none max-h-64 min-h-32">
                {agents.map(agent => (
                    <li
                        key={agent.id}
                        className={`cursor-pointer p-2 border mb-2 flex items-center ${selected_agent === agent.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
                            }`}
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