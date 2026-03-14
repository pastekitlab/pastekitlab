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
                    return updated.sort((a, b) => a.timestamp - b.timestamp); // 时间升序
                } else {
                    // 添加新请求
                    return [...prevRequests, requestForDisplay].sort((a, b) => a.timestamp - b.timestamp); // 时间升序
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
        // setSearchTerm('');  // 不清空搜索框
    };

    const getSelectedRequest = () => {
        return requests.find(r => r.requestId === selectedRequestId);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* 顶部吸题状态栏 */}
            <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="flex items-center justify-between p-3 gap-3">
                    {/* 左侧：标题和状态 */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <h1 className="text-lg font-bold text-gray-800 flex-shrink-0">
                            {t('requestlist.title')}
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                    connectionStatus === 'connected' ? 'bg-green-500' :
                                        connectionStatus === 'timeout' ? 'bg-yellow-500' :
                                            connectionStatus === 'invalid' ? 'bg-purple-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                    {connectionStatus === 'connected' ? t('requestlist.status_connected') :
                                        connectionStatus === 'timeout' ? t('requestlist.status_timeout') :
                                            connectionStatus === 'invalid' ? t('requestlist.status_invalid') : t('requestlist.status_disconnected')}
                                </span>
                            </div>
                            
                            <Badge variant="secondary" className="text-xs px-2 py-1 h-auto">
                                {t('requestlist.requests_count', { count: requests.length })}
                            </Badge>
                        </div>
                    </div>
                    
                    {/* 中间：搜索框 */}
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder={t('requestlist.search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-1.5 text-sm"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                                🔍
                            </div>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* 右侧：操作按钮 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearRequests}
                            disabled={requests.length === 0}
                            className="text-xs px-3 py-1.5 h-auto"
                        >
                            🗑️ {t('requestlist.clear_list')}
                        </Button>
                    </div>
                </div>
            </div>
                  
            {/* 主要内容区域 */}
            <div className="flex-1 flex gap-4 p-4 overflow-hidden min-w-0 max-w-full">
                {/* 请求列表面板 */}
                <div className="w-1/2 flex flex-col min-w-0 max-w-full">
                    <Card className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                        <CardHeader className="py-3">
                            <CardTitle className="text-lg">{t('requestlist.request_list_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden px-4 pb-4" style={{ minHeight: 0 }}>
                            {filteredRequests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>{searchTerm ? t('requestlist.no_matching_requests') : t('requestlist.no_requests')}</p>
                                    <p className="text-sm mt-2">
                                        {searchTerm ? t('requestlist.try_different_keywords') : t('requestlist.request_will_show_here')}
                                    </p>
                                </div>
                            ) : (
                                <ScrollArea className="h-full pr-2" style={{ maxWidth: '100%' }}>
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
                                                                className={`text-xs flex-shrink-0 ${
                                                                    request.method === 'GET' ? 'bg-green-100 text-green-800' :
                                                                        request.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                }`}
                                                            >
                                                                {request.method}
                                                            </Badge>
                                                            <span className="text-sm font-medium break-all whitespace-normal">
                                                                {request.url}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {t('requestlist.status_code_label')} {request.statusCode} |
                                                            {t('requestlist.time_label')} {request.timestamp ? new Date(parseInt(request.timestamp)).toLocaleTimeString() : '-'}
                                                            {request.plainRequestBody && (
                                                                <span className="ml-2 text-green-600">✓ {t('panel.request_decrypted')}</span>
                                                            )}
                                                            {request.plainResponseBody && (
                                                                <span className="ml-2 text-green-600">✓ {t('panel.response_decrypted')}</span>
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
                <div className="w-1/2 flex flex-col min-w-0 max-w-full">
                    <Card className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                        <CardHeader className="py-3">
                            <CardTitle className="text-lg">{t('requestlist.request_details_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden px-4 pb-4" style={{ minHeight: 0 }}>
                            {selectedRequestId ? (
                                <ScrollArea className="h-full pr-2" style={{ maxWidth: '100%' }}>
                                    <div className="space-y-4">
                                        {/* 基本信息 */}
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <h3 className="font-medium text-sm mb-2 text-gray-700">{t('requestlist.basic_info')}</h3>
                                            <div className="space-y-1 text-xs">
                                                <div>
                                                    <span className="font-medium text-gray-600">{t('requestlist.url_label')}</span>
                                                    <span className="ml-2 text-sm text-gray-800 break-all whitespace-normal">
                                                        {getSelectedRequest()?.url}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 mt-2">
                                                    <div>
                                                        <span className="font-medium text-gray-600">{t('requestlist.method_label')}</span>
                                                        <Badge variant="outline" className="ml-2">
                                                            {getSelectedRequest()?.method}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-600">{t('requestlist.status_code_label')}</span>
                                                        <span className="ml-2 font-mono">
                                                            {getSelectedRequest()?.statusCode}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600">{t('requestlist.time_label')}</span>
                                                    <span className="ml-2 font-mono">
                                                        {getSelectedRequest()?.timestamp ? new Date(parseInt(getSelectedRequest()?.timestamp)).toLocaleString() : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 请求体 */}
                                        <div>
                                            <h3 className="font-medium text-sm mb-2 text-gray-700">{t('requestlist.request_encrypted')}</h3>
                                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                                {getSelectedRequest()?.requestBody || t('requestlist.none')}
                                            </pre>
                                        </div>

                                        {/* 请求明文 */}
                                        {getSelectedRequest()?.plainRequestBody && (
                                            <div>
                                                <h3 className="font-medium text-sm mb-2 text-gray-700">{t('requestlist.request_decrypted')}</h3>
                                                <pre className="bg-green-50 border border-green-200 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                                    {getSelectedRequest()?.plainRequestBody}
                                                </pre>
                                            </div>
                                        )}

                                        {/* 响应体 */}
                                        <div>
                                            <h3 className="font-medium text-sm mb-2 text-gray-700">{t('requestlist.response_encrypted')}</h3>
                                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                                {getSelectedRequest()?.responseBody || t('requestlist.none')}
                                            </pre>
                                        </div>

                                        {/* 响应明文 */}
                                        {getSelectedRequest()?.plainResponseBody && (
                                            <div>
                                                <h3 className="font-medium text-sm mb-2 text-gray-700">{t('requestlist.response_decrypted')}</h3>
                                                <pre className="bg-green-50 border border-green-200 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                                    {getSelectedRequest()?.plainResponseBody}
                                                </pre>
                                            </div>
                                        )}

                                        {/* 解密配置信息 */}
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                            <h4 className="font-medium text-xs text-blue-800 mb-2">{t('requestlist.decryption_config_info')}</h4>
                                            <div className="text-xs text-blue-700 space-y-1">
                                                <div>{t('requestlist.config_name_label')} {getSelectedRequest()?.decryptionInfo?.config?.name || t('requestlist.unknown')}</div>
                                                <div>{t('requestlist.algorithm_label')} {getSelectedRequest()?.decryptionInfo?.config?.algorithm || t('requestlist.unknown')}</div>
                                                <div>{t('requestlist.domain_label')} {getSelectedRequest()?.decryptionInfo?.domainConfig?.domain || t('requestlist.unknown')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>{t('requestlist.select_request_for_details')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
