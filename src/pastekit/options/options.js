import { CipherUtils } from '../utils/cipherutils.js';

class OptionsManager {
    constructor() {
        this.currentSection = 'key-config';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedKeys();
        console.log('OptionsResolver 初始化完成');
    }

    bindEvents() {
        // 菜单切换事件
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.target);
            });
        });

        // 秘钥配置按钮事件
        document.getElementById('saveKeys').addEventListener('click', () => this.saveKeys());
        document.getElementById('loadKeys').addEventListener('click', () => this.loadSavedKeys());
        document.getElementById('generateKeys').addEventListener('click', () => this.generateRSAKeys());
        document.getElementById('clearKeys').addEventListener('click', () => this.clearKeys());

        // 加密测试按钮事件
        document.getElementById('encryptBtn').addEventListener('click', () => this.encryptTest());
        document.getElementById('decryptBtn').addEventListener('click', () => this.decryptTest());
        document.getElementById('testEncryption').addEventListener('click', () => this.fullTest());

        // 算法选择变化时清空结果
        document.getElementById('algorithmSelect').addEventListener('change', () => {
            document.getElementById('encryptedText').value = '';
            document.getElementById('decryptedText').value = '';
            this.hideResult('testResult');
        });

        // 输入框变化时清空结果
        document.getElementById('testText').addEventListener('input', () => {
            this.hideResult('testResult');
        });
    }

    switchSection(target) {
        // 更新菜单激活状态
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-target="${target}"]`).classList.add('active');

        // 切换内容显示
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(target).classList.add('active');

        this.currentSection = target;
        console.log(`切换到页面: ${target}`);
    }

    // 秘钥管理功能
    async saveKeys() {
        try {
            const keys = {
                publicKey: document.getElementById('publicKey').value.trim(),
                privateKey: document.getElementById('privateKey').value.trim(),
                aesKey: document.getElementById('aesKey').value.trim(),
                aesIv: document.getElementById('aesIv').value.trim(),
                timestamp: Date.now()
            };

            // 验证必填项
            if (!keys.aesKey) {
                this.showResult('keyResult', 'AES密钥不能为空', 'error');
                return;
            }

            // 保存到 Chrome 存储
            await chrome.storage.local.set({ encryptionKeys: keys });
            this.showResult('keyResult', '✅ 秘钥配置保存成功！', 'success');
            
            console.log('秘钥已保存:', keys);
        } catch (error) {
            console.error('保存秘钥失败:', error);
            this.showResult('keyResult', `❌ 保存失败: ${error.message}`, 'error');
        }
    }

    async loadSavedKeys() {
        try {
            const result = await chrome.storage.local.get(['encryptionKeys']);
            if (result.encryptionKeys) {
                const keys = result.encryptionKeys;
                document.getElementById('publicKey').value = keys.publicKey || '';
                document.getElementById('privateKey').value = keys.privateKey || '';
                document.getElementById('aesKey').value = keys.aesKey || '';
                document.getElementById('aesIv').value = keys.aesIv || '';
                
                this.showResult('keyResult', '📥 秘钥配置加载成功！', 'info');
                console.log('秘钥已加载:', keys);
            } else {
                this.showResult('keyResult', '📋 暂无保存的秘钥配置', 'info');
            }
        } catch (error) {
            console.error('加载秘钥失败:', error);
            this.showResult('keyResult', `❌ 加载失败: ${error.message}`, 'error');
        }
    }

    async generateRSAKeys() {
        try {
            this.showResult('keyResult', '🔑 正在生成RSA密钥对...', 'info');
            
            // 使用 Web Crypto API 生成 RSA 密钥对
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["sign", "verify"]
            );

            // 导出公钥
            const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
            const publicKeyPEM = this.arrayBufferToPEM(publicKey, "PUBLIC KEY");

            // 导出私钥
            const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
            const privateKeyPEM = this.arrayBufferToPEM(privateKey, "PRIVATE KEY");

            // 填入表单
            document.getElementById('publicKey').value = publicKeyPEM;
            document.getElementById('privateKey').value = privateKeyPEM;

            this.showResult('keyResult', '✅ RSA密钥对生成成功！请记得保存配置。', 'success');
            console.log('RSA密钥对生成完成');
        } catch (error) {
            console.error('生成RSA密钥失败:', error);
            this.showResult('keyResult', `❌ 生成失败: ${error.message}`, 'error');
        }
    }

    arrayBufferToPEM(buffer, type) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const pem = `-----BEGIN ${type}-----\n`;
        const end = `\n-----END ${type}-----`;
        
        // 每64个字符换行
        let result = pem;
        for (let i = 0; i < base64.length; i += 64) {
            result += base64.substr(i, 64) + '\n';
        }
        result += end;
        
        return result;
    }

    async clearKeys() {
        if (confirm('确定要清空所有秘钥配置吗？此操作不可恢复！')) {
            try {
                await chrome.storage.local.remove('encryptionKeys');
                document.getElementById('publicKey').value = '';
                document.getElementById('privateKey').value = '';
                document.getElementById('aesKey').value = '';
                document.getElementById('aesIv').value = '';
                
                this.showResult('keyResult', '🗑️ 秘钥配置已清空', 'info');
                console.log('秘钥配置已清空');
            } catch (error) {
                console.error('清空秘钥失败:', error);
                this.showResult('keyResult', `❌ 清空失败: ${error.message}`, 'error');
            }
        }
    }

    // 加密解密测试功能
    async encryptTest() {
        const plaintext = document.getElementById('testText').value.trim();
        const algorithm = document.getElementById('algorithmSelect').value;
        
        if (!plaintext) {
            this.showResult('testResult', '❌ 请输入测试文本', 'error');
            return;
        }

        try {
            let config;
            let ciphertext;

            switch (algorithm) {
                case 'RSA':
                    const rsaKeys = await this.getRSAKeys();
                    config = {
                        algorithm: 'RSA',
                        publicKey: { value: rsaKeys.publicKey, encoding: ['UTF8'] },
                        plainEncoding: ['UTF8'],
                        cipherEncoding: ['BASE64']
                    };
                    ciphertext = CipherUtils.encrypt(plaintext, config);
                    break;

                case 'AES/CBC/PKCS5Padding':
                case 'AES/ECB/PKCS5Padding':
                    const aesKeys = await this.getAESKeys();
                    const algParts = algorithm.split('/');
                    config = {
                        algorithm: `AES/${algParts[1]}/${algParts[2]}`,
                        key: { value: aesKeys.key, encoding: ['UTF8'] },
                        iv: aesKeys.iv ? { value: aesKeys.iv, encoding: ['UTF8'] } : undefined,
                        plainEncoding: ['UTF8'],
                        cipherEncoding: ['BASE64']
                    };
                    ciphertext = CipherUtils.encrypt(plaintext, config);
                    break;

                case 'SM4/CBC':
                case 'SM4/ECB':
                    const sm4Keys = await this.getAESKeys(); // SM4使用相同密钥格式
                    const sm4Parts = algorithm.split('/');
                    config = {
                        algorithm: `SM4/${sm4Parts[1]}`,
                        key: { value: sm4Keys.key, encoding: ['UTF8'] },
                        iv: sm4Keys.iv ? { value: sm4Keys.iv, encoding: ['UTF8'] } : undefined,
                        plainEncoding: ['UTF8'],
                        cipherEncoding: ['BASE64']
                    };
                    ciphertext = CipherUtils.encrypt(plaintext, config);
                    break;

                default:
                    throw new Error(`不支持的算法: ${algorithm}`);
            }

            document.getElementById('encryptedText').value = ciphertext;
            this.showResult('testResult', `✅ ${algorithm} 加密成功！`, 'success');
            console.log(`${algorithm} 加密完成:`, ciphertext);

        } catch (error) {
            console.error('加密失败:', error);
            this.showResult('testResult', `❌ 加密失败: ${error.message}`, 'error');
            document.getElementById('encryptedText').value = '';
        }
    }

    async decryptTest() {
        const ciphertext = document.getElementById('encryptedText').value.trim();
        const algorithm = document.getElementById('algorithmSelect').value;
        
        if (!ciphertext) {
            this.showResult('testResult', '❌ 请输入密文', 'error');
            return;
        }

        try {
            let config;
            let plaintext;

            switch (algorithm) {
                case 'RSA':
                    const rsaKeys = await this.getRSAKeys();
                    config = {
                        algorithm: 'RSA',
                        privateKey: { value: rsaKeys.privateKey, encoding: ['UTF8'] },
                        plainEncoding: ['UTF8'],
                        cipherEncoding: ['BASE64']
                    };
                    plaintext = CipherUtils.decrypt(ciphertext, config);
                    break;

                case 'AES/CBC/PKCS5Padding':
                case 'AES/ECB/PKCS5Padding':
                    const aesKeys = await this.getAESKeys();
                    const algParts = algorithm.split('/');
                    config = {
                        algorithm: `AES/${algParts[1]}/${algParts[2]}`,
                        key: { value: aesKeys.key, encoding: ['UTF8'] },
                        iv: aesKeys.iv ? { value: aesKeys.iv, encoding: ['UTF8'] } : undefined,
                        plainEncoding: ['UTF8'],
                        cipherEncoding: ['BASE64']
                    };
                    plaintext = CipherUtils.decrypt(ciphertext, config);
                    break;

                case 'SM4/CBC':
                case 'SM4/ECB':
                    const sm4Keys = await this.getAESKeys();
                    const sm4Parts = algorithm.split('/');
                    config = {
                        algorithm: `SM4/${sm4Parts[1]}`,
                        key: { value: sm4Keys.key, encoding: ['UTF8'] },
                        iv: sm4Keys.iv ? { value: sm4Keys.iv, encoding: ['UTF8'] } : undefined,
                        plainEncoding: ['UTF8'],
                        cipherEncoding: ['BASE64']
                    };
                    plaintext = CipherUtils.decrypt(ciphertext, config);
                    break;

                default:
                    throw new Error(`不支持的算法: ${algorithm}`);
            }

            document.getElementById('decryptedText').value = plaintext;
            this.showResult('testResult', `✅ ${algorithm} 解密成功！`, 'success');
            console.log(`${algorithm} 解密完成:`, plaintext);

        } catch (error) {
            console.error('解密失败:', error);
            this.showResult('testResult', `❌ 解密失败: ${error.message}`, 'error');
            document.getElementById('decryptedText').value = '';
        }
    }

    async fullTest() {
        const originalText = document.getElementById('testText').value.trim();
        const algorithm = document.getElementById('algorithmSelect').value;
        
        if (!originalText) {
            this.showResult('testResult', '❌ 请输入测试文本', 'error');
            return;
        }

        try {
            this.showResult('testResult', `🧪 正在执行 ${algorithm} 完整测试...`, 'info');
            
            // 加密
            await this.encryptTest();
            const ciphertext = document.getElementById('encryptedText').value;
            
            if (!ciphertext) {
                throw new Error('加密失败');
            }

            // 解密
            await this.decryptTest();
            const decryptedText = document.getElementById('decryptedText').value;
            
            // 验证
            if (originalText === decryptedText) {
                this.showResult('testResult', `✅ ${algorithm} 完整测试通过！加密解密一致性验证成功。`, 'success');
            } else {
                this.showResult('testResult', `❌ ${algorithm} 测试失败！原文与解密结果不一致。`, 'error');
            }

        } catch (error) {
            console.error('完整测试失败:', error);
            this.showResult('testResult', `❌ 完整测试失败: ${error.message}`, 'error');
        }
    }

    // 辅助方法
    async getRSAKeys() {
        const result = await chrome.storage.local.get(['encryptionKeys']);
        const keys = result.encryptionKeys;
        
        if (!keys || !keys.publicKey || !keys.privateKey) {
            throw new Error('请先配置RSA公钥和私钥');
        }
        
        return {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey
        };
    }

    async getAESKeys() {
        const result = await chrome.storage.local.get(['encryptionKeys']);
        const keys = result.encryptionKeys;
        
        if (!keys || !keys.aesKey) {
            throw new Error('请先配置AES密钥');
        }
        
        return {
            key: keys.aesKey,
            iv: keys.aesIv || ''
        };
    }

    showResult(elementId, message, type) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `test-result ${type}`;
        element.style.display = 'block';
    }

    hideResult(elementId) {
        const element = document.getElementById(elementId);
        element.style.display = 'none';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否在 Chrome 扩展环境中
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        new OptionsManager();
    } else {
        console.error('请在 Chrome 扩展环境中打开此页面');
        alert('请通过 Chrome 扩展的选项页面访问此功能');
    }
});