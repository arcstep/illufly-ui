import React from 'react';

export default function TabData({ agent, setAgent }) {
    return (
        <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
            <h2>数据集</h2>
            <br></br>
            <form>
                <div>
                    <p><label>已有数据清单</label></p>
                    <p><label>上传文件并转化为数据</label></p>
                    <p><label>配置数据库来源</label></p>
                    <input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} />
                </div>
                {/* 其他配置字段 */}
            </form>
        </div>
    );
}