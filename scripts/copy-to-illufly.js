const fs = require('fs-extra');
const path = require('path');

async function copyToFastAPI() {
    const sourcePath = path.join(__dirname, '../out');  // 使用 out 目录
    const targetPath = path.join(__dirname, '../../illufly/illufly/api/static');

    try {
        // 清理目标目录
        await fs.remove(targetPath);

        // 确保目标目录存在
        await fs.ensureDir(targetPath);

        // 复制优化后的文件
        await fs.copy(sourcePath, targetPath, {
            filter: (src, dest) => {
                // 排除不需要的文件
                const excludes = [
                    '.DS_Store',
                    'Thumbs.db',
                    '.git',
                    'node_modules'
                ];
                return !excludes.some(exclude => src.includes(exclude));
            }
        });

        console.log('✅ 静态文件已优化并复制到 FastAPI 包');
    } catch (error) {
        console.error('❌ 复制失败:', error);
        process.exit(1);
    }
}

copyToFastAPI();