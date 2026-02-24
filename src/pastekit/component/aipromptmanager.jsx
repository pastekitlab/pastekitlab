import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { StorageUtils } from '../utils/storageutils.js';

const AIPromptManager = ({ className = '' }) => {
  const [prompts, setPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState({
    id: '',
    name: '',
    template: '',
    category: 'general'
  });
  const [isEditing, setIsEditing] = useState(false);

  const categories = [
    { value: 'general', label: '通用' },
    { value: 'coding', label: '编程' },
    { value: 'writing', label: '写作' },
    { value: 'translation', label: '翻译' },
    { value: 'analysis', label: '分析' }
  ];

  // 加载保存的提示词模板
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const result = await StorageUtils.getItem('aiPrompts');
      if (result.aiPrompts && Array.isArray(result.aiPrompts)) {
        setPrompts(result.aiPrompts);
      } else {
        // 创建默认提示词模板
        const defaultPrompts = [
          {
            id: '1',
            name: '代码审查',
            template: '请帮我审查以下代码，指出潜在的问题和改进建议：\n\n{{content}}',
            category: 'coding'
          },
          {
            id: '2',
            name: '文档总结',
            template: '请总结以下文档的主要内容和要点：\n\n{{content}}',
            category: 'writing'
          },
          {
            id: '3',
            name: '翻译助手',
            template: '请将以下内容翻译成中文：\n\n{{content}}',
            category: 'translation'
          }
        ];
        setPrompts(defaultPrompts);
        await StorageUtils.setItem('aiPrompts', defaultPrompts);
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
      toast.error('加载提示词失败');
    }
  };

  const savePrompts = async (newPrompts) => {
    try {
      await StorageUtils.setItem('aiPrompts', newPrompts);
      setPrompts(newPrompts);
      toast.success('提示词保存成功');
    } catch (error) {
      console.error('保存提示词失败:', error);
      toast.error('保存提示词失败');
    }
  };

  const handleAddPrompt = () => {
    setCurrentPrompt({
      id: Date.now().toString(),
      name: '',
      template: '',
      category: 'general'
    });
    setIsEditing(true);
  };

  const handleEditPrompt = (prompt) => {
    setCurrentPrompt(prompt);
    setIsEditing(true);
  };

  const handleDeletePrompt = async (id) => {
    const newPrompts = prompts.filter(p => p.id !== id);
    await savePrompts(newPrompts);
  };

  const handleSavePrompt = async () => {
    if (!currentPrompt.name.trim() || !currentPrompt.template.trim()) {
      toast.error('请填写提示词名称和模板');
      return;
    }

    const newPrompts = [...prompts];
    if (currentPrompt.id && prompts.find(p => p.id === currentPrompt.id)) {
      // 更新现有提示词
      const index = newPrompts.findIndex(p => p.id === currentPrompt.id);
      newPrompts[index] = currentPrompt;
    } else {
      // 添加新提示词
      newPrompts.push(currentPrompt);
    }

    await savePrompts(newPrompts);
    setIsEditing(false);
    setCurrentPrompt({ id: '', name: '', template: '', category: 'general' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentPrompt({ id: '', name: '', template: '', category: 'general' });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 提示词列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>AI提示词模板</span>
            <Button onClick={handleAddPrompt}>添加提示词</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map(prompt => (
              <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-start">
                    <span>{prompt.name}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditPrompt(prompt)}
                      >
                        编辑
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDeletePrompt(prompt.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    分类: {categories.find(c => c.value === prompt.category)?.label || prompt.category}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {prompt.template.substring(0, 100)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 编辑表单 */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {currentPrompt.id ? '编辑提示词' : '添加提示词'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">提示词名称</Label>
              <Input
                id="prompt-name"
                value={currentPrompt.name}
                onChange={(e) => setCurrentPrompt({...currentPrompt, name: e.target.value})}
                placeholder="输入提示词名称"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt-category">分类</Label>
              <Select 
                value={currentPrompt.category} 
                onValueChange={(value) => setCurrentPrompt({...currentPrompt, category: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt-template">提示词模板</Label>
              <Textarea
                id="prompt-template"
                value={currentPrompt.template}
                onChange={(e) => setCurrentPrompt({...currentPrompt, template: e.target.value})}
                placeholder="输入提示词模板，使用 {{content}} 作为内容占位符"
                className="min-h-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                提示：使用 {'{{content}}'} 作为用户输入内容的占位符
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSavePrompt}>保存</Button>
              <Button variant="outline" onClick={handleCancel}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIPromptManager;