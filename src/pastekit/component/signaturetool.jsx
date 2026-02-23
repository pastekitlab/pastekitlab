import React, {useState, useEffect, useReducer, useRef} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useTranslation} from '../utils/i18n';
import {SignatureUtils} from '../utils/signatureutils';
import {toast} from 'sonner';

/**
 * 签名工具组件
 * 支持多种签名算法和验签功能
 */
export default function SignatureTool({configs = [], className = ''}) {
    const [t] = useTranslation();
    const [dataToSign, setDataToSign] = useState('');

    // 摘要算法
    const [digestAlgorithm, setDigestAlgorithm] = useState('sha256');

    // 签名算法
    const [signatureAlgorithm, setSignatureAlgorithm] = useState('none');

    // 密钥相关
    const [hmacKey, setHmacKey] = useState('');
    const [selectedConfig, setSelectedConfig] = useState('');

    // 结果相关
    const [signatureResult, setSignatureResult] = useState('');
    const [verificationResult, setVerificationResult] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [manualSignature, setManualSignature] = useState(''); // 用于手动输入签名

    // 强制刷新机制
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    // textarea引用
    const textareaRef = useRef(null);

    // 摘要算法选项
    const digestAlgorithms = [
        {value: 'md5', label: t('components.signature.methods.md5')},
        {value: 'sha1', label: t('components.signature.methods.sha1')},
        {value: 'sha256', label: t('components.signature.methods.sha256')},
        {value: 'sha512', label: t('components.signature.methods.sha512')}
    ];

    // 签名算法选项
    const signatureAlgorithms = [
        {value: 'none', label: t('components.signature.algorithms.none')},
        {value: 'hmac', label: t('components.signature.algorithms.hmac')},
        {value: 'rsa', label: t('components.signature.algorithms.rsa')},
        {value: 'sm2', label: t('components.signature.algorithms.sm2')}
    ];

    // 过滤出支持的RSA和SM2配置
    const asymmetricConfigs = configs.filter(config =>
        config.algorithmType === 'RSA' || config.algorithmType === 'SM2'
    );

    // 当签名算法改变时，重置相关状态
    useEffect(() => {
        setSignatureResult('');
        setVerificationResult('');
        setVerificationStatus(null);

        // 如果选择了需要密钥的算法，自动选择第一个可用配置
        if ((signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') &&
            asymmetricConfigs.length > 0 && !selectedConfig) {
            setSelectedConfig(asymmetricConfigs[0].name);
        }

        // 如果选择了HMAC算法，清空配置选择
        if (signatureAlgorithm === 'hmac') {
            setSelectedConfig('');
        }

        // 如果选择none，清空密钥相关输入
        if (signatureAlgorithm === 'none') {
            setHmacKey('');
            setSelectedConfig('');
        }
    }, [signatureAlgorithm, asymmetricConfigs]);

    // 监控签名结果变化
    useEffect(() => {
        console.log('=== signatureResult状态变化 ===');
        console.log('新值:', signatureResult);
        console.log('类型:', typeof signatureResult);
        console.log('长度:', signatureResult?.length);
        console.log('布尔值:', !!signatureResult);

        // 检查DOM元素
        setTimeout(() => {
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach((textarea, index) => {
                console.log(`Textarea ${index}:`, {
                    value: textarea.value,
                    display: window.getComputedStyle(textarea).display,
                    visibility: window.getComputedStyle(textarea).visibility
                });
            });
        }, 100);

        console.log('============================');
    }, [signatureResult]);

    // 确保textarea值与状态同步
    useEffect(() => {
        if (textareaRef.current) {
            console.log('更新textarea值:', signatureResult);
            textareaRef.current.value = signatureResult;
        }
    }, [signatureResult]);

    // 签名函数
    const handleSign = async () => {
        if (!dataToSign.trim()) {
            toast.error(t('components.signature.messages.enter_data'));
            return;
        }

        // 构建签名方法和哈希算法
        let signatureMethod = digestAlgorithm; // 默认使用摘要算法
        let hashAlgorithm = digestAlgorithm;   // 哈希算法

        if (signatureAlgorithm !== 'none') {
            signatureMethod = signatureAlgorithm;
            // 特殊处理HMAC
            if (signatureAlgorithm === 'hmac') {
                signatureMethod = `hmac-${digestAlgorithm}`;
                hashAlgorithm = null; // HMAC有自己的哈希处理
            }
        }

        // 对于需要配置的算法，检查配置
        if ((signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') && !selectedConfig) {
            toast.error(t('components.signature.messages.select_config'));
            return;
        }

        // 对于HMAC算法，检查密钥
        if (signatureAlgorithm === 'hmac' && !hmacKey.trim()) {
            toast.error('HMAC签名需要提供密钥');
            return;
        }

        setIsSigning(true);
        setSignatureResult('');

        try {
            console.log('开始签名过程:', {
                dataToSign,
                digestAlgorithm,
                signatureAlgorithm,
                signatureMethod,
                hashAlgorithm,
                selectedConfig,
                hmacKey
            });

            let config = null;
            if (signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') {
                config = configs.find(c => c.name === selectedConfig);
                console.log('找到的配置:', config);
                if (!config) {
                    throw new Error('找不到指定的配置');
                }
            }

            const result = SignatureUtils.sign(
                dataToSign,
                signatureMethod,
                config,
                hmacKey,
                hashAlgorithm
            );

            console.log('签名结果:', result);
            console.log('签名结果类型:', typeof result);
            console.log('签名结果长度:', result?.length);

            // 检查结果有效性
            if (result === null || result === undefined || result === '') {
                console.error('签名结果无效:', result);
                throw new Error('签名计算返回空结果');
            }

            setSignatureResult(prev => {
                console.log('设置signatureResult前的值:', prev);
                console.log('即将设置的新值:', result);
                return result;
            });

            // 触发强制刷新
            forceUpdate();

            // 延迟手动更新textarea
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.value = result;
                    console.log('延迟手动更新textarea完成');
                }
            }, 50);

            console.log('签名结果已设置，值为:', result);
            console.log('结果类型:', typeof result);
            console.log('结果长度:', result.length);
            toast.success(t('components.signature.messages.sign_success'));

            // 延迟检查状态更新
            setTimeout(() => {
                console.log('延迟检查 - 当前signatureResult值:', result);
            }, 0);
        } catch (error) {
            console.error('签名失败:', error);
            toast.error(t('components.signature.messages.sign_failed', {error: error.message}));
        } finally {
            setIsSigning(false);
        }
    };

    // 验签函数
    const handleVerify = async () => {
        if (!dataToSign.trim()) {
            toast.error(t('components.signature.messages.enter_data'));
            return;
        }

        // 使用手动生成的签名或手动输入的签名
        const signatureToVerify = signatureResult.trim() || manualSignature.trim();
        if (!signatureToVerify) {
            toast.error('请先生成签名或输入要验证的签名');
            return;
        }

        // 构建签名方法和哈希算法
        let signatureMethod = digestAlgorithm; // 默认使用摘要算法
        let hashAlgorithm = digestAlgorithm;   // 哈希算法

        if (signatureAlgorithm !== 'none') {
            signatureMethod = signatureAlgorithm;
            // 特殊处理HMAC
            if (signatureAlgorithm === 'hmac') {
                signatureMethod = `hmac-${digestAlgorithm}`;
                hashAlgorithm = null; // HMAC有自己的哈希处理
            }
        }

        setIsVerifying(true);
        setVerificationResult('');
        setVerificationStatus(null);

        try {
            let config = null;
            if (signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') {
                config = configs.find(c => c.name === selectedConfig);
                if (!config) {
                    throw new Error('找不到指定的配置');
                }
            }

            const result = SignatureUtils.verify(
                dataToSign,
                signatureToVerify,
                signatureMethod,
                config,
                hmacKey,
                hashAlgorithm
            );

            setVerificationResult(result.toString());
            setVerificationStatus(result);

            if (result) {
                toast.success(t('components.signature.messages.verify_success'));
            } else {
                toast.error(t('components.signature.messages.verify_failed'));
            }
        } catch (error) {
            console.error('验签失败:', error);
            toast.error(t('components.signature.messages.verify_failed_detail', {error: error.message}));
            setVerificationStatus(false);
        } finally {
            setIsVerifying(false);
        }
    };

    // 清空结果
    const clearResults = () => {
        setSignatureResult('');
        setVerificationResult('');
        setVerificationStatus(null);
        setManualSignature('');
        // 重置算法选择
        setSignatureAlgorithm('none');
        setHmacKey('');
        setSelectedConfig('');

        // 立即清空textarea
        if (textareaRef.current) {
            textareaRef.current.value = '';
        }
    };

    return (
        <div className={`space-y-6 ${className}`}>
            <Card>
                <CardHeader>
                    <CardTitle>{t('components.signature.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 待签名数据 */}
                    <div className="space-y-2">
                        <Label htmlFor="dataToSign">{t('components.signature.data_to_sign')}</Label>
                        <Textarea
                            id="dataToSign"
                            value={dataToSign}
                            onChange={(e) => setDataToSign(e.target.value)}
                            placeholder={t('components.signature.enter_data')}
                            className="min-h-[100px]"
                        />
                    </div>

                    {/* 算法选择区域 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 摘要算法 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <Label
                                    className="text-base font-medium">{t('components.signature.digest_algorithm')}</Label>
                            </div>
                            <Select value={digestAlgorithm} onValueChange={setDigestAlgorithm}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('components.signature.select_digest')}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {digestAlgorithms.map(alg => (
                                        <SelectItem key={alg.value} value={alg.value}>
                                            {alg.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 签名算法 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <Label
                                    className="text-base font-medium">{t('components.signature.signature_algorithm')}</Label>
                            </div>
                            <Select value={signatureAlgorithm} onValueChange={setSignatureAlgorithm}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('components.signature.select_signature')}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {signatureAlgorithms.map(alg => (
                                        <SelectItem key={alg.value} value={alg.value}>
                                            {alg.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 密钥输入区域 */}
                    {(signatureAlgorithm === 'hmac' || signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') && (
                        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                            <h4 className="font-medium text-foreground">{t('components.signature.key_input')}</h4>

                            {/* HMAC密钥输入 */}
                            {signatureAlgorithm === 'hmac' && (
                                <div className="space-y-2">
                                    <Label htmlFor="hmacKey">{t('components.signature.hmac_key')}</Label>
                                    <Input
                                        id="hmacKey"
                                        value={hmacKey}
                                        onChange={(e) => setHmacKey(e.target.value)}
                                        placeholder={t('components.signature.enter_hmac_key')}
                                    />
                                </div>
                            )}

                            {/* 配置选择（RSA/SM2） */}
                            {(signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') && (
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="signatureConfig">{t('components.signature.signature_config')}</Label>
                                    <Select
                                        value={selectedConfig}
                                        onValueChange={setSelectedConfig}
                                        disabled={asymmetricConfigs.length === 0}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                asymmetricConfigs.length === 0
                                                    ? t('components.signature.no_available_configs')
                                                    : t('components.signature.please_select')
                                            }/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {asymmetricConfigs.map(config => (
                                                <SelectItem key={config.name} value={config.name}>
                                                    {config.name} ({config.algorithmType})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {asymmetricConfigs.length === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('components.signature.config_required_tip')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={() => handleSign()}
                            disabled={isSigning || !dataToSign.trim() ||
                                (signatureAlgorithm !== 'none' &&
                                    ((signatureAlgorithm === 'hmac' && !hmacKey.trim()) ||
                                        ((signatureAlgorithm === 'rsa' || signatureAlgorithm === 'sm2') && !selectedConfig)))}
                        >
                            {isSigning ? t('components.signature.signing') : t('components.signature.sign')}
                        </Button>
                        <Button
                            onClick={handleVerify}
                            variant="secondary"
                            disabled={isVerifying || (!signatureResult && !manualSignature.trim()) || !dataToSign.trim()}
                        >
                            {isVerifying ? t('components.signature.verifying') : t('components.signature.verify')}
                        </Button>
                        <Button
                            onClick={clearResults}
                            variant="outline"
                        >
                            {t('components.signature.clear_results')}
                        </Button>
                    </div>

                    {/* 签名结果和手动签名输入 - 并列展示 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 签名结果 */}
                        <div className="space-y-2">
                            <Label>{t('components.signature.signature_result')}</Label>
                            <Textarea
                                ref={textareaRef}
                                defaultValue=""
                                readOnly
                                className="min-h-[120px] font-mono text-sm bg-muted"
                                onChange={() => {
                                }} // 空处理函数防止警告
                            />
                        </div>

                        {/* 手动签名输入（用于验签） */}
                        <div className="space-y-2">
                            <Label htmlFor="manualSignature">{t('components.signature.manual_signature')}</Label>
                            <Textarea
                                id="manualSignature"
                                value={manualSignature}
                                onChange={(e) => setManualSignature(e.target.value)}
                                placeholder={t('components.signature.enter_manual_signature')}
                                className="min-h-[120px] font-mono text-sm"
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('components.signature.manual_signature_tip')}
                            </p>
                        </div>
                    </div>


                    {/* 验签结果 */}
                    {verificationResult && (
                        <div className="space-y-2">
                            <Label>{t('components.signature.verification_result')}</Label>
                            <div className={`p-3 rounded ${
                                verificationStatus
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                                {verificationStatus
                                    ? t('components.signature.verification_passed')
                                    : t('components.signature.verification_failed')
                                }
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}