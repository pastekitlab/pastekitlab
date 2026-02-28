import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
    plugins: [
        mkcert(),
        react(),
        tailwindcss()
    ],
    server: {
        fs: {
            allow: ['.']
        },
        // 启用 HTTPS
        https: true,
        // 监听所有网络接口，包括局域网
        host: '0.0.0.0',
        port: 3000,
        open: true,
        proxy: {
            '/diandain/upload-photo': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false
            },
            '/diandain/': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false
            }
        }
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, './src'),
            "@core": resolve(__dirname, './src/core'),
            "@background": resolve(__dirname, './src/background'),
            "@panel": resolve(__dirname, './src/panel')
        },
    },
    build: {
        cssCodeSplit: false,
        rollupOptions: {
            input: {
                // 现有入口
                popup: resolve(__dirname, "src/pastekit/popup/popup.html"),
                options: resolve(__dirname, "src/pastekit/options/options.html"),
                // 新的扩展入口
                background: resolve(__dirname, "src/pastekit/background/background.js"),
                panel: resolve(__dirname, "src/pastekit/panel/panel.html")
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    // 为不同的入口指定不同的输出路径
                    if (chunkInfo.name === 'background') {
                        return 'background.js';
                    }
                    if (chunkInfo.name === 'panel') {
                        return 'panel.js';
                    }
                    return "assets/[name].js";
                },
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name][extname]",
                manualChunks: (id) => {
                    // 核心模块单独打包
                    if (id.includes('/src/core/')) {
                        return 'crypto-core';
                    }
                    
                    // React 相关打包
                    if (id.includes('node_modules')) {
                        if (
                            id.includes('react') ||
                            id.includes('react-dom') ||
                            id.includes('jsx-runtime')
                        ) {
                            return 'react-vendor';
                        }
                        
                        // 其他第三方库
                        if (id.includes('crypto-js') || id.includes('sm-crypto')) {
                            return 'crypto-vendor';
                        }
                    }
                }
            }
        }
    }
});