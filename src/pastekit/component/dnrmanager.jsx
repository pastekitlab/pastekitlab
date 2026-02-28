import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { MockStorageManager, MockDataManager, DNRManager, HTTP_METHODS, CONTENT_TYPES } from '../utils/mockutils.js';
import { StorageUtils } from '../utils/storageutils.js';

export default function Dnrmanager({ t }) {
  const [mockRules, setMockRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [mockData, setMockData] = useState('');
  const [statistics, setStatistics] = useState({ totalRules: 0, enabledRules: 0, dataEntries: 0 });
  
  // 权限申请相关状态
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [currentRuleId, setCurrentRuleId] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    urlPattern: '',
    method: 'GET',
    actionType: 'redirect', // redirect, block, allow
    redirectUrl: '',
    resourceTypes: ['xmlhttprequest'], // 默认拦截 AJAX 和 Fetch 请求
    excludedInitiatorDomains: [],
    excludedRequestDomains: [],
    priority: 1,
    enabled: true
  });

  useEffect(() => {
    loadMockRules();
    loadStatistics();
  }, []);

  const loadMockRules = async () => {
    setIsLoading(true);
    try {
      const rules = await MockStorageManager.loadMockRules();
      setMockRules(rules);
    } catch (error) {
      console.error('加载 Mock 规则失败:', error);
      toast.error(t('components.mockmanager.messages.load_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await MockDataManager.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('[Dnrmanager] 提交表单数据:', formData);
    
    // 验证 URL 模式
    if (!formData.urlPattern.trim()) {
      toast.error(t('components.mockmanager.messages.required_fields'));
      return;
    }
    
    // 测试 URL 模式有效性
    try {
      const testPattern = formData.urlPattern.includes('*') 
        ? formData.urlPattern.replace(/\*/g, 'test')
        : formData.urlPattern;
      new URL(testPattern);
    } catch (error) {
      toast.error(t('components.mockmanager.messages.invalid_url_pattern'));
      return;
    }

    try {
      let success;
      let rule;
      
      if (editingRule) {
        // 更新现有规则
        console.log('[Dnrmanager] 更新规则:', editingRule.id);
        success = await MockStorageManager.updateMockRule(editingRule.id, formData);
        rule = { ...editingRule, ...formData };
      } else {
        // 创建新规则
        console.log('[Dnrmanager] 创建新规则');
        rule = await MockStorageManager.addMockRule(formData);
        success = !!rule;
      }
      
      console.log('[Dnrmanager] 操作结果:', { success, rule });

      if (success) {
        // 检查是否需要申请权限
        const origin = extractOriginFromPattern(formData.urlPattern);
        
        if (origin) {
          const hasPermission = await checkHostPermission(origin);
          if (!hasPermission) {
            // 显示权限申请弹窗
            setCurrentOrigin(origin);
            setCurrentRuleId(rule.id);
            setShowPermissionDialog(true);
            
            // 关闭主对话框
            setIsDialogOpen(false);
            console.log('[Dnrmanager] 显示权限申请弹窗');
            return; // 提前返回，不执行后续操作
          } else {
            // 已有权限，直接注册 DNR 规则
            console.log('[Dnrmanager] 已有权限，直接注册 DNR 规则');
            const updatedRules = await MockStorageManager.loadMockRules();
            await DNRManager.registerDNRRules(updatedRules);
          }
        } else {
          // 无法解析 origin，直接注册 DNR 规则
          console.log('[Dnrmanager] 无法解析 origin，直接注册 DNR 规则');
          const updatedRules = await MockStorageManager.loadMockRules();
          await DNRManager.registerDNRRules(updatedRules);
        }
        
        // 成功保存后的提示
        toast.success(editingRule 
          ? t('components.mockmanager.messages.updated_successfully') 
          : t('components.mockmanager.messages.created_successfully')
        );
        
        setIsDialogOpen(false);
        resetForm();
        loadMockRules();
        loadStatistics();
      } else {
        toast.error(t('components.mockmanager.messages.operation_failed'));
      }
    } catch (error) {
      console.error('保存 Mock 规则失败:', error);
      toast.error(t('components.mockmanager.messages.save_failed'));
    }
  };

  const handleEdit = async (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      urlPattern: rule.urlPattern,
      method: rule.method,
      actionType: rule.actionType || 'redirect',
      redirectUrl: rule.redirectUrl || '',
      resourceTypes: rule.resourceTypes || ['xmlhttprequest'],
      excludedInitiatorDomains: rule.excludedInitiatorDomains || [],
      excludedRequestDomains: rule.excludedRequestDomains || [],
      priority: rule.priority || 1,
      enabled: rule.enabled
    });
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (ruleId) => {
    if (!confirm(t('components.mockmanager.messages.confirm_delete'))) {
      return;
    }

    try {
      const success = await MockStorageManager.deleteMockRule(ruleId);
      if (success) {
        // 重新注册 DNR 规则
        const updatedRules = await MockStorageManager.loadMockRules();
        await DNRManager.registerDNRRules(updatedRules);
        
        toast.success(t('components.mockmanager.messages.deleted_successfully'));
        loadMockRules();
        loadStatistics();
      } else {
        toast.error(t('components.mockmanager.messages.delete_failed'));
      }
    } catch (error) {
      console.error('删除 Mock 规则失败:', error);
      toast.error(t('components.mockmanager.messages.delete_failed'));
    }
  };

  const handleToggleEnabled = async (ruleId, enabled) => {
    try {
      const success = await MockStorageManager.updateMockRule(ruleId, { enabled });
      if (success) {
        // 重新注册 DNR 规则
        const updatedRules = await MockStorageManager.loadMockRules();
        await DNRManager.registerDNRRules(updatedRules);
        
        toast.success(enabled 
          ? t('components.mockmanager.messages.enabled_successfully')
          : t('components.mockmanager.messages.disabled_successfully')
        );
        loadMockRules();
        loadStatistics();
      }
    } catch (error) {
      console.error('切换规则状态失败:', error);
      toast.error(t('components.mockmanager.messages.toggle_failed'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      urlPattern: '',
      method: 'GET',
      actionType: 'redirect',
      redirectUrl: '',
      resourceTypes: ['xmlhttprequest'],
      excludedInitiatorDomains: [],
      excludedRequestDomains: [],
      priority: 1,
      enabled: true
    });
    setMockData('');
    setEditingRule(null);
  };

  const handleDialogOpenChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // 权限检查函数
  const checkHostPermission = async (origin) => {
    try {
      // 发送消息到 background script 检查权限
      const response = await chrome.runtime.sendMessage({
        action: 'checkPermission',
        origin: origin
      });
      return response.hasPermission;
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  };

  // 手动申请权限函数
  const handleRequestPermission = async () => {
    if (!currentOrigin) return;
    
    try {
      console.log('[Dnrmanager] 用户手动申请权限:', currentOrigin);
      
      // 直接在用户手势上下文中申请权限
      const granted = await chrome.permissions.request({
        origins: [currentOrigin]
      });
      
      // 关闭权限申请弹窗
      setShowPermissionDialog(false);
      
      if (granted) {
        toast.success(`成功获得 ${currentOrigin} 的访问权限`);
        setCurrentOrigin('');
        setCurrentRuleId('');
        
        // 重新注册 DNR 规则
        const updatedRules = await MockStorageManager.loadMockRules();
        await DNRManager.registerDNRRules(updatedRules);
      } else {
        toast.error(`申请 ${currentOrigin} 权限被拒绝`);
      }
    } catch (error) {
      console.error('申请权限失败:', error);
      toast.error('申请权限时发生错误: ' + error.message);
      setShowPermissionDialog(false);
    }
  };
  
  // 拒绝权限申请
  const handleRejectPermission = () => {
    console.log('[Dnrmanager] 用户拒绝权限申请');
    setShowPermissionDialog(false);
    setCurrentOrigin('');
    setCurrentRuleId('');
    toast.info('已取消权限申请');
  };

  // 从 URL 模式提取主机名
  const extractOriginFromPattern = (urlPattern) => {
    try {
      // 处理通配符模式
      let cleanPattern = urlPattern
        .replace(/\*\*/g, '*')
        .replace(/^\*\./, '')  // 移除前导 *.
        .replace(/\*$/, '');   // 移除尾随 *
      
      // 如果没有协议，添加 https://
      if (!cleanPattern.match(/^https?:\/\//)) {
        cleanPattern = 'https://' + cleanPattern;
      }
      
      const url = new URL(cleanPattern);
      return `${url.protocol}//${url.hostname}/*`;
    } catch (error) {
      console.error(`解析 URL 模式失败: ${urlPattern}`, error);
      return null;
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">{t('components.mockmanager.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* 标题和统计信息 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🎭 {t('components.mockmanager.title')}</h1>
        <div className="flex gap-4 text-sm">
          <Badge variant="secondary">
            {t('components.mockmanager.total_rules')}: {statistics.totalRules}
          </Badge>
          <Badge variant="default">
            {t('components.mockmanager.enabled_rules')}: {statistics.enabledRules}
          </Badge>
          <Badge variant="outline">
            {t('components.mockmanager.data_entries')}: {statistics.dataEntries}
          </Badge>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              ➕ {t('components.mockmanager.add_rule')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? t('components.mockmanager.edit_rule') : t('components.mockmanager.add_rule')}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t('components.mockmanager.rule_name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('components.mockmanager.rule_name_placeholder')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="urlPattern">{t('components.mockmanager.url_pattern')} *</Label>
                <Input
                  id="urlPattern"
                  value={formData.urlPattern}
                  onChange={(e) => handleInputChange('urlPattern', e.target.value)}
                  placeholder={t('components.mockmanager.url_pattern_placeholder')}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('components.mockmanager.url_pattern_help')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="method">{t('components.mockmanager.http_method')}</Label>
                  <Select value={formData.method} onValueChange={(value) => handleInputChange('method', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="actionType">{t('components.mockmanager.action_type')}</Label>
                  <Select value={formData.actionType} onValueChange={(value) => handleInputChange('actionType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="redirect">{t('components.mockmanager.messages.action_redirect')}</SelectItem>
                      <SelectItem value="block">{t('components.mockmanager.messages.action_block')}</SelectItem>
                      <SelectItem value="allow">{t('components.mockmanager.messages.action_allow')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 资源类型选择 */}
              <div>
                <Label>{t('components.mockmanager.resource_types')} ({t('components.mockmanager.messages.resource_types_selected', { count: formData.resourceTypes.length })})</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { value: 'main_frame', label: t('components.mockmanager.resource_type_main_frame') },
                    { value: 'sub_frame', label: t('components.mockmanager.resource_type_sub_frame') },
                    { value: 'stylesheet', label: t('components.mockmanager.resource_type_stylesheet') },
                    { value: 'script', label: t('components.mockmanager.resource_type_script') },
                    { value: 'image', label: t('components.mockmanager.resource_type_image') },
                    { value: 'font', label: t('components.mockmanager.resource_type_font') },
                    { value: 'xmlhttprequest', label: t('components.mockmanager.resource_type_xmlhttprequest') },
                    { value: 'ping', label: t('components.mockmanager.resource_type_ping') },
                    { value: 'media', label: t('components.mockmanager.resource_type_media') },
                    { value: 'websocket', label: t('components.mockmanager.resource_type_websocket') },
                    { value: 'webtransport', label: t('components.mockmanager.resource_type_webtransport') },
                    { value: 'other', label: t('components.mockmanager.resource_type_other') }
                  ].map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`resource-${type.value}`}
                        checked={formData.resourceTypes.includes(type.value)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...formData.resourceTypes, type.value]
                            : formData.resourceTypes.filter(t => t !== type.value);
                          handleInputChange('resourceTypes', newTypes);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`resource-${type.value}`} className="text-sm">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 优先级设置 */}
              <div>
                <Label htmlFor="priority">{t('components.mockmanager.priority')}</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('components.mockmanager.priority_help')}
                </p>
              </div>

              {/* 重定向 URL (仅当动作为 redirect 时显示) */}
              {formData.actionType === 'redirect' && (
                <div>
                  <Label htmlFor="redirectUrl">{t('components.mockmanager.redirect_url')} *</Label>
                  <Input
                    id="redirectUrl"
                    value={formData.redirectUrl || ''}
                    onChange={(e) => handleInputChange('redirectUrl', e.target.value)}
                    placeholder={t('components.mockmanager.redirect_url_placeholder')}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('components.mockmanager.redirect_url_help')}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                  />
                  <Label htmlFor="enabled">{t('components.mockmanager.enabled')}</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingRule ? t('common.save') : t('common.create')}
                  </Button>
                </div>
              </div>
              

            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 规则列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('components.mockmanager.rule_list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {mockRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('components.mockmanager.no_rules')}</p>
              <p className="text-sm mt-1">{t('components.mockmanager.add_first_rule')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mockRules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? t('components.mockmanager.enabled') : t('components.mockmanager.disabled')}
                        </Badge>
                        <Badge variant="outline">{rule.method}</Badge>
                        <Badge variant="outline">
                          {rule.actionType === 'redirect' ? t('components.mockmanager.messages.action_redirect') : 
                           rule.actionType === 'block' ? t('components.mockmanager.messages.action_block') : t('components.mockmanager.messages.action_allow')}
                        </Badge>
                        <Badge variant="outline">{t('components.mockmanager.priority')}: {rule.priority || 1}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">{t('components.mockmanager.url_pattern')}:</span> {rule.urlPattern}
                      </p>
                      
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>{t('components.mockmanager.url_pattern')}: {rule.urlPattern}</span>
                        <span>{t('components.mockmanager.resource_types')}: {(rule.resourceTypes || ['xmlhttprequest']).join(', ')}</span>
                        {rule.actionType === 'redirect' && (
                          <span>{t('components.mockmanager.redirect_url')}: {rule.redirectUrl || '默认 Mock 服务器'}</span>
                        )}
                        <span>{t('components.mockmanager.created_at')}: {formatDate(rule.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(rule)}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(rule.id)}
                      >
                        🗑️
                      </Button>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                      />
                    </div>
                  </div>
                  

                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Toaster />
      
      {/* 权限申请弹窗 */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              需要申请权限
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              为了使 Mock 规则能够拦截和替换 <strong className="text-foreground">{currentOrigin}</strong> 的网络请求，需要您授权访问此域名。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">💡 说明：</span>
                此权限仅用于拦截指定域名的网络请求，不会访问您的个人数据。
                您可以随时在浏览器扩展管理页面撤销此权限。
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              点击"申请权限"按钮，Chrome 将会弹出权限请求对话框。
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleRejectPermission}
            >
              拒绝
            </Button>
            <Button 
              onClick={handleRequestPermission}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              🔐 申请权限
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}