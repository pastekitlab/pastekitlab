import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '../utils/i18n';
import { ProxyWebSocketClient } from '../proxy/ws-client.js';
import { performDecryption } from '../proxy/utils/decryptor.js';
import { StorageUtils } from '../utils/storageutils.js';

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
    
    // WebSocket 客户端
    const wsClientRef = useRef(null);
    const statusCheckIntervalRef = useRef(null);
    
    // 配置存储
    const decryptionConfigsRef = useRef([]);
    const keyConfigsRef = useRef([]);
    
    const portRef = useRef(null);
    const isConnectedRef = useRef(false);
    const requestsRef = useRef([]);

    // 初始化连接
    useEffect(() => {
        console.log('[RequestList Viewer] 组件挂载，初始化连接');
        loadConfigurations();
        initializeWebSocket();

        return () => {
            // 组件卸载时清理连接
            if (portRef.current) {
                try {
                    portRef.current.disconnect();
                    console.log('[RequestList Viewer] Port 连接已断开');
                } catch (error) {
                    console.error('[RequestList Viewer] 断开 Port 连接失败:', error);
                }
            }
            
            // 清理 WebSocket 连接
            if (wsClientRef.current) {
                try {
                    wsClientRef.current.disconnect();
                    console.log('[RequestList Viewer] WebSocket 连接已断开');
                } catch (error) {
                    console.error('[RequestList Viewer] 断开 WebSocket 失败:', error);
                }
            }
            
            // 清理状态检查定时器
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
                console.log('[RequestList Viewer] 状态检查定时器已清理');
            }
        };
    }, []);

    // 同步 requests 到 ref
    useEffect(() => {
        requestsRef.current = requests;
    }, [requests]);

    // 加载配置（解密配置和密钥配置）
    const loadConfigurations = async () => {
        try {
            console.log('[RequestList Viewer] 开始加载配置');
            
            // 从 chrome.storage 加载解密配置
            const decryptionResult = await StorageUtils.getItem(['decryptionConfigs']);
            let rawDecryptionConfigs = decryptionResult.decryptionConfigs || [];
            
            if (typeof rawDecryptionConfigs === 'string') {
                rawDecryptionConfigs = JSON.parse(rawDecryptionConfigs);
            }
            
            decryptionConfigsRef.current = Array.isArray(rawDecryptionConfigs) ? rawDecryptionConfigs : [];
            
            // 从 chrome.storage 加载密钥配置
            const keyResult = await StorageUtils.getItem(['keyConfigs']);
            let rawKeyConfigs = keyResult.keyConfigs || [];
            
            if (typeof rawKeyConfigs === 'string') {
                rawKeyConfigs = JSON.parse(rawKeyConfigs);
            }
            
            keyConfigsRef.current = Array.isArray(rawKeyConfigs) ? rawKeyConfigs : [];
            
            console.log('[RequestList Viewer] 配置加载完成:', {
                decryptionConfigs: decryptionConfigsRef.current.length,
                keyConfigs: keyConfigsRef.current.length
            });
        } catch (error) {
            console.error('[RequestList Viewer] 加载配置失败:', error);
        }
    };

    // 根据域名查找匹配的解密配置
    const findMatchingConfig = (url) => {
        try {
            if (!Array.isArray(decryptionConfigsRef.current) || decryptionConfigsRef.current.length === 0) {
                return null;
            }
            
            let hostname;
            try {
                const urlObj = new URL(url);
                hostname = urlObj.hostname.toLowerCase();
            } catch (urlError) {
                console.error('[RequestList Viewer] URL 解析失败:', url, urlError);
                return null;
            }
            
            const matchedConfig = decryptionConfigsRef.current.find(config => {
                if (!config || !config.enabled) {
                    return false;
                }
                
                const configDomain = (config.domain || '').toLowerCase().replace(/^www\./, '');
                const requestDomain = hostname.replace(/^www\./, '');
                
                return configDomain === requestDomain || 
                       (configDomain && requestDomain.endsWith('.' + configDomain));
            });
            
            return matchedConfig || null;
        } catch (error) {
            console.error('[RequestList Viewer] 匹配配置失败:', error);
            return null;
        }
    };

    // 根据名称查找密钥配置
    const findKeyConfigByName = (name) => {
        if (!name) return null;
        return keyConfigsRef.current.find(config => config.name === name) || null;
    };

    // 初始化 WebSocket 连接
    const initializeWebSocket = () => {
        try {
            const wsUrl = 'ws://127.0.0.1:8889/ws';
            console.log('[RequestList Viewer] 🔄 正在连接到 WebSocket:', wsUrl);
            
            // 创建 WebSocket 客户端
            wsClientRef.current = new ProxyWebSocketClient(wsUrl);
            

            // 注册消息处理器（用于处理代理请求等）
            wsClientRef.current.on('proxy-request', async (message) => {
                console.log('[RequestList Viewer] 收到代理请求:', message.url);
                await handleProxyRequest(message);
            });
            
            wsClientRef.current.on('REQUEST', async (message) => {
                console.log('[RequestList Viewer] 收到 REQUEST:', message.url);
                await handleProxyRequest(message);
            });
            
            wsClientRef.current.on('RESPONSE', async (message) => {
                console.log('[RequestList Viewer] 收到 RESPONSE:', message.url);
                await handleProxyRequest(message);
            });

            // 更新连接状态的函数
            const updateConnectionStatus = () => {
                const isConnected = wsClientRef.current?.isConnected() || false;
                console.log('[RequestList Viewer] 📊 检查连接状态：isConnected =', isConnected);
                
                setIsConnected(isConnected);
                isConnectedRef.current = isConnected;
                
                if (isConnected) {
                    setConnectionStatus('connected');
                } else {
                    setConnectionStatus('disconnected');
                }
            };
            
            // 启动定时器，定期检查连接状态
            statusCheckIntervalRef.current = setInterval(() => {
                updateConnectionStatus();
            }, 500); // 每 500ms 检查一次
            
            // 连接到服务器
            wsClientRef.current.connect().catch(error => {
                console.error('[RequestList Viewer] 连接失败:', error);
                updateConnectionStatus();
            });
            
            // 延迟发送域名配置
            setTimeout(() => {
                updateConnectionStatus();
                sendDomainConfig();
            }, 1000);
            
        } catch (error) {
            console.error('[RequestList Viewer] 初始化 WebSocket 失败:', error);
            setConnectionStatus('error');
            setIsConnected(false);
            isConnectedRef.current = false;
        }
    };

    // 发送域名配置到代理服务器
    const sendDomainConfig = () => {
        console.log('[RequestList Viewer] 📤 准备发送域名配置');
        
        if (!wsClientRef.current) {
            console.warn('[RequestList Viewer] ⚠️ WebSocket 客户端不存在，跳过发送');
            return;
        }
        
        if (!wsClientRef.current.isConnected()) {
            console.warn('[RequestList Viewer] ⚠️ WebSocket 未连接，跳过发送');
            return;
        }
        
        try {
            const enabledDomains = decryptionConfigsRef.current
                .filter(config => config.enabled && config.decryptionEnabled !== false)
                .map(config => config.domain)
                .filter(domain => domain);
            
            console.log('[RequestList Viewer] 📋 启用解密的域名列表:', enabledDomains);
            console.log('[RequestList Viewer] 🔢 域名数量:', enabledDomains.length);
            
            if (enabledDomains.length === 0) {
                console.log('[RequestList Viewer] ℹ️ 没有启用解密的域名，但仍发送空列表');
            }
            
            const message = {
                msgType: 'domain',
                domain: enabledDomains
            };
            
            console.log('[RequestList Viewer] 📤 发送消息:', JSON.stringify(message));
            
            const success = wsClientRef.current.send('domain', message);
            
            if (success) {
                console.log('[RequestList Viewer] ✅ 域名配置发送成功');
            } else {
                console.warn('[RequestList Viewer] ⚠️ 域名配置发送失败');
            }
        } catch (error) {
            console.error('[RequestList Viewer] ❌ 发送域名配置失败:', error);
        }
    };

    // 处理来自代理的请求
    const handleProxyRequest = async (requestData) => {
        if (!requestData || !requestData.url) {
            console.log('[RequestList Viewer] 无效消息:', JSON.stringify(requestData));
            return;
        }
        
        console.log('[RequestList Viewer] 处理代理请求:', requestData.url);
        
        // 查找匹配的配置
        const matchedConfig = findMatchingConfig(requestData.url);
        if (!matchedConfig) {
            console.log('[RequestList Viewer] URL 不匹配任何配置，跳过');
            return;
        }
        
        let plainRequestBody = null;
        let plainResponseBody = null;
        let decryptError = null;
        let requestKeyConfig = null;
        let responseKeyConfig = null;
        
        // 只有在启用解密功能时才尝试解密
        if (matchedConfig.decryptionEnabled !== false) {
            // 查找密钥配置
            requestKeyConfig = findKeyConfigByName(matchedConfig.requestKeyConfigName);
            responseKeyConfig = findKeyConfigByName(matchedConfig.responseKeyConfigName);
            
            if (!requestKeyConfig || !responseKeyConfig) {
                console.warn('[RequestList Viewer] 未找到匹配的密钥配置');
                decryptError = '未找到匹配的密钥配置';
            } else {
                try {
                    // 执行解密
                    const result = await performDecryption({
                        requestBody: requestData.requestBody || requestData.body,
                        responseBody: requestData.responseBody || requestData.body,
                        requestKeyConfig,
                        responseKeyConfig
                    });
                    plainRequestBody = result.plainRequestBody;
                    plainResponseBody = result.plainResponseBody;
                    decryptError = result.error;
                    console.log('[RequestList Viewer] ✅ 解密成功');
                } catch (decryptErr) {
                    console.error('[RequestList Viewer] 解密失败:', decryptErr);
                    decryptError = decryptErr.message;
                }
            }
        }
        
        // 构建完整的请求对象
        const fullRequest = {
            requestId: requestData.eventId || requestData.timestamp?.toString() || Date.now().toString(),
            url: requestData.url,
            method: requestData.method,
            requestHeaders: requestData.headers || {},
            responseHeaders: requestData.headers || {},
            requestBody: requestData.body || requestData.requestBody,
            responseBody: requestData.body || requestData.responseBody,
            plainRequestBody: plainRequestBody,
            plainResponseBody: plainResponseBody,
            statusCode: requestData.statusCode,
            timestamp: requestData.timestamp || Date.now(),
            requestConfig: requestKeyConfig,
            responseConfig: responseKeyConfig,
            domainConfig: matchedConfig,
            decryptionSkipped: matchedConfig.decryptionEnabled === false
        };
        
        // 添加到请求列表
        setRequests(prevRequests => {
            const existingIndex = prevRequests.findIndex(req => req.requestId === fullRequest.requestId);
            if (existingIndex >= 0) {
                const updated = [...prevRequests];
                updated[existingIndex] = fullRequest;
                return updated.sort((a, b) => a.timestamp - b.timestamp);
            } else {
                return [...prevRequests, fullRequest].sort((a, b) => a.timestamp - b.timestamp);
            }
        });
        
        console.log('[RequestList Viewer] 已添加请求到列表:', fullRequest.requestId);
    };

    // 监听配置变化
    useEffect(() => {
        const handleStorageChange = (changes, areaName) => {
            // 配置变化后重新发送域名配置
            setTimeout(() => {
                sendDomainConfig();
            }, 1000);
        };
        
        chrome.storage.onChanged.addListener(handleStorageChange);
        
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

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
