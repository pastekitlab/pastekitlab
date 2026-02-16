import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import mkcert from 'vite-plugin-mkcert';


export default defineConfig({
    plugins: [
        mkcert(),
        react(),tailwindcss()],
    server: {
        fs: {
            allow: ['.']
        },
        // 监听所有网络接口，包括局域网
        host: '0.0.0.0',
        // 或者直接设置为 true
        // host: true,
        port: 3000, // 可选：指定端口
        // 可选：启动时自动打开浏览器
        open: true,
        proxy:{
            '/diandain/upload-photo':{
                target: 'http://localhost:8080', // 实际后端地址（HTTP）
                changeOrigin: true,
                secure: false // 允许代理到 HTTP
            },
            '/diandain/':{
                target: 'http://localhost:8080', // 实际后端地址（HTTP）
                changeOrigin: true,
                secure: false // 允许代理到 HTTP
            }
        }
    },
    resolve: {
        alias: {
            "@": resolve(resolve(), './src'), // resolve() 默认是当前目录
            // 或者：
            // "@": resolve(new URL('.', import.meta.url).pathname, './src')
        },
    },
    build: {
        cssCodeSplit: false,   // ⭐ 防止 CSS 重复

        rollupOptions: {

            input: {
                popup: resolve(__dirname, "src/pastekit/popup/popup.html"),
                options: resolve(__dirname, "src/pastekit/options/options.html")
            },
            output: {
                entryFileNames: "assets/[name].js",
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name][extname]",

            manualChunks(id) {
                // ⭐ 强制所有 React 相关只生成一个文件
                if (id.includes('node_modules')) {
                    if (
                        id.includes('react') ||
                        id.includes('react-dom') ||
                        id.includes('jsx-runtime')
                    ) {
                        return 'react-vendor'
                    }
                }
            }
            }
        }
    }
});