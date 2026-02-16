import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { StorageUtils } from '../utils/storageutils.js';
import KeyConfigManager from '../component/keyconfigmanager.jsx';
import CipherTestComponent from '../component/ciphertest.jsx';
import AboutComponent from '../component/about.jsx';
import LanguageSwitcher from '../component/languageswitcher.jsx';
import { useTranslation, preloadTranslations } from '../utils/i18n';

// Menu items configuration (will be translated dynamically)
const getMenuItems = (t) => [
  { id: 'key-config', label: t('options.sidebar.key_config'), icon: 'key' },
  { id: 'encryption-test', label: t('options.sidebar.encryption_test'), icon: 'test-tube' },
  { id: 'about', label: t('options.sidebar.about'), icon: 'info' }
];

export default function OptionsPage() {
  const [t, currentLanguage, isReady] = useTranslation();
  const [activeSection, setActiveSection] = useState('key-config');
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

  // 当翻译未准备好时显示加载状态
  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar className="border-r bg-white" variant="sidebar">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="p-4">
                  <LanguageSwitcher variant="vertical" />
                </div>
                <Separator className="my-2" />
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        isActive={activeSection === item.id}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <span className="mr-2">
                          {item.icon === 'key' && '🔐'}
                          {item.icon === 'test-tube' && '🧪'}
                          {item.icon === 'info' && 'ℹ️'}
                        </span>
                        {item.label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset>
          <div className="flex-1 overflow-auto p-6">
            {activeSection === 'key-config' && (
              <KeyConfigManager 
                onConfigChange={handleConfigChange}
                initialConfigs={savedConfigs}
              />
            )}
            
            {activeSection === 'encryption-test' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold">{t('options.sidebar.encryption_test')}</h1>
                <CipherTestComponent 
                  configs={savedConfigs}
                  selectedConfig={currentConfig}
                />
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
    </SidebarProvider>
  );
}

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OptionsPage />);