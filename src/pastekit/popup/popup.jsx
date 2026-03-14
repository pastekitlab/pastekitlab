import ReactDOM from "react-dom/client";
import React, {useState, useEffect, useRef} from "react";
import {Textarea} from "@/components/ui/textarea";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {Github, Settings, Video, Book, MessageSquare, Coffee} from "lucide-react";
import {useChromePopupHeight} from "@/hooks/use-chrome-popup-height";
import TimeTool from "@/pastekit/component/timetool"
import CroneTool from "@/pastekit/component/cronetool"
import JsonTool from "@/pastekit/component/jsontool"
import AutoEncodeTool from "@/pastekit/component/autoencodetool"
import UrlTool from "@/pastekit/component/urltool"
import IpTool from "@/pastekit/component/iptool"
import DnsTool from "@/pastekit/component/dnstool"
import WorldClock from "@/pastekit/component/worldclock"
import AutoCipherTool from "@/pastekit/component/autociphertool"
import AIPromptSelector from "@/pastekit/component/aipromptselector";
import LanguageSwitcher from "@/pastekit/component/languageswitcher";
import {useTranslation, preloadTranslations} from "@/pastekit/utils/i18n";

// RSA密文特征检测
async function isLikelyRSACipher(content) {
    const trimmedContent = content.trim();

    // 基本格式检查 - 必须是有效的Base64
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(trimmedContent)) {
        return false;
    }

    // 长度检查 - RSA加密结果通常较长
    if (trimmedContent.length < 50) {
        return false;
    }

    // 长度特征检查 - RSA常见长度
    const typicalRSALengths = [344, 172, 256, 128];
    const isTypicalLength = typicalRSALengths.includes(trimmedContent.length);

    // 检查是否存在RSA配置
    try {
        const {StorageUtils} = await import('../utils/storageutils');
        const result = await StorageUtils.getItem('keyConfigs');
        const configs = result.keyConfigs || [];
        const hasRSAConfig = configs.some(config =>
            config.algorithm?.toUpperCase().includes('RSA') ||
            config.algorithmType?.toUpperCase() === 'RSA'
        );

        // 如果有RSA配置且长度符合特征，则很可能是RSA密文
        if (hasRSAConfig && (isTypicalLength || trimmedContent.length > 100)) {
            console.log('检测到RSA密文特征:', {
                length: trimmedContent.length,
                hasRSAConfig: hasRSAConfig,
                isTypicalLength: isTypicalLength
            });
            return true;
        }
    } catch (err) {
        console.log('RSA配置检查失败:', err.message);
    }

    return false;
}

// Format detection function
const detectContentType = async (content) => {
    const trimmedContent = content?.trim() || '';

    // Detect IPv4 address format
    const ipv4Pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Pattern.test(trimmedContent)) {
        return 'ip';
    }

    // Detect IPv6 address format (more strict detection)
    // Must contain at least one colon and cannot be pure numbers
    if (trimmedContent.includes(':') && !/^[\d\.]+$/.test(trimmedContent)) {
        const ipv6FullRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        const ipv6CompressedRegex = /^(([0-9a-fA-F]{1,4}:){1,7}:|:(([0-9a-fA-F]{1,4}:){1,7}|:)|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
        if (ipv6FullRegex.test(trimmedContent) || ipv6CompressedRegex.test(trimmedContent)) {
            return 'ipv6';
        }
    }

    // Detect IPv4 CIDR format (e.g. 192.168.1.0/24) - Must contain slash
    if (trimmedContent.includes('/')) {
        const cidrPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([1-9]|[12][0-9]|3[0-2])$/;
        if (cidrPattern.test(trimmedContent)) {
            return 'cidr';
        }
    }

    // Detect IPv6 CIDR format (e.g. 2001:db8::/32) - Must contain colon and slash
    if (trimmedContent.includes(':') && trimmedContent.includes('/')) {
        const ipv6CidrPattern = /^([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,7}|:|::)(\/(1[0-2][0-8]|[1-9][0-9]|[0-9]))$/;
        if (ipv6CidrPattern.test(trimmedContent)) {
            return 'ipv6cidr';
        }
    }

    // Detect Cron expression format
    // Support standard 5 fields: 0 0 * * *
    // Support 6 fields (with seconds): 0 0 0 * * *
    // Support Quartz format (with year): 0 0 0 * * ? 2024
    const cronPatterns = [
        /^([\d\*\/,\-\?]+\s+){4}[\d\*\/,\-\?]+$/,  // 5字段标准格式
        /^([\d\*\/,\-\?]+\s+){5}[\d\*\/,\-\?]+$/,  // 6字段格式(含秒)
        /^([\d\*\/,\-\?]+\s+){6}[\d\*\/,\-\?]+$/   // 7字段格式(含秒和年份)
    ];

    if (cronPatterns.some(pattern => pattern.test(trimmedContent))) {
        return 'cron';
    }

    // Detect timestamp format (10 or 13 digit numbers)
    const timestampPattern = /^\d{10}$|^\d{13}$/;
    if (timestampPattern.test(trimmedContent)) {
        return 'timestamp';
    }

    // Detect date time format (YYYY-MM-DD HH:mm:ss or similar format)
    const dateTimePattern = /^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}:\d{2})?$/;
    if (dateTimePattern.test(trimmedContent)) {
        return 'datetime';
    }
    try {
        // RSA密文特殊检测
        if (await isLikelyRSACipher(trimmedContent)) {
            return 'encrypted';
        }

        // 智能加密内容检测：优先检测加密内容
        if (trimmedContent.length > 10) {

            // 导入必要的工具函数
            const {StorageUtils} = await import('../utils/storageutils');
            const {CipherUtils} = await import('../utils/cipherutils');

            // 获取所有加密配置
            const result = await StorageUtils.getItem('keyConfigs');
            const configs = result.keyConfigs || [];

            if (configs.length > 0) {
                // 尝试用每个配置解密
                for (const config of configs) {
                    try {
                        const decrypted = CipherUtils.decrypt(trimmedContent, config);
                        // 检查解密结果
                        if (decrypted && decrypted !== trimmedContent) {
                            // 只有CFB模式才进行可打印字符判断
                            const isCFBMode = config.algorithm?.toUpperCase().includes('CFB') ||
                                config.mode?.toUpperCase() === 'CFB' || config.algorithm?.toUpperCase().includes('CTR') ||
                                config.mode?.toUpperCase() === 'CTR';

                            if (isCFBMode) {
                                // 导入文本工具函数
                                const {analyzePrintableCharacters} = await import('../utils/textutils');
                                const analysis = analyzePrintableCharacters(decrypted);

                                console.log('CFB模式解密结果分析:', {
                                    configName: config.name,
                                    originalLength: trimmedContent.length,
                                    decryptedLength: decrypted.length,
                                    decryptedContent: decrypted,
                                    ...analysis
                                });

                                // CFB模式下，可打印字符比例超过50%才认为是有效的明文
                                if (analysis.isReadable) {
                                    return 'encrypted';
                                }
                            } else {
                                // 非CFB模式直接认为解密成功
                                console.log('非CFB模式解密成功:', {
                                    configName: config.name,
                                    algorithm: config.algorithm,
                                    mode: config.mode
                                });
                                return 'encrypted';
                            }
                        }
                    } catch (err) {
                        // 解密失败，继续尝试下一个配置
                        continue;
                    }
                }
            }
        }
    } catch (err) {
        console.log('加密内容检测失败:', err);
    }

    // Detect JSON format
    try {
        // Check if content looks like JSON (starts with { or [)
        if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) || 
            (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
            // Try to parse as JSON
            JSON.parse(trimmedContent);
            return 'json';
        }
    } catch (e) {
        // Not valid JSON, continue with other detections
    }

    // Detect URL encoding characteristics (%xx format) and verify if decoded content contains http
    if (trimmedContent.toLowerCase().startsWith('http')) {
        return 'url';
    }
    const urlEncodedPattern = /%[0-9A-Fa-f]{2}/;
    if (urlEncodedPattern.test(trimmedContent)) {
        try {
            const decoded = decodeURIComponent(trimmedContent);
            if (decoded.toLowerCase().startsWith('http')) {
                return 'url';
            }
        } catch (e) {
            // Decoding failed
        }
    }

    // Detect domain format
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (domainPattern.test(trimmedContent)) {
        return 'domain';
    }

    // Detect Base64 format (moved to later in detection order)
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (base64Pattern.test(trimmedContent) && trimmedContent.length % 4 === 0 && trimmedContent.length > 10) {
        return 'encode';
    }

    // Default return encode (other formats)
    return 'encode';
};

export default function PopUp() {
    const [t, currentLanguage, isReady] = useTranslation();
    const [content, setContent] = useState('');
    const maxHeight = useChromePopupHeight();
    const [contentType, setContentType] = useState('encode');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isOnAIWebsite, setIsOnAIWebsite] = useState(false);
    const textareaRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    // 确保翻译数据已预加载
    useEffect(() => {
        const initializeTranslations = async () => {
            try {
                console.log('[Popup] Initializing translations...');
                await preloadTranslations();
                console.log('[Popup] Translations initialized successfully');
                setIsLoading(false);
            } catch (error) {
                console.error('[Popup] Failed to initialize translations:', error);
                setIsLoading(false);
            }
        };

        initializeTranslations();
    }, []);

    // 自动聚焦到Textarea - 在翻译准备好后执行
    useEffect(() => {
        if (textareaRef.current && isReady) {
            console.log('[Popup] Auto-focusing textarea');
            textareaRef.current.focus();
            // 也可以选择性地选中所有文本
            // textareaRef.current.select();
        }
    }, [isReady]); // 依赖isReady确保在翻译准备好后聚焦

    // 检测是否在AI网站
    useEffect(() => {
        const aiWebsites = [
            'https://www.qianwen.com',
            'https://kimi.moonshot.cn',
            'https://chat.deepseek.com',
            'https://yiyan.baidu.com',
            'https://chatglm.cn',
            'https://xinghuo.xfyun.cn',
            'https://yuanbao.tencent.com',
            'https://chat.openai.com',
            'https://claude.ai',
            'https://gemini.google.com'
        ];

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('获取标签页信息失败:', chrome.runtime.lastError);
                return;
            }

            if (tabs[0]?.url) {
                try {
                    const currentUrl = new URL(tabs[0].url);
                    const currentOrigin = `${currentUrl.origin}`;
                    const isAI = aiWebsites.includes(currentOrigin);
                    setIsOnAIWebsite(isAI);

                    if (isAI) {
                        console.log('Popup检测到AI网站:', currentOrigin);
                    }
                } catch (error) {
                    console.error('解析URL失败:', error);
                }
            }
        });
    }, []);

    // 内容类型检测（异步）
    useEffect(() => {
        const detectType = async () => {
            if (!content || content.trim() === '') {
                setContentType('encode');
                return;
            }

            const type = await detectContentType(content);
            setContentType(type);
        };

        detectType();
    }, [content]);

    // Chrome扩展环境下强制控制滚动行为
    React.useEffect(() => {
        const handleWheel = (e) => {
            // 阻止body级别的滚动
            e.preventDefault();
            e.stopPropagation();

            // 查找真正的可滚动元素
            const scrollableElement = document.querySelector('.overflow-y-auto');
            if (scrollableElement) {
                const delta = e.deltaY;
                scrollableElement.scrollTop += delta;
                // console.log('🖱️ Wheel event handled, scrolling Tool component');
            } else {
                // console.warn('⚠️ No scrollable element found');
            }
        };

        // 添加wheel事件监听器到body
        document.body.addEventListener('wheel', handleWheel, {passive: false});

        // 也监听touch事件以支持移动设备
        const handleTouchMove = (e) => {
            e.preventDefault();
        };

        document.body.addEventListener('touchmove', handleTouchMove, {passive: false});

        // 禁用默认的滚动行为
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        console.log('🚀 Scroll control initialized');

        return () => {
            document.body.removeEventListener('wheel', handleWheel);
            document.body.removeEventListener('touchmove', handleTouchMove);
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            console.log('🧹 Scroll control cleanup');
        };
    }, []);

    // Render corresponding components based on content type
    const renderToolComponent = () => {
        // 当翻译未准备好时显示加载状态
        if (!isReady) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <div className="text-sm text-gray-500">Loading translations...</div>
                    </div>
                </div>
            );
        }

        // When content is empty, display default local IP
        if (!content || content.trim() === '') {
            return <IpTool content={content} showMyIp={true}/>;
        }

        switch (contentType) {
            case 'ip':
            case 'ipv6':
            case 'cidr':
            case 'ipv6cidr':
                // When IP is entered, display both local IP and detailed query results
                return <IpTool content={content} showMyIp={true}/>;
            case 'domain':
                return <DnsTool content={content}/>;
            case 'cron':
                return <CroneTool cronExpr={content}/>;
            case 'timestamp':
            case 'datetime':
                return <TimeTool content={content}/>;
            case 'json':
                return <JsonTool content={content}/>;
            case 'url':
                return <UrlTool content={content}/>;
            case 'encrypted':
                return <AutoCipherTool content={content}/>;
            case 'encode':
            default:
                return <AutoEncodeTool content={content}/>;
        }
    };

    // 当翻译未准备好时显示整体加载状态
    if (!isReady) {
        return (
            <div className="w-[500px] h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-lg font-medium text-gray-700">Loading...</div>
                    <div className="text-sm text-gray-500 mt-2">Preparing translation data</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-[500px] h-[600px] border rounded flex flex-col overflow-hidden`}>
            {/* Fixed header - 绝对不滚动 */}
            <div className="shrink-0">
                {/* Language Switcher */}
                <div className="h-[30px] flex items-center px-2">
                    <LanguageSwitcher variant="horizontal"/>
                </div>
                <div className="border-b">
                    <WorldClock/>
                </div>
                <div>
                    <Textarea
                        ref={textareaRef}
                        className='h-[100px]'
                        placeholder={t('popup.placeholder')}
                        id="message-2"
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value)
                        }}
                    />
                    <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
                        {(() => {
                            const detectedFormat = t('popup.detected_format');
                            const defaultIP = t('popup.default_ip');
                            const formatText = t(`popup.formats.${contentType}`);

                            return !content || content.trim() === ''
                                ? `${detectedFormat} ${defaultIP}`
                                : `${detectedFormat} ${formatText}`;
                        })()}
                    </div>
                </div>
            </div>

            {/* 可滚动的内容区域 */}
            <div className="flex-1 overflow-y-auto">
                {!isOnAIWebsite && renderToolComponent()}
                <AIPromptSelector
                    content={content}
                    onGeneratedPromptChange={setGeneratedPrompt}
                    onAIWebsiteDetected={setIsOnAIWebsite}
                />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t bg-gray-50 px-4 py-3 flex justify-center items-center gap-4">
                <TooltipProvider delayDuration={100}>
                    {/* Advanced Settings */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href="options.html"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
                            >
                                <Settings className="w-5 h-5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('advanced_settings')}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Video Tutorial */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href="https://www.youtube.com/@PasteKitLab"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 hover:text-red-700 transition-colors duration-200"
                            >
                                <Video className="w-5 h-5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('video_tutorial')}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/*/!* Documentation *!/*/}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href="https://pastekitlab.github.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 transition-colors duration-200"
                            >
                                <Book className="w-5 h-5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('documentation')}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Feedback */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href="https://github.com/pastekitlab/pastekitlab/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 transition-colors duration-200"
                            >
                                <MessageSquare className="w-5 h-5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('feedback')}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Donate */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href="https://ko-fi.com/pastekitlab"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-600 hover:text-yellow-700 transition-colors duration-200"
                            >
                                <Coffee className="w-5 h-5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('donate')}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* GitHub */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href="https://github.com/pastekitlab/pastekitlab"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-900 text-white p-1 rounded hover:bg-gray-800 transition-colors duration-200"
                            >
                                <Github className="w-5 h-5"/>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('github_repository')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}