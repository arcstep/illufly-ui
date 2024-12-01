import React, { useState } from 'react';

export default function Tabs({ tabs }) {
    const [activeTab, setActiveTab] = useState(tabs[0].key);

    return (
        <div className="flex flex-col h-full">
            <div className="flex space-x-4 mb-4 sticky top-0 bg-white z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg transition-colors duration-300`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex-1 p-4 bg-gray-50 rounded-lg shadow-inner">
                {tabs.map((tab) => (
                    activeTab === tab.key && <div key={tab.key} className="h-full">{tab.content}</div>
                ))}
            </div>
        </div>
    );
}