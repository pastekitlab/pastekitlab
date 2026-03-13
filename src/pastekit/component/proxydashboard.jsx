import React, { useState, useEffect } from 'react';
import { useTranslation } from '../utils/i18n';

/**
 * 代理请求看板组件
 * 展示来自手机代理的解密请求
 */
export default function ProxyDashboard() {
    const [t] = useTranslation();
    const [requests, setRequests] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [filterText, setFilterText] = useState('');
    
    // 监听来自 background 的消息
    useEffect(() => {
        // 连接到 background
        const port = chrome.runtime.connect({ name: 'proxy-dashboard' });
        
        port.onMessage.addListener((message) => {
            console.log('[Proxy Dashboard] 收到消息:', message.type);
            
            if (message.type === 'DECRYPTION_RESULT') {
                // 添加新的解密请求到列表
                setRequests(prev => [message.request, ...prev].slice(0, 100)); // 最多保留 100 条
                setIsConnected(true);
            }
        });
        
        port.onDisconnect.addListener(() => {
            console.log('[Proxy Dashboard] 与 background 的连接已断开');
            setIsConnected(false);
        });
        
        return () => {
            port.disconnect();
        };
    }, []);
    
    // 过滤请求
    const filteredRequests = requests.filter(req => {
        if (!filterText) return true;
        const searchLower = filterText.toLowerCase();
        return req.url.toLowerCase().includes(searchLower);
    });
    
    // 清空列表
    const clearRequests = () => {
        setRequests([]);
    };
    
    // 导出请求数据
    const exportRequests = () => {
        const dataStr = JSON.stringify(requests, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proxy-requests-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto p-6">
            {/* 头部 */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                    📱 {t('components.proxydashboard.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t('components.proxydashboard.description')}
                </p>
            </div>
            
            {/* 状态栏 */}
            <div className="mb-4 flex items-center justify-between bg-card rounded-lg border p-4">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">
                        {isConnected ? '已连接' : '未连接'}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                        共 {requests.length} 条请求
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="搜索 URL..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="px-3 py-1.5 border rounded-md text-sm w-64"
                    />
                    <button
                        onClick={clearRequests}
                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm"
                    >
                        清空
                    </button>
                    <button
                        onClick={exportRequests}
                        className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm"
                    >
                        导出
                    </button>
                </div>
            </div>
            
            {/* 请求列表 */}
            <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>暂无请求数据</p>
                        <p className="text-sm mt-2">在手机 APP 中进行操作，请求将显示在这里</p>
                    </div>
                ) : (
                    filteredRequests.map((request, index) => (
                        <RequestItem key={`${request.timestamp}-${index}`} request={request} />
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * 单个请求展示组件
 */
function RequestItem({ request }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN');
    };
    
    const getMethodColor = (method) => {
        const colors = {
            'GET': 'bg-blue-100 text-blue-800',
            'POST': 'bg-green-100 text-green-800',
            'PUT': 'bg-yellow-100 text-yellow-800',
            'DELETE': 'bg-red-100 text-red-800'
        };
        return colors[method] || 'bg-gray-100 text-gray-800';
    };
    
    return (
        <div className="border rounded-lg bg-card overflow-hidden">
            {/* 头部信息 */}
            <div 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(request.method)}`}>
                            {request.method}
                        </span>
                        <span className="text-sm font-medium truncate max-w-2xl">
                            {request.url}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatDate(request.timestamp)}</span>
                        <span className="text-xs">▼</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>状态码：{request.statusCode || 'N/A'}</span>
                    {request.domainConfig && (
                        <>
                            <span>•</span>
                            <span>匹配配置：{request.domainConfig.domain}</span>
                        </>
                    )}
                    {request.plainResponseBody && (
                        <>
                            <span>•</span>
                            <span className="text-green-600">✓ 已解密</span>
                        </>
                    )}
                </div>
            </div>
            
            {/* 展开详情 */}
            {isExpanded && (
                <div className="border-t p-4 space-y-4 bg-muted/30">
                    {/* 请求头 */}
                    {request.requestHeaders && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm">请求头</h4>
                            <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-48">
                                {JSON.stringify(request.requestHeaders, null, 2)}
                            </pre>
                        </div>
                    )}
                    
                    {/* 响应头 */}
                    {request.responseHeaders && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm">响应头</h4>
                            <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-48">
                                {JSON.stringify(request.responseHeaders, null, 2)}
                            </pre>
                        </div>
                    )}
                    
                    {/* 原始请求体 */}
                    {request.requestBody && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm">原始请求体</h4>
                            <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-64">
                                {request.requestBody}
                            </pre>
                        </div>
                    )}
                    
                    {/* 解密后的请求体 */}
                    {request.plainRequestBody && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm text-green-600">
                                ✓ 解密后请求体
                            </h4>
                            <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-64">
                                {request.plainRequestBody}
                            </pre>
                        </div>
                    )}
                    
                    {/* 原始响应体 */}
                    {request.responseBody && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm">原始响应体</h4>
                            <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-64">
                                {request.responseBody}
                            </pre>
                        </div>
                    )}
                    
                    {/* 解密后的响应体 */}
                    {request.plainResponseBody && (
                        <div>
                            <h4 className="font-medium mb-2 text-green-600">
                                ✓ 解密后响应体
                            </h4>
                            <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-96">
                                {request.plainResponseBody}
                            </pre>
                        </div>
                    )}
                    
                    {/* 使用的配置 */}
                    {request.requestConfig && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm">请求密钥配置</h4>
                            <div className="bg-background p-3 rounded text-xs space-y-1">
                                <div>名称：{request.requestConfig.name}</div>
                                <div>算法：{request.requestConfig.algorithm}</div>
                                {request.requestConfig.mode && (
                                    <div>模式：{request.requestConfig.mode}</div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {request.responseConfig && (
                        <div>
                            <h4 className="font-medium mb-2 text-sm">响应密钥配置</h4>
                            <div className="bg-background p-3 rounded text-xs space-y-1">
                                <div>名称：{request.responseConfig.name}</div>
                                <div>算法：{request.responseConfig.algorithm}</div>
                                {request.responseConfig.mode && (
                                    <div>模式：{request.responseConfig.mode}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
