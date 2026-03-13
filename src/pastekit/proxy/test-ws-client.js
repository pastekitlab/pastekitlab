#!/usr/bin/env node
/**
 * WebSocket Client 测试脚本
 * 连接 ws://127.0.0.1:8889 并发送测试消息
 */

import { WebSocket } from 'ws';

const WS_URL = process.argv[2] || 'ws://127.0.0.1:8889/ws';

console.log('\n============================================================');
console.log('🚀 WebSocket Client 测试');
console.log('============================================================\n');
console.log(`📡 目标地址：${WS_URL}\n`);

let ws;

function connect() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🔌 正在连接...');
            ws = new WebSocket(WS_URL);
            
            ws.on('open', () => {
                console.log('✅ 已连接到 WebSocket服务器\n');
                resolve();
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('📨 收到消息:');
                    console.log('   类型:', message.type);
                    console.log('   时间戳:', new Date(message.timestamp).toLocaleTimeString());
                    
                    if (message.clientId) {
                        console.log('   客户端 ID:', message.clientId);
                    }
                    
                    if (message.data) {
                        console.log('   数据:', JSON.stringify(message.data, null, 2));
                    }
                    
                    console.log('');
                    
                    // 处理不同类型的消息
                    switch (message.type) {
                        case 'connected':
                            console.log('🎉 收到服务器欢迎消息，准备发送测试数据...\n');
                            setTimeout(sendTestMessages, 1000);
                            break;
                            
                        case 'pong':
                            console.log('💓 心跳响应\n');
                            break;
                    }
                } catch (error) {
                    console.error('❌ 消息解析失败:', error.message);
                    console.log('原始数据:', data.toString(), '\n');
                }
            });
            
            ws.on('error', (error) => {
                console.error('❌ WebSocket错误:', error.message);
                reject(error);
            });
            
            ws.on('close', () => {
                console.log('\n👋 连接已关闭');
                console.log('🔄 5 秒后尝试重连...\n');
                setTimeout(connect, 5000);
            });
            
        } catch (error) {
            console.error('❌ 连接失败:', error.message);
            reject(error);
        }
    });
}

function sendTestMessages() {
    console.log('📤 开始发送测试消息...\n');
    
    // 测试消息 1: 请求数据
    const requestMessage = {
        type: 'request',
        data: {
            url: 'https://api.example.com/users',
           method: 'GET',
           headers: {
                'Accept': 'application/json'
            },
            timestamp: Date.now()
        }
    };
    
    console.log('1️⃣ 发送请求消息:');
    console.log(JSON.stringify(requestMessage, null, 2), '\n');
    ws.send(JSON.stringify(requestMessage));
    
    // 测试消息 2: 响应数据
    setTimeout(() => {
        const responseMessage = {
            type: 'response',
            data: {
                url: 'https://api.example.com/users',
               statusCode: 200,
               headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    users: [
                        { id: 1, name: 'Alice' },
                        { id: 2, name: 'Bob' }
                    ]
                }),
                timestamp: Date.now()
            }
        };
        
        console.log('2️⃣ 发送响应消息:');
        console.log(JSON.stringify(responseMessage, null, 2), '\n');
        ws.send(JSON.stringify(responseMessage));
    }, 1000);
    
    // 测试消息 3: Ping
    setTimeout(() => {
        const pingMessage = {
            type: 'ping',
            timestamp: Date.now()
        };
        
        console.log('3️⃣ 发送 Ping 消息:');
        console.log(JSON.stringify(pingMessage, null, 2), '\n');
        ws.send(JSON.stringify(pingMessage));
    }, 2000);
    
    // 测试消息 4: 自定义消息
    setTimeout(() => {
        const customMessage = {
            type: 'decrypt',
            data: {
                requestId: 'test-123',
                algorithm: 'AES',
                mode: 'CBC',
                encryptedData: 'U2FtcGxlRW5jcnlwdGVkRGF0YQ==',
                key: 'sample-key'
            },
            timestamp: Date.now()
        };
        
        console.log('4️⃣ 发送解密请求消息:');
        console.log(JSON.stringify(customMessage, null, 2), '\n');
        ws.send(JSON.stringify(customMessage));
    }, 3000);
}

function startPingInterval() {
    // 每 30 秒发送一次心跳
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('💓 发送心跳 Ping...');
            ws.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
        }
    }, 30000);
}

// 启动连接
connect()
    .then(() => {
        console.log('✅ 连接成功\n');
       startPingInterval();
        
        // 监听退出信号
        process.on('SIGINT', () => {
            console.log('\n\n👋 正在关闭连接...');
            if (ws) {
                ws.close();
            }
            process.exit(0);
        });
    })
    .catch(error => {
        console.error('\n❌ 连接失败:', error.message);
        console.log('\n请确保:');
        console.log('  1. WebSocket服务器已启动');
        console.log('  2. 端口 8889 未被占用');
        console.log('  3. 防火墙允许本地连接\n');
        process.exit(1);
    });
