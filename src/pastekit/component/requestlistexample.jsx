import React, { useState, useEffect } from 'react';
import StandardListView from '@/components/self/StandardListView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from '../utils/i18n';
import { StorageUtils } from '../utils/storageutils.js';

/**
 * 请求列表示例 - 使用标准列表视图
 * 支持分页、搜索、新增、修改、删除
 */
export default function RequestListExample() {
  const [t] = useTranslation();
  const [requests, setRequests] = useState([]);
  const storageKey = 'request_list_data';

  // 加载数据
  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const result = await StorageUtils.getItem(storageKey);
      if (result[storageKey] && Array.isArray(result[storageKey])) {
        setRequests(result[storageKey]);
      } else {
        // 初始化一些示例数据
        const initialData = [
          {
            id: 1,
            name: '测试请求 1',
            url: 'https://api.example.com/test1',
            method: 'GET',
            statusCode: 200,
            createdAt: Date.now()
          },
          {
            id: 2,
            name: '测试请求 2',
            url: 'https://api.example.com/test2',
            method: 'POST',
            statusCode: 201,
            createdAt: Date.now()
          }
        ];
        setRequests(initialData);
        await StorageUtils.setItem(storageKey, initialData);
      }
    } catch (error) {
      console.error('加载请求列表失败:', error);
      toast.error('加载失败');
    }
  };

  // 保存数据
  const saveRequests = async (newRequests) => {
    try {
      await StorageUtils.setItem(storageKey, newRequests);
      setRequests(newRequests);
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  };

  // 创建新请求
  const handleCreate = async (formData) => {
    const newItem = {
      ...formData,
      id: Date.now(),
      createdAt: Date.now()
    };
    const newRequests = [...requests, newItem];
    await saveRequests(newRequests);
  };

  // 编辑请求
  const handleEdit = async (formData) => {
    const newRequests = requests.map(req =>
      req.id === formData.id ? { ...req, ...formData } : req
    );
    await saveRequests(newRequests);
  };

  // 删除请求
  const handleDelete = async (item) => {
    const newRequests = requests.filter(req => req.id !== item.id);
    await saveRequests(newRequests);
  };

  // 自定义过滤函数
  const filterFunction = (item, searchTerm) => {
    const term = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.url?.toLowerCase().includes(term) ||
      item.method?.toLowerCase().includes(term)
    );
  };

  // 定义列
  const columns = (
    <tr className="text-left text-sm font-medium text-gray-700">
      <th className="py-3 px-4">序号</th>
      <th className="py-3 px-4">名称</th>
      <th className="py-3 px-4">URL</th>
      <th className="py-3 px-4">方法</th>
      <th className="py-3 px-4">状态码</th>
      <th className="py-3 px-4 text-right">操作</th>
    </tr>
  );

  // 渲染行
  const renderRow = (item, index, onEdit, onDelete) => (
    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-sm">{index + 1}</td>
      <td className="py-3 px-4">
        <span className="font-medium text-sm">{item.name}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-gray-600 break-all whitespace-normal max-w-xs block">
          {item.url}
        </span>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className="text-xs">
          {item.method}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className={`text-sm font-mono ${
          item.statusCode >= 200 && item.statusCode < 300 
            ? 'text-green-600' 
            : 'text-red-600'
        }`}>
          {item.statusCode}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
          >
            ✏️ 编辑
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(item)}
          >
            🗑️ 删除
          </Button>
        </div>
      </td>
    </tr>
  );

  // 渲染弹窗表单
  const renderDialogForm = (formData, onChange) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">名称 *</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="请输入名称"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="method">请求方法 *</Label>
          <Select 
            value={formData.method || 'GET'} 
            onValueChange={(value) => onChange('method', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择方法" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">请求 URL *</Label>
        <Input
          id="url"
          value={formData.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="请输入 URL"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="statusCode">状态码</Label>
        <Input
          id="statusCode"
          type="number"
          value={formData.statusCode || ''}
          onChange={(e) => onChange('statusCode', parseInt(e.target.value) || '')}
          placeholder="例如：200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="请输入描述信息"
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full h-full p-6 overflow-hidden">
      <StandardListView
        title="请求列表管理"
        data={requests}
        onDataChange={setRequests}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        columns={columns}
        renderRow={renderRow}
        renderDialogForm={renderDialogForm}
        searchPlaceholder="搜索名称、URL 或方法..."
        filterFunction={filterFunction}
        storageKey={storageKey}
        itemsPerPage={10}
      />
    </div>
  );
}
