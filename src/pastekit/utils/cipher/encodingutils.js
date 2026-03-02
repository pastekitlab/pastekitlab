import CryptoJS from 'crypto-js';

/**
 * 编码处理工具类
 * 遵循开发规范：统一处理编码逻辑，避免重复编码
 */
export class EncodingUtils {
    /**
     * 将数据按照指定编码方式进行编码
     * @param {string|ArrayBuffer} data - 原始数据
     * @param {string} dataEncoding - 数据本身的编码格式
     * @param {string[]} encodings - 后续编码方式数组，从外到内应用
     * @returns {string} 编码后的字符串
     */
    static encode(data, dataEncoding = 'UTF8', encodings = []) {
        let result = data;

        // 首先处理数据本身的编码格式
        if (dataEncoding && dataEncoding.toUpperCase() !== 'UTF8') {
            result = this._convertDataEncoding(result, dataEncoding);
        }

        // 如果没有后续编码，直接返回
        if (!encodings || encodings.length === 0) {
            return typeof result === 'string' ? result : result.toString(CryptoJS.enc.Base64);
        }

        // 检查是否需要跳过重复编码
        const shouldSkipDuplicateEncoding = this.shouldSkipEncoding(dataEncoding, encodings);

        // 确保输入是WordArray格式
        if (typeof result === 'string') {
            result = this._parseInputToWordArray(result, shouldSkipDuplicateEncoding);
        }

        // 应用后续编码处理
        result = this._applyEncodings(result, encodings, shouldSkipDuplicateEncoding, dataEncoding);

        // 返回最终结果
        return this._formatOutput(result);
    }

    /**
     * 检查是否需要跳过重复编码
     * @private
     * @param {string} dataEncoding - 数据本身的编码格式
     * @param {string[]} encodings - 后续编码配置
     * @returns {boolean} 是否需要跳过
     */
    static shouldSkipEncoding(dataEncoding, encodings) {
        // 当数据编码格式与第一个后续编码格式一致时，跳过重复编码
        return dataEncoding &&
            encodings.length > 0 &&
            dataEncoding.toUpperCase() === encodings[0].toUpperCase();
    }

    /**
     * 将输入数据解析为WordArray格式
     * @private
     * @param {string} input - 输入字符串
     * @param {boolean} skipBase64 - 是否跳过Base64处理
     * @returns {CryptoJS.lib.WordArray} WordArray对象
     */
    static _parseInputToWordArray(input, skipBase64) {
        if (skipBase64) {
            // 直接解析为Base64 WordArray，避免重复编码
            return CryptoJS.enc.Base64.parse(input);
        } else {
            // 按UTF-8解析
            return CryptoJS.enc.Utf8.parse(input);
        }
    }

    /**
     * 应用编码处理
     * @private
     * @param {CryptoJS.lib.WordArray} data - 数据
     * @param {string[]} encodings - 编码配置
     * @param {boolean} skipFirstBase64 - 是否跳过首次Base64编码
     * @returns {any} 处理后的数据
     */
    static _applyEncodings(data, encodings, skipFirstBase64, dataEncoding = 'UTF8') {
        let result = data;
        let currentEncoding = dataEncoding;
        let shouldSkipNextBase64 = skipFirstBase64;

        // 从内到外应用编码（逆序处理）
        for (let i = encodings.length - 1; i >= 0; i--) {
            const encoding = encodings[i].toUpperCase();
            result = this._applySingleEncoding(result, encoding, shouldSkipNextBase64, currentEncoding, i===encodings.length - 1);
            // 更新当前编码格式
            currentEncoding = encoding;
            // 更新跳过标志
            if (shouldSkipNextBase64 && encoding === 'BASE64') {
                shouldSkipNextBase64 = false;
            }
        }

        return result;
    }

    /**
     * 应用单个编码
     * @private
     * @param {any} data - 数据
     * @param {string} encoding - 编码类型
     * @param {boolean} skipBase64 - 是否跳过Base64编码
     * @param {string} dataEncoding - 数据本身的编码格式
     * @returns {any} 编码后的数据
     */
    static _applySingleEncoding(data, encoding, skipBase64, dataEncoding = 'UTF8', first) {
        switch (encoding) {
            case 'UTF8':
                // UTF8编码保持WordArray格式
                return data;
            case 'HEX':
                // 根据数据编码方式先转换为字符串
                if (first) {
                    const hexStr = data.toString(CryptoJS.enc.Hex);
                    console.info(`HEX编码: ${data} -> ${hexStr} ${dataEncoding}`);
                    return hexStr;
                } else {
                    const dataStr = this._convertDataToString(data, dataEncoding);
                    // 执行一次HEX编码
                    const hexStr = this._stringToHex(dataStr);
                    console.info(`HEX编码: ${dataStr} -> ${hexStr}`);
                    // 直接返回HEX字符串，不转换为WordArray
                    return hexStr;
                }
            case 'BASE64':
                if (skipBase64) {
                    console.info("跳过Base64编码，输入已为Base64格式");
                    return data;
                }
                // 根据数据编码方式先转换为字符串
                const base64DataStr = this._convertDataToString(data, dataEncoding);
                // 执行一次Base64编码
                const base64Str = this._toBase64(unescape(encodeURIComponent(base64DataStr)));
                console.info(`Base64编码: ${base64DataStr} -> ${base64Str}`);
                return CryptoJS.enc.Base64.parse(base64Str);
            case 'BASE64_URLSAFE':
                // 根据数据编码方式先转换为字符串
                const urlSafeDataStr = this._convertDataToString(data, dataEncoding);

                // 执行Base64 URL安全编码
                const urlSafeBase64 = this._toBase64(unescape(encodeURIComponent(urlSafeDataStr)))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
                return urlSafeBase64;

            default:
                throw new Error(`不支持的编码方式: ${encoding}`);
        }
    }

    /**
     * 将字符串转换为HEX格式（UTF-8编码）
     * @private
     * @param {string} str - 输入字符串
     * @returns {string} HEX格式字符串
     */
    static _stringToHex(str) {
        // 先将字符串转换为UTF-8字节数组
        const utf8Bytes = [];
        for (let i = 0; i < str.length; i++) {
            let charCode = str.charCodeAt(i);

            // 处理UTF-16代理对
            if (charCode >= 0xD800 && charCode <= 0xDBFF) {
                // 高代理项
                if (i + 1 < str.length) {
                    const lowSurrogate = str.charCodeAt(i + 1);
                    if (lowSurrogate >= 0xDC00 && lowSurrogate <= 0xDFFF) {
                        // 计算完整的码点
                        charCode = 0x10000 + ((charCode & 0x3FF) << 10) + (lowSurrogate & 0x3FF);
                        i++; // 跳过低代理项
                    }
                }
            }

            // 转换为UTF-8字节
            if (charCode < 0x80) {
                utf8Bytes.push(charCode);
            } else if (charCode < 0x800) {
                utf8Bytes.push(0xC0 | (charCode >> 6));
                utf8Bytes.push(0x80 | (charCode & 0x3F));
            } else if (charCode < 0x10000) {
                utf8Bytes.push(0xE0 | (charCode >> 12));
                utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3F));
                utf8Bytes.push(0x80 | (charCode & 0x3F));
            } else {
                utf8Bytes.push(0xF0 | (charCode >> 18));
                utf8Bytes.push(0x80 | ((charCode >> 12) & 0x3F));
                utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3F));
                utf8Bytes.push(0x80 | (charCode & 0x3F));
            }
        }

        // 转换为HEX字符串
        let hex = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            hex += utf8Bytes[i].toString(16).padStart(2, '0');
        }
        return hex;
    }

    /**
     * Base64解码
     * @private
     * @param {string} base64Str - Base64字符串
     * @returns {string} 解码后的字符串
     */
    static _base64Decode(base64Str) {
        try {
            // 预先检查字符范围，避免atob报错
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Str)) {
                throw new Error('Invalid Base64 character');
            }

            // 检查是否在background环境中（没有document对象）
            if (typeof document === 'undefined') {
                // 在background环境中使用自定义解码
                return this._fromBase64(base64Str);
            } else {
                // 在浏览器环境中使用atob
                const decoded = atob(base64Str);
                return decodeURIComponent(escape(decoded));
            }
        } catch (e) {
            // 静默处理错误，返回null而不是抛出异常
            console.warn('Base64解码失败:', e.message, '输入:', base64Str.substring(0, 50) + '...');
            return null;
        }
    }

    /**
     * 跨环境的Base64编码实现
     * @private
     * @param {string} str - 要编码的字符串
     * @returns {string} Base64编码结果
     */
    static _toBase64(str) {
        // 检查环境并选择合适的实现
        if (typeof document !== 'undefined' && typeof btoa !== 'undefined') {
            // 浏览器环境
            return btoa(str);
        } else {
            // Background环境或其他环境，使用自定义实现
            return this._customBase64Encode(str);
        }
    }

    /**
     * 跨环境的Base64解码实现
     * @private
     * @param {string} base64Str - Base64字符串
     * @returns {string} 解码结果
     */
    static _fromBase64(base64Str) {
        // 检查环境并选择合适的实现
        if (typeof document !== 'undefined' && typeof atob !== 'undefined') {
            // 浏览器环境
            const decoded = atob(base64Str);
            return decodeURIComponent(escape(decoded));
        } else {
            // Background环境或其他环境，使用自定义实现
            return this._customBase64Decode(base64Str);
        }
    }

    /**
     * 自定义Base64编码实现
     * @private
     * @param {string} str - 要编码的字符串
     * @returns {string} Base64编码结果
     */
    static _customBase64Encode(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        // 使用标准的 Base64 分组处理方式
        for (let groupStart = 0; groupStart < str.length; groupStart += 3) {
            // 获取三个字节（不足的用0补齐）
            const chr1 = str.charCodeAt(groupStart);
            const chr2 = groupStart + 1 < str.length ? str.charCodeAt(groupStart + 1) : 0;
            const chr3 = groupStart + 2 < str.length ? str.charCodeAt(groupStart + 2) : 0;
            
            // 计算四个6位值
            const enc1 = chr1 >> 2;
            const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            const enc4 = chr3 & 63;
            
            // 根据实际有效字节数添加结果
            result += chars.charAt(enc1);
            result += chars.charAt(enc2);
            
            if (groupStart + 1 >= str.length) {
                // 只有一个有效字节：添加 '=='
                result += '==';
            } else if (groupStart + 2 >= str.length) {
                // 只有两个有效字节：添加第三个字符和 '='
                result += chars.charAt(enc3) + '=';
            } else {
                // 三个字节都有效：添加所有四个字符
                result += chars.charAt(enc3) + chars.charAt(enc4);
            }
        }
        
        return result;
    }

    /**
     * 自定义Base64解码实现
     * @private
     * @param {string} base64Str - Base64字符串
     * @returns {string} 解码结果
     */
    static _customBase64Decode(base64Str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        // 移除填充字符
        base64Str = base64Str.replace(/[^A-Za-z0-9+/]/g, '');
        
        while (i < base64Str.length) {
            const enc1 = chars.indexOf(base64Str.charAt(i++));
            const enc2 = chars.indexOf(base64Str.charAt(i++));
            const enc3 = chars.indexOf(base64Str.charAt(i++));
            const enc4 = chars.indexOf(base64Str.charAt(i++));
            
            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;
            
            result += String.fromCharCode(chr1);
            
            if (enc3 !== 64) {
                result += String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                result += String.fromCharCode(chr3);
            }
        }
        
        try {
            return decodeURIComponent(escape(result));
        } catch (e) {
            return result;
        }
    }

    /**
     * 将字节数组转换为UTF-8字符串
     * @private
     * @param {number[]} bytes - 字节数组
     * @returns {string} UTF-8字符串
     */
    static _bytesToString(bytes) {
        let str = '';
        for (let i = 0; i < bytes.length; i++) {
            str += String.fromCharCode(bytes[i]);
        }
        try {
            // 尝试解码为UTF-8
            return decodeURIComponent(escape(str));
        } catch (e) {
            // 如果解码失败，直接抛出错误
            console.error('UTF-8解码失败:', e.message);
            throw new Error(`UTF-8解码失败: ${e.message}`);
        }
    }

    /**
     * 根据数据编码方式将数据转换为UTF-8字符串
     * @private
     * @param {any} data - 原始数据
     * @param {string} dataEncoding - 数据编码格式
     * @returns {string} UTF-8字符串
     */
    static _convertDataToString(data, dataEncoding) {
        const upperEncoding = dataEncoding.toUpperCase();

        switch (upperEncoding) {
            case 'HEX':
                // 如果数据本身就是HEX格式，先转换为UTF-8字符串
                const hexWordArray = CryptoJS.enc.Hex.parse(data.toString(CryptoJS.enc.Hex));
                return CryptoJS.enc.Utf8.stringify(hexWordArray);

            case 'BASE64':
                // 如果数据是Base64格式，先转换为UTF-8字符串
                const base64WordArray = CryptoJS.enc.Base64.parse(data.toString(CryptoJS.enc.Base64));
                return CryptoJS.enc.Utf8.stringify(base64WordArray);

            case 'BASE64_URLSAFE':
                // 如果数据是Base64 URL安全格式，先转换为标准Base64再转换为UTF-8
                let standardBase64 = data.toString().replace(/-/g, '+').replace(/_/g, '/');
                // 补充可能缺失的填充字符
                while (standardBase64.length % 4 !== 0) {
                    standardBase64 += '=';
                }
                const urlSafeWordArray = CryptoJS.enc.Base64.parse(standardBase64);
                return CryptoJS.enc.Utf8.stringify(urlSafeWordArray);

            default:
                // 默认UTF-8格式
                return data.toString(CryptoJS.enc.Utf8);
        }
    }

    /**
     * 格式化输出结果
     * @private
     * @param {any} data - 处理后的数据
     * @returns {string} 格式化字符串
     */
    static _formatOutput(data) {
        if (typeof data === 'string') {
            return data;
        }
        return data.toString(CryptoJS.enc.Base64);
    }

    /**
     * 转换数据本身的编码格式
     * @private
     * @param {string|ArrayBuffer} data - 原始数据
     * @param {string} dataEncoding - 数据编码格式
     * @returns {any} 转换后的数据
     */
    static _convertDataEncoding(data, dataEncoding) {
        const upperEncoding = dataEncoding.toUpperCase();

        switch (upperEncoding) {
            case 'HEX':
                if (typeof data === 'string') {
                    return CryptoJS.enc.Hex.parse(data);
                }
                return data;

            case 'BASE64':
                if (typeof data === 'string') {
                    return CryptoJS.enc.Base64.parse(data);
                }
                return data;

            case 'BASE64_URLSAFE':
                if (typeof data === 'string') {
                    // URL安全Base64转换为标准Base64
                    let base64Str = data.replace(/-/g, '+').replace(/_/g, '/');
                    while (base64Str.length % 4 !== 0) {
                        base64Str += '=';
                    }
                    return CryptoJS.enc.Base64.parse(base64Str);
                }
                return data;

            default:
                throw new Error(`不支持的数据编码格式: ${dataEncoding}`);
        }
    }

    /**
     * 从数据编码格式转换回UTF-8
     * @private
     * @param {any} data - 编码后的数据
     * @param {string} dataEncoding - 数据编码格式
     * @returns {string} UTF-8字符串
     */
    static _convertFromDataEncoding(data, dataEncoding) {
        const upperEncoding = dataEncoding.toUpperCase();

        switch (upperEncoding) {
            case 'HEX':
                if (typeof data === 'string') {
                    const wordArray = CryptoJS.enc.Hex.parse(data);
                    return CryptoJS.enc.Utf8.stringify(wordArray);
                }
                return data.toString(CryptoJS.enc.Utf8);

            case 'BASE64':
                if (typeof data === 'string') {
                    const wordArray = CryptoJS.enc.Base64.parse(data);
                    return CryptoJS.enc.Utf8.stringify(wordArray);
                }
                return data.toString(CryptoJS.enc.Utf8);

            case 'BASE64_URLSAFE':
                if (typeof data === 'string') {
                    // URL安全Base64转换为标准Base64再解码
                    let base64Str = data.replace(/-/g, '+').replace(/_/g, '/');
                    while (base64Str.length % 4 !== 0) {
                        base64Str += '=';
                    }
                    const wordArray = CryptoJS.enc.Base64.parse(base64Str);
                    return CryptoJS.enc.Utf8.stringify(wordArray);
                }
                return data.toString(CryptoJS.enc.Utf8);

            default:
                throw new Error(`不支持的数据编码格式: ${dataEncoding}`);
        }
    }

    /**
     * 将数据按照指定编码方式进行解码
     * @param {string} data - 编码后的数据
     * @param {string} dataEncoding - 数据本身的编码格式
     * @param {string[]} encodings - 前置编码方式数组，从外到内应用
     * @returns {string} 解码后的原始数据
     */
    static decode(data, dataEncoding = 'UTF8', encodings = []) {
        let result = data;
        
        // 如果没有前置编码，直接处理数据编码
        if (!encodings || encodings.length === 0) {
            if (dataEncoding && dataEncoding.toUpperCase() !== 'UTF8') {
                result = this._convertFromDataEncoding(result, dataEncoding);
            }
            return typeof result === 'string' ? result : CryptoJS.enc.Utf8.stringify(result);
        }
        
        // 确保输入是字符串格式进行解码处理
        if (typeof result !== 'string') {
            result = result.toString(CryptoJS.enc.Base64);
        }
        
        // 应用前置编码解码处理
        result = this._applyDecodings(result, encodings,dataEncoding);
        console.info('final Decoded data:', result);
        return result;
    }
    
    /**
     * 应用解码处理
     * @private
     * @param {string} data - 编码后的数据
     * @param {string[]} encodings - 编码配置
     * @returns {string} 解码后的数据
     */
    static _applyDecodings(data, encodings,lastEncoding) {
        let result = data;
        
        // 按照编码顺序进行解码（从外到内，即从数组开头到结尾）
        for (let i = 0; i < encodings.length; i++) {
            const encoding = encodings[i].toUpperCase();
            result = this._applySingleDecoding(result, encoding, i===encodings.length-1,lastEncoding);
        }
        
        return result;
    }
    
    /**
     * 应用单个解码
     * @private
     * @param {string} data - 编码后的数据
     * @param {string} encoding - 编码类型
     * @param {boolean} last - 是否为最后一层解码
     * @returns {string} 解码后的数据
     */
    static _applySingleDecoding(data, encoding, last,lastEncoding) {
        switch (encoding) {
            case 'UTF8':
                // UTF8 通常作为最终解码，保持原样
                return data;
                
            case 'HEX':
                return this._decodeHex(data, last,lastEncoding);
                
            case 'BASE64':
                return this._decodeBase64(data, last,lastEncoding);
                
            case 'BASE64_URLSAFE':
                return this._decodeBase64UrlSafe(data, last,lastEncoding);
                
            default:
                throw new Error(`不支持的编码方式: ${encoding}`);
        }
    }
    
    /**
     * HEX解码
     * @private
     * @param {string} data - HEX编码的数据
     * @param {boolean} last - 是否为最后一层解码
     * @returns {string} 解码后的数据
     */
    static _decodeHex(data, last,lastEncoding) {
        if (typeof data !== 'string') {
            console.warn(`[HEX解码] 输入不是字符串格式: ${typeof data}`);
            return data.toString();
        }
        
        // 首先检查是否为有效的HEX字符串
        if (!/^[0-9a-fA-F]*$/.test(data) || data.length % 2 !== 0) {
            console.info(`[HEX解码] 跳过解码，输入不是有效HEX格式: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`);
            return data;
        }
        
        try {
            // 将HEX字符串转换为UTF-8字符串
            let str = '';
            for (let i = 0; i < data.length; i += 2) {
                const byte = parseInt(data.substr(i, 2), 16);
                str += String.fromCharCode(byte);
            }
            
            let result;
            if (last) {
                // 如果是最后一层解码，根据lastEncoding决定输出格式
                const upperLastEncoding = lastEncoding ? lastEncoding.toUpperCase() : 'BASE64';
                
                if (upperLastEncoding === 'HEX') {
                    // 输出HEX格式
                    result = data; // 保持原始HEX格式
                    console.info(`[HEX解码] 最后一层解码，保持HEX格式: ${data.substring(0, 32)}... -> ${result}`);
                } else {
                    // 默认输出Base64格式
                    try {
                        // 直接使用原始字节数据进行Base64编码
                        result = this._toBase64(str);
                        console.info(`[HEX解码] 最后一层解码，HEX转Base64: ${data.substring(0, 32)}... -> ${result}`);
                    } catch (base64Error) {
                        console.warn(`[HEX解码] Base64转换失败，返回原始转换结果: ${base64Error.message}`);
                        result = str;
                    }
                }
            } else {
                // 非最后一层解码，保持原有逻辑
                try {
                    result = decodeURIComponent(escape(str));
                } catch (utf8Error) {
                    console.warn(`[HEX解码] UTF-8解码失败，返回原始转换结果: ${utf8Error.message}`);
                    result = str;
                }
                console.info(`[HEX解码] 中间层解码: ${data.substring(0, 32)}... -> ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`[HEX解码] 解码失败: ${error.message}`);
            return data; // 出错时返回原始数据
        }
    }
    
    /**
     * Base64解码
     * @private
     * @param {string} data - Base64编码的数据
     * @param {boolean} last - 是否为最后一层解码
     * @param {string} lastEncoding - 最终输出编码格式
     * @returns {string} 解码后的数据
     */
    static _decodeBase64(data, last, lastEncoding) {
        if (typeof data !== 'string') {
            console.warn(`[BASE64解码] 输入不是字符串格式: ${typeof data}`);
            return data.toString();
        }
        
        // 预先检查字符范围，避免atob报错
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
            console.info(`[BASE64解码] 跳过解码，输入不是有效Base64格式: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`);
            return data;
        }
        
        const decoded = this._base64Decode(data);
        if (decoded !== null) {
            let result = decoded;
            
            if (last) {
                // 根据lastEncoding决定最终输出格式
                const upperLastEncoding = lastEncoding ? lastEncoding.toUpperCase() : 'BASE64';
                
                if (upperLastEncoding === 'HEX') {
                    // 转换为HEX格式
                    try {
                        let hex = '';
                        for (let i = 0; i < result.length; i++) {
                            hex += result.charCodeAt(i).toString(16).padStart(2, '0');
                        }
                        result = hex;
                        console.info(`[BASE64解码] 最后一层解码，转换为HEX: ${data.substring(0, 32)}... -> ${result}`);
                    } catch (hexError) {
                        console.warn(`[BASE64解码] HEX转换失败，保持Base64结果: ${hexError.message}`);
                    }
                } else {
                    result=data;
                    console.info(`[BASE64解码] 最后一层解码，保持Base64格式: ${data.substring(0, 32)}... -> ${result}`);
                }
            } else {
                console.info(`[BASE64解码] 中间层解码: ${data.substring(0, 32)}... -> ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`);
            }
            
            return result;
        } else {
            console.warn(`[BASE64解码] 解码失败，保持原始数据`);
            return data;
        }
    }
    
    /**
     * Base64 URL安全解码
     * @private
     * @param {string} data - Base64 URL安全编码的数据
     * @param {boolean} last - 是否为最后一层解码
     * @param {string} lastEncoding - 最终输出编码格式
     * @returns {string} 解码后的数据
     */
    static _decodeBase64UrlSafe(data, last, lastEncoding) {
        if (typeof data !== 'string') {
            console.warn(`[BASE64_URLSAFE解码] 输入不是字符串格式: ${typeof data}`);
            return data.toString();
        }
        
        // 预先检查字符范围
        if (!/^[-_A-Za-z0-9]*=?=?$/.test(data)) {
            console.info(`[BASE64_URLSAFE解码] 跳过解码，输入不是有效URL安全Base64格式: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`);
            return data;
        }
        
        try {
            // URL安全的Base64使用-和_替换+和/
            let base64Str = data.replace(/-/g, '+').replace(/_/g, '/');
            // 补充缺失的填充字符
            while (base64Str.length % 4 !== 0) {
                base64Str += '=';
            }
            
            const decoded = this._base64Decode(base64Str);
            if (decoded !== null) {
                let result = decoded;
                
                if (last) {
                    // 根据lastEncoding决定最终输出格式
                    const upperLastEncoding = lastEncoding ? lastEncoding.toUpperCase() : 'BASE64';
                    
                    if (upperLastEncoding === 'HEX') {
                        // 转换为HEX格式
                        try {
                            let hex = '';
                            for (let i = 0; i < result.length; i++) {
                                hex += result.charCodeAt(i).toString(16).padStart(2, '0');
                            }
                            result = hex;
                            console.info(`[BASE64_URLSAFE解码] 最后一层解码，转换为HEX: ${data.substring(0, 32)}... -> ${result}`);
                        } catch (hexError) {
                            console.warn(`[BASE64_URLSAFE解码] HEX转换失败，保持Base64结果: ${hexError.message}`);
                        }
                    } else {
                        console.info(`[BASE64_URLSAFE解码] 最后一层解码，保持Base64格式: ${data.substring(0, 32)}... -> ${result}`);
                    }
                } else {
                    console.info(`[BASE64_URLSAFE解码] 中间层解码: ${data.substring(0, 32)}... -> ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`);
                }
                
                return result;
            } else {
                console.warn(`[BASE64_URLSAFE解码] 解码失败，保持原始数据`);
                return data;
            }
            
        } catch (error) {
            console.error(`[BASE64_URLSAFE解码] 解码失败: ${error.message}`);
            return data; // 出错时返回原始数据
        }
    }

    /**
     * 解析复合编码字符串
     * @param {string} encodingString - 编码字符串，支持+号分隔
     * @returns {string[]} 编码方式数组
     */
    static parseCompoundEncoding(encodingString) {
        if (!encodingString) return ['UTF8'];
        return encodingString.split('+').map(enc => enc.trim()).filter(enc => enc);
    }

    /**
     * 格式化编码数组为字符串
     * @param {string[]} encodings - 编码方式数组
     * @returns {string} 格式化后的编码字符串
     */
    static formatEncoding(encodings) {
        return encodings.join('+');
    }

    /**
     * 处理明文编码 - 加密时使用
     * 根据明文编码配置对明文进行预处理
     * @param {string} plaintext - 原始明文
     * @param {string[]} plainEncoding - 明文编码方式数组
     * @returns {string} 处理后的明文
     */
    static processPlaintextEncoding(plaintext, plainEncoding = ['UTF8']) {
        // 明文编码方式处理：如果指定了非UTF8的编码方式，需要先解码
        let processedPlaintext = plaintext;

        if (plainEncoding && plainEncoding.length > 0 && !plainEncoding.includes('UTF8')) {
            // 如果明文是以其他编码方式存储的，需要先解码为UTF8
            processedPlaintext = this.decode(plaintext, plainEncoding);
        }

        return processedPlaintext;
    }

    /**
     * 处理明文解码 - 解密后使用
     * 根据明文编码配置对解密后的明文进行后处理
     * @param {string} plaintext - 解密后的明文（UTF8格式）
     * @param {string[]} plainEncoding - 明文编码方式数组
     * @returns {string} 处理后的明文
     */
    static processPlaintextDecoding(plaintext, plainEncoding = ['UTF8']) {
        // 明文解码处理：如果需要输出为非UTF8格式，需要重新编码
        let processedPlaintext = plaintext;

        if (plainEncoding && plainEncoding.length > 0 && !plainEncoding.includes('UTF8')) {
            // 如果需要输出为其他编码格式，需要重新编码
            processedPlaintext = this.encode(plaintext, plainEncoding);
        }

        return processedPlaintext;
    }
}