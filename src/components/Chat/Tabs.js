import React from 'react';

export default function Tabs({ tabs, selectedTab, onSelectTab }) {
    return (
        <div className="flex-1 flex flex-col">
            <ul className="flex border-b-2 border-gray-200 bg-white sticky top-0 z-10">
                {tabs.map((tab) => (
                    <li
                        key={tab.key}
                        className={`cursor-pointer p-2 ${selectedTab === tab.key ? 'border-b-2 border-blue-500' : ''}`}
                        onClick={() => onSelectTab(tab.key)}
                    >
                        {tab.label}
                    </li>
                ))}
            </ul>
            <div className="flex-1 overflow-y-auto">
                {tabs.find((tab) => tab.key === selectedTab)?.content}
            </div>
        </div>
    );
}