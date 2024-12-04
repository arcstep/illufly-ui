import React from 'react';

export default function TabSettings({ agent, setAgent }) {
    return (
        <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
            <h2>模型配置</h2>
            <form>
                <div>
                    <p><label>智能体名称</label></p>
                    <p><label>从清单中选择模型</label></p>
                    <p><label>模型参数：温度、最大token数、种子等</label></p>
                    <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} />
                </div>
                {/* 其他配置字段 */}
            </form>
        </div>
    );
}