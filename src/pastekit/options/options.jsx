import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup } from '@/components/ui/radio-group';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StorageUtils } from '../utils/storageutils.js';
import KeyConfigManager from '../component/keyconfigmanager.jsx';
import CipherTestComponent from '../component/ciphertest.jsx';
import SignatureTool from '../component/signaturetool.jsx';
import EncodingTool from '../component/encodingtool.jsx';
import AIPromptManager from '../component/aipromptmanager.jsx';
import Dnrmanager from '../component/dnrmanager.jsx';
import AboutComponent from '../component/about.jsx';
import DevToolsDecryptorConfig from '../component/devtoolsdecryptorconfig.jsx';
import LanguageSwitcher from '../component/languageswitcher.jsx';
import RequestListViewer from '../component/requestlistviewer.jsx';
import { useTranslation, preloadTranslations } from '../utils/i18n';

// Menu items configuration (will be translated dynamically)
const getMenuItems = (t) => [
  { id: 'key-config', label: t('options.sidebar.key_config'), icon: 'key' },
  { id: 'encryption-test', label: t('options.sidebar.encryption_test'), icon: 'test-tube' },
  { id: 'signature-tool', label: t('options.sidebar.signature_tool'), icon: 'pen-tool' },
  { id: 'encoding-tool', label: t('options.sidebar.encoding_tool') || '编解码工具', icon: 'text' },
  { id: 'mock-manager', label: t('options.sidebar.mock_manager'), icon: 'theater-masks' },
  { id: 'request-list', label: t('options.sidebar.request_list') || '请求列表', icon: 'list' },
  { id: 'devtools-decryptor', label: t('options.sidebar.devtools_decryptor') || 'DevTools 解密器', icon: 'shield' },
  { id: 'ai-prompts', label: t('options.sidebar.ai_prompts'), icon: 'message-circle' },
  { id: 'about', label: t('options.sidebar.about'), icon: 'info' }
];

export default function OptionsPage() {
  const [t, currentLanguage, isReady] = useTranslation();
  const [activeSection, setActiveSection] = useState('key-config');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // 侧边栏折叠状态
  const [showLanguageDialog, setShowLanguageDialog] = useState(false); // 语言选择弹窗
  const [currentConfig, setCurrentConfig] = useState(null);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [testData, setTestData] = useState({
    text: 'Hello World! 这是一个加密解密测试。',
    algorithm: 'RSA',
    encrypted: '',
    decrypted: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // 确保翻译数据已预加载
  useEffect(() => {
    const initializeTranslations = async () => {
      try {
        await preloadTranslations();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize translations:', error);
        setIsLoading(false);
      }
    };
    
    initializeTranslations();
  }, []);

  // 页面加载时恢复上次的 activeSection
  useEffect(() => {
    const restoreActiveSection = async () => {
      try {
        const result = await chrome.storage.local.get(['lastActiveSection']);
        if (result.lastActiveSection) {
          console.log('[Options Page] 恢复上次的 menu:', result.lastActiveSection);
          setActiveSection(result.lastActiveSection);
        }
      } catch (error) {
        console.error('[Options Page] 恢复 activeSection 失败:', error);
      }
    };
    
    restoreActiveSection();
  }, []);

  // 页面加载时恢复侧边栏折叠状态
  useEffect(() => {
    const restoreSidebarState = async () => {
      try {
        const result = await chrome.storage.local.get(['sidebarCollapsed']);
        if (result.sidebarCollapsed !== undefined) {
          console.log('[Options Page] 恢复侧边栏状态:', result.sidebarCollapsed ? '折叠' : '展开');
          setSidebarCollapsed(result.sidebarCollapsed);
        }
      } catch (error) {
        console.error('[Options Page] 恢复侧边栏状态失败:', error);
      }
    };
    
    restoreSidebarState();
  }, []);

  // 页面加载时获取保存的配置
  useEffect(() => {
    loadSavedConfigs();
  }, []);

  // Check browser support when component mounts
  useEffect(() => {
    if (typeof TextEncoder === 'undefined' || typeof TextDecoder === 'undefined') {
      console.warn('Browser does not support TextEncoder/TextDecoder, some features may be limited');
    }
  }, []);

  // Load saved configurations
  const loadSavedConfigs = async () => {
    try {
      const result = await StorageUtils.getItem('keyConfigs');
      if (result.keyConfigs && Array.isArray(result.keyConfigs)) {
        setSavedConfigs(result.keyConfigs);
        if (result.keyConfigs.length > 0) {
          setCurrentConfig(result.keyConfigs[0]);
        }
        toast.info('Configuration loaded successfully');
      } else {
        // Create default configuration if none exists
        const defaultConfig = [{
          name: 'Default Configuration',
          type: 'RSA',
          publicKey: '',
          privateKey: '',
          aesKey: '',
          aesIv: '',
          createdAt: Date.now()
        }];
        setSavedConfigs(defaultConfig);
        setCurrentConfig(defaultConfig[0]);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      toast.error(`Load failed: ${error.message}`);
    }
  };

  // Save all configurations
  const saveAllConfigs = async (configs) => {
    try {
      await StorageUtils.setItem('keyConfigs', configs);
      setSavedConfigs(configs);
      toast.success('Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error(`Save failed: ${error.message}`);
    }
  };

  // Handle configuration changes
  const handleConfigChange = (config) => {
    setCurrentConfig(config);
  };

  // 处理 menu 点击，保存当前选中的 section
  const handleMenuClick = (sectionId) => {
    console.log('[Options Page] 切换 menu:', sectionId);
    setActiveSection(sectionId);
    
    // 保存到 chrome storage
    try {
      chrome.storage.local.set({ lastActiveSection: sectionId }, () => {
        console.log('[Options Page] 已保存 lastActiveSection:', sectionId);
      });
    } catch (error) {
      console.error('[Options Page] 保存 lastActiveSection 失败:', error);
    }
  };

  // 切换侧边栏折叠状态
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    console.log('[Options Page] 切换侧边栏:', newState ? '折叠' : '展开');
    setSidebarCollapsed(newState);
    
    // 保存到 chrome storage
    try {
      chrome.storage.local.set({ sidebarCollapsed: newState }, () => {
        console.log('[Options Page] 已保存 sidebarCollapsed:', newState);
      });
    } catch (error) {
      console.error('[Options Page] 保存 sidebarCollapsed 失败:', error);
    }
  };

  // 打开语言选择弹窗
  const openLanguageDialog = () => {
    setShowLanguageDialog(true);
  };

  // 关闭语言选择弹窗
  const closeLanguageDialog = () => {
    setShowLanguageDialog(false);
  };

  // 当翻译未准备好时显示加载状态
  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-xl font-medium text-gray-700">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Preparing translation data</div>
        </div>
      </div>
    );
  }

  // Menu items configuration (will be translated dynamically)
  const menuItems = getMenuItems(t);

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar className={`border-r bg-white transition-all duration-300 ${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'}`} variant="sidebar">
          <SidebarContent className="flex flex-col h-full">
            {/* 顶部语言切换按钮 */}
            <div className={`p-4 border-b ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
              {!sidebarCollapsed && <LanguageSwitcher variant="vertical" />}
              {sidebarCollapsed && (
                <div 
                  className="text-2xl cursor-pointer hover:opacity-70 transition-opacity" 
                  title="语言切换 (Language)"
                  onClick={openLanguageDialog}
                >
                  🌐
                </div>
              )}
            </div>
            
            {/* 折叠/展开按钮 */}
            <div className="border-b p-2 bg-gray-50">
              <button
                onClick={toggleSidebar}
                className="w-full p-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                title={sidebarCollapsed ? '展开菜单' : '折叠菜单'}
              >
                {sidebarCollapsed ? (
                  <span className="text-xl">➡️</span>
                ) : (
                  <span className="text-xl">⬅️</span>
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton 
                          isActive={activeSection === item.id}
                          onClick={() => handleMenuClick(item.id)}
                          className="relative"
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <span className={`${sidebarCollapsed ? 'mx-auto text-xl' : 'mr-2 text-base'}`}>
                            {item.icon === 'key' && '🔐'}
                            {item.icon === 'test-tube' && '🧪'}
                            {item.icon === 'pen-tool' && '✍️'}
                            {item.icon === 'text' && '🔤'}
                            {item.icon === 'theater-masks' && '🎭'}
                            {item.icon === 'list' && '📋'}
                            {item.icon === 'shield' && '🛡️'}
                            {item.icon === 'message-circle' && '💬'}
                            {item.icon === 'info' && 'ℹ️'}
                          </span>
                          {!sidebarCollapsed && (
                            <span>{item.label}</span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset>
          <div className="flex-1 overflow-hidden p-6">
            {activeSection === 'key-config' && (
              <KeyConfigManager 
                onConfigChange={handleConfigChange}
                initialConfigs={savedConfigs}
              />
            )}
            
            {activeSection === 'encryption-test' && (
              <div className="space-y-6 w-full">
                <h1 className="text-2xl font-bold">{t('options.sidebar.encryption_test')}</h1>
                <CipherTestComponent 
                  configs={savedConfigs}
                  selectedConfig={currentConfig}
                  className="w-full"
                />
              </div>
            )}
            
            {activeSection === 'signature-tool' && (
              <div className="space-y-6 w-full">
                <h1 className="text-2xl font-bold">{t('options.sidebar.signature_tool')}</h1>
                <SignatureTool 
                  configs={savedConfigs}
                  className="w-full"
                />
              </div>
            )}
            
            {activeSection === 'encoding-tool' && (
              <div className="space-y-6 w-full">
                <h1 className="text-2xl font-bold">{t('options.sidebar.encoding_tool') || '编解码工具'}</h1>
                <EncodingTool className="w-full" />
              </div>
            )}
            
            {activeSection === 'mock-manager' && (
              <div className="space-y-6 w-full">
                {isReady ? (
                  <Dnrmanager t={t} />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading translations...</span>
                  </div>
                )}
              </div>
            )}
            
            {activeSection === 'request-list' && (
              <RequestListViewer />
            )}
            
            {activeSection === 'devtools-decryptor' && (
              <div className="space-y-6 w-full">
                <h1 className="text-2xl font-bold">DevTools 解密器配置</h1>
                <DevToolsDecryptorConfig 
                  configs={savedConfigs}
                  className="w-full"
                />
              </div>
            )}
            
            {activeSection === 'ai-prompts' && (
              <div className="space-y-6 w-full">
                <h1 className="text-2xl font-bold">{t('options.sidebar.ai_prompts')}</h1>
                <AIPromptManager className="w-full" />
              </div>
            )}
            {activeSection === 'about' && (
              <div className="max-w-6xl mx-auto">
                <AboutComponent />
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
      
      <Toaster />
      
      {/* 语言选择弹窗 */}
      <Dialog open={showLanguageDialog} onOpenChange={closeLanguageDialog}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>选择语言 / Select Language</DialogTitle>
            <DialogDescription>
              请选择界面显示语言
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup 
              value={currentLanguage} 
              onValueChange={(value) => {
                switchLanguage(value);
                closeLanguageDialog();
              }}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer" onClick={() => switchLanguage('en')}>
                <input type="radio" checked={currentLanguage === 'en'} readOnly className="w-4 h-4" />
                <Label htmlFor="lang-en-dialog" className="cursor-pointer text-base font-medium">
                  English
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer" onClick={() => switchLanguage('zh')}>
                <input type="radio" checked={currentLanguage === 'zh'} readOnly className="w-4 h-4" />
                <Label htmlFor="lang-zh-dialog" className="cursor-pointer text-base font-medium">
                  中文
                </Label>
              </div>
            </RadioGroup>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OptionsPage />);