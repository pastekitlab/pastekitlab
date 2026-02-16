import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import CipherTool from './ciphertool';
import { useTranslation } from '../utils/i18n';
import { 
  normalizeConfig, 
  validateRequiredFields,
  ConfigManager 
} from '../utils/keyconfigutils';
import { 
  ENCODING_OPTIONS,
  PLAINTEXT_ENCODING_OPTIONS,
  CIPHERTEXT_ENCODING_OPTIONS,
  updateKeyValue,
  updateKeyEncoding,
  updateIvValue,
  updateIvEncoding,
  addPlainEncoding,
  removePlainEncoding,
  addCipherEncoding,
  removeCipherEncoding
} from '../utils/encodinghandlers';

/**
 * 配置编辑器主组件
 */
export default function ConfigEditor({ 
  config, 
  onSave, 
  onDelete, 
  showGenerateButton = true,
  onCancel 
}) {
  const [t] = useTranslation();
  const normalizedConfig = normalizeConfig(config);
  const [editedConfig, setEditedConfig] = useState(normalizedConfig);

  const handleSave = () => {
    const validationResult = validateRequiredFields(editedConfig);
    if (!validationResult.isValid) {
      toast.error(validationResult.message);
      return;
    }
    
    onSave(editedConfig);
  };

  const handleDelete = () => {
    onDelete(config.name);
  };

  const handleGenerateKeys = () => {
    ConfigManager.generateRSAKeys((keyPairData) => {
      const formattedKeys = ConfigManager.formatRSAKeyPair(keyPairData);
      setEditedConfig(prev => ({
        ...prev,
        ...formattedKeys
      }));
    });
  };

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-2">
      {/* 基础配置 */}
      <BasicConfigEditor 
        config={editedConfig}
        onUpdateConfig={setEditedConfig}
        t={t}
      />

      <Separator />

      {/* 密钥配置 */}
      <KeyConfigEditor
        config={editedConfig}
        onUpdateConfig={setEditedConfig}
        showGenerateButton={showGenerateButton}
        onGenerateKeys={handleGenerateKeys}
        t={t}
      />

      <Separator />

      {/* 编码设置 */}
      <EncodingSettingsEditor
        plainEncoding={editedConfig.plainEncoding}
        cipherEncoding={editedConfig.cipherEncoding}
        onAddPlainEncoding={(encoding) => addPlainEncoding(setEditedConfig, encoding)}
        onRemovePlainEncoding={(encoding) => removePlainEncoding(setEditedConfig, encoding)}
        onUpdatePlainEncoding={(encoding) => updatePlainEncoding(setEditedConfig, encoding)}
        onAddCipherEncoding={(encoding) => addCipherEncoding(setEditedConfig, encoding)}
        onRemoveCipherEncoding={(encoding) => removeCipherEncoding(setEditedConfig, encoding)}
        onUpdateCipherEncoding={(encoding) => updateCipherEncoding(setEditedConfig, encoding)}
        t={t}
      />

      <Separator />

      {/* 操作按钮 */}
      <ActionButtons 
        onDelete={handleDelete}
        onCancel={onCancel}
        onSave={handleSave}
        t={t}
      />
    </div>
  );
}

/**
 * 基础配置编辑器
 */
function BasicConfigEditor({ config, onUpdateConfig, t }) {
  return (
    <div className="space-y-4">
      <div className="pb-2 border-b">
        <h3 className="text-lg font-semibold">{t('components.keyconfigmanager.base_config')}</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="configName">{t('components.keyconfigmanager.config_name')} *</Label>
          <Input
            id="configName"
            value={config.name}
            onChange={(e) => onUpdateConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('components.keyconfigmanager.messages.enter_name')}
          />
        </div>
        
        <div>
          <CipherTool
            initialValue={{
              algorithm: config.algorithm || '',
              model: config.mode || config.model || '',
              padding: config.padding || ''
            }}
            onSave={(merged) => {
              const updated = ConfigManager.updateAlgorithmConfig(config, merged);
              onUpdateConfig(updated);
              toast.success('算法设置已应用并保存');
            }}
            onChange={(merged) => {
              const updated = ConfigManager.updateAlgorithmConfig(config, merged);
              onUpdateConfig(updated);
            }}
            onCancel={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 密钥配置编辑器
 */
function KeyConfigEditor({ config, onUpdateConfig, showGenerateButton, onGenerateKeys, t }) {
  return (
    <div className="space-y-4">
      <div className="pb-2 border-b">
        <h3 className="text-lg font-semibold">{t('components.keyconfigmanager.key_config')}</h3>
      </div>
      
      {config.algorithmType === 'RSA' ? (
        <RSAModeEditor 
          config={config}
          onUpdateConfig={onUpdateConfig}
          onGenerateKeys={onGenerateKeys}
          showGenerateButton={showGenerateButton}
          t={t}
        />
      ) : (
        <SymmetricModeEditor 
          config={config}
          onUpdateConfig={onUpdateConfig}
          t={t}
        />
      )}
    </div>
  );
}

/**
 * RSA模式编辑器
 */
function RSAModeEditor({ config, onUpdateConfig, onGenerateKeys, showGenerateButton, t }) {
  const updatePublicKeyValue = (value) => {
    onUpdateConfig(prev => ({
      ...prev,
      publicKey: {
        ...prev.publicKey,
        value: value
      }
    }));
  };

  const updatePublicKeyEncoding = (encoding) => {
    onUpdateConfig(prev => ({
      ...prev,
      publicKey: {
        ...prev.publicKey,
        encoding: [encoding]
      }
    }));
  };

  const updatePrivateKeyValue = (value) => {
    onUpdateConfig(prev => ({
      ...prev,
      privateKey: {
        ...prev.privateKey,
        value: value
      }
    }));
  };

  const updatePrivateKeyEncoding = (encoding) => {
    onUpdateConfig(prev => ({
      ...prev,
      privateKey: {
        ...prev.privateKey,
        encoding: [encoding]
      }
    }));
  };

  return (
    <>
      <div>
        <Label>{t('components.keyconfigmanager.public_key')} *</Label>
        <div className="flex gap-2">
          <Textarea
            value={config.publicKey?.value || ''}
            onChange={(e) => updatePublicKeyValue(e.target.value)}
            placeholder={t('components.keyconfigmanager.public_key')}
            className="font-mono text-sm flex-1"
            rows={6}
          />
          <Select 
            value={config.publicKey?.encoding?.[0] || 'UTF8'} 
            onValueChange={updatePublicKeyEncoding}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODING_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t('components.keyconfigmanager.private_key')} *</Label>
        <div className="flex gap-2">
          <Textarea
            value={config.privateKey?.value || ''}
            onChange={(e) => updatePrivateKeyValue(e.target.value)}
            placeholder={t('components.keyconfigmanager.private_key')}
            className="font-mono text-sm flex-1"
            rows={6}
          />
          <Select 
            value={config.privateKey?.encoding?.[0] || 'UTF8'} 
            onValueChange={updatePrivateKeyEncoding}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODING_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {showGenerateButton && (
        <Button variant="success" onClick={onGenerateKeys} className="w-full">
          🔑 {t('components.keyconfigmanager.generate_keys')}
        </Button>
      )}
    </>
  );
}

/**
 * 对称算法模式编辑器
 */
function SymmetricModeEditor({ config, onUpdateConfig, t }) {
  const updateKeyValueLocal = (value) => {
    updateKeyValue(onUpdateConfig, value);
  };

  const updateKeyEncodingLocal = (encoding) => {
    updateKeyEncoding(onUpdateConfig, encoding);
  };

  const updateIvValueLocal = (value) => {
    updateIvValue(onUpdateConfig, value);
  };

  const updateIvEncodingLocal = (encoding) => {
    updateIvEncoding(onUpdateConfig, encoding);
  };

  return (
    <>
      <div>
        <Label>{t('components.keyconfigmanager.key')} *</Label>
        <div className="flex gap-2">
          <Input
            value={config.key?.value || ''}
            onChange={(e) => updateKeyValueLocal(e.target.value)}
            placeholder={t('components.keyconfigmanager.key')}
            className="flex-1"
          />
          <Select 
            value={config.key?.encoding?.[0] || 'HEX'} 
            onValueChange={updateKeyEncodingLocal}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODING_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t('components.keyconfigmanager.iv')}</Label>
        <div className="flex gap-2">
          <Input
            value={config.iv?.value || ''}
            onChange={(e) => updateIvValueLocal(e.target.value)}
            placeholder={`${t('components.keyconfigmanager.iv')} (${t('common.optional')})`}
            className="flex-1"
          />
          <Select 
            value={config.iv?.encoding?.[0] || 'UTF8'} 
            onValueChange={updateIvEncodingLocal}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODING_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

/**
 * 编码设置编辑器
 */
function EncodingSettingsEditor({ 
  plainEncoding = [], 
  cipherEncoding = [],
  onAddPlainEncoding,
  onRemovePlainEncoding,
  onUpdatePlainEncoding,
  onAddCipherEncoding,
  onRemoveCipherEncoding,
  onUpdateCipherEncoding,
  t 
}) {
  return (
    <div className="space-y-4">
      <div className="pb-2 border-b">
        <h3 className="text-lg font-semibold">{t('components.keyconfigmanager.encoding_settings')}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('components.keyconfigmanager.plaintext_encoding')}</Label>
          <div className="space-y-2">
            {/* 复合编码显示 */}
            <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded bg-gray-50">
              {plainEncoding.map((encoding, index) => (
                <div key={index} className="flex items-center bg-green-100 px-2 py-1 rounded text-sm">
                  <span>{encoding}</span>
                  <button 
                    type="button"
                    onClick={() => onRemovePlainEncoding(encoding)}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </div>
              )) || (
                <span className="text-gray-400 text-sm">{t('components.keyconfigmanager.no_encodings_selected')}</span>
              )}
            </div>
            
            {/* 编码选择器 */}
            <Select onValueChange={onAddPlainEncoding}>
              <SelectTrigger>
                <SelectValue placeholder={`${t('common.add')} ${t('components.keyconfigmanager.plaintext_encoding')}`} />
              </SelectTrigger>
              <SelectContent>
                {PLAINTEXT_ENCODING_OPTIONS.map(option => {
                  return (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* 说明文字 */}
            <div className="text-xs text-gray-500">
              {t('components.keyconfigmanager.support_compound_encoding')}
            </div>
          </div>
        </div>
        
        <div>
          <Label>{t('components.keyconfigmanager.ciphertext_encoding')}</Label>
          <div className="space-y-2">
            {/* 复合编码显示 */}
            <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded bg-gray-50">
              {cipherEncoding.map((encoding, index) => (
                <div key={index} className="flex items-center bg-blue-100 px-2 py-1 rounded text-sm">
                  <span>{encoding}</span>
                  <button 
                    type="button"
                    onClick={() => onRemoveCipherEncoding(encoding)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
              )) || (
                <span className="text-gray-400 text-sm">{t('components.keyconfigmanager.no_encodings_selected')}</span>
              )}
            </div>
            
            {/* 编码选择器 */}
            <Select onValueChange={onAddCipherEncoding}>
              <SelectTrigger>
                <SelectValue placeholder={`${t('common.add')} ${t('components.keyconfigmanager.ciphertext_encoding')}`} />
              </SelectTrigger>
              <SelectContent>
                {CIPHERTEXT_ENCODING_OPTIONS.map(option => {
                  const isSelected = cipherEncoding.includes(option.value);
                  return (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={isSelected}
                    >
                      {option.label}{isSelected ? ' (' + t('common.added') + ')' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* 说明文字 */}
            <div className="text-xs text-gray-500">
              {t('components.keyconfigmanager.support_compound_encoding')}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">{t('components.keyconfigmanager.encoding_explanation')}</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• <strong>{t('components.keyconfigmanager.plaintext_encoding')}</strong>: {t('components.keyconfigmanager.plaintext_encoding_desc')}</li>
          <li>• <strong>{t('components.keyconfigmanager.ciphertext_encoding')}</strong>: {t('components.keyconfigmanager.ciphertext_encoding_desc')}</li>
          <li>• <strong>{t('components.keyconfigmanager.key_iv_encoding')}</strong>: {t('components.keyconfigmanager.key_iv_encoding_desc')}</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * 操作按钮组
 */
function ActionButtons({ onDelete, onCancel, onSave, t }) {
  return (
    <div className="flex justify-between sticky bottom-0 bg-background pt-4 pb-2">
      <div className="flex gap-2">
        <Button variant="destructive" onClick={onDelete}>
          🗑️ {t('components.keyconfigmanager.delete_config')}
        </Button>
      </div>
      
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSave}>
          {t('components.keyconfigmanager.save_config')}
        </Button>
      </div>
    </div>
  );
}