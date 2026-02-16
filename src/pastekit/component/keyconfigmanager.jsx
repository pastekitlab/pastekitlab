import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfigList from './configlist';
import ConfigPagination from './configpagination';
import ConfigEditor from './configeditor';
// 引入常量和工具
import { NEED_PADDING_MODES, ITEMS_PER_PAGE } from '../utils/keyconfigconstants';
import {ConfigManager, loadConfigs, saveConfigs} from '../utils/keyconfigutils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { StorageUtils } from '../utils/storageutils';
import { useTranslation } from '../utils/i18n';

/**
 * Key configuration management component
 * Supports creation, editing, deletion and selection of multiple key configurations
 */
export default function KeyConfigManager({ 
  onConfigChange, 
  initialConfigs = [],
  showGenerateButton = true,
  storageKey = 'keyConfigs' // 存储键名
}) {
  const [t, currentLanguage] = useTranslation();
  const [configs, setConfigs] = useState(initialConfigs);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [newConfigName, setNewConfigName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Display 5 configurations per page
  const [isLoading, setIsLoading] = useState(false);

  // 计算分页数据
  const totalPages = Math.ceil(configs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConfigs = configs.slice(startIndex, endIndex);

  // Initialize: Load configurations from storage
  useEffect(() => {
    loadConfigsFromStorage();
  }, []);

  // Load configurations from storage
  const loadConfigsFromStorage = async () => {
    try {
      setIsLoading(true);
      const result = await loadConfigs(storageKey, initialConfigs);
      
      setConfigs(result.configs);
      setSelectedConfig(result.selectedConfig);
      
      // Notify parent component of currently selected configuration
      if (result.selectedConfig) {
        const selected = result.configs.find(c => c.name === result.selectedConfig);
        if (selected) {
          onConfigChange?.(selected);
        }
      }
    } catch (error) {
      console.error('Loading configuration failed:', error);
      toast.error('Loading configuration failed: ' + error.message);
      
      // Use initial configuration when error occurs
      if (initialConfigs.length > 0) {
        setConfigs(initialConfigs);
        if (initialConfigs.length > 0) {
          setSelectedConfig(initialConfigs[0].name);
          onConfigChange?.(initialConfigs[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration to storage
  const saveConfigsToStorage = async (newConfigs) => {
    return await saveConfigs(storageKey, newConfigs);
  };

  // Select first configuration if available during initialization
  useEffect(() => {
    if (configs.length > 0 && !selectedConfig) {
      setSelectedConfig(configs[0].name);
      onConfigChange?.(configs[0]);
    }
  }, [configs, selectedConfig, onConfigChange]);

  // Notify parent component when selected configuration changes
  useEffect(() => {
    const config = configs.find(c => c.name === selectedConfig);
    if (config) {
      onConfigChange?.(config);
    }
  }, [selectedConfig, configs, onConfigChange]);

  // Add new configuration
  const addConfig = async () => {
    if (!newConfigName.trim()) {
      toast.error(t('components.keyconfigmanager.messages.enter_name'));
      return;
    }

    if (configs.some(c => c.name === newConfigName.trim())) {
      toast.error(t('components.keyconfigmanager.messages.name_exists'));
      return;
    }

    const newConfig = {
      name: newConfigName.trim(),
      algorithm: 'AES/CBC/PKCS5Padding', // Complete algorithm string
      algorithmType: 'AES', // Algorithm type
      mode: 'CBC', // Encryption mode
      padding: 'PKCS5Padding', // Padding method
      key: {
        value: '',
        encoding: ['UTF8']
      },
      iv: {
        value: '',
        encoding: ['UTF8']
      },
      publicKey: {
        value: '',
        encoding: ['UTF8']
      },
      privateKey: {
        value: '',
        encoding: ['UTF8']
      },
      plainEncoding: ['UTF8'], // Plaintext encoding defaults to UTF8
      cipherEncoding: ['BASE64'], // Ciphertext encoding defaults to BASE64
      createdAt: Date.now()
    };

    const updatedConfigs = [...configs, newConfig];
    const success = await saveConfigsToStorage(updatedConfigs);
    
    if (success) {
      setConfigs(updatedConfigs);
      setNewConfigName('');
      setEditingConfig(newConfig);
      setIsDialogOpen(true);
      toast.success(t('components.keyconfigmanager.messages.created'));
    }
  };

  // Edit configuration
  const editConfig = (configName) => {
    const config = configs.find(c => c.name === configName);
    if (config) {
      setEditingConfig(config);
      setIsDialogOpen(true);
    }
  };

  // Save configuration
  const saveConfig = async (updatedConfig) => {
    const updatedConfigs = configs.map(config => 
      config.name === updatedConfig.name ? updatedConfig : config
    );
    
    const success = await saveConfigsToStorage(updatedConfigs);
    
    if (success) {
      setConfigs(updatedConfigs);
      setIsDialogOpen(false);
      setEditingConfig(null);
      toast.success(t('components.keyconfigmanager.messages.saved'));
    }
  };

  // Delete configuration
  const deleteConfig = async (configName) => {
    if (configs.length <= 1) {
      toast.error(t('components.keyconfigmanager.messages.min_configs'));
      return;
    }

    if (confirm(`${t('components.keyconfigmanager.confirm_delete')} "${configName}" ${t('components.keyconfigmanager.confirm_delete_suffix')}?`)) {
      const updatedConfigs = configs.filter(c => c.name !== configName);
      const success = await saveConfigsToStorage(updatedConfigs);
      
      if (success) {
        setConfigs(updatedConfigs);
        
        // If deleting the currently selected configuration, select the first one
        if (selectedConfig === configName) {
          if (updatedConfigs.length > 0) {
            setSelectedConfig(updatedConfigs[0].name);
          } else {
            setSelectedConfig('');
          }
        }
        
        toast.success(t('components.keyconfigmanager.messages.deleted'));
      }
    }
  };

  // 生成RSA密钥对
  const generateRSAKeys = async (configToUpdate, onUpdateCallback) => {
    try {
      toast.info(`${t('components.keyconfigmanager.generating_keys')}...`);
      
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );

      const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const publicKeyPEM = arrayBufferToPEM(publicKey, "PUBLIC KEY");

      const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const privateKeyPEM = arrayBufferToPEM(privateKey, "PRIVATE KEY");

      const updatedConfig = {
        ...configToUpdate,
        publicKey: {
          value: publicKeyPEM,
          encoding: ['UTF8']
        },
        privateKey: {
          value: privateKeyPEM,
          encoding: ['UTF8']
        }
      };

      // 只更新输入框值，不自动保存
      if (onUpdateCallback && typeof onUpdateCallback === 'function') {
        onUpdateCallback(updatedConfig);
      }
      
      toast.success(t('components.keyconfigmanager.messages.keys_generated'));
    } catch (error) {
      console.error('生成RSA密钥失败:', error);
      toast.error(`生成失败: ${error.message}`);
    }
  };

  // ArrayBuffer转PEM格式（去除头部尾部标记，只保留Base64内容）
  const arrayBufferToPEM = (buffer, type) => {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    // 只返回Base64内容，不包含PEM头部和尾部标记
    return base64;
  };

  // Get currently selected configuration
  const getCurrentConfig = () => {
    return ConfigManager.getCurrentConfig(configs, selectedConfig);
  };

  // Chrome扩展环境中的滚动处理
  useEffect(() => {
    if (!isDialogOpen) return;
    
    const handleWheel = (e) => {
      // 阻止事件冒泡到父级容器
      e.stopPropagation();
      
      // 获取当前焦点的可滚动元素
      const target = e.target;
      const scrollableParent = target.closest('[class*="overflow-y-auto"]') || 
                              target.closest('.DialogContent') || 
                              document.querySelector('.DialogContent');
      
      if (scrollableParent) {
        // 重定向滚动到正确的容器
        const delta = e.deltaY;
        scrollableParent.scrollTop += delta;
        e.preventDefault();
      }
    };
    
    // 监听对话框内的wheel事件
    const dialogContent = document.querySelector('.DialogContent');
    if (dialogContent) {
      dialogContent.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (dialogContent) {
        dialogContent.removeEventListener('wheel', handleWheel);
      }
    };
  }, [isDialogOpen]);

  return (
    <div className="space-y-4 w-full max-w-none h-full">
      {/* 加载状态指示器 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>{t('components.keyconfigmanager.messages.loading')}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Configuration selection and management - Full screen */}
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <span>🔐 {t('components.keyconfigmanager.title')}</span>
            <div className="flex gap-2">

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setEditingConfig(null);
                      setNewConfigName('');
                    }}
                  >
                    {t('components.keyconfigmanager.new_config')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                      {editingConfig ? `${t('common.edit')} ${editingConfig.name}` : t('components.keyconfigmanager.create_config')}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {editingConfig ? (
                    <ConfigEditor 
                      config={editingConfig}
                      onSave={saveConfig}
                      onDelete={deleteConfig}
                      showGenerateButton={showGenerateButton}
                      onCancel={() => setIsDialogOpen(false)}
                    />
                  ) : (
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                      <div>
                        <Label htmlFor="newConfigName">{t('components.keyconfigmanager.config_name')}</Label>
                        <Input
                          id="newConfigName"
                          value={newConfigName}
                          onChange={(e) => setNewConfigName(e.target.value)}
                          placeholder={t('components.keyconfigmanager.messages.enter_name')}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button onClick={addConfig}>
                          {t('common.create')}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-semibold">{t('components.keyconfigmanager.config_list')}</h3>
              <div className="text-sm text-muted-foreground">
                {t('components.keyconfigmanager.total_configs', { count: configs.length })} {totalPages > 1 && `(${t('components.keyconfigmanager.page_info', { current: currentPage, total: totalPages })})`} {isLoading && `(${t('common.loading')})`}
              </div>
            </div>
            
            {/* Configuration list - Using existing component */}
            <ConfigList
              configs={configs}
              selectedConfig={selectedConfig}
              onSelectConfig={setSelectedConfig}
              onEditConfig={editConfig}
              onDeleteConfig={deleteConfig}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
            />
            
            {/* 分页控件 */}
            <div className="flex justify-center flex-shrink-0 pt-2">
              <ConfigPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={configs.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </div>
          
          {selectedConfig && (
            <div className="mt-4 p-3 bg-muted rounded-lg flex-shrink-0">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  {t('components.keyconfigmanager.current_config')}: <span className="font-medium text-foreground">{selectedConfig}</span>
                  <span className="mx-2">•</span>
                  {t('components.keyconfigmanager.algorithm')}: <span className="font-medium text-foreground">
                    {getCurrentConfig()?.algorithm || '未设置'}
                  </span>
                </div>
                <div>
                  {t('components.keyconfigmanager.plaintext_encoding')}: <span className="font-medium">{getCurrentConfig()?.plainEncoding?.[0] || getCurrentConfig()?.plaintextEncoding || 'UTF-8'}</span>
                  <span className="mx-2">•</span>
                  {t('components.keyconfigmanager.ciphertext_encoding')}: <span className="font-medium">{getCurrentConfig()?.cipherEncoding?.[0] || getCurrentConfig()?.ciphertextEncoding || 'BASE64'}</span>
                </div>
                {getCurrentConfig()?.algorithmType !== 'RSA' && getCurrentConfig()?.algorithm !== 'RSA' && (
                  <div>
                    {(() => {
                      const cur = getCurrentConfig();
                      const mode = cur?.mode || cur?.algorithm?.split('/')[1] || '';
                      const padding = cur?.padding || cur?.algorithm?.split('/')[2] || '';
                      return (
                        <>
                          {t('components.keyconfigmanager.mode')}: <span className="font-medium">{mode || 'CBC'}</span>
                          {NEED_PADDING_MODES.has(mode) && (
                            <>
                              <span className="mx-2">•</span>
                              {t('components.keyconfigmanager.padding')}: <span className="font-medium">{padding || 'PKCS5Padding'}</span>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                 )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

