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
import { MockStorageManager, MockDataManager, HTTP_METHODS } from '../utils/mockutils.js';
import { StorageUtils } from '../utils/storageutils.js';

export default function Mockmanager({ t }) {
  const [mockRules, setMockRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [statistics, setStatistics] = useState({ totalRules: 0, enabledRules: 0, dataEntries: 0 });
  
  // 表单状态 - 简化为只包含必要字段
  const [formData, setFormData] = useState({
    name: '',
    urlPattern: '',
    method: 'GET',
    mockResponse: '',
    contentType: 'application/json',
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
      toast.error(t('mockmanager.messages.load_failed'));
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
    
    console.log('[MockManager] 提交表单数据:', formData);
    
    // 验证必填字段
    if (!formData.urlPattern.trim() || !formData.mockResponse.trim()) {
      toast.error(t('mockmanager.messages.required_fields'));
      return;
    }

    try {
      let success;
      let rule;
      
      if (editingRule) {
        // 更新现有规则
        console.log('[MockManager] 更新规则:', editingRule.id);
        success = await MockStorageManager.updateMockRule(editingRule.id, {
          name: formData.name,
          urlPattern: formData.urlPattern,
          method: formData.method,
          mockResponse: formData.mockResponse,
          contentType: formData.contentType,
          enabled: formData.enabled
        });
        rule = { ...editingRule, ...formData };
      } else {
        // 创建新规则
        console.log('[MockManager] 创建新规则');
        rule = await MockStorageManager.addMockRule({
          name: formData.name,
          urlPattern: formData.urlPattern,
          method: formData.method,
          mockResponse: formData.mockResponse,
          contentType: formData.contentType,
          enabled: formData.enabled
        });
        success = !!rule;
      }
      
      console.log('[MockManager] 操作结果:', { success, rule });

      if (success) {
        toast.success(editingRule 
          ? t('mockmanager.messages.updated_successfully') 
          : t('mockmanager.messages.created_successfully')
        );
        
        setIsDialogOpen(false);
        resetForm();
        loadMockRules();
        loadStatistics();
      } else {
        toast.error(t('mockmanager.messages.operation_failed'));
      }
    } catch (error) {
      console.error('保存 Mock 规则失败:', error);
      toast.error(t('mockmanager.messages.save_failed'));
    }
  };

  const handleEdit = async (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      urlPattern: rule.urlPattern,
      method: rule.method,
      mockResponse: rule.mockResponse || '',
      contentType: rule.contentType || 'application/json',
      enabled: rule.enabled
    });
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (ruleId) => {
    if (!confirm(t('mockmanager.messages.confirm_delete'))) {
      return;
    }

    try {
      const success = await MockStorageManager.deleteMockRule(ruleId);
      if (success) {
        toast.success(t('mockmanager.messages.deleted_successfully'));
        loadMockRules();
        loadStatistics();
      } else {
        toast.error(t('mockmanager.messages.delete_failed'));
      }
    } catch (error) {
      console.error('删除 Mock 规则失败:', error);
      toast.error(t('mockmanager.messages.delete_failed'));
    }
  };

  const handleToggleEnabled = async (ruleId, enabled) => {
    try {
      const success = await MockStorageManager.updateMockRule(ruleId, { enabled });
      if (success) {
        toast.success(enabled 
          ? t('mockmanager.messages.enabled_successfully')
          : t('mockmanager.messages.disabled_successfully')
        );
        loadMockRules();
        loadStatistics();
      }
    } catch (error) {
      console.error('切换规则状态失败:', error);
      toast.error(t('mockmanager.messages.toggle_failed'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      urlPattern: '',
      method: 'GET',
      mockResponse: '',
      contentType: 'application/json',
      enabled: true
    });
    setEditingRule(null);
  };

  const handleDialogOpenChange = (open) => {
    console.log('[MockManager] Dialog 状态变化:', open);
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatMockDataPreview = (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return data;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">{t('mockmanager.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* 标题和统计信息 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🎭 {t('mockmanager.title')}</h1>
        <div className="flex gap-4 text-sm">
          <Badge variant="secondary">
            {t('mockmanager.total_rules')}: {statistics.totalRules}
          </Badge>
          <Badge variant="default">
            {t('mockmanager.enabled_rules')}: {statistics.enabledRules}
          </Badge>
          <Badge variant="outline">
            {t('mockmanager.data_entries')}: {statistics.dataEntries}
          </Badge>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              console.log('[MockManager] 点击添加规则按钮，当前 isDialogOpen:', isDialogOpen);
              setIsDialogOpen(true);
            }}>
              ➕ {t('mockmanager.add_rule')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? t('mockmanager.edit_rule') : t('mockmanager.add_rule')}
              </DialogTitle>
              <div className="sr-only">
                {editingRule ? '编辑 Mock 规则' : '添加新的 Mock 规则'}
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <form id="mock-rule-form" onSubmit={handleSubmit} className="space-y-4">
                {/* 规则名称 */}
                <div>
                  <Label htmlFor="name">{t('mockmanager.rule_name')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('mockmanager.rule_name_placeholder')}
                    required
                  />
                </div>

                {/* URL 模式 */}
                <div>
                  <Label htmlFor="urlPattern">{t('mockmanager.url_pattern')} *</Label>
                  <Input
                    id="urlPattern"
                    value={formData.urlPattern}
                    onChange={(e) => handleInputChange('urlPattern', e.target.value)}
                    placeholder={t('mockmanager.url_pattern_placeholder')}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('mockmanager.url_pattern_help')}
                  </p>
                </div>

                {/* HTTP 方法 */}
                <div>
                  <Label htmlFor="method">{t('mockmanager.http_method')}</Label>
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

                {/* Mock 响应数据 */}
                <div>
                  <Label>{t('mockmanager.mock_data')} *</Label>
                  <Textarea
                    value={formData.mockResponse}
                    onChange={(e) => handleInputChange('mockResponse', e.target.value)}
                    placeholder={t('mockmanager.mock_data_placeholder')}
                    rows={12}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('mockmanager.mock_data_help')}
                  </p>
                </div>

                {/* Content Type */}
                <div>
                  <Label>{t('mockmanager.content_type')}</Label>
                  <Select value={formData.contentType} onValueChange={(value) => handleInputChange('contentType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application/json">JSON</SelectItem>
                      <SelectItem value="text/html">HTML</SelectItem>
                      <SelectItem value="text/plain">Plain Text</SelectItem>
                      <SelectItem value="text/xml">XML</SelectItem>
                      <SelectItem value="application/xml">Application XML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 启用状态 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      checked={formData.enabled}
                      onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                    />
                    <Label htmlFor="enabled">{t('mockmanager.enabled')}</Label>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" form="mock-rule-form">
                {editingRule ? t('save') : t('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 规则列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('mockmanager.rule_list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {mockRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('mockmanager.no_rules')}</p>
              <p className="text-sm mt-1">{t('mockmanager.add_first_rule')}</p>
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
                          {rule.enabled ? t('mockmanager.enabled') : t('mockmanager.disabled')}
                        </Badge>
                        <Badge variant="outline">{rule.method}</Badge>
                        <Badge variant="outline">
                          {rule.actionType === 'redirect' ? t('mockmanager.messages.action_redirect') : 
                           rule.actionType === 'block' ? t('mockmanager.messages.action_block') : t('mockmanager.messages.action_allow')}
                        </Badge>
                        <Badge variant="outline">{t('mockmanager.priority')}: {rule.priority || 1}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">{t('mockmanager.url_pattern')}:</span> {rule.urlPattern}
                      </p>
                      
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>{t('mockmanager.created_at')}: {formatDate(rule.createdAt)}</span>
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
    </div>
  );
}
