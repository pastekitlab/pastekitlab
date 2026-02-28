import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../utils/i18n';

/**
 * DevTools 解密面板组件
 * 负责网络请求监控、解密结果显示和用户交互
 */
export default function DevToolsPanel() {
  const [t] = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const portRef = useRef(null);
  const isConnectedRef = useRef(false);
  const connectionStatusRef = useRef('disconnected');

  // 添加状态变化监听
  useEffect(() => {
    console.log('[CryptoDevTools Panel] isConnected 状态变化:', isConnected);
  }, [isConnected]);
  
  useEffect(() => {
    console.log('[CryptoDevTools Panel] connectionStatus 状态变化:', connectionStatus);
  }, [connectionStatus]);
  
  // 初始化连接
  useEffect(() => {
    console.log('[CryptoDevTools Panel] useEffect 初始化开始');
    initializeConnection();
  }, []);

  const initializeConnection = () => {
    try {
      console.log('[CryptoDevTools Panel] 初始化连接');
      
      // 检查扩展上下文是否有效
      if (!chrome.runtime) {
        console.error('[CryptoDevTools Panel] Chrome 扩展上下文无效');
        setConnectionStatus('invalid');
        return;
      }
      
      // 建立与 background 的直接连接
      const port = chrome.runtime.connect({ name: 'devtools-panel' });
      portRef.current = port;
      
      console.log('[CryptoDevTools Panel] 已创建 port 连接');
      
      port.onMessage.addListener(handleMessage);
      console.log('[CryptoDevTools Panel] 已设置消息监听器');
      
      port.onDisconnect.addListener(() => {
        console.log('[CryptoDevTools Panel] 连接断开');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        // 尝试重新连接
        setTimeout(() => {
          if (chrome.runtime) {
            console.log('[CryptoDevTools Panel] 尝试重新连接');
            initializeConnection();
          }
        }, 2000);
      });
      
      // 等待连接确认
      waitForConnection();
      
      // 初始化 DevTools 网络监听
      initializeDevToolsNetworkListener();
      
    } catch (error) {
      console.error('[CryptoDevTools Panel] 连接初始化失败:', error);
      if (error.message.includes('Extension context invalidated')) {
        setConnectionStatus('invalid');
      }
    }
  };

  const initializeDevToolsNetworkListener = () => {
    console.log('[CryptoDevTools Panel] 初始化 DevTools 网络监听');
    
    if (typeof chrome !== 'undefined' && chrome.devtools && chrome.devtools.network) {
      try {
        console.log('[CryptoDevTools Panel] DevTools API 可用');
        chrome.devtools.network.onRequestFinished.addListener((request) => {
          console.log('[CryptoDevTools Panel] 捕获到网络请求:', request.request.url);
          handleDevToolsNetworkRequest(request);
        });
        console.log('[CryptoDevTools Panel] ✅ DevTools 网络监听已设置');
      } catch (error) {
        console.log('[CryptoDevTools Panel] ❌ 设置网络监听失败:', error.message);
      }
    } else {
      console.log('[CryptoDevTools Panel] ⚠️ 当前环境不支持 DevTools 网络 API');
      console.log('[CryptoDevTools Panel] chrome.devtools:', typeof chrome.devtools);
      console.log('[CryptoDevTools Panel] chrome.devtools.network:', typeof chrome.devtools?.network);
    }
  };

  const waitForConnection = () => {
    console.log('[CryptoDevTools Panel] 开始等待连接确认');
    console.log('[CryptoDevTools Panel] 初始状态检查:', { 
      isConnected, 
      connectionStatus,
      refIsConnected: isConnectedRef.current,
      refConnectionStatus: connectionStatusRef.current
    });
    
    const checkInterval = setInterval(() => {
      // 使用 refs 获取最新状态
      const currentIsConnected = isConnectedRef.current;
      const currentConnectionStatus = connectionStatusRef.current;
      
      console.log(`[CryptoDevTools Panel] 检查连接状态: ${currentIsConnected ? '已连接' : '未连接'}`);
      console.log(`[CryptoDevTools Panel] 当前状态值: isConnected=${currentIsConnected}, connectionStatus=${currentConnectionStatus}`);
      console.log(`[CryptoDevTools Panel] React状态: isConnected=${isConnected}, connectionStatus=${connectionStatus}`);
      
      if (currentIsConnected) {
        clearInterval(checkInterval);
        console.log('[CryptoDevTools Panel] ✅ 连接已建立');
      }
    }, 1000); // 每秒检查一次
    
    // 超时处理 - 延长到30秒
    setTimeout(() => {
      const currentIsConnected = isConnectedRef.current;
      if (!currentIsConnected) {
        clearInterval(checkInterval);
        console.warn('[CryptoDevTools Panel] ⚠️ 连接超时，尝试重新连接');
        setConnectionStatus('timeout');
        connectionStatusRef.current = 'timeout';
        // 自动重试
        setTimeout(() => {
          const currentIsConnected = isConnectedRef.current;
          if (!currentIsConnected && portRef.current) {
            console.log('[CryptoDevTools Panel] 重新初始化连接');
            initializeConnection();
          }
        }, 3000);
      }
    }, 30000);
  };

  const handleMessage = (message) => {
    console.log('[CryptoDevTools Panel] 收到消息:', message);
    console.log('[CryptoDevTools Panel] 处理前状态:', { isConnected, connectionStatus });
    console.log('[CryptoDevTools Panel] 状态函数引用:', { setIsConnected, setConnectionStatus });
    
    // 特殊处理：CONFIG_MATCH_RESULT 消息由临时监听器处理，这里不做处理
    if (message.type === 'CONFIG_MATCH_RESULT') {
      console.log('[CryptoDevTools Panel] CONFIG_MATCH_RESULT 消息由临时监听器处理');
      return;
    }
    
    switch (message.type) {
      case 'CONNECTION_CONFIRMED':
        console.log('[CryptoDevTools Panel] 处理 CONNECTION_CONFIRMED 消息');
        console.log('[CryptoDevTools Panel] 调用 setIsConnected(true)');
        setIsConnected(true);
        isConnectedRef.current = true;
        console.log('[CryptoDevTools Panel] 调用 setConnectionStatus("connected")');
        setConnectionStatus('connected');
        connectionStatusRef.current = 'connected';
        console.log('[CryptoDevTools Panel] 已调用状态更新函数');
        console.log('[CryptoDevTools Panel] ✅ 收到连接确认');
        break;
        
      case 'BATCH_DECRYPTION_RESULT':
        handleBatchDecryptionResult(message);
        break;
        
      case 'DECRYPTION_RESULT':
        handleSingleDecryptionResult(message);
        break;
        
      case 'NETWORK_DATA_CAPTURED':
        handleNetworkData(message);
        break;
        
      default:
        console.log('[CryptoDevTools Panel] 未知消息类型:', message.type);
    }
    
    console.log('[CryptoDevTools Panel] 处理后状态:', { isConnected, connectionStatus });
  };

  // 处理 DevTools 网络请求
  const handleDevToolsNetworkRequest = async (request) => {
    console.log('[CryptoDevTools Panel] 处理网络请求:', request.request.url);
    
    // 使用 refs 检查连接状态
    if (!portRef.current || !isConnectedRef.current) {
      console.log('[CryptoDevTools Panel] 无法处理请求 - 连接未建立');
      return;
    }
    
    // 检查是否匹配配置
    const matchedConfig = await getMatchingConfig(request.request.url);
    if (!matchedConfig) {
      console.log('[CryptoDevTools Panel] URL不匹配任何配置，跳过', request.request.url);
      return;
    }
    
    console.log('[CryptoDevTools Panel] 匹配到配置:', matchedConfig.domain);
    
    // 获取请求体
    let requestBody = null;
    if (request.request.postData && request.request.postData.text) {
      requestBody = request.request.postData.text;
      console.log('[CryptoDevTools Panel] 获取到请求体，长度:', requestBody.length);
    }
    
    // 获取响应体
    console.log('[CryptoDevTools Panel] 开始获取响应体...');
    request.getContent((responseBody) => {
      console.log('[CryptoDevTools Panel] 响应体获取完成');
      console.log('[CryptoDevTools Panel] 响应体长度:', responseBody?.length || 0);
      console.log('[CryptoDevTools Panel] 响应体类型:', typeof responseBody);
      
      const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // 发送网络数据到 background
      if (portRef.current && isConnectedRef.current) {
        console.log('[CryptoDevTools Panel] 发送网络数据到 background');
        portRef.current.postMessage({
          type: 'DEVTOOLS_NETWORK_DATA',
          requestId,
          url: request.request.url,
          method: request.request.method,
          requestBody: requestBody,
          responseBody: responseBody || null,
          statusCode: request.response.status
        });
        
        console.log('[CryptoDevTools Panel] ✅ 网络数据已发送到 background');
      } else {
        console.log('[CryptoDevTools Panel] ❌ 无法发送数据 - port或连接状态无效');
        console.log('[CryptoDevTools Panel] portRef.current:', !!portRef.current);
        console.log('[CryptoDevTools Panel] isConnectedRef.current:', isConnectedRef.current);
      }
    });
  };

  const handleNetworkData = (message) => {
    const { requestId, url, method, requestBody, responseBody, statusCode } = message;
    
    const request = {
      requestId,
      url,
      method,
      requestBody: requestBody || null,
      responseBody: responseBody || null,
      statusCode,
      timestamp: Date.now()
    };
    
    addRequest(request);
  };

  const handleBatchDecryptionResult = (message) => {
    const { requestId, results } = message;
    
    setRequests(prevRequests => {
      return prevRequests.map(req => {
        if (req.requestId === requestId) {
          const updatedReq = { ...req };
          results.forEach(result => {
            if (result.success && result.plaintext) {
              if (result.dataType === 'request') {
                updatedReq.requestBody = result.plaintext;
              } else if (result.dataType === 'response') {
                updatedReq.responseBody = result.plaintext;
              }
            }
          });
          return updatedReq;
        }
        return req;
      });
    });
    
    // 如果是当前选中的请求，更新详情面板
    if (selectedRequestId === requestId) {
      // 触发重新渲染
    }
  };

  const handleSingleDecryptionResult = (message) => {
    const { requestId, result } = message;
    
    if (result.success && result.plaintext) {
      console.log('[CryptoDevTools Panel] 单个解密结果:', result);
    }
  };

  const addRequest = (request) => {
    setRequests(prevRequests => {
      // 检查是否已存在
      const existingIndex = prevRequests.findIndex(req => req.requestId === request.requestId);
      if (existingIndex >= 0) {
        // 更新现有请求
        const updatedRequests = [...prevRequests];
        updatedRequests[existingIndex] = request;
        return updatedRequests.sort((a, b) => a.timestamp - b.timestamp);
      } else {
        // 添加新请求
        return [...prevRequests, request].sort((a, b) => a.timestamp - b.timestamp);
      }
    });
  };

  const selectRequest = (requestId) => {
    setSelectedRequestId(requestId);
  };

  // 解密数据
  const decryptData = async (requestId, dataType) => {
    // 使用 refs 检查连接状态
    if (!portRef.current || !isConnectedRef.current) {
      console.error('[CryptoDevTools Panel] 未连接到 background');
      return;
    }
    
    const request = requests.find(req => req.requestId === requestId);
    if (!request) return;
    
    const data = dataType === 'request' ? request.requestBody : request.responseBody;
    if (!data) return;
    
    // 获取匹配的配置
    const config = await getMatchingConfig(request.url);
    if (!config) {
      console.log('[CryptoDevTools Panel] 未找到匹配的解密配置');
      return;
    }
    
    console.log('[CryptoDevTools Panel] 发送解密请求');
    // 发送解密请求
    portRef.current.postMessage({
      type: 'REQUEST_DECRYPTION',
      requestId,
      data,
      config,
      isRequest: dataType === 'request'
    });
  };

  const getMatchingConfig = (url) => {
    return new Promise((resolve) => {
      // 使用 refs 检查连接状态
      if (!portRef.current || !isConnectedRef.current) {
        console.log('[CryptoDevTools Panel] 无法获取配置 - 连接未建立');
        resolve(null);
        return;
      }
      
      const messageId = 'config_check_' + Date.now();
      
      // 发送配置检查请求
      console.log('[CryptoDevTools Panel] 发送配置检查请求:', url);
      portRef.current.postMessage({
        type: 'CHECK_CONFIG_MATCH',
        url,
        messageId
      });
      
      // 临时监听器等待响应
      const tempListener = (message) => {
        console.log('[CryptoDevTools Panel] 临时监听器收到消息:', message.type);
        if (message.type === 'CONFIG_MATCH_RESULT' && message.messageId === messageId) {
          portRef.current.onMessage.removeListener(tempListener);
          console.log('[CryptoDevTools Panel] 配置匹配结果:', message.matchedConfig);
          resolve(message.matchedConfig || null);
        }
      };
      
      portRef.current.onMessage.addListener(tempListener);
      
      // 超时处理 - 延长到5秒
      setTimeout(() => {
        portRef.current.onMessage.removeListener(tempListener);
        console.log('[CryptoDevTools Panel] 配置检查超时');
        resolve(null);
      }, 5000);
    });
  };

  const refreshConfigs = () => {
    // 使用 refs 检查连接状态
    if (!portRef.current || !isConnectedRef.current) {
      console.log('[CryptoDevTools Panel] 无法刷新配置 - 连接未建立');
      return;
    }
    
    console.log('[CryptoDevTools Panel] 发送配置刷新请求');
    portRef.current.postMessage({
      type: 'REFRESH_CONFIGURATION'
    });
  };

  const clearRequests = () => {
    console.log('[CryptoDevTools Panel] 清理所有请求');
    setRequests([]);
    setSelectedRequestId(null);
  };

  // 渲染组件
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {t('components.panel.title')}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'timeout' ? 'bg-yellow-500' :
                  connectionStatus === 'invalid' ? 'bg-purple-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {connectionStatus === 'connected' ? t('components.panel.connected') :
                   connectionStatus === 'timeout' ? t('components.panel.timeout') :
                   connectionStatus === 'invalid' ? '扩展上下文失效' : t('components.panel.disconnected')}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {t('components.panel.requests_count', { count: requests.length })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshConfigs}
              disabled={!isConnected}
            >
              🔄 {t('components.panel.refresh_configs')}
            </Button>
            <Button 
              variant="outline" 
              onClick={clearRequests}
              disabled={requests.length === 0}
            >
              🗑️ {t('components.panel.clear_requests')}
            </Button>
          </div>
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* 请求列表面板 */}
        <div className="w-1/2 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>{t('components.panel.requests')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('components.panel.no_requests')}</p>
                  <p className="text-sm mt-2">{t('components.panel.make_request_tip')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((request) => (
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
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              request.method === 'GET' ? 'bg-green-100 text-green-800' :
                              request.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.method}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {request.url}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            状态: {request.statusCode} | 时间: {new Date(request.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {request.requestBody && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                decryptData(request.requestId, 'request');
                              }}
                            >
                              解密请求
                            </Button>
                          )}
                          {request.responseBody && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                decryptData(request.requestId, 'response');
                              }}
                            >
                              解密响应
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* 详情面板 */}
        <div className="w-1/2 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>{t('components.panel.details')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {selectedRequestId ? (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">请求体</h3>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                      {requests.find(r => r.requestId === selectedRequestId)?.requestBody || '无请求体'}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">响应体</h3>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                      {requests.find(r => r.requestId === selectedRequestId)?.responseBody || '无响应体'}
                    </pre>
                  </div>
                </div>
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

// 渲染 React 组件到 DOM
if (typeof document !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<DevToolsPanel />);
  }
}

// 导出组件供其他地方使用
export { DevToolsPanel };
