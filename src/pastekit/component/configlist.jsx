import React from 'react';
import { Button } from '@/components/ui/button';
import { NEED_PADDING_MODES } from '../utils/keyconfigconstants';
import { useTranslation } from '../utils/i18n';

/**
 * 配置列表组件
 * 展示配置项列表和基本操作
 */
export default function ConfigList({ 
  configs = [], 
  selectedConfig = '', 
  onSelectConfig, 
  onEditConfig, 
  onDeleteConfig,
  currentPage = 1,
  itemsPerPage = 5
}) {
  const [t] = useTranslation();
  // 计算当前页显示的配置
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConfigs = configs.slice(startIndex, endIndex);

  if (currentConfigs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('components.keyconfigmanager.no_configs')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted sticky top-0">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('components.keyconfigmanager.config_name')}</th>
            <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('components.keyconfigmanager.algorithm')}</th>
            <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('components.keyconfigmanager.plaintext_encoding')}</th>
            <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('components.keyconfigmanager.ciphertext_encoding')}</th>
            <th className="text-left py-3 px-4 font-semibold text-sm border-b">{t('components.keyconfigmanager.mode')}/{t('components.keyconfigmanager.padding')}</th>
            <th className="text-center py-3 px-4 font-semibold text-sm border-b">{t('components.keyconfigmanager.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {currentConfigs.map((config, index) => (
            <ConfigRow
              key={config.name}
              config={config}
              isSelected={selectedConfig === config.name}
              rowIndex={index}
              onSelect={onSelectConfig}
              onEdit={onEditConfig}
              onDelete={onDeleteConfig}
              isDeletable={configs.length > 1}
              t={t}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 配置行组件
 */
function ConfigRow({ config, isSelected, rowIndex, onSelect, onEdit, onDelete, isDeletable, t }) {
  const displayInfo = getConfigDisplayInfo(config);
  
  return (
    <tr 
      className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10' : ''
      } ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
      onClick={() => onSelect(config.name)}
    >
      <td className="py-3 px-4 font-medium">{config.name}</td>
      <td className="py-3 px-4">{displayInfo.algorithmType}</td>
      <td className="py-3 px-4">{displayInfo.plainEncoding}</td>
      <td className="py-3 px-4">{displayInfo.cipherEncoding}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {displayInfo.modeDisplay}
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex justify-center gap-1">
          <ActionButton 
            icon="✏️"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(config.name);
            }}
            tooltip={t('common.edit')}
          />
          <ActionButton 
            icon="🗑️"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(config.name);
            }}
            disabled={!isDeletable}
            tooltip={isDeletable ? t('common.delete') : t('components.keyconfigmanager.messages.min_configs')}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * 操作按钮组件
 */
function ActionButton({ icon, onClick, disabled = false, tooltip = "" }) {
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0"
      title={tooltip}
    >
      {icon}
    </Button>
  );
}

/**
 * 获取配置显示信息
 */
function getConfigDisplayInfo(config) {
  const algorithmType = config.algorithmType || config.algorithm?.split('/')[0] || 'AES';
  const mode = config.mode || config.algorithm?.split('/')[1] || '';
  
  let modeDisplay = '';
  if (algorithmType === 'RSA' || config.algorithm?.startsWith('RSA')) {
    modeDisplay = 'N/A';
  } else {
    if (NEED_PADDING_MODES.has(mode)) {
      const padding = config.padding || config.algorithm?.split('/')[2] || 'PKCS5Padding';
      modeDisplay = `${mode || 'CBC'} / ${padding}`;
    } else {
      modeDisplay = mode || (config.algorithm?.split('/')[1] || 'CBC');
    }
  }
  
  return {
    algorithmType,
    plainEncoding: config.plainEncoding?.[0] || 'UTF8',
    cipherEncoding: config.cipherEncoding?.[0] || 'BASE64',
    modeDisplay
  };
}