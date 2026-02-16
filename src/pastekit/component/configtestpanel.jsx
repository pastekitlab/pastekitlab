import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation, useLanguage } from '../utils/i18n';

/**
 * 语言切换面板组件
 * 提供简单的语言切换功能
 */
export default function LanguageSwitchPanel() {
  const [t, currentLanguage] = useTranslation();
  const { switchLanguage, getSupportedLanguages } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  const togglePanel = () => {
    setIsVisible(!isVisible);
  };

  const handleLanguageSwitch = async (language) => {
    try {
      await switchLanguage(language);
      console.log(`[LanguageSwitch] Switched to ${language}`);
    } catch (error) {
      console.error('[LanguageSwitch] Failed to switch language:', error);
    }
  };

  const supportedLanguages = getSupportedLanguages();

  if (!isVisible) {
    return (
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={togglePanel}
          className="bg-secondary hover:bg-secondary/80"
        >
          🌐 {t('common.language_switch')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 面板标题和关闭按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🌐 {t('common.language_switch')}</span>
        </h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={togglePanel}
          className="h-8 w-8 p-0"
        >
          ✕
        </Button>
      </div>
      
      {/* 语言切换选项 */}
      <div className="p-4 bg-muted rounded-lg border">
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            {t('common.select_language')}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(supportedLanguages).map(([key, langCode]) => (
              <Button
                key={langCode}
                variant={currentLanguage === langCode ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageSwitch(langCode)}
                className="capitalize"
              >
                {langCode === 'zh' ? '中文' : 'English'}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {t('common.current_language')}: {currentLanguage === 'zh' ? '中文' : 'English'}
          </div>
        </div>
      </div>
    </div>
  );
}