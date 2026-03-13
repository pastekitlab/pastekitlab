#!/usr/bin/env node
/**
 * WebSocket 客户端快速启动脚本
 * 自动连接 ws://127.0.0.1:8889 并发送示例消息
 */

import { WebSocket } from 'ws';

console.log('\n🚀 WebSocket 客户端快速启动\n');

const WS_URL = 'ws://127.0.0.1:8889';
let ws;

// 连接到服务器
ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ 已连接到:', WS_URL);
    console.log('');
    
    // 等待欢迎消息
    setTimeout(() => {
        console.log('📤 发送示例消息...\n');
        
        // 示例 1: 发送 HTTP 请求数据
        console.log('1️⃣ 发送 HTTP 请求:');
        const requestMsg = {
            type: 'request',
            data: {
               url: 'https://api.github.com/users/octocat',
              method: 'GET',
              headers: {
                    'User-Agent': 'WebSocket-Client'
                },
               timestamp: Date.now()
            }
        };
        console.log(JSON.stringify(requestMsg, null, 2));
        ws.send(JSON.stringify(requestMsg));
        console.log('');
        
        // 示例 2: 发送 HTTP 响应数据
        setTimeout(() => {
            console.log('2️⃣ 发送 HTTP 响应:');
            const responseMsg = {
                type: 'response',
                data: {
                   url: 'https://api.github.com/users/octocat',
                  statusCode: 200,
                  headers: {
                        'Content-Type': 'application/json'
                    },
                   body: JSON.stringify({
                        login: "octocat",
                        id: 1,
                        avatar_url: "https://github.com/images/error/octocat_happy.gif"
                    }),
                   timestamp: Date.now()
                }
            };
            console.log(JSON.stringify(responseMsg, null, 2));
            ws.send(JSON.stringify(responseMsg));
            console.log('');
        }, 500);
        
        // 示例 3: 发送心跳
        setTimeout(() => {
            console.log('3️⃣ 发送心跳:');
            const pingMsg = {
                type: 'ping',
               timestamp: Date.now()
            };
            console.log(JSON.stringify(pingMsg, null, 2));
            ws.send(JSON.stringify(pingMsg));
            console.log('');
        }, 1000);
        
    }, 500);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📨 收到消息:');
        console.log('   类型:', message.type);
        
        if (message.clientId) {
            console.log('   客户端 ID:', message.clientId);
        }
        
        if (message.data) {
            console.log('   数据预览:', JSON.stringify(message.data).substring(0, 100) + '...');
        }
        
        console.log('');
        
        // 收到 Pong 响应
        if (message.type === 'pong') {
            console.log('💓 收到心跳响应，服务器时间:', new Date(message.timestamp).toLocaleString());
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ 消息解析失败:', error.message);
        console.log('原始数据:', data.toString(), '\n');
    }
});

ws.on('error', (error) => {
    console.error('❌ 连接错误:', error.message);
    console.log('\n请确保:');
    console.log('  • WebSocket服务器已启动 (npm run proxy-server)');
    console.log('  • 端口 8889 可用\n');
   process.exit(1);
});

ws.on('close', () => {
    console.log('\n👋 连接已关闭\n');
   process.exit(0);
});

// 监听退出信号
process.on('SIGINT', () => {
    console.log('\n👋 正在退出...\n');
    if (ws) {
        ws.close();
    }
   process.exit(0);
});
