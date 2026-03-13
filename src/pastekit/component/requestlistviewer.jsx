import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '../utils/i18n';

/**
 * 请求列表展示组件 - 用于 Options 页面
 * 展示来自代理的请求和解密结果
 */
export default function RequestListViewer() {
    const [t] = useTranslation();
    const [requests, setRequests] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    
    const portRef = useRef(null);
    const isConnectedRef = useRef(false);
    const requestsRef = useRef([]);

    // 初始化连接
    useEffect(() => {
        console.log('[RequestList Viewer] 组件挂载，初始化连接');
        initializeConnection();

        return () => {
            // 组件卸载时清理连接
            if (portRef.current) {
                try {
                    portRef.current.disconnect();
                    console.log('[RequestList Viewer] 连接已断开');
                } catch (error) {
                    console.error('[RequestList Viewer] 断开连接失败:', error);
                }
            }
        };
    }, []);

    // 同步 requests 到 ref
    useEffect(() => {
        requestsRef.current = requests;
    }, [requests]);

    const initializeConnection = () => {
        try {
            console.log('[RequestList Viewer] 开始初始化连接');

            if (!chrome.runtime) {
                console.error('[RequestList Viewer] Chrome 扩展上下文无效');
                setConnectionStatus('invalid');
                return;
            }

            // 建立与 background 的连接
            const port = chrome.runtime.connect({
                name: 'options-request-viewer'
            });
            portRef.current = port;

            console.log('[RequestList Viewer] 已创建 port 连接');

            port.onMessage.addListener(handleMessage);

            port.onDisconnect.addListener(() => {
                console.log('[RequestList Viewer] 连接断开');
                setIsConnected(false);
                setConnectionStatus('disconnected');
                
                // 检查是否需要重连
                setTimeout(() => {
                    if (chrome.runtime && chrome.runtime.id !== undefined) {
                        console.log('[RequestList Viewer] 尝试重新连接');
                        initializeConnection();
                    }
                }, 3000);
            });

            // 等待连接确认
            setTimeout(() => {
                if (isConnectedRef.current) {
                    console.log('[RequestList Viewer] ✅ 连接已建立');
                } else {
                    console.warn('[RequestList Viewer] ⚠️ 连接超时');
                    setConnectionStatus('timeout');
                }
            }, 5000);

        } catch (error) {
            console.error('[RequestList Viewer] 连接初始化失败:', error);
            if (error.message.includes('Extension context invalidated')) {
                setConnectionStatus('invalid');
            }
        }
    };

    const handleMessage = (message) => {
        console.log('[RequestList Viewer] 收到消息:', message.type);

        switch (message.type) {
            case 'CONNECTION_CONFIRMED':
                setIsConnected(true);
                isConnectedRef.current = true;
                setConnectionStatus('connected');
                console.log('[RequestList Viewer] ✅ 连接已确认');
                break;

            case 'DECRYPTION_RESULT':
                handleDecryptionResult(message);
                break;

            default:
                console.log('[RequestList Viewer] 未知消息类型:', message.type);
        }
    };

    const handleDecryptionResult = (message) => {
        const { requestId, request } = message;

        if (request) {
            const requestForDisplay = {
                requestId: requestId,
                url: request.url,
                method: request.method,
                requestHeaders: request.requestHeaders || [],
                responseHeaders: request.responseHeaders || [],
                requestBody: request.requestBody,
                responseBody: request.responseBody,
                plainRequestBody: request.plainRequestBody,
                plainResponseBody: request.plainResponseBody,
                statusCode: request.statusCode,
                timestamp: request.timestamp || Date.now(),
                decryptionInfo: {
                    config: request.requestConfig,
                    domainConfig: request.domainConfig
                }
            };

            console.log('[RequestList Viewer] 添加请求:', requestForDisplay);
            
            setRequests(prevRequests => {
                // 检查是否已存在
                const existingIndex = prevRequests.findIndex(req => req.requestId === requestId);
                if (existingIndex >= 0) {
                    // 更新现有请求
                    const updated = [...prevRequests];
                    updated[existingIndex] = requestForDisplay;
                    return updated.sort((a, b) => b.timestamp - a.timestamp);
                } else {
                    // 添加新请求
                    return [...prevRequests, requestForDisplay].sort((a, b) => b.timestamp - a.timestamp);
                }
            });
        }
    };

    // 过滤请求列表
    const filteredRequests = useMemo(() => {
        if (!searchTerm) return requests;
        
        const term = searchTerm.toLowerCase().trim();
        return requests.filter(request => 
            request.url?.toLowerCase().includes(term) ||
            request.requestId?.toLowerCase().includes(term) ||
            request.method?.toLowerCase().includes(term) ||
            request.statusCode?.toString().includes(term)
        );
    }, [requests, searchTerm]);

    const selectRequest = (requestId) => {
        setSelectedRequestId(requestId);
    };

    const clearRequests = () => {
        setRequests([]);
        setSelectedRequestId(null);
        setSearchTerm('');
    };

    const getSelectedRequest = () => {
        return requests.find(r => r.requestId === selectedRequestId);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* 顶部状态栏 */}
            <div className="bg-white border-b p-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">
                            🔍 请求监控列表
                        </h1>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                    connectionStatus === 'connected' ? 'bg-green-500' :
                                        connectionStatus === 'timeout' ? 'bg-yellow-500' :
                                            connectionStatus === 'invalid' ? 'bg-purple-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-sm text-gray-600">
                                    {connectionStatus === 'connected' ? '已连接' :
                                        connectionStatus === 'timeout' ? '连接超时' :
                                            connectionStatus === 'invalid' ? '上下文失效' : '未连接'}
                                </span>
                            </div>
                            
                            <Badge variant="secondary">
                                请求数：{requests.length}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={clearRequests}
                            disabled={requests.length === 0}
                        >
                            🗑️ 清空列表
                        </Button>
                    </div>
                </div>
            </div>
                  
            {/* 搜索区域 */}
            <div className="bg-white border-b p-3">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Input
                            type="text"
                            placeholder="搜索 URL、请求 ID 或方法..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            🔍
                        </div>
                    </div>
                    <div className="text-sm text-gray-600">
                        显示：{filteredRequests.length} / {requests.length}
                    </div>
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm('')}
                        >
                            ✕ 清除
                        </Button>
                    )}
                </div>
            </div>
                  
            {/* 主要内容区域 */}
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* 请求列表面板 */}
                <div className="w-1/2 flex flex-col">
                    <Card className="flex-1 flex flex-col h-full">
                        <CardHeader className="py-3">
                            <CardTitle className="text-lg">请求列表</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden px-4 pb-4">
                            {filteredRequests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>{searchTerm ? '没有找到匹配的请求' : '暂无请求'}</p>
                                    <p className="text-sm mt-2">
                                        {searchTerm ? '尝试更换关键词搜索' : '发起网络请求后将在此展示'}
                                    </p>
                                </div>
                            ) : (
                                <ScrollArea className="h-full pr-2">
                                    <div className="space-y-2">
                                        {filteredRequests.map((request) => (
                                            <div
                                                key={request.requestId}
                                                className={`p-3 rounded border cursor-pointer transition-colors ${
                                                    selectedRequestId === request.requestId
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                                onClick={() => selectRequest(request.requestId)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2">
                                                            <Badge 
                                                                variant="outline" 
                                                                className={`text-xs ${
                                                                    request.method === 'GET' ? 'bg-green-100 text-green-800' :
                                                                        request.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                }`}
                                                            >
                                                                {request.method}
                                                            </Badge>
                                                            <span className="text-sm font-medium truncate block">
                                                                {request.url}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            状态：{request.statusCode} |
                                                            时间：{new Date(request.timestamp).toLocaleTimeString()}
                                                            {request.plainRequestBody && (
                                                                <span className="ml-2 text-green-600">✓ 请求已解密</span>
                                                            )}
                                                            {request.plainResponseBody && (
                                                                <span className="ml-2 text-green-600">✓ 响应已解密</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 详情面板 */}
                <div className="w-1/2 flex flex-col">
                    <Card className="flex-1 flex flex-col h-full">
                        <CardHeader className="py-3">
                            <CardTitle className="text-lg">请求详情</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden px-4 pb-4">
                            {selectedRequestId ? (
                                <ScrollArea className="h-full pr-2">
                                    <div className="space-y-4">
                                        {/* 基本信息 */}
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <h3 className="font-medium text-sm mb-2 text-gray-700">基本信息</h3>
                                            <div className="space-y-1 text-xs">
                                                <div>
                                                    <span className="font-medium text-gray-600">URL:</span>
                                                    <span className="ml-2 text-gray-800 break-all">
                                                        {getSelectedRequest()?.url}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 mt-2">
                                                    <div>
                                                        <span className="font-medium text-gray-600">方法:</span>
                                                        <Badge variant="outline" className="ml-2">
                                                            {getSelectedRequest()?.method}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-600">状态码:</span>
                                                        <span className="ml-2 font-mono">
                                                            {getSelectedRequest()?.statusCode}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600">时间:</span>
                                                    <span className="ml-2 font-mono">
                                                        {new Date(getSelectedRequest()?.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 请求体 */}
                                        <div>
                                            <h3 className="font-medium text-sm mb-2 text-gray-700">🔒 请求密文</h3>
                                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                                                {getSelectedRequest()?.requestBody || '无'}
                                            </pre>
                                        </div>

                                        {/* 请求明文 */}
                                        {getSelectedRequest()?.plainRequestBody && (
                                            <div>
                                                <h3 className="font-medium text-sm mb-2 text-gray-700">🔓 请求明文</h3>
                                                <pre className="bg-green-50 border border-green-200 p-3 rounded text-xs overflow-auto max-h-48">
                                                    {getSelectedRequest()?.plainRequestBody}
                                                </pre>
                                            </div>
                                        )}

                                        {/* 响应体 */}
                                        <div>
                                            <h3 className="font-medium text-sm mb-2 text-gray-700">🔒 响应密文</h3>
                                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                                                {getSelectedRequest()?.responseBody || '无'}
                                            </pre>
                                        </div>

                                        {/* 响应明文 */}
                                        {getSelectedRequest()?.plainResponseBody && (
                                            <div>
                                                <h3 className="font-medium text-sm mb-2 text-gray-700">🔓 响应明文</h3>
                                                <pre className="bg-green-50 border border-green-200 p-3 rounded text-xs overflow-auto max-h-48">
                                                    {getSelectedRequest()?.plainResponseBody}
                                                </pre>
                                            </div>
                                        )}

                                        {/* 解密配置信息 */}
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                            <h4 className="font-medium text-xs text-blue-800 mb-2">解密配置信息</h4>
                                            <div className="text-xs text-blue-700 space-y-1">
                                                <div>配置名称：{getSelectedRequest()?.decryptionInfo?.config?.name || '未知'}</div>
                                                <div>算法：{getSelectedRequest()?.decryptionInfo?.config?.algorithm || '未知'}</div>
                                                <div>域名：{getSelectedRequest()?.decryptionInfo?.domainConfig?.domain || '未知'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>请选择一个请求查看详情</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
