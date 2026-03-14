import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AutoPagination } from '@/components/self/AutoPagination';
import { MockStorageManager, MockDataManager, HTTP_METHODS } from '../utils/mockutils.js';
import { StorageUtils } from '../utils/storageutils.js';

export default function Mockmanager({ t }) {
  const [mockRules, setMockRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [statistics, setStatistics] = useState({ totalRules: 0, enabledRules: 0, dataEntries: 0 });
  
  // 搜索和分页状态
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // 默认每页 10 条
  
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

  // 重置页码当搜索变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 重置页码当每页数量变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

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

  // 批量删除
  const handleBatchDelete = async () => {
    const confirmed = confirm(t('mockmanager.messages.batch_delete_confirm'));
    if (!confirmed) return;
    
    try {
      let deletedCount = 0;
      for (const rule of currentData) {
        const success = await MockStorageManager.deleteMockRule(rule.id);
        if (success) deletedCount++;
      }
      
      toast.success(t('mockmanager.messages.batch_delete_success', { count: deletedCount }));
      loadMockRules();
      loadStatistics();
    } catch (error) {
      console.error('批量删除失败:', error);
      toast.error(t('mockmanager.messages.batch_delete_failed'));
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

  // 生成唯一 ID
  const generateId = () => {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  // 过滤数据
  const filteredData = searchTerm.trim()
    ? mockRules.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.urlPattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.method.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mockRules;

  // 计算分页数据
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

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
    <div className="space-y-4 w-full">
      {/* 顶部操作栏 */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">🎭 {t('mockmanager.title')}</h1>
              <Badge variant="secondary">
                {filteredData.length} {t('items')}
              </Badge>
            </div>

            {/* 搜索区域 */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t('mockmanager.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8 w-[300px]"
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
              <Button onClick={() => setIsDialogOpen(true)} size="sm">
                ➕ {t('mockmanager.add_rule')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 列表内容 */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-auto p-0">
          <div className="min-w-full max-h-[calc(100vh-350px)] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.rule_name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.url_pattern')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.http_method')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.content_type')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.status')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.created_at')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm border-b">{t('mockmanager.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((rule, index) => {
                    const actualIndex = startIndex + index;
                    return (
                      <tr 
                        key={rule.id}
                        className={`border-b cursor-pointer transition-colors duration-200 ease-out ${
                          actualIndex % 2 === 0 ? 'bg-background hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">{rule.name}</td>
                        <td className="py-3 px-4 text-sm break-all max-w-md">{rule.urlPattern}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{rule.method}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{rule.contentType}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? t('mockmanager.enabled') : t('mockmanager.disabled')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                          {formatDate(rule.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(rule);
                              }}
                              title={t('mockmanager.edit')}
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rule.id);
                              }}
                              title={t('mockmanager.delete')}
                            >
                              🗑️
                            </Button>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={() => handleToggleEnabled(rule.id, !rule.enabled)}
                              onClick={(e) => e.stopPropagation()}
                              className="ml-1"
                              title={t('mockmanager.toggle_enabled')}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? t('mockmanager.messages.no_results') : t('mockmanager.no_rules')}
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
        <Card className="flex-shrink-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {t('mockmanager.total_rules', { count: filteredData.length })} ({t('mockmanager.page_info', { current: currentPage, total: totalPages || 1 })})
                </div>
                {/* 每页数量选择器 */}
                <Select
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('mockmanager.items_per_page')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t('page')} 5 {t('items')}</SelectItem>
                    <SelectItem value="10">{t('page')} 10 {t('items')}</SelectItem>
                    <SelectItem value="20">{t('page')} 20 {t('items')}</SelectItem>
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
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
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

      <Toaster />
    </div>
  );
}
