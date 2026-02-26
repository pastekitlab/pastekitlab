#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 PasteKit Lab HTTPS Mock 服务器...');

// 启动 HTTPS Mock 服务器
const httpsServer = spawn('node', [path.join(__dirname, 'https-mock-server.cjs')], {
    stdio: 'inherit'
});

httpsServer.on('error', (error) => {
    console.error('❌ HTTPS 服务器启动失败:', error);
});

httpsServer.on('close', (code) => {
    console.log(`🔒 HTTPS 服务器已退出，退出码: ${code}`);
});

// 优雅关闭处理
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    httpsServer.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 收到终止信号，正在关闭服务器...');
    httpsServer.kill('SIGTERM');
    process.exit(0);
});