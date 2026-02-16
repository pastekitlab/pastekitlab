import { useState, useEffect } from 'react';
import { useTranslation } from '../utils/i18n';

export default function TimeTool({content}) {
    const [t] = useTranslation();
    
    // 判断是否为有效的时间字符串（支持 yyyy-MM-dd HH:mm:ss）
    const isValidTimeInput = (input) => {
        // 情况1: 是数字
        if (typeof input === 'number') {
            if (isNaN(input)) return false;
            const clean = Math.floor(Math.abs(input)).toString();
            return clean.length === 10 || clean.length === 13;
        }

        // 情况2: 是字符串
        if (typeof input === 'string') {
            // 子情况2a: 是纯数字字符串（10位或13位）
            if (/^\d+$/.test(input)) {
                return input.length === 10 || input.length === 13;
            }
            // 子情况2b: 是日期格式字符串（如 "2025-04-05 14:30:00"）
            const date = new Date(input);
            return !isNaN(date.getTime());
        }
        // 其他类型（boolean, object, null 等）→ 无效
        return false;
    };

    // 安全解析字符串为时间戳（毫秒）
    const parseStringToTimestamp = (str) => {
        const date = new Date(str);
        return isNaN(date.getTime()) ? null : date.getTime();
    };

    // 格式化时间戳为 yyyy-MM-dd HH:mm:ss（自动识别10位/13位）
    const formatTimestamp = (ts) => {
        // 先确保是数字
        if (typeof ts !== 'number' || isNaN(ts)) {
            return null;
        }

        // 判断是 10 位（秒）还是 13 位（毫秒）
        const clean = Math.floor(Math.abs(ts));
        let timestampMs;

        if (clean.toString().length === 10) {
            timestampMs = ts * 1000; // 秒 → 毫秒
        } else if (clean.toString().length === 13) {
            timestampMs = ts; // 已是毫秒
        } else {
            // 既不是10位也不是13位，可能是无效时间戳
            return null;
        }

        const date = new Date(timestampMs);
        if (isNaN(date.getTime())) {
            return null;
        }

        const pad = (n) => n.toString().padStart(2, '0');
        const y = date.getFullYear();
        const m = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const H = pad(date.getHours());
        const M = pad(date.getMinutes());
        const S = pad(date.getSeconds());

        return `${y}-${m}-${d} ${H}:${M}:${S}`;
    };

    // 主转换逻辑 - 双向转换
    const convertContent = () => {
        // 情况1: content 是数字（时间戳）
        if (typeof content === 'number') {
            const formatted = formatTimestamp(content);
            return {
                display: formatted || '(无效时间戳)',
                timestamp: content,
                type: 'timestamp',
                showDate: true, // 显示日期格式
                showTimestamp: false // 不显示时间戳（因为输入就是时间戳）
            };
        }

        // 情况2: content 是字符串
        if (typeof content === 'string') {
            // 2a: 纯数字字符串（10位或13位时间戳）
            if (/^\d+$/.test(content) && (content.length === 10 || content.length === 13)) {
                const formatted = formatTimestamp(+content);
                return {
                    display: formatted || t('components.timetool.invalid_timestamp'),
                    timestamp: +content,
                    type: 'timestamp-string',
                    showDate: true, // 显示日期格式
                    showTimestamp: false // 不显示时间戳
                };
            }
            
            // 2b: 日期格式字符串（如 "2025-04-05 14:30:00"）
            const timestamp = parseStringToTimestamp(content);
            if (timestamp !== null) {
                const formatted = formatTimestamp(timestamp);
                return {
                    display: formatted || t('components.timetool.invalid_timestamp'),
                    timestamp: timestamp,
                    type: 'date-string',
                    showDate: false, // 不显示日期格式（因为输入就是日期）
                    showTimestamp: true // 显示时间戳
                };
            }
            
            return {
                display: t('components.timetool.cannot_parse'),
                timestamp: null,
                type: 'invalid',
                showDate: false,
                showTimestamp: false
            };
        }

        // 其他类型
        return {
            display: content != null ? String(content) : t('components.timetool.empty_content'),
            timestamp: null,
            type: 'other',
            showDate: false,
            showTimestamp: false
        };
    };

    const result = convertContent();

    // 判断是否显示组件 - 不限制原始内容，只要有内容就显示
    const shouldShow = content !== undefined && content !== null;
    
    // 格式化时间戳显示 - 返回结构化数据
    const formatTimestampDisplay = (timestamp) => {
        if (!timestamp || isNaN(timestamp)) return [];
        
        const clean = Math.floor(Math.abs(timestamp));
        if (clean.toString().length === 10) {
            // 10位时间戳：显示秒级，同时计算对应的毫秒级
            const millisecondTimestamp = timestamp * 1000;
            return [
                { label: t('components.timetool.timestamp_s'), value: timestamp },
                { label: t('components.timetool.timestamp_ms'), value: millisecondTimestamp }
            ];
        } else if (clean.toString().length === 13) {
            // 13位时间戳：显示毫秒级，同时计算对应的秒级
            const secondTimestamp = Math.floor(timestamp / 1000);
            return [
                { label: t('components.timetool.timestamp_ms'), value: timestamp },
                { label: t('components.timetool.timestamp_s'), value: secondTimestamp }
            ];
        }
        return [{ label: t('components.timetool.timestamp'), value: timestamp }];
    };

    // 实时时间状态
    const [currentTimeInfo, setCurrentTimeInfo] = useState(() => {
        const now = new Date();
        const timestamp = now.getTime(); // 毫秒时间戳
        const secondsTimestamp = Math.floor(timestamp / 1000); // 秒时间戳
        
        const pad = (n) => n.toString().padStart(2, '0');
        const y = now.getFullYear();
        const m = pad(now.getMonth() + 1);
        const d = pad(now.getDate());
        const H = pad(now.getHours());
        const M = pad(now.getMinutes());
        const S = pad(now.getSeconds());
        const ms = pad(now.getMilliseconds());
        
        const formattedDate = `${y}-${m}-${d} ${H}:${M}:${S}.${ms}`;
        
        return {
            formattedDate,
            timestamp,
            secondsTimestamp
        };
    });

    // 更新实时时间的定时器
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const timestamp = now.getTime(); // 毫秒时间戳
            const secondsTimestamp = Math.floor(timestamp / 1000); // 秒时间戳
            
            const pad = (n) => n.toString().padStart(2, '0');
            const y = now.getFullYear();
            const m = pad(now.getMonth() + 1);
            const d = pad(now.getDate());
            const H = pad(now.getHours());
            const M = pad(now.getMinutes());
            const S = pad(now.getSeconds());
            const ms = pad(now.getMilliseconds());
            
            const formattedDate = `${y}-${m}-${d} ${H}:${M}:${S}.${ms}`;
            
            setCurrentTimeInfo({
                formattedDate,
                timestamp,
                secondsTimestamp
            });
        }, 10); // 每10毫秒更新一次，使时间流畅移动

        // 清理定时器
        return () => clearInterval(timer);
    }, []);

    return (
        <div>
            {shouldShow && (
                <div className="w-full border rounded p-3 space-y-2">
                    {/* Parsing results - date format display */}
                    {result.showDate && (result.type !== 'other' && result.type !== 'invalid') && (
                        <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-gray-600 w-32 text-right flex-shrink-0">{t('components.timetool.date_format')}:</span>
                            <span className="text-sm font-mono break-all bg-blue-100 px-2 py-1 rounded flex-1 min-w-0">
                                {result.display}
                            </span>
                        </div>
                    )}
                    
                    {/* Timestamp information */}
                    {result.showTimestamp && result.timestamp && (
                        <div className="space-y-2">
                            {formatTimestampDisplay(result.timestamp).map((item, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <span className="text-sm font-medium text-gray-600 w-32 text-right flex-shrink-0">{item.label}:</span>
                                    <span className="text-sm font-mono break-all bg-green-100 px-2 py-1 rounded flex-1 min-w-0">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Real-time current time information */}
                    <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-gray-600 w-32 text-right flex-shrink-0">{t('components.timetool.current_time')}:</span>
                            <span className="text-sm font-mono break-all bg-purple-100 px-2 py-1 rounded flex-1 min-w-0">
                                {currentTimeInfo.formattedDate}
                            </span>
                        </div>
                        <div className="flex items-start gap-2 mt-1">
                            <span className="text-sm font-medium text-gray-600 w-32 text-right flex-shrink-0">{t('components.timetool.current_timestamp_ms')}:</span>
                            <span className="text-sm font-mono break-all bg-purple-100 px-2 py-1 rounded flex-1 min-w-0">
                                {currentTimeInfo.timestamp}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}