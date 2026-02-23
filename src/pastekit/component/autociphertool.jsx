import React, { useState, useEffect } from 'react';
import { CipherUtils } from '../utils/cipherutils';
import { StorageUtils } from '../utils/storageutils';
import { useTranslation } from '../utils/i18n';

const AutoCipherTool = ({ content = '' }) => {
  const [t] = useTranslation();
  const [decryptionResults, setDecryptionResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [error, setError] = useState('');

  // 加载所有加密配置
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const result = await StorageUtils.getItem('keyConfigs');
        const allConfigs = result.keyConfigs || [];
        setConfigs(allConfigs);
      } catch (err) {
        console.error('加载配置失败:', err);
        setError(t('components.autociphertool.error.no_configs'));
      }
    };
    loadConfigs();
  }, []);

  // 当内容变化时自动开始解密
  useEffect(() => {
    if (content.trim() && configs.length > 0) {
      // 延迟一小段时间确保配置已加载
      const timer = setTimeout(() => {
        autoDecrypt();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [content, configs]);

  // 验证配置是否有效
  const isValidConfig = (config) => {
    if (!config || !config.name) return false;
    if (config.algorithm?.startsWith('RSA')) {
      // RSA配置需要检查私钥对象及其值
      return config.privateKey && config.privateKey.value;
    } else {
      return config.key && config.key.value;
    }
  };

  // 自动解密函数
  const autoDecrypt = async () => {
    if (!content.trim()) {
      setError(t('components.autociphertool.error.no_content'));
      return;
    }

    if (configs.length === 0) {
      setError(t('components.autociphertool.error.no_configs'));
      return;
    }

    setIsLoading(true);
    setError('');
    setDecryptionResults([]);

    const results = [];

    // 遍历所有配置进行解密尝试
    for (const config of configs) {
      try {
        // 验证配置是否有效
        if (!isValidConfig(config)) {
          console.info("配置无效:"+config.name)
          results.push({
            configName: config.name,
            success: false,
            error: t('components.autociphertool.error.invalid_config'),
            plaintext: null
          });
          continue;
        }

        // 尝试解密
        const decrypted = CipherUtils.decrypt(content, config);
        console.info("config:"+JSON.stringify(config)+" result"+decrypted)
        if (decrypted && decrypted !== content) {
          // 只有CFB模式才进行可打印字符判断
          const isCFBMode = config.algorithm?.toUpperCase().includes('CFB') || 
                          config.mode?.toUpperCase() === 'CFB';
          
          if (isCFBMode) {
            // CFB模式需要可打印字符判断
            const { analyzePrintableCharacters } = await import('../utils/textutils');
            const analysis = analyzePrintableCharacters(decrypted);
            
            // CFB模式下，可打印字符比例超过50%才认为是有效的明文
            if (analysis.isReadable) {
              results.push({
                configName: config.name,
                success: true,
                error: null,
                plaintext: decrypted,
                algorithm: config.algorithm
              });
            } else {
              results.push({
                configName: config.name,
                success: false,
                error: `CFB模式解密成功但结果不可读 (可打印字符比例: ${(analysis.printableRatio * 100).toFixed(1)}%)`,
                plaintext: null
              });
            }
          } else {
            // 非CFB模式直接认为解密成功
            results.push({
              configName: config.name,
              success: true,
              error: null,
              plaintext: decrypted,
              algorithm: config.algorithm
            });
          }
        } else {
          // 解密失败或结果相同
          results.push({
            configName: config.name,
            success: false,
            error: t('components.autociphertool.error.decrypt_failed'),
            plaintext: null
          });
        }
      } catch (err) {
        console.error(`配置 ${config.name} 解密出错:`, err);
        results.push({
          configName: config.name,
          success: false,
          error: err.message || t('components.autociphertool.error.process_error'),
          plaintext: null
        });
      }
    }

    setDecryptionResults(results);
    setIsLoading(false);

    // 检查是否有成功的解密
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      setError(t('components.autociphertool.error.no_successful_decrypt'));
    }
  };

  // 清空结果
  const clearResults = () => {
    setDecryptionResults([]);
    setError('');
  };

  // 过滤出成功解密的结果
  const successfulResults = decryptionResults.filter(r => r.success);

  return (
    <div className="w-full border rounded p-4 space-y-4 h-full">
      <h3 className="text-lg font-bold">{t('components.autociphertool.title')}</h3>
      
      <div className="space-y-4">

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
            <strong>{t('common.error')}:</strong> {error}
          </div>
        )}
      </div>

      {/* 只显示成功解密的结果 */}
      {successfulResults.length > 0 && (
        <div className="space-y-4 flex-1">
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            {t('components.autociphertool.success.title')} ({successfulResults.length} {t('common.items')})
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {successfulResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 bg-green-50 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-800">{result.configName}</span>
                    {result.algorithm && (
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {result.algorithm}
                      </span>
                    )}
                  </div>
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-medium">
                    {t('components.autociphertool.success.label')}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-green-700">{t('components.autociphertool.success.message')}</div>
                  <div className="bg-white border border-green-200 rounded p-3">
                    <pre className="whitespace-pre-wrap break-words text-sm max-w-full overflow-hidden">
                      {result.plaintext}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="border rounded p-3 bg-gray-50">
        <h4 className="font-medium text-sm mb-2 text-gray-700">{t('components.autociphertool.usage.title')}</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div>• {t('components.autociphertool.usage.instruction1')}</div>
          <div>• {t('components.autociphertool.usage.instruction2')}</div>
          <div>• {t('components.autociphertool.usage.instruction3')}</div>
          <div className="mt-2 pt-2 border-t text-xs">
            <strong>{t('common.tip')}:</strong> {t('components.autociphertool.usage.tip')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoCipherTool;