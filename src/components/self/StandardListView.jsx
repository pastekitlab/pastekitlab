import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AutoPagination } from '@/components/self/AutoPagination';
import { toast } from 'sonner';

/**
 * 标准列表视图组件
 * 支持分页、搜索、新增、修改、删除功能
 * 
 * @param {Object} props
 * @param {string} props.title - 列表标题
 * @param {Array} props.data - 数据数组
 * @param {Function} props.onDataChange - 数据变化回调
 * @param {Function} props.onCreate - 创建新数据回调
 * @param {Function} props.onEdit - 编辑数据回调
 * @param {Function} props.onDelete - 删除数据回调
 * @param {React.ReactNode} props.columns - 列定义 (TableHeader)
 * @param {Function} props.renderRow - 行渲染函数 (item, index) => <tr>...</tr>
 * @param {Function} props.renderDialogForm - 弹窗表单渲染函数 (data, onChange) => JSX
 * @param {string} props.searchPlaceholder - 搜索框占位符
 * @param {Function} props.filterFunction - 自定义过滤函数 (item, searchTerm) => boolean
 * @param {string} props.storageKey - 存储键名
 * @param {number} props.itemsPerPage - 每页显示数量，默认 10
 */
export default function StandardListView({
  title = '列表管理',
  data = [],
  onDataChange,
  onCreate,
  onEdit,
  onDelete,
  columns,
  renderRow,
  renderDialogForm,
  searchPlaceholder = '搜索...',
  filterFunction,
  storageKey = 'standard_list_data',
  itemsPerPage = 10
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // 计算分页数据
  const filteredData = searchTerm.trim()
    ? (filterFunction
        ? data.filter(item => filterFunction(item, searchTerm))
        : data.filter(item =>
            JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : data;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // 重置页码当搜索变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 打开新建弹窗
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsDialogOpen(true);
  };

  // 保存数据
  const handleSave = async () => {
    try {
      if (editingItem) {
        // 编辑模式
        await onEdit?.(formData);
        toast.success('修改成功');
      } else {
        // 新建模式
        await onCreate?.(formData);
        toast.success('创建成功');
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({});
    } catch (error) {
      toast.error(editingItem ? '修改失败' : '创建失败');
      console.error(error);
    }
  };

  // 删除数据
  const handleDelete = async (item) => {
    try {
      await onDelete?.(item);
      toast.success('删除成功');
    } catch (error) {
      toast.error('删除失败');
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

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 顶部操作栏 */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <Button onClick={handleCreate} size="sm">
              ➕ 新增
            </Button>
          </div>
          
          {/* 搜索区域 */}
          <div className="mt-4 relative">
            <Input
              type="text"
              placeholder={searchPlaceholder}
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
          <div className="min-w-full">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                {columns}
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((item, index) => {
                    const actualIndex = startIndex + index;
                    return renderRow(item, actualIndex, handleEdit, handleDelete);
                  })
                ) : (
                  <tr>
                    <td colSpan={React.Children.count(columns?.props?.children) || 5} className="text-center py-8 text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 底部分页 */}
      {totalPages > 1 && (
        <Card className="mt-4 flex-shrink-0">
          <CardContent className="py-4">
            <AutoPagination
              totalPage={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      )}

      {/* 编辑/新建弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '编辑' : '新建'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderDialogForm(formData, handleFormChange)}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
