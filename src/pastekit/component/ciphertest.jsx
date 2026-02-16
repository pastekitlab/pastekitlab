import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CipherUtils } from '../utils/cipherutils';
import { useTranslation } from '../utils/i18n';

/**
 * 加密解密测试组件
 * 用于测试各种加密算法和秘钥配置的有效性
 */
export default function CipherTestComponent({ 
  configs = [], 
  selectedConfig = null,
  className = "",
  showConfigSelector = true 
}) {
  const [t] = useTranslation();
  const [testText, setTestText] = useState('Hello World! 测试加密解密功能');
  const [encryptResult, setEncryptResult] = useState('');
  const [decryptResult, setDecryptResult] = useState('');
  const [testConfig, setTestConfig] = useState(selectedConfig?.name || (configs[0]?.name || ''));
  const [isTesting, setIsTesting] = useState(false);

  // 获取当前选中的配置
  const getCurrentConfig = useCallback(() => {
    if (!testConfig) return null;
    return configs.find(c => c.name === testConfig) || null;
  }, [configs, testConfig]);

  // 执行加密测试
  const handleEncrypt = async () => {
    const config = getCurrentConfig();
    if (!config) {
      toast.error(t('components.ciphertest.messages.select_valid_config'));
      return;
    }

    if (!testText.trim()) {
      toast.error(t('components.ciphertest.messages.enter_test_text'));
      return;
    }

    setIsTesting(true);
    try {
      // 检查模式支持
      const mode = config.mode || config.algorithm?.split('/')[1] || 'CBC';
      const supportedModes = ['CBC', 'ECB', 'CFB', 'OFB', 'CTR'];
      
      if (!supportedModes.includes(mode.toUpperCase())) {
        throw new Error(t('components.ciphertest.messages.unsupported_mode', { 
        type: t('components.ciphertest.encrypt'), 
        mode, 
        modes: supportedModes.join(', ') 
      }));
      }
      
      // 适配配置格式
      const adaptedConfig = adaptConfigForCipher(config);
      const result = CipherUtils.encrypt(testText, adaptedConfig);
      setEncryptResult(result);
      toast.success(t('components.ciphertest.messages.encrypt_success'));
      
      // 如果已经有解密结果，重新验证一致性
      if (decryptResult) {
        const isMatch = normalizeString(decryptResult) === normalizeString(testText);
        console.log('重新验证结果一致性:', isMatch);
      }
    } catch (error) {
      console.error('Encryption failed:', error);
      toast.error(t('components.ciphertest.messages.encrypt_failed', { error: error.message }));
      setEncryptResult('');
    } finally {
      setIsTesting(false);
    }
  };

  // 执行解密测试
  const handleDecrypt = async () => {
    const config = getCurrentConfig();
    if (!config) {
      toast.error(t('components.ciphertest.messages.select_valid_config'));
      return;
    }

    if (!encryptResult.trim()) {
      toast.error(t('components.ciphertest.messages.execute_encrypt_first'));
      return;
    }

    setIsTesting(true);
    try {
      // 检查模式支持
      const mode = config.mode || config.algorithm?.split('/')[1] || 'CBC';
      const supportedModes = ['CBC', 'ECB', 'CFB', 'OFB', 'CTR'];
      
      if (!supportedModes.includes(mode.toUpperCase())) {
        throw new Error(t('components.ciphertest.messages.unsupported_mode', { 
          type: t('components.ciphertest.decrypt'), 
          mode, 
          modes: supportedModes.join(', ') 
        }));
      }
      
      // 适配配置格式
      const adaptedConfig = adaptConfigForCipher(config);
      const result = CipherUtils.decrypt(encryptResult, adaptedConfig);
      setDecryptResult(result);
      
      // 验证与输入文本的一致性
      const isMatch = normalizeString(result) === normalizeString(testText);
      if (isMatch) {
        toast.success(t('components.ciphertest.messages.decrypt_success_match'));
      } else {
        toast.warning(t('components.ciphertest.messages.decrypt_success_mismatch'));
        console.log(t('components.ciphertest.decrypt_result_validation'), result === testText, t('components.ciphertest.normalized_comparison_result'), isMatch);
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      toast.error(t('components.ciphertest.messages.decrypt_failed', { error: error.message }));
      setDecryptResult('');
    } finally {
      setIsTesting(false);
    }
  };

  // 执行完整测试（加密+解密）
  const handleFullTest = async () => {
    const config = getCurrentConfig();
    if (!config) {
      toast.error(t('components.ciphertest.messages.select_valid_config'));
      return;
    }

    if (!testText.trim()) {
      toast.error(t('components.ciphertest.messages.enter_test_text'));
      return;
    }

    setIsTesting(true);
    try {
      // 检查模式支持
      const mode = config.mode || config.algorithm?.split('/')[1] || 'CBC';
      const supportedModes = ['CBC', 'ECB', 'CFB', 'OFB', 'CTR'];
      
      if (!supportedModes.includes(mode.toUpperCase())) {
        throw new Error(t('components.ciphertest.messages.unsupported_mode', { 
          type: t('components.ciphertest.full_test'), 
          mode, 
          modes: supportedModes.join(', ') 
        }));
      }
      
      // 适配配置格式
      const adaptedConfig = adaptConfigForCipher(config);
      
      // 加密
      const encrypted = CipherUtils.encrypt(testText, adaptedConfig);
      setEncryptResult(encrypted);
      
      // 解密
      const decrypted = CipherUtils.decrypt(encrypted, adaptedConfig);
      setDecryptResult(decrypted);
      
      // 验证结果 - 使用更宽松的比较方式
      const isMatch = normalizeString(decrypted) === normalizeString(testText);
      
      if (isMatch) {
        toast.success(t('components.ciphertest.messages.full_test_pass'));
      } else {
        toast.warning(t('components.ciphertest.messages.full_test_mismatch'));
        // 输出详细调试信息
        console.log(t('components.ciphertest.debug_info') + ':');
        console.log(t('components.ciphertest.original_text') + ':', JSON.stringify(testText));
        console.log(t('components.ciphertest.decrypt_result') + ':', JSON.stringify(decrypted));
        console.log(t('components.ciphertest.original_length') + ':', testText.length);
        console.log(t('components.ciphertest.decrypted_length') + ':', decrypted.length);
        console.log(t('components.ciphertest.strict_comparison_result') + ':', decrypted === testText);
        console.log(t('components.ciphertest.normalized_comparison_result') + ':', isMatch);
        
        // 字符级别的比较
        if (testText.length === decrypted.length) {
          for (let i = 0; i < testText.length; i++) {
            if (testText.charCodeAt(i) !== decrypted.charCodeAt(i)) {
              console.log(`${t('components.ciphertest.character_diff_position')} ${i}: ${t('components.ciphertest.original_text')}=${testText.charCodeAt(i)}('${testText[i]}'), ${t('components.ciphertest.decrypted_text')}=${decrypted.charCodeAt(i)}('${decrypted[i]}')`);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Full test failed:', error);
      toast.error(t('components.ciphertest.messages.test_failed', { error: error.message }));
      setEncryptResult('');
      setDecryptResult('');
    } finally {
      setIsTesting(false);
    }
  };

  // 字符串规范化函数 - 用于比较前的预处理
  const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    // 移除首尾空白，标准化换行符
    return str.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  };

  // 配置格式适配函数
  const adaptConfigForCipher = (config) => {
    // 如果是RSA算法，需要将 publicKey/privateKey 字符串转换为对象格式
    if (config.algorithm?.startsWith('RSA') || config.algorithmType === 'RSA') {
      return {
        ...config,
        publicKey:config.publicKey|| {value:  '', encoding: ['UTF8']},
        privateKey: config.privateKey|| {value:  '', encoding: ['UTF8']},
      };
    }
    
    // 对于对称算法，确保 key 和 iv 格式正确
    return {
      ...config,
      key: config.key || { value: '', encoding: ['HEX'] },
      iv: config.iv || { value: '', encoding: ['UTF8'] }
    };
  };

  // 边界情况测试函数
  const testEdgeCases = async () => {
    const edgeCases = [
      'Hello World!',
      '中文测试',
      'Special chars: !@#$%^&*()',
      'Newline\ntest',
      'Tab\ttest',
      'Mixed 中英文 test',
      '   Leading spaces',
      'Trailing spaces   ',
      'Multiple   spaces   between',
      '',
      'a',
      '1234567890'
    ];
    
    const config = getCurrentConfig();
    if (!config) {
      toast.error('请选择有效的配置');
      return;
    }
    
    setIsTesting(true);
    toast.info(t('components.ciphertest.edge_test') + '...');
    
    const results = [];
    const adaptedConfig = adaptConfigForCipher(config);
    
    for (const testCase of edgeCases) {
      try {
        const encrypted = CipherUtils.encrypt(testCase, adaptedConfig);
        const decrypted = CipherUtils.decrypt(encrypted, adaptedConfig);
        const isMatch = normalizeString(decrypted) === normalizeString(testCase);
        
        results.push({
          input: testCase,
          output: decrypted,
          match: isMatch,
          strictMatch: decrypted === testCase
        });
        
        console.log(`测试 '${testCase}': ${isMatch ? '✅' : '❌'}`);
      } catch (error) {
        results.push({
          input: testCase,
          error: error.message,
          match: false
        });
        console.error(`${t('components.ciphertest.testing_case')} '${testCase}' ${t('components.ciphertest.failed')}:`, error.message);
      }
    }
    
    const successCount = results.filter(r => r.match).length;
    const totalCount = results.length;
    
    toast[successCount === totalCount ? 'success' : 'warning'](
      t('components.ciphertest.messages.boundary_test_complete', { 
        success: successCount, 
        total: totalCount 
      })
    );
    
    console.table(results);
    setIsTesting(false);
  };

  // 清空结果
  const handleClear = () => {
    setEncryptResult('');
    setDecryptResult('');
  };

  // 配置发生变化时更新测试配置
  React.useEffect(() => {
    if (selectedConfig && configs.some(c => c.name === selectedConfig.name)) {
      setTestConfig(selectedConfig.name);
    }
  }, [selectedConfig, configs]);

  const currentConfig = getCurrentConfig();

  return (
    <div className={`space-y-4 w-full ${className}`}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('components.ciphertest.title')}
            {currentConfig && (
              <span className="text-sm font-normal text-muted-foreground">
                ({t('components.ciphertest.current_config')}: {currentConfig.name})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 配置选择器 */}
          {showConfigSelector && configs.length > 0 && (
            <div className="space-y-2">
              <Label>{t('components.ciphertest.select_config')}</Label>
              <Select value={testConfig} onValueChange={setTestConfig}>
                <SelectTrigger>
                  <SelectValue placeholder={t('components.ciphertest.please_select')} />
                </SelectTrigger>
                <SelectContent>
                  {configs.map(config => (
                    <SelectItem key={config.name} value={config.name}>
                      <div className="flex items-center gap-2">
                        <span>{config.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({config.algorithmType || config.algorithm?.split('/')[0] || 'AES'})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {currentConfig && (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  <div>{t('components.ciphertest.algorithm')}: {currentConfig.algorithm || t('components.keyconfigmanager.messages.loading')}</div>
                  <div>{t('components.ciphertest.plaintext_encoding')}: {currentConfig.plainEncoding?.[0] || 'UTF8'}</div>
                  <div>{t('components.ciphertest.ciphertext_encoding')}: {currentConfig.cipherEncoding?.[0] || 'BASE64'}</div>
                  {currentConfig.algorithmType !== 'RSA' && (
                    <div>
                      {t('components.ciphertest.mode')}: {currentConfig.mode || currentConfig.algorithm?.split('/')[1] || 'CBC'}
                      {currentConfig.padding && ` / ${currentConfig.padding}`}
                    </div>
                  )}
                  {/* GCM 模式特殊提示 */}
                  {((currentConfig.mode || currentConfig.algorithm?.split('/')[1] || '').toUpperCase() === 'GCM') && (
                    <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded text-xs">
                      {t('components.ciphertest.gcm_warning')}
                    </div>
                  )}
                  {/* 调试信息 */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">{t('components.ciphertest.debug_info')}</summary>
                    <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
{JSON.stringify({
  name: currentConfig.name,
  algorithm: currentConfig.algorithm,
  algorithmType: currentConfig.algorithmType,
  mode: currentConfig.mode,
  padding: currentConfig.padding,
  publicKey: typeof currentConfig.publicKey === 'string' ? 
    `${currentConfig.publicKey.substring(0, 50)}...` : currentConfig.publicKey,
  privateKey: typeof currentConfig.privateKey === 'string' ? 
    `${currentConfig.privateKey.substring(0, 50)}...` : currentConfig.privateKey,
  key: currentConfig.key,
  iv: currentConfig.iv
}, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* 测试输入区域 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="testText">{t('components.ciphertest.test_text')}</Label>
              <Textarea
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder={t('components.ciphertest.enter_test_text')}
                rows={3}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleEncrypt} 
                disabled={isTesting || !currentConfig}
                variant="secondary"
              >
                {isTesting ? t('components.ciphertest.encrypting') : t('components.ciphertest.encrypt')}
              </Button>
              
              <Button 
                onClick={handleDecrypt} 
                disabled={isTesting || !currentConfig}
                variant="secondary"
              >
                {isTesting ? t('components.ciphertest.decrypting') : t('components.ciphertest.decrypt')}
              </Button>
              
              <Button 
                onClick={handleFullTest} 
                disabled={isTesting || !currentConfig}
                variant="default"
              >
                {isTesting ? t('components.ciphertest.testing') : t('components.ciphertest.full_test')}
              </Button>
              
              <Button 
                onClick={testEdgeCases} 
                disabled={isTesting || !currentConfig}
                variant="outline"
                size="sm"
              >
                {t('components.ciphertest.edge_test')}
              </Button>
              
              <Button 
                onClick={handleClear} 
                variant="outline"
                disabled={!encryptResult && !decryptResult}
              >
                {t('components.ciphertest.clear_results')}
              </Button>
            </div>
          </div>

          {/* 结果显示区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 加密结果 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('components.ciphertest.encrypt_result')}
                {encryptResult && (
                  <span className="text-xs text-green-600">{t('components.ciphertest.encrypted')}</span>
                )}
              </Label>
              <Textarea
                value={encryptResult}
                readOnly
                placeholder={t('components.ciphertest.encrypt_result_placeholder')}
                rows={4}
                className="font-mono text-sm bg-muted"
              />
            </div>

            {/* 解密结果 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('components.ciphertest.decrypt_result')}
                {decryptResult && (
                  <span className="text-xs text-green-600">{t('components.ciphertest.decrypted')}</span>
                )}
              </Label>
              <Textarea
                value={decryptResult}
                readOnly
                placeholder={t('components.ciphertest.decrypt_result_placeholder')}
                rows={4}
                className="font-mono text-sm bg-muted"
              />
              
              {/* 结果对比 */}
              {decryptResult && testText && (
                <div className={`text-sm p-2 rounded ${
                  normalizeString(decryptResult) === normalizeString(testText) 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {normalizeString(decryptResult) === normalizeString(testText) 
                    ? t('components.ciphertest.result_consistent') 
                    : t('components.ciphertest.result_inconsistent')
                  }
                  {/* 详细比较信息 */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">{t('components.ciphertest.detailed_comparison')}</summary>
                    <div className="text-xs mt-1 space-y-1">
                      <div>{t('components.ciphertest.strict_comparison')}: {decryptResult === testText ? '✅ ' + t('components.ciphertest.equal') : '❌ ' + t('components.ciphertest.not_equal')}</div>
                      <div>{t('components.ciphertest.normalized_comparison')}: {normalizeString(decryptResult) === normalizeString(testText) ? '✅ ' + t('components.ciphertest.equal') : '❌ ' + t('components.ciphertest.not_equal')}</div>
                      <div>{t('components.ciphertest.original_length')}: {testText.length} {t('components.ciphertest.characters')}</div>
                      <div>{t('components.ciphertest.decrypted_length')}: {decryptResult.length} {t('components.ciphertest.characters')}</div>
                      <div>{t('components.ciphertest.original_preview')}: "{testText.substring(0, 50)}{testText.length > 50 ? '...' : ''}"</div>
                      <div>{t('components.ciphertest.decrypted_preview')}: "{decryptResult.substring(0, 50)}{decryptResult.length > 50 ? '...' : ''}"</div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* 测试统计信息 */}
          {encryptResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground">{t('components.ciphertest.original_size')}</div>
                <div className="font-medium">{testText.length} {t('components.ciphertest.characters')}</div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground">{t('components.ciphertest.ciphertext_size')}</div>
                <div className="font-medium">{encryptResult.length} {t('components.ciphertest.characters')}</div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground">{t('components.ciphertest.compression_ratio')}</div>
                <div className="font-medium">
                  {Math.round((encryptResult.length / testText.length) * 100)}%
                </div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground">{t('components.ciphertest.test_status')}</div>
                <div className="font-medium text-green-600">{t('components.ciphertest.completed')}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}