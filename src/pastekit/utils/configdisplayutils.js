/**
 * 配置显示工具类
 * 处理配置信息的显示和格式化
 */
import { NEED_PADDING_MODES } from './keyconfigconstants';

/**
 * 配置显示处理器类
 */
export class ConfigDisplayHandler {
  /**
   * 获取配置的基本显示信息
   * @param {Object} config - 配置对象
   * @returns {Object} 显示信息对象
   */
  static getConfigBasicInfo(config) {
    if (!config) return {};
    
    const algorithmType = config.algorithmType || config.algorithm?.split('/')[0] || 'AES';
    const mode = config.mode || config.algorithm?.split('/')[1] || '';
    const padding = config.padding || config.algorithm?.split('/')[2] || '';
    
    return {
      algorithmType,
      mode,
      padding,
      plainEncoding: config.plainEncoding?.[0] || 'UTF8',
      cipherEncoding: config.cipherEncoding?.[0] || 'BASE64',
      needsPadding: NEED_PADDING_MODES.has(mode)
    };
  }

  /**
   * 获取配置的模式显示文本
   * @param {Object} config - 配置对象
   * @returns {string} 模式显示文本
   */
  static getModeDisplayText(config) {
    if (!config) return '';
    
    const algorithmType = config.algorithmType || config.algorithm?.split('/')[0] || '';
    
    // RSA算法不显示模式和填充
    if (algorithmType === 'RSA' || config.algorithm?.startsWith('RSA')) {
      return 'N/A';
    }
    
    const mode = config.mode || config.algorithm?.split('/')[1] || '';
    
    if (NEED_PADDING_MODES.has(mode)) {
      const padding = config.padding || config.algorithm?.split('/')[2] || 'PKCS5Padding';
      return `${mode || 'CBC'} / ${padding}`;
    }
    
    return mode || (config.algorithm?.split('/')[1] || 'CBC');
  }

  /**
   * 获取配置的详细信息显示
   * @param {Object} config - 配置对象
   * @returns {Object} 详细信息对象
   */
  static getConfigDetails(config) {
    if (!config) return {};
    
    const basicInfo = this.getConfigBasicInfo(config);
    const modeDisplay = this.getModeDisplayText(config);
    
    return {
      ...basicInfo,
      modeDisplay,
      name: config.name,
      algorithm: config.algorithm || '未设置',
      createdAt: config.createdAt ? new Date(config.createdAt).toLocaleString() : ''
    };
  }

  /**
   * 格式化配置列表项显示
   * @param {Object} config - 配置对象
   * @param {number} index - 索引
   * @param {string} selectedConfig - 当前选中的配置名称
   * @returns {Object} 格式化后的显示对象
   */
  static formatConfigListItem(config, index, selectedConfig) {
    const details = this.getConfigDetails(config);
    
    return {
      ...details,
      isSelected: selectedConfig === config.name,
      rowIndex: index,
      rowClass: `border-b hover:bg-muted/50 cursor-pointer transition-colors ${
        details.isSelected ? 'bg-primary/10' : ''
      } ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`
    };
  }

  /**
   * 获取配置状态信息显示
   * @param {Object} config - 配置对象
   * @returns {Object} 状态信息
   */
  static getConfigStatusInfo(config) {
    if (!config) return { isValid: false, message: '配置不存在' };
    
    // 检查必需字段
    if (config.algorithm?.startsWith('RSA')) {
      if (!config.publicKey?.value?.trim() || !config.privateKey?.value?.trim()) {
        return { isValid: false, message: 'RSA配置缺少公钥或私钥' };
      }
    } else {
      if (!config.key?.value?.trim()) {
        return { isValid: false, message: '对称算法配置缺少密钥' };
      }
    }
    
    return { isValid: true, message: '配置有效' };
  }

  /**
   * 获取配置摘要信息
   * @param {Object} config - 配置对象
   * @returns {string} 配置摘要
   */
  static getConfigSummary(config) {
    if (!config) return '无配置';
    
    const details = this.getConfigDetails(config);
    const status = this.getConfigStatusInfo(config);
    
    return `${config.name} (${details.algorithmType}) - ${status.message}`;
  }

  /**
   * 获取配置编码信息显示
   * @param {Object} config - 配置对象
   * @returns {Object} 编码信息
   */
  static getConfigEncodingInfo(config) {
    if (!config) return {};
    
    return {
      plainEncoding: config.plainEncoding?.join('+') || 'UTF8',
      cipherEncoding: config.cipherEncoding?.join('+') || 'BASE64',
      keyEncoding: config.key?.encoding?.[0] || 'UTF8',
      ivEncoding: config.iv?.encoding?.[0] || 'UTF8',
      publicKeyEncoding: config.publicKey?.encoding?.[0] || 'UTF8',
      privateKeyEncoding: config.privateKey?.encoding?.[0] || 'UTF8'
    };
  }
}

// 导出便捷函数
export const getConfigBasicInfo = ConfigDisplayHandler.getConfigBasicInfo;
export const getModeDisplayText = ConfigDisplayHandler.getModeDisplayText;
export const getConfigDetails = ConfigDisplayHandler.getConfigDetails;
export const formatConfigListItem = ConfigDisplayHandler.formatConfigListItem;
export const getConfigStatusInfo = ConfigDisplayHandler.getConfigStatusInfo;
export const getConfigSummary = ConfigDisplayHandler.getConfigSummary;
export const getConfigEncodingInfo = ConfigDisplayHandler.getConfigEncodingInfo;