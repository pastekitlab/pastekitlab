import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useLanguage, SUPPORTED_LANGUAGES } from '../utils/i18n';

/**
 * 语言切换Radio组件
 * 支持中英文切换，默认与浏览器语言环境一致
 */
export default function LanguageSwitcher({ className = '', onLanguageChange, variant = 'horizontal' }) {
  const { currentLanguage, switchLanguage } = useLanguage();

  const handleLanguageChange = async (value) => {
    await switchLanguage(value);
    if (onLanguageChange && typeof onLanguageChange === 'function') {
      onLanguageChange(value);
    }
  };

  // 水平布局样式
  const horizontalClass = variant === 'horizontal' 
    ? 'flex items-center justify-end space-x-2' 
    : 'space-y-2';

  return (
    <div className={`${horizontalClass} ${className}`}>
      <RadioGroup 
        value={currentLanguage} 
        onValueChange={handleLanguageChange}
        className="flex items-center space-x-2"
      >
        <div className="flex items-center space-x-1">
          <RadioGroupItem value={SUPPORTED_LANGUAGES.EN} id="lang-en" className="w-4 h-4" />
          <Label htmlFor="lang-en" className="cursor-pointer text-sm">
            EN
          </Label>
        </div>
        <div className="flex items-center space-x-1">
          <RadioGroupItem value={SUPPORTED_LANGUAGES.ZH} id="lang-zh" className="w-4 h-4" />
          <Label htmlFor="lang-zh" className="cursor-pointer text-sm">
            中
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

/**
 * 简化版本的语言切换按钮组
 */
export function SimpleLanguageSwitcher({ className = '', variant = 'horizontal' }) {
  const { currentLanguage, switchLanguage } = useLanguage();

  const languages = [
    { code: SUPPORTED_LANGUAGES.EN, label: 'EN', fullName: 'English' },
    { code: SUPPORTED_LANGUAGES.ZH, label: '中', fullName: '中文' }
  ];

  const containerClass = variant === 'vertical' 
    ? 'flex flex-col space-y-2' 
    : 'flex space-x-2';

  return (
    <div className={`space-y-2 flex ${className}`}>
      <div className={containerClass}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={`
              px-3 py-1 rounded-md text-sm font-medium transition-colors
              ${currentLanguage === lang.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
            title={lang.fullName}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}