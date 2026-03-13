/**
 * Proxy Request Decryptor Utils
 * 处理代理请求的解密逻辑，统一 handleProxyRequest 和 handleNetworkData 的解密处理
 */

import { CipherUtils } from '../../utils/cipher/cipherutils.js';

/**
 * 检测内容编码类型
 * @param {string} content - 待检测的内容
 * @returns {string} - 编码类型：HEX, BASE64, BASE64_URLSAFE, JSON, PLAIN, UNKNOWN
 */
export function detectContentEncoding(content) {
    if (!content || typeof content !== 'string') {
        return 'UNKNOWN';
    }
    
    const trimmed = content.trim();
    
    // 检测 Hex 格式 (只包含 0-9, a-f, A-F 且长度为偶数)
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
        return 'HEX';
    }
    
    // 检测 Base64 格式
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
            return 'BASE64';
        }
    }
    
    // 检测 Base64 URL 安全格式
    if (/^[-_A-Za-z0-9]*=?=?$/.test(trimmed)) {
        return 'BASE64_URLSAFE';
    }
    
    // 检测 JSON 格式
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return 'JSON';
        } catch (e) {
            // 不是有效的 JSON
        }
    }
    
    return 'PLAIN';
}

/**
 * 在 JSON 中查找编码值并解密
 * @param {object} obj - JSON 对象
 * @param {object} keyConfig - 密钥配置
 * @param {object} cipherUtils - 加密工具实例
 * @returns {object} - 解密后的对象
 */
export function findAndDecryptEncodedValues(obj, keyConfig, cipherUtils) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    const result = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            const encodingType = detectContentEncoding(value);
            if (['HEX', 'BASE64', 'BASE64_URLSAFE'].includes(encodingType)) {
                try {
                    // 尝试解密
                    const decrypted = cipherUtils.decrypt(value, keyConfig);
                    if (decrypted && decrypted !== value) {
                        result[key] = decrypted;
                        console.log(`[ProxyDecryptor] 成功解密 JSON 字段 ${key}: ${value.substring(0, 30)}... -> ${decrypted.substring(0, 30)}...`);
                        
                        // 如果解密结果是 JSON，继续解析
                        if (detectContentEncoding(decrypted) === 'JSON') {
                            try {
                                return JSON.parse(decrypted);
                            } catch (e) {
                                // 解析失败，保持原值
                            }
                        }
                        continue;
                    }
                } catch (decryptError) {
                    console.log(`[ProxyDecryptor] JSON 字段 ${key} 解密失败:`, decryptError.message);
                }
            }
            // 如果不是编码格式或解密失败，保持原值
            result[key] = value;
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * 深度解密 JSON 对象中的所有可解密的字符串值
 * 递归处理所有层级的 value 值
 * @param {object|string} data - 待解密的数据（JSON 对象或字符串）
 * @param {object} keyConfig - 密钥配置
 * @param {object} cipherUtils - 加密工具实例
 * @param {number} depth - 当前递归深度（防止无限递归）
 * @returns {any} - 解密后的数据
 */
export function deepDecryptJSON(data, keyConfig, cipherUtils, depth = 0) {
    // 限制递归深度，防止无限循环
    if (depth > 1) {
        console.warn('[ProxyDecryptor] 达到最大递归深度，停止解密');
        return data;
    }
    
    // 如果是字符串，尝试检测并解密
    if (typeof data === 'string') {
        const encodingType = detectContentEncoding(data);
        
        // 增加长度限制：长度为 32 或 36 的不处理（可能是 UUID 或其他标识符）
        if (data.length === 32 || data.length === 36) {
            console.debug(`[ProxyDecryptor] 跳过长度为 ${data.length} 的字符串，可能是 UUID 或标识符`);
            return data;
        }
        
        if (['HEX', 'BASE64', 'BASE64_URLSAFE'].includes(encodingType)) {
            try {
                const decrypted = cipherUtils.decrypt(data, keyConfig);
                if (decrypted && decrypted !== data) {
                    console.log(`[ProxyDecryptor] 解密字符串成功：${data.substring(0, 50)}...`);
                    
                    // 如果解密结果是 JSON 格式，先转换为 JSON 对象
                    if (detectContentEncoding(decrypted) === 'JSON') {
                        try {
                            const jsonObj = JSON.parse(decrypted);
                            console.log('[ProxyDecryptor] 解密结果是 JSON，继续递归处理');
                            // 递归处理 JSON 对象
                            return deepDecryptJSON(jsonObj, keyConfig, cipherUtils, depth + 1);
                        } catch (parseError) {
                            console.warn('[ProxyDecryptor] JSON 解析失败，返回原始解密结果:', parseError.message);
                            // 解析失败，返回解密后的字符串
                            return decrypted;
                        }
                    }
                    
                    // 不是 JSON，递归处理解密后的字符串（可能还包含嵌套的加密数据）
                    return deepDecryptJSON(decrypted, keyConfig, cipherUtils, depth + 1);
                }
            } catch (decryptError) {
                console.debug(`[ProxyDecryptor] 字符串解密失败:`, decryptError.message);
            }
        }
        return data;
    }
    
    // 如果是数组，递归处理每个元素
    if (Array.isArray(data)) {
        return data.map(item => deepDecryptJSON(item, keyConfig, cipherUtils, depth + 1));
    }
    
    // 如果是对象，递归处理每个属性
    if (typeof data === 'object' && data !== null) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = deepDecryptJSON(value, keyConfig, cipherUtils, depth + 1);
        }
        return result;
    }
    
    // 其他类型直接返回
    return data;
}

/**
 * 解密单个数据体（请求体或响应体）
 * @param {string} data - 待解密的数据
 * @param {object} keyConfig - 密钥配置
 * @param {string} dataType - 数据类型：'request' 或 'response'
 * @returns {object} - { plainData: 解密后的数据，originalData: 原始数据，error: 错误信息 }
 */
export function decryptDataBody(data, keyConfig, dataType = 'request') {
    if (!data) {
        return { plainData: null, originalData: data };
    }
    
    const typeLabel = dataType === 'request' ? '请求体' : '响应体';
    let plainData = null;
    
    try {
        const encoding = detectContentEncoding(data);
        console.log(`[ProxyDecryptor] ${typeLabel}编码类型:`, encoding);
        
        if (['HEX', 'BASE64', 'BASE64_URLSAFE'].includes(encoding)) {
            // 直接解密编码格式的数据
            plainData = CipherUtils.decrypt(data, keyConfig);
            console.info(`[ProxyDecryptor] 直接解密${typeLabel}成功：${data.substring(0, 50)}... -> ${plainData?.substring(0, 50)}...`);
            
            // 如果解密结果是 JSON 格式，递归解密所有可解密的 value 值
            if (plainData && detectContentEncoding(plainData) === 'JSON') {
                try {
                    const jsonObj = JSON.parse(plainData);
                    const deepDecryptedObj = deepDecryptJSON(jsonObj, keyConfig, CipherUtils);
                    plainData = JSON.stringify(deepDecryptedObj, null, 2);
                    console.info(`[ProxyDecryptor] JSON ${typeLabel}深度解密完成`);
                } catch (jsonError) {
                    console.warn(`[ProxyDecryptor] JSON 深度解密失败，使用普通解密结果:`, jsonError.message);
                }
            }
        } else if (encoding === 'JSON') {
            // JSON 格式，查找并解密其中的编码值（包括第一层 value）
            try {
                const jsonObj = JSON.parse(data);
                // 使用深度解密处理所有层级
                const decryptedObj = deepDecryptJSON(jsonObj, keyConfig, CipherUtils);
                plainData = JSON.stringify(decryptedObj, null, 2);
                console.info(`[ProxyDecryptor] JSON ${typeLabel}深度解密完成`);
            } catch (jsonError) {
                console.warn(`[ProxyDecryptor] JSON 解析失败，跳过${typeLabel}处理:`, jsonError.message);
                plainData = data;
            }
        } else {
            // 其他格式，尝试直接解密
            try {
                plainData = CipherUtils.decrypt(data, keyConfig);
                console.info(`[ProxyDecryptor] 尝试直接解密${typeLabel}: ${data.substring(0, 50)}... -> ${plainData?.substring(0, 50)}...`);
                
                // 如果解密结果是 JSON 格式，递归解密所有可解密的 value 值
                if (plainData && detectContentEncoding(plainData) === 'JSON') {
                    try {
                        const jsonObj = JSON.parse(plainData);
                        const deepDecryptedObj = deepDecryptJSON(jsonObj, keyConfig, CipherUtils);
                        plainData = JSON.stringify(deepDecryptedObj, null, 2);
                        console.info(`[ProxyDecryptor] ${typeLabel}解密后 JSON 深度解密完成`);
                    } catch (jsonError) {
                        console.warn(`[ProxyDecryptor] JSON 深度解密失败:`, jsonError.message);
                    }
                }
            } catch (decryptError) {
                console.log(`[ProxyDecryptor] ${typeLabel}直接解密失败，保持原值:`, decryptError.message);
                plainData = data;
            }
        }
        
        // JSON 美化（如果还没有格式化）
        if (plainData && typeof plainData === 'string' && detectContentEncoding(plainData) === 'JSON') {
            try {
                const parsed = JSON.parse(plainData);
                plainData = JSON.stringify(parsed, null, 2);
                console.info(`[ProxyDecryptor] ${typeLabel}明文 JSON 美化完成`);
            } catch (beautifyError) {
                // 不是 JSON，保持原样
                console.debug(`[ProxyDecryptor] ${typeLabel}明文不是 JSON 格式，跳过美化`);
            }
        }
        
        return { plainData, originalData: data };
    } catch (error) {
        console.error(`[ProxyDecryptor] 解密${typeLabel}失败:`, error);
        return { plainData: data, originalData: data, error: error.message };
    }
}

/**
 * 执行完整的解密处理
 * @param {object} params - 参数对象
 * @param {string} params.requestBody - 请求体
 * @param {string} params.responseBody - 响应体
 * @param {object} params.requestKeyConfig - 请求密钥配置
 * @param {object} params.responseKeyConfig - 响应密钥配置
 * @returns {object} - { plainRequestBody, plainResponseBody, error }
 */
export async function performDecryption({ requestBody, responseBody, requestKeyConfig, responseKeyConfig }) {
    let plainRequestBody = null;
    let plainResponseBody = null;
    let error = null;
    
    try {
        // 解密响应体
        if (responseBody) {
            const responseResult = decryptDataBody(responseBody, responseKeyConfig, 'response');
            plainResponseBody = responseResult.plainData;
            if (responseResult.error) {
                error = responseResult.error;
            }
        }
        
        // 解密请求体
        if (requestBody) {
            const requestResult = decryptDataBody(requestBody, requestKeyConfig, 'request');
            plainRequestBody = requestResult.plainData;
            if (requestResult.error && !error) {
                error = requestResult.error;
            }
        }
    } catch (err) {
        console.error('[ProxyDecryptor] 解密过程中发生错误:', err);
        error = err.message;
    }
    
    return {
        plainRequestBody,
        plainResponseBody,
        error
    };
}
