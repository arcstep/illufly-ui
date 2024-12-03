import React from 'react';

export default function TabKnowledge({ agent, setAgent }) {
    return (
        <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
            <h2>知识</h2>
            <br></br>
            <form>
                <div>
                    <p><label>经验知识清单</label></p>
                    <p><label>从其他智能体分享知识</label></p>
                    <p><label>从已有网站获取知识</label></p>
                    <p><label>上传文件并转化为知识</label></p>
                    <p><label>从其他对话学习知识</label></p>
                    <p><input type="text" value={agent} onChange={(e) => setAgent(e.target.value)} /></p>
                </div>
                {/* 其他配置字段 */}
            </form>
        </div>
    );
}