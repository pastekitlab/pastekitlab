/**
 * WebSocket Client 使用示例
 * 演示如何连接 ws://127.0.0.1:8889 并发送消息
 */

import { ProxyWebSocketClient } from './ws-client.js';

// 创建客户端实例
const client = new ProxyWebSocketClient('ws://127.0.0.1:8889/ws');

// 注册消息处理器
client.on('connected', (message) => {
    console.log('✅ 连接到服务器成功，客户端 ID:', message.clientId);
    
    // 连接成功后发送测试消息
    setTimeout(() => {
        console.log('📤 发送测试消息...');
        
        // 发送请求数据
        client.sendRequest({
            url: 'https://api.example.com/test',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: 'data' })
        });
        
        // 发送响应数据
        client.sendResponse({
            url: 'https://api.example.com/test',
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ result: 'success' })
        });
        
    }, 1000);
});

client.on('proxy-request', (message) => {
    console.log('📨 收到代理请求:', message.data?.url);
});

client.on('proxy-response', (message) => {
    console.log('📨 收到代理响应:', message.data?.url);
});

client.on('pong', (message) => {
    console.log('💓 心跳响应，服务器时间:', new Date(message.timestamp));
});

// 连接到服务器
console.log('🚀 开始连接 WebSocket服务器...');
client.connect()
    .then(() => {
        console.log('✅ 连接成功');
        
        // 定期发送心跳（可选，客户端内部已自动处理）
        setInterval(() => {
            if (client.isConnected()) {
                console.log('💓 发送心跳...');
                client.ping();
            }
        }, 3000);
    })
    .catch(error => {
        console.error('❌ 连接失败:', error);
    });

// 优雅地断开连接（在需要时调用）
// setTimeout(() => {
//     console.log('👋 断开连接...');
//     client.disconnect();
// }, 60000);
