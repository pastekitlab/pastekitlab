import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from '../utils/i18n';
import { EncodingUtils } from '../utils/cipher/encodingutils';

/**
 * 编解码工具组件
 * 支持常见的编码解码操作
 */
export default function EncodingTool({ className = '' }) {
  const [t] = useTranslation();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [operation, setOperation] = useState('encode'); // encode | decode
  const [inputEncoding, setInputEncoding] = useState('utf8'); // utf8 | base64 | hex | url | unicode
  const [outputEncoding, setOutputEncoding] = useState('base64'); // utf8 | base64 | hex | url | unicode

  // 编码选项映射
  const encodingOptions = [
    { value: 'utf8', label: 'UTF-8' },
    { value: 'base64', label: 'Base64' },
    { value: 'hex', label: 'Hex' },
    { value: 'url', label: 'URL' },
    { value: 'unicode', label: 'Unicode' }
  ];

  // 编码名称映射
  const encodingNames = {
    utf8: 'UTF-8',
    base64: 'Base64',
    hex: 'Hex',
    url: 'URL',
    unicode: 'Unicode'
  };

  // 转换编码格式为 EncodingUtils 格式
  const convertEncodingFormat = (encoding) => {
    switch (encoding.toLowerCase()) {
      case 'utf8': return 'UTF8';
      case 'base64': return 'BASE64';
      case 'hex': return 'HEX';
      case 'url': return 'UTF8'; // URL编码使用UTF8作为基础
      case 'unicode': return 'UTF8'; // Unicode编码使用UTF8作为基础
      default: return 'UTF8';
    }
  };

  // 执行编码转换操作
  const handleProcess = () => {
    if (!inputText.trim()) {
      toast.error('请输入要转换的文本');
      return;
    }

    try {
      let result;
      
      if (operation === 'encode') {
        // 编码转换：从输入编码转换为输出编码
        const inputFormat = convertEncodingFormat(inputEncoding);
        const outputFormat = convertEncodingFormat(outputEncoding);
        
        if (inputFormat === outputFormat) {
          // 相同编码格式，直接返回原文
          result = inputText;
        } else if (inputFormat === 'UTF8') {
          // 从UTF8转换为目标编码
          result = EncodingUtils.encode(inputText, 'UTF8', [outputFormat]);
        } else if (outputFormat === 'UTF8') {
          // 从源编码转换为UTF8
          result = EncodingUtils.decode(inputText, inputFormat, [inputFormat]);
        } else {
          // 从一种编码转换为另一种编码：先解码为UTF8，再编码为目标格式
          const utf8Text = EncodingUtils.decode(inputText, inputFormat, [inputFormat]);
          result = EncodingUtils.encode(utf8Text, 'UTF8', [outputFormat]);
        }
      } else {
        // 解码转换：从输出编码转换为输入编码（反向操作）
        const inputFormat = convertEncodingFormat(inputEncoding);
        const outputFormat = convertEncodingFormat(outputEncoding);
        
        if (inputFormat === outputFormat) {
          // 相同编码格式，直接返回原文
          result = inputText;
        } else if (inputFormat === 'UTF8') {
          // 从目标编码转换回UTF8（使用decode）
          if (needsSpecialHandling(outputEncoding)) {
            result = handleSpecialEncoding(inputText, outputEncoding, false);
          } else {
            result = EncodingUtils.decode(inputText, outputFormat, [outputFormat]);
          }
        } else if (outputFormat === 'UTF8') {
          // 从UTF8转换回源编码（使用encode）
          if (needsSpecialHandling(inputEncoding)) {
            result = handleSpecialEncoding(inputText, inputEncoding, true);
          } else {
            result = EncodingUtils.encode(inputText, 'UTF8', [inputFormat]);
          }
        } else {
          // 从一种编码转换为另一种编码：先解码为目标编码的UTF8形式，再编码为源编码
          let utf8Text;
          if (needsSpecialHandling(outputEncoding)) {
            utf8Text = handleSpecialEncoding(inputText, outputEncoding, false);
          } else {
            utf8Text = EncodingUtils.decode(inputText, outputFormat, [outputFormat]);
          }
          
          if (needsSpecialHandling(inputEncoding)) {
            result = handleSpecialEncoding(utf8Text, inputEncoding, true);
          } else {
            result = EncodingUtils.encode(utf8Text, 'UTF8', [inputFormat]);
          }
        }
      }
      
      setOutputText(result);
      const inputName = encodingNames[inputEncoding];
      const outputName = encodingNames[outputEncoding];
      const operationText = operation === 'encode' ? '编码转换' : '解码转换';
      toast.success(`${inputName} → ${outputName} ${operationText}成功`);
    } catch (error) {
      console.error('编码转换失败:', error);
      toast.error(error.message);
      setOutputText('');
    }
  };

  // 处理URL和Unicode编码的特殊逻辑
  const handleSpecialEncoding = (text, encoding, isEncode) => {
    if (encoding === 'url') {
      try {
        return isEncode ? encodeURIComponent(text) : decodeURIComponent(text);
      } catch (error) {
        throw new Error(isEncode ? 'URL编码失败' : 'URL解码失败');
      }
    } else if (encoding === 'unicode') {
      try {
        if (isEncode) {
          return text.split('').map(char => 
            '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
          ).join('');
        } else {
          return text.replace(/\\u([\d\w]{4})/gi, (match, grp) => 
            String.fromCharCode(parseInt(grp, 16))
          );
        }
      } catch (error) {
        throw new Error(isEncode ? 'Unicode编码失败' : 'Unicode解码失败');
      }
    }
    return null;
  };

  // 检查是否需要使用特殊编码处理
  const needsSpecialHandling = (encoding) => {
    return encoding === 'url' || encoding === 'unicode';
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

  // 交换输入输出编码和文本
  const swapInputOutput = () => {
    const tempText = inputText;
    const tempEncoding = inputEncoding;
    
    setInputText(outputText);
    setOutputText(tempText);
    setInputEncoding(outputEncoding);
    setOutputEncoding(tempEncoding);
    
    toast.info('已交换输入输出编码和文本');
  };

  return (
    <div className={`space-y-6 w-full ${className}`}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔤 {t('components.encodingtool.title') || '编码转换工具'}
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
                {t('components.encodingtool.input_encoding') || '输入编码'}
              </label>
              <Select value={inputEncoding} onValueChange={setInputEncoding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {encodingOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('components.encodingtool.output_encoding') || '输出编码'}
              </label>
              <Select value={outputEncoding} onValueChange={setOutputEncoding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {encodingOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
              {operation === 'encode' ? '🔄 编码转换' : '🔄 解码转换'}
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
              placeholder={`${t('components.encodingtool.input_placeholder') || '请输入要转换的文本...'} (${encodingNames[inputEncoding]})`}
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
              placeholder={`${t('components.encodingtool.output_placeholder') || '转换结果将显示在这里...'} (${encodingNames[outputEncoding]})`}
              className="min-h-[120px] font-mono text-sm bg-muted"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}