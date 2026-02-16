import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '../utils/i18n';

/**
 * About组件 - 关于页面
 * 支持多语言切换的关于信息展示组件
 */
export default function AboutComponent() {
  const [t] = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('components.about.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* 功能介绍 */}
            <div>
              <h3 className="text-lg font-semibold">{t('components.about.features')}</h3>
              <p>{t('components.about.description')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {Array.isArray(t('components.about.features_list')) ? 
                  t('components.about.features_list').map((feature, index) => (
                    <li key={index}>{feature}</li>
                  )) : 
                  <li>{t('components.about.features_list')}</li>
                }
              </ul>
            </div>
            
            {/* 安全特性 */}
            <div>
              <h3 className="text-lg font-semibold mt-4">{t('components.about.security')}</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {Array.isArray(t('components.about.security_features')) ? 
                  t('components.about.security_features').map((feature, index) => (
                    <li key={index}>{feature}</li>
                  )) : 
                  <li>{t('components.about.security_features')}</li>
                }
              </ul>
            </div>
            
            {/* 开发信息 */}
            <div>
              <h3 className="text-lg font-semibold mt-4">{t('components.about.development')}</h3>
              <div className="space-y-1">
                <p><strong>{t('components.about.version')}:</strong> 1.0.0</p>
                <p><strong>{t('components.about.developer')}:</strong> PasteKitLab Team</p>
                <p><strong>GitHub:</strong> 
                  <a 
                    href="https://github.com/pastekitlab/pastekitlab"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    pastekitlab/PasteKitLab
                  </a>
                </p>
              </div>
            </div>
            
            {/* 使用提示 */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">{t('components.about.usage_tips')}</h4>
              {Array.isArray(t('components.about.tips')) ? 
                t('components.about.tips').map((tip, index) => (
                  <p key={index} className="text-sm mb-1">{tip}</p>
                )) : 
                <p className="text-sm">{t('components.about.tips')}</p>
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}