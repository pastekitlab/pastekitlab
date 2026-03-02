import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { StorageUtils } from '../utils/storageutils.js';

/**
 * DevTools 解密器配置组件
 * 用于配置需要监听和解密的域名及对应的密钥信息
 */
export default function DevToolsDecryptorConfig({ configs = [], className = '' }) {
  const [decryptionConfigs, setDecryptionConfigs] = useState([]);
  const [newConfig, setNewConfig] = useState({
    domain: '',
    requestKeyConfigId: '',  // 请求密钥配置
    responseKeyConfigId: '',  // 响应密钥配置
    enabled: true,
    description: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [useSameKeyForRequestAndResponse, setUseSameKeyForRequestAndResponse] = useState(false);

  // 组件挂载时加载配置
  useEffect(() => {
    console.log('[DevTools Config] 组件挂载，传入的configs:', configs);
    loadDecryptionConfigs();
  }, [configs]);

  // 加载解密配置
  const loadDecryptionConfigs = async () => {
    try {
      setIsLoading(true);
      const result = await StorageUtils.getItem(['decryptionConfigs']);
      const loadedConfigs = result.decryptionConfigs || [];
      setDecryptionConfigs(loadedConfigs);
      console.log('[DevTools Config] 加载配置:', loadedConfigs);
      console.log('[DevTools Config] 可用的密钥配置:', configs);
      toast.success('配置加载成功');
    } catch (error) {
      console.error('[DevTools Config] 加载配置失败:', error);
      toast.error(`加载失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存解密配置
  const saveDecryptionConfigs = async (configsToSave) => {
    try {
      await StorageUtils.setItem('decryptionConfigs', configsToSave);
      setDecryptionConfigs(configsToSave);
      console.log('[DevTools Config] 保存配置成功');
      toast.success('配置保存成功');
      
      // 通知 background.js 更新配置
      chrome.runtime.sendMessage({
        type: 'REFRESH_DECRYPTION_CONFIGS',
        configs: configsToSave
      }).catch(err => {
        console.log('[DevTools Config] 通知 background 失败（可能是正常现象）:', err);
      });
      
    } catch (error) {
      console.error('[DevTools Config] 保存配置失败:', error);
      toast.error(`保存失败: ${error.message}`);
    }
  };

  // 添加新配置
  const handleAddConfig = async () => {
    console.log('[DevTools Config] 添加配置，当前表单状态:', newConfig);
    console.log('[DevTools Config] 可用密钥配置数量:', configs.length);
    
    if (!newConfig.domain) {
      toast.error('请输入目标域名');
      return;
    }
    
    if (!newConfig.requestKeyConfigId) {
      toast.error('请选择请求密钥配置');
      return;
    }

    if (!useSameKeyForRequestAndResponse && !newConfig.responseKeyConfigId) {
      toast.error('请选择响应密钥配置，或启用"请求和响应使用相同密钥"选项');
      return;
    }

    // 验证域名格式
    if (!isValidDomain(newConfig.domain)) {
      toast.error('请输入有效的域名格式');
      return;
    }


    // 只保存配置名称，不保存完整配置数据
    const configToAdd = {
      id: generateId(),
      domain: newConfig.domain,
      requestKeyConfigName: newConfig.requestKeyConfigId, // 请求密钥配置名称
      responseKeyConfigName: useSameKeyForRequestAndResponse ? newConfig.requestKeyConfigId : newConfig.responseKeyConfigId, // 响应密钥配置名称
      enabled: newConfig.enabled,
      description: newConfig.description,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedConfigs = [...decryptionConfigs, configToAdd];
    saveDecryptionConfigs(updatedConfigs);

    // 重置表单
    setNewConfig({
      domain: '',
      requestKeyConfigId: '',
      responseKeyConfigId: '',
      enabled: true,
      description: ''
    });
    setUseSameKeyForRequestAndResponse(false);
    
    toast.success(`配置添加成功！已为域名 ${newConfig.domain} 申请并获得权限。`);
  };

  // 删除配置
  const handleDeleteConfig = (configId) => {
    const updatedConfigs = decryptionConfigs.filter(config => config.id !== configId);
    saveDecryptionConfigs(updatedConfigs);
  };

  // 切换配置启用状态
  const handleToggleConfig = (configId) => {
    const updatedConfigs = decryptionConfigs.map(config => 
      config.id === configId 
        ? { ...config, enabled: !config.enabled, updatedAt: Date.now() }
        : config
    );
    saveDecryptionConfigs(updatedConfigs);
  };

  // 请求域名权限
  const requestDomainPermission = async (domain) => {
    try {
      console.log(`[DevTools Config] 申请域名权限: ${domain}`);
      
      // 构造权限origin
      const origin = `https://${domain}/*`;
      
      // 检查是否已有权限
      const hasPermission = await chrome.permissions.contains({
        origins: [origin]
      });
      
      if (hasPermission) {
        console.log(`[DevTools Config] 已拥有域名权限: ${domain}`);
        return true;
      }
      
      // 请求新权限
      const granted = await chrome.permissions.request({
        origins: [origin]
      });
      
      if (granted) {
        console.log(`[DevTools Config] 成功获得域名权限: ${domain}`);
        return true;
      } else {
        console.log(`[DevTools Config] 用户拒绝了域名权限: ${domain}`);
        return false;
      }
      
    } catch (error) {
      console.error(`[DevTools Config] 申请域名权限失败: ${domain}`, error);
      toast.error(`权限申请失败: ${error.message}`);
      return false;
    }
  };

  // 验证域名格式
  const isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain.trim());
  };

  // 生成唯一ID
  const generateId = () => {
    return `decrypt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 获取密钥配置（通过名称查找）
  const getKeyConfigByName = (configName) => {
    return configs.find(c => c.name === configName) || null;
  };

  // 从密钥配置名称获取算法显示名称
  const getAlgorithmFromKeyConfig = (configName) => {
    console.log('[DevTools Config] 获取算法信息，configName:', configName);
    
    const config = getKeyConfigByName(configName);
    
    console.log('[DevTools Config] 找到的配置:', config);
    
    if (!config) return '未知配置';
    
    // 增强的算法识别逻辑
    const algorithmType = config.algorithmType || config.type || config.algorithm?.split('/')[0];
    console.log('[DevTools Config] 算法类型:', algorithmType);
    
    const algorithmMap = {
      'AES': 'AES-CBC (PKCS5)',
      'RSA': 'RSA-OAEP',
      'SM2': 'SM2',
      'SM4': 'SM4-CBC (PKCS5)'
    };
    
    // 处理完整的算法字符串
    if (config.algorithm && typeof config.algorithm === 'string') {
      const algorithmParts = config.algorithm.split('/');
      const mainAlgorithm = algorithmParts[0];
      const mode = algorithmParts[1] || '';
      const padding = algorithmParts[2] || '';
      
      console.log('[DevTools Config] 算法分解:', { mainAlgorithm, mode, padding });
      
      // 特殊处理各种算法组合
      if (mainAlgorithm === 'RSA') {
        return 'RSA-OAEP';
      } else if (mainAlgorithm === 'SM2') {
        return 'SM2';
      } else if (mainAlgorithm === 'AES' || mainAlgorithm === 'SM4') {
        const modeDisplay = mode ? mode.toUpperCase() : 'CBC';
        const paddingDisplay = padding ? padding.replace('Padding', '') : 'PKCS5';
        return `${mainAlgorithm}-${modeDisplay} (${paddingDisplay})`;
      }
    }
    
    // 使用映射表或默认显示
    return algorithmMap[algorithmType] || `${algorithmType || '未知'} (默认模式)`;
  };

  // 获取算法显示名称（保持向后兼容）
  const getAlgorithmDisplayName = (algorithm) => {
    const algorithmMap = {
      'AES/CBC/PKCS5Padding': 'AES-CBC (PKCS5)',
      'AES/ECB/PKCS5Padding': 'AES-ECB (PKCS5)',
      'RSA/None/OAEPPadding': 'RSA-OAEP',
      'SM2/None/None': 'SM2',
      'SM4/CBC/PKCS5Padding': 'SM4-CBC (PKCS5)',
      'SM4/ECB/PKCS5Padding': 'SM4-ECB (PKCS5)'
    };
    return algorithmMap[algorithm] || algorithm;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">加载配置中...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 添加新配置卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>添加解密配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">目标域名 *</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newConfig.domain}
                onChange={(e) => setNewConfig({...newConfig, domain: e.target.value})}
              />
              <p className="text-sm text-muted-foreground">
                支持完整域名，如 api.example.com
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>密钥配置模式</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="useSameKey"
                  checked={useSameKeyForRequestAndResponse}
                  onCheckedChange={(checked) => {
                    setUseSameKeyForRequestAndResponse(checked);
                    if (checked) {
                      setNewConfig({...newConfig, responseKeyConfigId: newConfig.requestKeyConfigId});
                    }
                  }}
                />
                <Label htmlFor="useSameKey">请求和响应使用相同密钥</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requestKeyConfig">请求密钥配置 *</Label>
              <div className="space-y-1">
                <Select 
                  value={newConfig.requestKeyConfigId?.toString() || 'no-selection'} 
                  onValueChange={(value) => {
                    console.log('[DevTools Config] 选择请求密钥配置:', value);
                    if (value && value !== 'no-selection' && value !== 'no-configs') {
                      const updateData = {...newConfig, requestKeyConfigId: value};
                      if (useSameKeyForRequestAndResponse) {
                        updateData.responseKeyConfigId = value;
                      }
                      setNewConfig(updateData);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择密钥配置" />
                  </SelectTrigger>
                  <SelectContent>
                    {configs && configs.length > 0 ? (
                      configs.map((config) => {
                        const configId = (config.id || config.name)?.toString();
                        const algorithmType = config.type || config.algorithmType || '';
                        const displayText = algorithmType 
                          ? `${config.name} (${algorithmType})`
                          : config.name;
                        
                        return (
                          <SelectItem key={configId} value={configId}>
                            {displayText}
                          </SelectItem>
                        );
                      }).filter(Boolean)
                    ) : (
                      <SelectItem value="no-configs" disabled>
                        暂无可用的密钥配置，请先在密钥配置管理中添加
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  当前选择：{newConfig.requestKeyConfigId || '未选择'}
                </p>
                {newConfig.requestKeyConfigId && (
                  <p className="text-xs text-blue-600">
                    识别算法：{getAlgorithmFromKeyConfig(newConfig.requestKeyConfigId)}
                  </p>
                )}
              </div>
            </div>

            {!useSameKeyForRequestAndResponse && (
              <div className="space-y-2">
                <Label htmlFor="responseKeyConfig">响应密钥配置 *</Label>
                <div className="space-y-1">
                  <Select 
                    value={newConfig.responseKeyConfigId?.toString() || 'no-selection'} 
                    onValueChange={(value) => {
                      console.log('[DevTools Config] 选择响应密钥配置:', value);
                      if (value && value !== 'no-selection' && value !== 'no-configs') {
                        setNewConfig({...newConfig, responseKeyConfigId: value});
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择密钥配置" />
                    </SelectTrigger>
                    <SelectContent>
                      {configs && configs.length > 0 ? (
                        configs.map((config) => {
                          const configId = (config.id || config.name)?.toString();
                          const algorithmType = config.type || config.algorithmType || '';
                          const displayText = algorithmType 
                            ? `${config.name} (${algorithmType})`
                            : config.name;
                          
                          return (
                            <SelectItem key={configId} value={configId}>
                              {displayText}
                            </SelectItem>
                          );
                        }).filter(Boolean)
                      ) : (
                        <SelectItem value="no-configs" disabled>
                          暂无可用的密钥配置
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    当前选择：{newConfig.responseKeyConfigId || '未选择'}
                  </p>
                  {newConfig.responseKeyConfigId && (
                    <p className="text-xs text-blue-600">
                      识别算法：{getAlgorithmFromKeyConfig(newConfig.responseKeyConfigId)}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="可选的配置说明"
                value={newConfig.description}
                onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={newConfig.enabled}
                onCheckedChange={(checked) => setNewConfig({...newConfig, enabled: checked})}
              />
              <Label htmlFor="enabled">启用配置</Label>
            </div>
            <Button onClick={handleAddConfig}>
              添加配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 配置列表卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>现有解密配置 ({decryptionConfigs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {decryptionConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无解密配置</p>
              <p className="text-sm mt-2">添加配置后即可在 DevTools 中监控和解密对应域名的网络请求</p>
            </div>
          ) : (
            <div className="space-y-4">
              {decryptionConfigs.map((config) => (
                <div key={config.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? '启用' : '禁用'}
                        </Badge>
                        <span className="font-medium">{config.domain}</span>
                        {config.description && (
                          <span className="text-sm text-muted-foreground">- {config.description}</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">请求算法:</span>{' '}
                          <span className="font-medium">
                            {getAlgorithmFromKeyConfig(config.requestKeyConfigName)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">响应算法:</span>{' '}
                          <span className="font-medium">
                            {getAlgorithmFromKeyConfig(config.responseKeyConfigName)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建时间:</span>{' '}
                          <span>{new Date(config.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        <span>请求密钥:{config.requestKeyConfigName}</span>
                        {config.requestKeyConfigName !== config.responseKeyConfigName && (
                          <span className="ml-2">| 响应密钥:{config.responseKeyConfigName}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={() => handleToggleConfig(config.id)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                  
                  {!config.enabled && (
                    <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                      ⚠️ 此配置已禁用，不会对网络请求进行监控和解密
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium mb-2">如何使用:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>在此页面添加需要监控的域名和对应的密钥配置</li>
              <li>可以分别为请求和响应配置不同的密钥</li>
              <li>打开目标网站并按 F12 打开开发者工具</li>
              <li>切换到 "PasteKit Decryptor" 面板</li>
              <li>点击 "连接后台" 开始监控网络请求</li>
              <li>系统会自动拦截并解密匹配域名的请求</li>
            </ol>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">注意事项:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>域名支持子域名匹配，如配置 example.com 会匹配 api.example.com</li>
              <li>可以分别为请求和响应配置不同的密钥配置</li>
              <li>如果请求和响应使用相同密钥，可以开启"请求和响应使用相同密钥"开关</li>
              <li>建议只对必要的域名启用监控以提高性能</li>
              <li>解密功能依赖于正确的密钥配置，请确保密钥信息准确</li>
              <li>某些网站的安全策略可能会阻止扩展的网络监控功能</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  );
}