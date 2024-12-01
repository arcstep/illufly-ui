import React from 'react';

export default function TabLearn({ agent, setAgent }) {
    return (
        <div className="flex-1 overflow-y-auto min-h-[150px]">
            <h2>学习</h2>
            <form>
                <div>
                    <label>智能体名称:</label>
                    <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} />
                </div>
                {/* 其他配置字段 */}
            </form>
        </div>
    );
}