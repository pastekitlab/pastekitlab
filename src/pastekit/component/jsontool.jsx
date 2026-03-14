import React, {useState, useCallback, useEffect, useRef} from 'react';
import { useTranslation } from '../utils/i18n';

// 工具：安全格式化 JSON
const formatJson = (str) => {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, 4);
};

// 工具：压缩 JSON（移除多余空白）
const minifyJson = (str) => {
    const obj = JSON.parse(str);
    return JSON.stringify(obj);
};

// 工具：定位 JSON 错误位置，并提取上下文
const locateJsonError = (str) => {
    try {
        JSON.parse(str);
        return null;
    } catch (err) {
        // 尝试从错误消息中提取 position（Chrome/Firefox 支持）
        const match = err.message.match(/at position (\d+)/);
        let position = -1;

        if (match) {
            position = parseInt(match[1], 10); // 0-based index
        } else {
            // 如果无法获取 position，回退到逐行估算（保留原逻辑简化版）
            const lines = str.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const testStr = lines.slice(0, i + 1).join('\n');
                try {
                    // 简单补全尝试
                    let completed = testStr;
                    const openBraces = (testStr.match(/{/g) || []).length - (testStr.match(/}/g) || []).length;
                    const openBrackets = (testStr.match(/\[/g) || []).length - (testStr.match(/]/g) || []).length;
                    completed += '}'.repeat(Math.max(0, openBraces)) + ']'.repeat(Math.max(0, openBrackets));
                    JSON.parse(completed);
                } catch {
                    // 假设错误在当前行末尾
                    position = testStr.length;
                    break;
                }
            }
        }

        if (position < 0 || position >= str.length) {
            position = str.length - 1;
        }

        // 提取上下文：前3个 + 当前 + 后3个
        const start = Math.max(0, position - 3);
        const end = Math.min(str.length, position + 4); // position+1 是下一个字符，+4 → 取3个后
        const contextBefore = str.slice(start, position);
        const errorChar = str.charAt(position) || '';
        const contextAfter = str.slice(position + 1, end);

        // 计算行号和列号（用于显示）
        const upToPos = str.slice(0, position);
        const line = upToPos.split('\n').length;
        const column = upToPos.split('\n').pop().length + 1;

        return {
            line,
            column,
            position,
            context: {
                before: contextBefore,
                char: errorChar,
                after: contextAfter,
            },
            rawMessage: err.message,
        };
    }
};

export default function JsonTool({content}) {
    const [t] = useTranslation();
    
    // 更严格的JSON检测逻辑
    const trimmedContent = content?.trim() || '';
    
    // 检查是否为有效的JSON结构（对象或数组）
    const isValidJsonStructure = trimmedContent && (
        trimmedContent.startsWith('{') || 
        trimmedContent.startsWith('[')
    );
    
    // 排除纯数字、字符串等简单类型
    const isSimpleType = trimmedContent && (
        // 纯数字（整数或小数）
        /^\d+(\.\d+)?$/.test(trimmedContent) ||
        // 纯字符串（带引号）
        (/^".*"$/.test(trimmedContent) && trimmedContent.length > 2) ||
        // 布尔值
        trimmedContent === 'true' || 
        trimmedContent === 'false' ||
        // null值
        trimmedContent === 'null'
    );
    
    const isValidJsonStart = isValidJsonStructure && !isSimpleType;
    
    console.log('🔧 JsonTool渲染:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        isValidJsonStart,
        isValidJsonStructure,
        isSimpleType,
        trimmedContent,
        timestamp: Date.now()
    });

    // 如果content不以{或[开头，则不渲染组件内容
    if (!isValidJsonStart) {
        return null;
    }

    const [output, setOutput] = useState('');
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('format'); // 'format' | 'minify'
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 State update:', {mode, outputLength: output.length, hasError: !!error});

    // Core function to process JSON
    const processJson = useCallback((inputContent = content, targetMode = mode) => {
        console.log('🚀 Executing processJson:', {
            content: inputContent?.substring(0, 50) + '...',
            mode: targetMode,
            timestamp: Date.now()
        });

        setError(null);
        setOutput('');

        try {
            if (targetMode === 'format') {
                const formatted = formatJson(inputContent);
                setOutput(formatted);
            } else if (targetMode === 'minify') {
                const minified = minifyJson(inputContent);
                setOutput(minified);
            }
        } catch (err) {
            const location = locateJsonError(inputContent);
            setError({
                ...location,
                rawMessage: err.message,
            });
        }
    }, []);

    // Button click handler - execute immediately
    const handleModeChange = useCallback((newMode) => {
        console.log('🖱️ Button click:', {newMode, content: content?.substring(0, 50) + '...'});
        setMode(newMode);
        // Execute immediately, no debounce
        processJson(content, newMode);
    }, [content, processJson]);

    // Debounce handling for content changes
    useEffect(() => {
        console.log('🎯 Content change monitoring:', {
            content: content?.substring(0, 50) + '...',
            hasContent: !!content,
            lastProcessed: lastProcessedContentRef.current?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        // Skip processing if content hasn't changed or is empty
        if (!content || content === lastProcessedContentRef.current) {
            console.log('⚠️ Content unchanged or empty, skipping debounce processing');
            return;
        }

        console.log('🔍 Debounce triggered:', {content: content.substring(0, 50) + '...', mode, timestamp: Date.now()});

        // Clear previous timers
        if (debounceTimerRef.current) {
            console.log('🧹 Clearing old timer:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ Debounce executing content change:', {
                content: content.substring(0, 50) + '...',
                mode,
                timestamp: Date.now()
            });
            processJson(content, mode);
            // Update last processed content
            lastProcessedContentRef.current = content;
        }, 500);

        console.log('⏰ Setting new timer:', debounceTimerRef.current, 'delay: 500ms');

        // Cleanup function
        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 Clearing timer on component unmount:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, mode, processJson]); // Monitor content, mode and processJson changes

    return (
        <div className="w-full max-w-4xl mx-auto p-4 border rounded">
            <h2 className="text-xl font-bold mb-4">{t('jsontool.title')}</h2>

            {/* Control buttons */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => handleModeChange('format')}
                    className={`px-3 py-1 rounded ${mode === 'format' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                    {t('jsontool.format_json')}
                </button>
                <button
                    onClick={() => handleModeChange('minify')}
                    className={`px-3 py-1 rounded ${mode === 'minify' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                    {t('jsontool.compress_json')}
                </button>
            </div>

            {/* Error notification */}
            {error && (
                <div className="mt-2 p-3 bg-red-100 text-red-800 rounded text-sm font-mono">
                    <strong>{t('jsontool.parsing_error')}:</strong>
                    Line {error.line}, Column {error.column}
                    <br/>
                    <span className="text-gray-600">Context: </span>
                    <span className="bg-yellow-200">{error.context.before}</span>
                    <span className="bg-red-300 font-bold">{error.context.char || '␣'}</span>
                    <span className="bg-yellow-200">{error.context.after}</span>
                    <br/>
                    <span className="text-xs text-gray-700">{error.rawMessage}</span>
                </div>
            )}
            {/* Output box */}
            <div className="mt-4">
                <h3 className="font-medium mb-1">{t('jsontool.result')}:</h3>
                <pre className="w-full h-40 p-2 bg-gray-100 border rounded overflow-auto font-mono text-sm">
                    {output || (error ? t('jsontool.error_indicator') : t('jsontool.click_process'))}
                </pre>
            </div>
        </div>
    );
}