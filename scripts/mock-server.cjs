#!/usr/bin/env node

const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');

// 服务器配置
const PORT = 8787;
const HOST = 'localhost';

// Mock 数据存储路径
const MOCK_STORAGE_PATH = path.join(__dirname, '..', 'mock-data.json');

class MockServer {
    constructor() {
        this.server = null;
        this.mockData = new Map();
        this.loadMockData();
    }

    // 加载 Mock 数据
    async loadMockData() {
        try {
            // 尝试从文件加载持久化数据
            const data = await fs.readFile(MOCK_STORAGE_PATH, 'utf8');
            const parsedData = JSON.parse(data);
            this.mockData = new Map(Object.entries(parsedData));
            console.log('[MockServer] 已加载 Mock 数据:', this.mockData.size, '条');
        } catch (error) {
            console.log('[MockServer] 初始化空的 Mock 数据存储');
            this.mockData = new Map();
        }
    }

    // 保存 Mock 数据
    async saveMockData() {
        try {
            const data = Object.fromEntries(this.mockData);
            await fs.writeFile(MOCK_STORAGE_PATH, JSON.stringify(data, null, 2));
            console.log('[MockServer] Mock 数据已保存');
        } catch (error) {
            console.error('[MockServer] 保存 Mock 数据失败:', error);
        }
    }

    // 设置 Mock 数据
    setMockData(ruleId, data) {
        this.mockData.set(ruleId, data);
        this.saveMockData();
        console.log(`[MockServer] 设置 Mock 数据: ${ruleId}`);
    }

    // 获取 Mock 数据
    getMockData(ruleId) {
        return this.mockData.get(ruleId);
    }

    // 处理请求
    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;
        
        console.log(`[MockServer] 收到请求: ${method} ${pathname}`);

        // 处理 API 请求
        if (pathname.startsWith('/api/')) {
            this.handleApiRequest(req, res, pathname);
            return;
        }

        // 处理普通的 Mock 请求
        // 解析规则 ID
        const ruleId = pathname.substring(1); // 移除开头的 '/'
        
        if (!ruleId) {
            this.sendError(res, 400, 'Missing rule ID');
            return;
        }

        // 获取 Mock 数据
        const mockData = this.getMockData(ruleId);
        
        if (!mockData) {
            // 返回默认响应
            const defaultResponse = {
                status: 'success',
                message: 'Mocked by PasteKit Lab Local Server',
                mocked: true,
                ruleId: ruleId,
                timestamp: Date.now()
            };
            
            this.sendResponse(res, 200, 'application/json', JSON.stringify(defaultResponse, null, 2));
            return;
        }

        // 返回真实的 Mock 数据
        this.sendResponse(
            res, 
            mockData.statusCode || 200, 
            mockData.contentType || 'application/json', 
            mockData.data
        );
    }

    // 处理 API 请求
    async handleApiRequest(req, res, pathname) {
        const apiPath = pathname.substring(4); // 移除 '/api' 前缀
        
        if (apiPath === '/status') {
            // 服务器状态
            const statusResponse = {
                status: 'running',
                port: PORT,
                host: HOST,
                mockDataCount: this.mockData.size,
                timestamp: Date.now()
            };
            this.sendResponse(res, 200, 'application/json', JSON.stringify(statusResponse, null, 2));
            return;
        }
        
        if (apiPath.startsWith('/set-mock-data/')) {
            // 设置 Mock 数据
            const ruleId = apiPath.substring(15); // 移除 '/set-mock-data/' 前缀
            if (req.method !== 'POST') {
                this.sendError(res, 405, 'Method not allowed');
                return;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const mockData = JSON.parse(body);
                    this.setMockData(ruleId, mockData);
                    this.sendResponse(res, 200, 'application/json', JSON.stringify({
                        success: true,
                        message: 'Mock data saved',
                        ruleId: ruleId
                    }));
                } catch (error) {
                    this.sendError(res, 400, 'Invalid JSON data');
                }
            });
            return;
        }
        
        if (apiPath.startsWith('/get-mock-data/')) {
            // 获取 Mock 数据
            const ruleId = apiPath.substring(15); // 移除 '/get-mock-data/' 前缀
            const mockData = this.getMockData(ruleId);
            
            if (mockData) {
                this.sendResponse(res, 200, 'application/json', JSON.stringify(mockData));
            } else {
                this.sendError(res, 404, 'Mock data not found');
            }
            return;
        }
        
        // 未知 API 端点
        this.sendError(res, 404, 'API endpoint not found');
    }

    // 发送响应
    sendResponse(res, statusCode, contentType, data) {
        res.writeHead(statusCode, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-Mock-By': 'PasteKit Lab Local Server'
        });
        
        res.end(data);
        console.log(`[MockServer] 返回响应: ${statusCode} ${contentType} (${data.length} bytes)`);
    }

    // 发送错误响应
    sendError(res, statusCode, message) {
        const errorResponse = {
            error: true,
            message: message,
            timestamp: Date.now()
        };
        
        this.sendResponse(res, statusCode, 'application/json', JSON.stringify(errorResponse, null, 2));
    }

    // 启动服务器
    start() {
        this.server = http.createServer((req, res) => {
            if (req.method === 'OPTIONS') {
                // 处理预检请求
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                });
                res.end();
                return;
            }
            
            this.handleRequest(req, res);
        });

        this.server.listen(PORT, HOST, () => {
            console.log(`🚀 PasteKit Lab Mock Server 运行在 http://${HOST}:${PORT}`);
            console.log(`🕒 启动时间: ${new Date().toISOString()}`);
        });

        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`[MockServer] 端口 ${PORT} 已被占用，尝试使用其他端口...`);
                this.server.listen(0, HOST, () => {
                    const actualPort = this.server.address().port;
                    console.log(`🚀 PasteKit Lab Mock Server 运行在 http://${HOST}:${actualPort}`);
                });
            } else {
                console.error('[MockServer] 服务器启动失败:', error);
            }
        });
    }

    // 停止服务器
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('[MockServer] 服务器已停止');
            });
        }
    }
}

// 如果直接运行此文件
if (require.main === module) {
    const server = new MockServer();
    server.start();

    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n正在关闭服务器...');
        server.stop();
        process.exit(0);
    });
}

module.exports = MockServer;