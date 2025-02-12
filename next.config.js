// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',  // 启用静态导出
    images: {
        unoptimized: true,  // 静态导出需要
    },

    // 生产环境优化
    compress: true,  // 启用 gzip 压缩
    poweredByHeader: false,  // 移除 X-Powered-By header

    // webpack 优化配置
    webpack: (config, { dev, isServer }) => {
        // 仅在生产构建时应用优化
        if (!dev && !isServer) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                    // 更激进的合并策略
                    minSize: 50000,        // 增加最小尺寸
                    maxSize: 500000,       // 增加最大尺寸
                    cacheGroups: {
                        // 主要依赖包单独打包
                        vendors: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all',
                            priority: 10,
                        },
                        // 合并小模块
                        commons: {
                            name: 'commons',
                            minChunks: 2,      // 至少被引用2次才合并
                            priority: 5,
                        },
                        // 默认组
                        default: {
                            minChunks: 1,
                            priority: -20,
                            reuseExistingChunk: true,
                        },
                    },
                },
            };
        }
        return config;
    },
}

module.exports = nextConfig;