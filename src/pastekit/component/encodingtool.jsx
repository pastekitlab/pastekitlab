import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from '../utils/i18n';

/**
 * 编解码工具组件
 * 支持常见的编码解码操作
 */
export default function EncodingTool({ className = '' }) {
  const [t] = useTranslation();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [operation, setOperation] = useState('encode'); // encode | decode
  const [encodingType, setEncodingType] = useState('base64'); // base64 | hex | url | unicode

  // 编码解码映射表
  const encodingMap = {
    base64: {
      name: 'Base64',
      encode: (text) => {
        try {
          return btoa(unescape(encodeURIComponent(text)));
        } catch (error) {
          throw new Error('Base64编码失败: 输入包含无效字符');
        }
      },
      decode: (text) => {
        try {
          return decodeURIComponent(escape(atob(text)));
        } catch (error) {
          throw new Error('Base64解码失败: 无效的Base64字符串');
        }
      }
    },
    hex: {
      name: 'Hex',
      encode: (text) => {
        try {
          return Array.from(new TextEncoder().encode(text))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        } catch (error) {
          throw new Error('Hex编码失败');
        }
      },
      decode: (text) => {
        try {
          // 移除空格和换行符
          const cleanText = text.replace(/[\s\r\n]/g, '');
          if (cleanText.length % 2 !== 0) {
            throw new Error('Hex字符串长度必须为偶数');
          }
          const bytes = new Uint8Array(cleanText.length / 2);
          for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(cleanText.substr(i * 2, 2), 16);
          }
          return new TextDecoder().decode(bytes);
        } catch (error) {
          throw new Error('Hex解码失败: ' + error.message);
        }
      }
    },
    url: {
      name: 'URL',
      encode: (text) => {
        try {
          return encodeURIComponent(text);
        } catch (error) {
          throw new Error('URL编码失败');
        }
      },
      decode: (text) => {
        try {
          return decodeURIComponent(text);
        } catch (error) {
          throw new Error('URL解码失败: 无效的URL编码');
        }
      }
    },
    unicode: {
      name: 'Unicode',
      encode: (text) => {
        try {
          return text.split('').map(char => 
            '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
          ).join('');
        } catch (error) {
          throw new Error('Unicode编码失败');
        }
      },
      decode: (text) => {
        try {
          return text.replace(/\\u([\d\w]{4})/gi, (match, grp) => 
            String.fromCharCode(parseInt(grp, 16))
          );
        } catch (error) {
          throw new Error('Unicode解码失败: 无效的Unicode格式');
        }
      }
    }
  };

  // 执行编解码操作
  const handleProcess = () => {
    if (!inputText.trim()) {
      toast.error('请输入要处理的文本');
      return;
    }

    try {
      const processor = encodingMap[encodingType];
      if (!processor) {
        throw new Error('不支持的编码类型');
      }

      const result = operation === 'encode' 
        ? processor.encode(inputText) 
        : processor.decode(inputText);
      
      setOutputText(result);
      toast.success(`${processor.name}${operation === 'encode' ? '编码' : '解码'}成功`);
    } catch (error) {
      console.error('编解码失败:', error);
      toast.error(error.message);
      setOutputText('');
    }
  };

  // 复制结果到剪贴板
  const copyToClipboard = async () => {
    if (!outputText) {
      toast.error('没有可复制的内容');
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText);
      toast.success('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败: ' + error.message);
    }
  };

  // 清空所有内容
  const clearAll = () => {
    setInputText('');
    setOutputText('');
    toast.info('已清空所有内容');
  };

  // 交换输入输出
  const swapInputOutput = () => {
    const temp = inputText;
    setInputText(outputText);
    setOutputText(temp);
    toast.info('已交换输入输出');
  };

  return (
    <div className={`space-y-6 w-full ${className}`}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔤 {t('components.encodingtool.title') || '编解码工具'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 操作选择 */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('components.encodingtool.operation') || '操作类型'}
              </label>
              <Select value={operation} onValueChange={setOperation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encode">
                    {t('components.encodingtool.encode') || '编码'}
                  </SelectItem>
                  <SelectItem value="decode">
                    {t('components.encodingtool.decode') || '解码'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('components.encodingtool.encoding_type') || '编码方式'}
              </label>
              <Select value={encodingType} onValueChange={setEncodingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base64">Base64</SelectItem>
                  <SelectItem value="hex">Hex</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="unicode">Unicode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 快捷操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleProcess}
            >
              {operation === 'encode' ? '🔄 编码' : '🔄 解码'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={copyToClipboard}
              disabled={!outputText}
            >
              📋 复制结果
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={swapInputOutput}
            >
              ⇄ 交换输入输出
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAll}
            >
              🗑️ 清空
            </Button>
          </div>

          {/* 输入区域 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('components.encodingtool.input') || '输入文本'}
            </label>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('components.encodingtool.input_placeholder') || '请输入要处理的文本...'}
              className="min-h-[120px] font-mono text-sm"
            />
          </div>

          {/* 输出区域 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('components.encodingtool.output') || '输出结果'}
            </label>
            <Textarea
              value={outputText}
              readOnly
              placeholder={t('components.encodingtool.output_placeholder') || '处理结果将显示在这里...'}
              className="min-h-[120px] font-mono text-sm bg-muted"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}