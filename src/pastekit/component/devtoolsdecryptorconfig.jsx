import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AutoPagination } from '@/components/self/AutoPagination';
import { toast } from 'sonner';
import { StorageUtils } from '../utils/storageutils.js';

/**
 * DevTools 解密器配置组件 - 重构版
 * 支持标准列表展示、搜索、分页、弹窗 CRUD 操作
 */
export default function DevToolsDecryptorConfig({ configs = [], className = '' }) {
  // 列表数据状态
  const [decryptionConfigs, setDecryptionConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 搜索和分页状态
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // 默认每页 10 条
  
  // 弹窗状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    domain: '',
    requestKeyConfigId: '',
    responseKeyConfigId: '',
    enabled: true,
    decryptionEnabled: true,  // 新增：是否启用解密
    description: ''
  });
  const [useSameKeyForRequestAndResponse, setUseSameKeyForRequestAndResponse] = useState(false);

  // 组件挂载时加载配置
  useEffect(() => {
    loadDecryptionConfigs();
  }, []);

  // 重置页码当搜索变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 重置页码当每页数量变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

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
      toast.error(`加载失败：${error.message}`);
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
      toast.error(`保存失败：${error.message}`);
    }
  };

  // 过滤数据
  const filteredData = searchTerm.trim()
    ? decryptionConfigs.filter(item =>
        item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.requestKeyConfigName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.responseKeyConfigName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : decryptionConfigs;

  // 计算分页数据
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // 打开新建弹窗
  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      domain: '',
      requestKeyConfigId: '',
      responseKeyConfigId: '',
      enabled: true,
      decryptionEnabled: true,
      description: ''
    });
    setUseSameKeyForRequestAndResponse(false);
    setIsDialogOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      domain: config.domain,
      requestKeyConfigId: config.requestKeyConfigName,
      responseKeyConfigId: config.responseKeyConfigName,
      enabled: config.enabled,
      decryptionEnabled: config.decryptionEnabled !== false,  // 默认为 true
      description: config.description || ''
    });
    setUseSameKeyForRequestAndResponse(config.requestKeyConfigName === config.responseKeyConfigName);
    setIsDialogOpen(true);
  };

  // 保存数据
  const handleSave = async () => {
    // 验证必填字段
    if (!formData.domain) {
      toast.error('请输入目标域名');
      return;
    }
    
    // 仅在启用解密功能时验证密钥配置
    if (formData.decryptionEnabled !== false) {
      if (!formData.requestKeyConfigId) {
        toast.error('请选择请求密钥配置');
        return;
      }

      if (!useSameKeyForRequestAndResponse && !formData.responseKeyConfigId) {
        toast.error('请选择响应密钥配置，或启用"请求和响应使用相同密钥"选项');
        return;
      }
    }

    // 验证域名格式
    if (!isValidDomain(formData.domain)) {
      toast.error('请输入有效的域名格式');
      return;
    }

    try {
      if (editingConfig) {
        // 编辑模式
        const updatedConfigs = decryptionConfigs.map(config => 
          config.id === editingConfig.id 
            ? {
                ...config,
                domain: formData.domain,
                requestKeyConfigName: formData.requestKeyConfigId,
                responseKeyConfigName: useSameKeyForRequestAndResponse ? formData.requestKeyConfigId : formData.responseKeyConfigId,
                enabled: formData.enabled,
                decryptionEnabled: formData.decryptionEnabled,
                description: formData.description,
                updatedAt: Date.now()
              }
            : config
        );
        await saveDecryptionConfigs(updatedConfigs);
        toast.success('修改成功');
      } else {
        // 新建模式
        const configToAdd = {
          id: generateId(),
          domain: formData.domain,
          requestKeyConfigName: formData.requestKeyConfigId,
          responseKeyConfigName: useSameKeyForRequestAndResponse ? formData.requestKeyConfigId : formData.responseKeyConfigId,
          enabled: formData.enabled,
          decryptionEnabled: formData.decryptionEnabled,
          description: formData.description,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const updatedConfigs = [...decryptionConfigs, configToAdd];
        await saveDecryptionConfigs(updatedConfigs);
        toast.success('创建成功');
      }
      
      setIsDialogOpen(false);
      setEditingConfig(null);
      setFormData({
        domain: '',
        requestKeyConfigId: '',
        responseKeyConfigId: '',
        enabled: true,
        decryptionEnabled: true,
        description: ''
      });
      setUseSameKeyForRequestAndResponse(false);
    } catch (error) {
      toast.error(editingConfig ? '修改失败' : '创建失败');
      console.error(error);
    }
  };

  // 删除数据
  const handleDelete = async (config) => {
    // 显示确认弹窗
    if (!window.confirm(`确定要删除此解密配置吗？\n\n域名：${config.domain}\n描述：${config.description || '无'}`)) {
      return;
    }
    
    try {
      const updatedConfigs = decryptionConfigs.filter(c => c.id !== config.id);
      await saveDecryptionConfigs(updatedConfigs);
      toast.success('删除成功');
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (config) => {
    try {
      const updatedConfigs = decryptionConfigs.map(c => 
        c.id === config.id 
          ? { ...c, enabled: !c.enabled, updatedAt: Date.now() }
          : c
      );
      await saveDecryptionConfigs(updatedConfigs);
    } catch (error) {
      toast.error('操作失败');
      console.error(error);
    }
  };

  // 更新表单数据
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 生成唯一 ID
  const generateId = () => {
    return `decrypt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 验证域名格式
  const isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain.trim());
  };

  // 获取密钥配置（通过名称查找）
  const getKeyConfigByName = (configName) => {
    return configs.find(c => c.name === configName) || null;
  };

  // 从密钥配置名称获取算法显示名称
  const getAlgorithmFromKeyConfig = (configName) => {
    const config = getKeyConfigByName(configName);
    
    if (!config) return '未知配置';
    
    // 增强的算法识别逻辑
    const algorithmType = config.algorithmType || config.type || config.algorithm?.split('/')[0];
    
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

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">加载配置中...</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden ${className}`}>
      {/* 顶部操作栏 */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">DevTools 解密器配置</CardTitle>
            <Button onClick={handleCreate} size="sm">
              ➕ 新增配置
            </Button>
          </div>
          
          {/* 搜索区域 */}
          <div className="mt-4 relative">
            <Input
              type="text"
              placeholder="搜索域名、描述或密钥配置..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 列表内容 */}
      <Card className="flex-1 mt-4 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-auto p-0">
          <div className="min-w-full max-h-[calc(100vh-400px)] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">域名</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">请求算法</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">响应算法</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">描述</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm border-b">状态</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm border-b">操作</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((config, index) => {
                    const actualIndex = startIndex + index;
                    return (
                      <tr 
                        key={config.id}
                        className={`border-b cursor-pointer transition-colors duration-200 ease-out ${
                          actualIndex % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">{config.domain}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium">
                            {getAlgorithmFromKeyConfig(config.requestKeyConfigName)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">
                            {getAlgorithmFromKeyConfig(config.responseKeyConfigName)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {config.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant={config.enabled ? "default" : "secondary"}>
                              {config.enabled ? '启用' : '禁用'}
                            </Badge>
                            {config.enabled && config.decryptionEnabled !== false && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                🔓 解密
                              </Badge>
                            )}
                            {config.enabled && config.decryptionEnabled === false && (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                👁️ 监听
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(config);
                              }}
                              title="编辑"
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(config);
                              }}
                              title="删除"
                            >
                              🗑️
                            </Button>
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={() => handleToggleEnabled(config)}
                              onClick={(e) => e.stopPropagation()}
                              className="ml-1"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? '未找到匹配的配置' : '暂无解密配置'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 底部分页 */}
      {filteredData.length > 0 && (
        <Card className="mt-4 flex-shrink-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  共 {filteredData.length} 个配置 (第 {currentPage}/{totalPages || 1} 页)
                </div>
                {/* 每页数量选择器 */}
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="每页数量" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 条/页</SelectItem>
                    <SelectItem value="10">10 条/页</SelectItem>
                    <SelectItem value="20">20 条/页</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AutoPagination
                totalPage={totalPages || 1}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 编辑/新建弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? '编辑解密配置' : '新建解密配置'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* 域名输入 */}
            <div className="space-y-2">
              <Label htmlFor="domain">目标域名 *</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={formData.domain}
                onChange={(e) => handleFormChange('domain', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                支持完整域名，如 api.example.com
              </p>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => handleFormChange('enabled', checked)}
              />
              <Label htmlFor="enabled">启用配置</Label>
            </div>

            {/* 解密开关 */}
            <div className="flex items-center space-x-2 pt-2 border-b">
              <Switch
                id="decryptionEnabled"
                checked={formData.decryptionEnabled}
                onCheckedChange={(checked) => handleFormChange('decryptionEnabled', checked)}
              />
              <Label htmlFor="decryptionEnabled">启用解密功能</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              关闭后仅监听请求，不进行加解密操作
            </p>

            {/* 密钥配置模式开关 */}
            <div className="space-y-2">
              <Label>密钥配置模式</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="useSameKey"
                  checked={useSameKeyForRequestAndResponse}
                  onCheckedChange={(checked) => {
                    setUseSameKeyForRequestAndResponse(checked);
                    if (checked) {
                      setFormData({...formData, responseKeyConfigId: formData.requestKeyConfigId});
                    }
                  }}
                />
                <Label htmlFor="useSameKey">请求和响应使用相同密钥</Label>
              </div>
            </div>

            {/* 仅在启用解密功能时显示密钥配置 */}
            {formData.decryptionEnabled !== false && (
              <>
                {/* 请求密钥配置 */}
                <div className="space-y-2">
                  <Label htmlFor="requestKeyConfig">请求密钥配置 *</Label>
                  <div className="space-y-1">
                    <Select 
                      value={formData.requestKeyConfigId?.toString() || 'no-selection'} 
                      onValueChange={(value) => {
                        if (value && value !== 'no-selection' && value !== 'no-configs') {
                          const updateData = {...formData, requestKeyConfigId: value};
                          if (useSameKeyForRequestAndResponse) {
                            updateData.responseKeyConfigId = value;
                          }
                          setFormData(updateData);
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
                    {formData.requestKeyConfigId && (
                      <p className="text-xs text-blue-600">
                        识别算法：{getAlgorithmFromKeyConfig(formData.requestKeyConfigId)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 响应密钥配置 */}
                {!useSameKeyForRequestAndResponse && (
                  <div className="space-y-2">
                    <Label htmlFor="responseKeyConfig">响应密钥配置 *</Label>
                    <div className="space-y-1">
                      <Select 
                        value={formData.responseKeyConfigId?.toString() || 'no-selection'} 
                        onValueChange={(value) => {
                          if (value && value !== 'no-selection' && value !== 'no-configs') {
                            setFormData({...formData, responseKeyConfigId: value});
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
                      {formData.responseKeyConfigId && (
                        <p className="text-xs text-blue-600">
                          识别算法：{getAlgorithmFromKeyConfig(formData.responseKeyConfigId)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 未启用解密功能时的提示 */}
            {formData.decryptionEnabled === false && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">监听模式</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      当前已关闭解密功能，系统将仅监听网络请求，不会进行加解密操作。
                      <br/>如需配置密钥，请先启用上方的"启用解密功能"开关。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 描述输入 */}
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="可选的配置说明"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingConfig ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
