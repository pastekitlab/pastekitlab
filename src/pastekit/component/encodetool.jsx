import React, { useState, useCallback, useEffect, useRef } from 'react';
import QRCodeComponent from './qrcode';
import { useTranslation } from '../utils/i18n';

// Encoding/decoding utility functions

// Base64 encoding/decoding
const encodeBase64 = (str) => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        throw new Error('Base64 encoding failed: ' + e.message);
    }
};

const decodeBase64 = (str) => {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        throw new Error('Base64 decoding failed: ' + e.message);
    }
};

// Hex encoding/decoding
const encodeHex = (str) => {
    try {
        // Use TextEncoder to convert string to UTF-8 byte array, then convert to hexadecimal
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    } catch (e) {
        throw new Error('Hex encoding failed: ' + e.message);
    }
};

const decodeHex = (hex) => {
    try {
        if (hex.length % 2 !== 0) {
            // If length is odd, prepend 0
            hex = '0' + hex;
        }
        // Convert hexadecimal string to byte array
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        // First try to decode as UTF-8 text
        const decoder = new TextDecoder('utf-8');
        const decodedText = decoder.decode(bytes);
        
        // Check if the decoded text contains mostly printable characters
        // Consider printable: letters, numbers, common punctuation, spaces
        const printableChars = decodedText.match(/[\x20-\x7E\u4e00-\u9fff]/g);
        const printableRatio = printableChars ? printableChars.length / decodedText.length : 0;
        
        // If less than 70% of characters are printable, show as byte array
        if (printableRatio < 0.7) {
            // Return byte array representation with metadata
            return {
                value: bytes.map(byte => '0x' + byte.toString(16).padStart(2, '0')).join(' '),
                isByteArray: true,
                byteCount: bytes.length
            };
        }
        
        return {
            value: decodedText,
            isByteArray: false
        };
    } catch (e) {
        throw new Error('Hex decoding failed: ' + e.message);
    }
};

// URL encoding/decoding
const encodeUrl = (str) => {
    try {
        return encodeURIComponent(str);
    } catch (e) {
        throw new Error('URL encoding failed: ' + e.message);
    }
};

const decodeUrl = (str) => {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        throw new Error('URL decoding failed: ' + e.message);
    }
};

// Unicode encoding/decoding
const encodeUnicode = (str) => {
    try {
        return Array.from(str)
            .map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))
            .join('');
    } catch (e) {
        throw new Error('Unicode encoding failed: ' + e.message);
    }
};

const decodeUnicode = (str) => {
    try {
        return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    } catch (e) {
        throw new Error('Unicode decoding failed: ' + e.message);
    }
};

// ASCII encoding/decoding
const encodeAscii = (str) => {
    try {
        return Array.from(str)
            .map(char => char.charCodeAt(0).toString())
            .join(',');
    } catch (e) {
        throw new Error('ASCII encoding failed: ' + e.message);
    }
};

const decodeAscii = (asciiStr) => {
    try {
        return asciiStr.split(',')
            .map(code => String.fromCharCode(parseInt(code, 10)))
            .join('');
    } catch (e) {
        throw new Error('ASCII decoding failed: ' + e.message);
    }
};

// UTF-8 byte array encoding/decoding
const encodeUtf8Bytes = (str) => {
    try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return Array.from(bytes).join(',');
    } catch (e) {
        throw new Error('UTF-8 byte encoding failed: ' + e.message);
    }
};

const decodeUtf8Bytes = (byteStr) => {
    try {
        const bytes = new Uint8Array(byteStr.split(',').map(b => parseInt(b, 10)));
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    } catch (e) {
        throw new Error('UTF-8 byte decoding failed: ' + e.message);
    }
};

// Format detection function
const detectFormat = (content) => {
    if (!content || typeof content !== 'string') return null;
    
    const trimmed = content.trim();
    
    // Detect URL encoding (%xx format) - highest priority
    if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
        try {
            decodeURIComponent(trimmed);
            return 'url';
        } catch {
            // Not valid URL encoding
        }
    }
    
    // Detect Unicode encoding (\\uxxxx format)
    if (/\\u[0-9a-fA-F]{4}/.test(trimmed)) {
        return 'unicode';
    }
    
    // Detect comma-separated number sequences (ASCII codes or UTF-8 bytes)
    if (/^(\d+,)*\d+$/.test(trimmed)) {
        // Further validate if it's valid UTF-8 byte values (0-255)
        const bytes = trimmed.split(',').map(b => parseInt(b, 10));
        if (bytes.every(b => b >= 0 && b <= 255)) {
            // All numbers are within 0-255 range, it's UTF-8 bytes
            return 'utf8-bytes';
        } else {
            // Numbers exist that are greater than 255 or less than 0, process as ASCII codes
            return 'ascii';
        }
    }
    
    // Detect Hex (only contains 0-9, a-f, A-F and even length)
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
        // According to project specifications, as long as it matches ^[0-9A-Fa-f]+$ regex pattern and has even length, it's considered Hex encoding
        return 'hex';
    }
    
    // Detect Base64 (only contains A-Z, a-z, 0-9, +, /, = and length is multiple of 4)
    // Enhanced validation: exclude obvious JSON fragments, XML tags and other structured data
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
        // Exclude obvious structured data patterns
        const jsonLikePattern = /[{}[\]:,"']/;
        const xmlLikePattern = /<[a-zA-Z][^>]*>/;
        const htmlLikePattern = /<[^>]+>/;
        
        // Exclude common non-Base64 patterns
        const nonBase64Patterns = [
            /\{[^}]*\}/,  // JSON objects
            /\[[^\]]*\]/, // JSON arrays
            /".*?:/,      // JSON key-value pairs
            /<[^>]+>/,    // HTML/XML tags
            /\\u[0-9a-fA-F]{4}/, // Unicode escapes
            /%[0-9A-Fa-f]{2}/     // URL encoding
        ];
        
        // Check if any non-Base64 pattern matches
        const hasNonBase64Pattern = nonBase64Patterns.some(pattern => pattern.test(trimmed));
        
        if (jsonLikePattern.test(trimmed) || xmlLikePattern.test(trimmed) || htmlLikePattern.test(trimmed) || hasNonBase64Pattern) {
            // Contains structured data characteristics, unlikely to be Base64
            return 'plain';
        }
        
        try {
            atob(trimmed);
            return 'base64';
        } catch {
            // Not valid Base64
        }
    }
    
    return 'plain'; // Plain text
};

// Get all supported formats (excluding plain text)
const getSupportedFormats = () => [
    { key: 'base64', name: 'Base64', encode: encodeBase64, decode: decodeBase64 },
    { key: 'hex', name: 'Hex', encode: encodeHex, decode: decodeHex },
    { key: 'url', name: 'URL Encoding', encode: encodeUrl, decode: decodeUrl },
    { key: 'unicode', name: 'Unicode', encode: encodeUnicode, decode: decodeUnicode },
    { key: 'ascii', name: 'ASCII Code', encode: encodeAscii, decode: decodeAscii },
    { key: 'utf8-bytes', name: 'UTF-8 Bytes', encode: encodeUtf8Bytes, decode: decodeUtf8Bytes },
    { key: 'qrcode', name: 'QR Code', encode: null, decode: null, isQR: true }
];

export default function EncodeTool({ content }) {
    const [t] = useTranslation();
    
    console.log('🔧 EncodeTool rendering:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // Don't display component if no content
    if (!content || content === undefined || content === null) {
        return null;
    }

    const [results, setResults] = useState({});
    const [error, setError] = useState(null);
    const [detectedFormat, setDetectedFormat] = useState(null);
    const [activeFormat, setActiveFormat] = useState('base64'); // Default activate Base64
    const [qrSize, setQrSize] = useState(200);
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 State update:', { detectedFormat, resultsCount: Object.keys(results).length, hasError: !!error });

    // Core function to process encoding/decoding
    const processEncoding = useCallback((inputContent = content) => {
        console.log('🚀 Executing processEncoding:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setError(null);
        setResults({});

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                setResults({});
                return;
            }

            // Detect input format
            const detected = detectFormat(trimmedContent);
            setDetectedFormat(detected);

            const newResults = {};
            const formats = getSupportedFormats();

            // Smart processing for each format: decide encoding or decoding based on input content
            formats.forEach(format => {
                const result = {
                    encodeSuccess: false,
                    decodeSuccess: false,
                    encoded: '',
                    decoded: '',
                    encodeError: '',
                    decodeError: '',
                    operation: '' // Record actual operation performed
                };

                // Smart judgment: if input is already target format, perform decoding; otherwise perform encoding
                const isInputInTargetFormat = detected === format.key;
                
                if (isInputInTargetFormat && format.decode) {
                    // Input content is already target format, perform decoding
                    try {
                        const decodeResult = format.decode(trimmedContent);
                        
                        // Handle both string and object return types
                        if (typeof decodeResult === 'object' && decodeResult !== null) {
                            result.decoded = decodeResult.value;
                            result.isByteArray = decodeResult.isByteArray;
                            result.byteCount = decodeResult.byteCount;
                        } else {
                            result.decoded = decodeResult;
                            result.isByteArray = false;
                        }
                        
                        result.decodeSuccess = true;
                        result.operation = 'decode';
                    } catch (e) {
                        result.decodeError = e.message;
                    }
                } else if (!isInputInTargetFormat && format.encode) {
                    // Input content is not target format, perform encoding
                    try {
                        result.encoded = format.encode(trimmedContent);
                        result.encodeSuccess = true;
                        result.operation = 'encode';
                    } catch (e) {
                        result.encodeError = e.message;
                    }
                }

                newResults[format.key] = result;
            });

            setResults(newResults);
            
            // 如果检测到Unicode、Hex、UTF-8字节、ASCII或URL格式，自动切换到对应标签页
            if (detected === 'unicode' || detected === 'hex' || detected === 'utf8-bytes' || detected === 'ascii' || detected === 'url') {
                setActiveFormat(detected);
            }
            
            // Generate QR code for plain text
            if (detected === 'plain' && trimmedContent) {
                // QR code generation is now handled by QRCodeComponent
                // No need to generate here since it's only shown when activeFormat === 'qrcode'
            } else {
                // No QR code data needed for other formats
            }
        } catch (err) {
            setError(err.message);
        }
    }, [qrSize]);

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

        console.log('🔍 Debounce triggered:', {content: content.substring(0, 50) + '...', timestamp: Date.now()});

        // Clear previous timers
        if (debounceTimerRef.current) {
            console.log('🧹 Clearing old timer:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ Debounce executing content change:', {
                content: content.substring(0, 50) + '...',
                timestamp: Date.now()
            });
            processEncoding(content);
            // Update last processed content
            lastProcessedContentRef.current = content;
        }, 300); // 减少延迟以更快响应

        console.log('⏰ Setting new timer:', debounceTimerRef.current, 'delay: 300ms');

        // Cleanup function
        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 Clearing timer on component unmount:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processEncoding]);

    // Initial processing
    useEffect(() => {
        if (content && content !== lastProcessedContentRef.current) {
            processEncoding(content);
            lastProcessedContentRef.current = content;
        }
    }, []); // Execute only once when component mounts

    const formats = getSupportedFormats();

    return (
        <div>
            <div className="w-full border rounded p-4 space-y-4">
                <h3 className="text-lg font-bold">{t('components.encodetool.title')}</h3>
            
            {/* Detected format */}
            {detectedFormat && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    🔍 {t('components.encodetool.detected_format')}: <strong>{formats.find(f => f.key === detectedFormat)?.name || detectedFormat}</strong>
                </div>
            )}

            {/* Error notification */}
            {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                    <strong>{t('components.encodetool.processing_error')}:</strong> {error}
                </div>
            )}

            {/* Format switching buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
                {formats.map(format => (
                    <button
                        key={format.key}
                        onClick={() => setActiveFormat(format.key)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                            activeFormat === format.key
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        {format.name}
                    </button>
                ))}
            </div>

            {/* QR Code Generator Section */}
            {activeFormat === 'qrcode' && (
                <QRCodeComponent 
                    content={content?.trim() || ''}
                    size={qrSize}
                    onSizeChange={setQrSize}
                    type="svg"
                />
            )}

            {/* Result display - only show currently selected format (except QR Code) */}
            {activeFormat !== 'qrcode' && (
                <div className="space-y-4">
                    {(() => {
                        const format = formats.find(f => f.key === activeFormat);
                        const result = results[activeFormat];
                        
                        if (!format || !result) return null;

                        // Only display format when encoding or decoding succeeds
                        const shouldShow = result.encodeSuccess || result.decodeSuccess;
                        if (!shouldShow) return null;

                        return (
                            <div key={format.key} className="border rounded p-3">
                                <h4 className="font-medium text-sm mb-2 text-gray-700">{format.name}</h4>
                                
                                {/* Display operation type and results */}
                                {result.operation === 'encode' && result.encodeSuccess && (
                                    <div className="mb-2">
                                        <div className="text-xs text-gray-500 mb-1">🔄 {t('components.encodetool.encoding_result', { format: format.name })}:</div>
                                        <div className="text-xs font-mono bg-green-100 px-2 py-1 rounded break-all">
                                            {result.encoded}
                                        </div>
                                    </div>
                                )}

                                {result.operation === 'decode' && result.decodeSuccess && (
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">
                                            🔓 {t('components.encodetool.decoding_result', { format: format.name })}:
                                        </div>
                                        
                                        {/* Byte array hint */}
                                        {result.isByteArray && (
                                            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2 flex items-center gap-1">
                                                ⚠️ Binary data detected, displayed as byte code format (Total {result.byteCount} bytes)
                                            </div>
                                        )}
                                        
                                        <div className="text-xs font-mono bg-blue-100 px-2 py-1 rounded break-all">
                                            {result.decoded}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Empty state notification */}
            {!detectedFormat && Object.keys(results).length === 0 && !error && (
                <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">🔧</div>
                    <div>{t('components.encodetool.enter_content')}</div>
                    <div className="text-sm mt-1">{t('components.encodetool.support_desc')}</div>
                </div>
            )}

            {/* Current format has no results notification */}
            {results[activeFormat] && !results[activeFormat].encodeSuccess && !results[activeFormat].decodeSuccess && (
                <div className="text-center text-gray-500 py-4">
                    {t('components.encodetool.cannot_process')}
                </div>
            )}
        </div>
    </div>
    );
}