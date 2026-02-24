import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StorageUtils } from '../utils/storageutils.js';

const AIPromptSelector = ({ content, onGeneratedPromptChange, onAIWebsiteDetected }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // 支持的AI网站列表
  const aiWebsites = [
      'https://www.qianwen.com',
    'https://kimi.moonshot.cn',
    'https://chat.deepseek.com',
    'https://yiyan.baidu.com',
    'https://chatglm.cn',
    'https://xinghuo.xfyun.cn',
    'https://yuanbao.tencent.com',
    'https://chat.openai.com',
    'https://claude.ai',
    'https://gemini.google.com'
  ];

  // 检测当前是否在AI网站
  const [isOnAIWebsite, setIsOnAIWebsite] = useState(false);

  useEffect(() => {
    // 检测当前页面URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('获取标签页信息失败:', chrome.runtime.lastError);
        return;
      }
      
      if (tabs[0]?.url) {
        try {
          const currentUrl = new URL(tabs[0].url);
          const currentOrigin = `${currentUrl.origin}`;
          const isAI = aiWebsites.includes(currentOrigin);
          setIsOnAIWebsite(isAI);
                  
          // 通知父组件
          if (onAIWebsiteDetected) {
            onAIWebsiteDetected(isAI);
          }
                  
          if (isAI) {
            console.log('检测到AI网站:', currentOrigin);
          }
          console.log('检测AI网站:', currentOrigin);
        } catch (error) {
          console.error('解析URL失败:', error);
        }
      }
    });
  }, []);

  // 加载提示词模板
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const result = await StorageUtils.getItem('aiPrompts');
      console.log('加载提示词结果:', result);
      
      if (result.aiPrompts && Array.isArray(result.aiPrompts) && result.aiPrompts.length > 0) {
        setPrompts(result.aiPrompts);
        console.log('已加载提示词:', result.aiPrompts);
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
        // 保存默认模板
        await StorageUtils.setItem('aiPrompts', defaultPrompts);
        console.log('创建并保存默认提示词模板');
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
    }
  };

  // 当选择提示词或内容变化时生成最终提示词
  useEffect(() => {
    console.log('提示词选择变化:', { selectedPrompt, content, promptsLength: prompts.length });
    
    if (selectedPrompt && content) {
      const promptTemplate = prompts.find(p => p.id === selectedPrompt)?.template;
      console.log('找到的模板:', promptTemplate);
      
      if (promptTemplate) {
        const finalPrompt = promptTemplate.replace('{{content}}', content);
        setGeneratedPrompt(finalPrompt);
        onGeneratedPromptChange?.(finalPrompt);
        console.log('生成的提示词:', finalPrompt);
      }
    } else {
      setGeneratedPrompt('');
      onGeneratedPromptChange?.('');
    }
  }, [selectedPrompt, content, prompts]);

  if (!isOnAIWebsite) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">AI提示词助手</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">选择提示词模板</label>
          <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
            <SelectTrigger>
              <SelectValue placeholder="选择提示词模板" />
            </SelectTrigger>
            <SelectContent>
              {prompts.map(prompt => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {generatedPrompt && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">生成的提示词</label>
              <Button 
                size="sm" 
                onClick={() => navigator.clipboard.writeText(generatedPrompt)}
              >
                复制到剪贴板
              </Button>
            </div>
            <Textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              className="min-h-[120px] font-mono text-sm bg-white border-primary"
            />
            <p className="text-xs text-muted-foreground">
              💡 提示词已生成，您可以直接编辑和修改内容
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIPromptSelector;