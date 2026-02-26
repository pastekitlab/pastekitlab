#!/usr/bin/env node

const https = require('https');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 服务器配置
const PORT = 8443;
const HOST = 'localhost';

// Mock 数据存储路径
const MOCK_STORAGE_PATH = path.join(__dirname, '..', 'mock-data.json');

// SSL 证书配置
const SSL_CONFIG = {
    key: path.join(__dirname, 'server.key'),
    cert: path.join(__dirname, 'server.cert')
};

class HttpsMockServer {
    constructor() {
        this.server = null;
        this.mockData = new Map();
        this.loadMockData();
    }

    // 生成自签名证书（如果不存在）
    async generateCertificates() {
        try {
            // 检查证书是否存在
            await fs.access(SSL_CONFIG.key);
            await fs.access(SSL_CONFIG.cert);
            console.log('[HttpsMockServer] 使用现有 SSL 证书');
        } catch (error) {
            console.log('[HttpsMockServer] 生成自签名 SSL 证书...');
            
            // 生成私钥
            const { execSync } = require('child_process');
            const opensslPath = process.platform === 'win32' ? 'openssl' : '/usr/bin/openssl';
            
            try {
                // 生成私钥
                execSync(`${opensslPath} genrsa -out "${SSL_CONFIG.key}" 2048`, { stdio: 'ignore' });
                
                // 生成证书
                execSync(`${opensslPath} req -new -x509 -key "${SSL_CONFIG.key}" -out "${SSL_CONFIG.cert}" -days 365 -subj "/CN=localhost"`, { stdio: 'ignore' });
                
                console.log('[HttpsMockServer] SSL 证书生成成功');
            } catch (opensslError) {
                console.warn('[HttpsMockServer] OpenSSL 不可用，使用备用方案');
                await this.generateSelfSignedCertFallback();
            }
        }
    }

    // 备用的自签名证书生成方法
    async generateSelfSignedCertFallback() {
        const forge = await import('node-forge');
        const pki = forge.pki;
        
        // 生成密钥对
        const keys = pki.rsa.generateKeyPair(2048);
        
        // 创建证书
        const cert = pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
        
        const attrs = [{
            name: 'commonName',
            value: 'localhost'
        }];
        
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.sign(keys.privateKey);
        
        // 保存证书和私钥
        await fs.writeFile(SSL_CONFIG.key, pki.privateKeyToPem(keys.privateKey));
        await fs.writeFile(SSL_CONFIG.cert, pki.certificateToPem(cert));
        
        console.log('[HttpsMockServer] 使用 node-forge 生成 SSL 证书');
    }

    // 加载 Mock 数据
    async loadMockData() {
        try {
            // 尝试从文件加载持久化数据
            const data = await fs.readFile(MOCK_STORAGE_PATH, 'utf8');
            const parsedData = JSON.parse(data);
            this.mockData = new Map(Object.entries(parsedData));
            console.log('[HttpsMockServer] 已加载 Mock 数据:', this.mockData.size, '条');
        } catch (error) {
            console.log('[HttpsMockServer] 初始化空的 Mock 数据存储');
            this.mockData = new Map();
        }
    }

    // 保存 Mock 数据
    async saveMockData() {
        try {
            const data = Object.fromEntries(this.mockData);
            await fs.writeFile(MOCK_STORAGE_PATH, JSON.stringify(data, null, 2));
            console.log('[HttpsMockServer] Mock 数据已保存');
        } catch (error) {
            console.error('[HttpsMockServer] 保存 Mock 数据失败:', error);
        }
    }

    // 设置 Mock 数据
    setMockData(ruleId, data) {
        this.mockData.set(ruleId, data);
        this.saveMockData();
        console.log(`[HttpsMockServer] 设置 Mock 数据: ${ruleId}`);
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
        
        console.log(`[HttpsMockServer] 收到请求: ${method} ${pathname} (HTTPS)`);
        
        // 添加安全头部
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');

        // 处理 API 请求
        if (pathname.startsWith('/api/')) {
            this.handleApiRequest(req, res, pathname);
            return;
        }

        // 处理普通的 Mock 请求
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
                message: 'Mocked by PasteKit Lab HTTPS Server',
                mocked: true,
                ruleId: ruleId,
                timestamp: Date.now(),
                protocol: 'HTTPS'
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
            const statusResponse = {
                status: 'running',
                port: PORT,
                host: HOST,
                protocol: 'HTTPS',
                mockDataCount: this.mockData.size,
                timestamp: Date.now(),
                ssl: true
            };
            this.sendResponse(res, 200, 'application/json', JSON.stringify(statusResponse, null, 2));
            return;
        }
        
        if (apiPath.startsWith('/set-mock-data/')) {
            const ruleId = apiPath.substring(15);
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
                        message: 'Mock data saved via HTTPS',
                        ruleId: ruleId
                    }));
                } catch (error) {
                    this.sendError(res, 400, 'Invalid JSON data');
                }
            });
            return;
        }
        
        if (apiPath.startsWith('/get-mock-data/')) {
            const ruleId = apiPath.substring(15);
            const mockData = this.getMockData(ruleId);
            
            if (mockData) {
                this.sendResponse(res, 200, 'application/json', JSON.stringify(mockData));
            } else {
                this.sendError(res, 404, 'Mock data not found');
            }
            return;
        }
        
        this.sendError(res, 404, 'API endpoint not found');
    }

    // 发送响应
    sendResponse(res, statusCode, contentType, data) {
        res.writeHead(statusCode, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-Mock-By': 'PasteKit Lab HTTPS Server',
            'X-Protocol': 'HTTPS'
        });
        
        res.end(data);
        console.log(`[HttpsMockServer] 返回响应: ${statusCode} ${contentType} (${data.length} bytes)`);
    }

    // 发送错误响应
    sendError(res, statusCode, message) {
        const errorResponse = {
            error: true,
            message: message,
            timestamp: Date.now(),
            protocol: 'HTTPS'
        };
        
        this.sendResponse(res, statusCode, 'application/json', JSON.stringify(errorResponse, null, 2));
    }

    // 启动 HTTPS 服务器
    async start() {
        // 生成证书
        await this.generateCertificates();
        
        // 读取 SSL 证书
        const [key, cert] = await Promise.all([
            fs.readFile(SSL_CONFIG.key),
            fs.readFile(SSL_CONFIG.cert)
        ]);

        const options = {
            key: key,
            cert: cert
        };

        this.server = https.createServer(options, (req, res) => {
            if (req.method === 'OPTIONS') {
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
            console.log(`🔒 PasteKit Lab HTTPS Mock Server 运行在 https://${HOST}:${PORT}`);
            console.log(`🕒 启动时间: ${new Date().toISOString()}`);
            console.log(`📁 证书路径: ${SSL_CONFIG.cert}`);
        });

        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`[HttpsMockServer] 端口 ${PORT} 已被占用`);
                // 尝试下一个端口
                const nextPort = PORT + 1;
                if (nextPort <= 8453) { // 限制端口范围
                    console.log(`[HttpsMockServer] 尝试端口 ${nextPort}...`);
                    this.server.listen(nextPort, HOST, () => {
                        console.log(`🔒 PasteKit Lab HTTPS Mock Server 运行在 https://${HOST}:${nextPort}`);
                    });
                } else {
                    console.error('[HttpsMockServer] 无法找到可用端口');
                }
            } else {
                console.error('[HttpsMockServer] 服务器启动失败:', error);
            }
        });
    }

    // 停止服务器
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('[HttpsMockServer] HTTPS 服务器已停止');
            });
        }
    }
}

// 如果直接运行此文件
if (require.main === module) {
    const server = new HttpsMockServer();
    server.start();

    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n正在关闭 HTTPS 服务器...');
        server.stop();
        process.exit(0);
    });
}

module.exports = HttpsMockServer;