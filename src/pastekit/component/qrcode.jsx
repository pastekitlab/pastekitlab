import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../utils/i18n';

// QR Code generation utility for canvas-based QR codes
const generateQRCode = (text, size = 200) => {
    try {
        // Simple QR code generation using canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = size;
        canvas.height = size;
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        // Draw simple QR-like pattern (this is a simplified version)
        ctx.fillStyle = 'black';
        
        // Add finder patterns (corners)
        const addFinderPattern = (x, y) => {
            // Outer square
            ctx.fillRect(x, y, 7, 7);
            // Inner white square
            ctx.fillStyle = 'white';
            ctx.fillRect(x + 1, y + 1, 5, 5);
            // Inner black square
            ctx.fillStyle = 'black';
            ctx.fillRect(x + 2, y + 2, 3, 3);
            ctx.fillStyle = 'black';
        };
        
        addFinderPattern(0, 0);
        addFinderPattern(size - 7, 0);
        addFinderPattern(0, size - 7);
        
        // Add timing patterns
        for (let i = 8; i < size - 8; i += 2) {
            ctx.fillRect(i, 6, 1, 1);
            ctx.fillRect(6, i, 1, 1);
        }
        
        // Add data (simplified representation)
        const dataAreaSize = size - 16;
        const gridSize = Math.min(21, Math.ceil(Math.sqrt(text.length * 8)));
        const cellSize = Math.floor(dataAreaSize / gridSize);
        
        // Generate pseudo-random pattern based on text
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
        }
        
        // Fill data area with pattern
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const index = row * gridSize + col;
                const bit = (hash >> (index % 32)) & 1;
                
                if (bit && 
                    row > 0 && row < gridSize - 1 && 
                    col > 0 && col < gridSize - 1) {
                    ctx.fillRect(8 + col * cellSize, 8 + row * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }
        
        return canvas.toDataURL('image/png');
    } catch (e) {
        throw new Error('QR Code generation failed: ' + e.message);
    }
};

export default function QRCodeComponent({ 
    content, 
    size = 200, 
    onSizeChange,
    type = 'svg', // 'svg' or 'canvas'
    regenerateCallback // 用于重新生成的回调函数
}) {
    const [t] = useTranslation();
    const [qrSize, setQrSize] = useState(size);
    const [qrCodeData, setQrCodeData] = useState(null);

    // 当内容或尺寸变化时重新生成二维码
    useEffect(() => {
        if (content) {
            try {
                if (type === 'canvas') {
                    const qrData = generateQRCode(content, qrSize);
                    setQrCodeData(qrData);
                } else {
                    // SVG类型不需要预生成，QRCodeSVG组件会自动处理
                    setQrCodeData(null);
                }
            } catch (e) {
                console.error('QR Code generation error:', e);
                setQrCodeData(null);
            }
        } else {
            setQrCodeData(null);
        }
    }, [content, qrSize, type]);

    // 处理尺寸变化
    const handleSizeChange = (newSize) => {
        setQrSize(newSize);
        if (onSizeChange) {
            onSizeChange(newSize);
        }
    };

    // 重新生成二维码
    const handleRegenerate = () => {
        if (regenerateCallback) {
            regenerateCallback();
        } else {
            // 默认重新生成逻辑
            if (content) {
                try {
                    if (type === 'canvas') {
                        const qrData = generateQRCode(content, qrSize);
                        setQrCodeData(qrData);
                    }
                } catch (e) {
                    console.error('QR Code regeneration error:', e);
                }
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-700 mr-2">
                        {t('components.qrcode.size_label')}:
                    </label>
                    <select 
                        value={qrSize}
                        onChange={(e) => handleSizeChange(Number(e.target.value))}
                        className="px-3 py-1 border rounded text-sm"
                    >
                        <option value={100}>{t('components.qrcode.size_100')}</option>
                        <option value={150}>{t('components.qrcode.size_150')}</option>
                        <option value={200}>{t('components.qrcode.size_200')}</option>
                        <option value={250}>{t('components.qrcode.size_250')}</option>
                        <option value={300}>{t('components.qrcode.size_300')}</option>
                    </select>
                </div>
                
                <button
                    onClick={handleRegenerate}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                >
                    {t('components.qrcode.regenerate')}
                </button>
            </div>

            <div className="flex justify-center">
                {content ? (
                    <div className="text-center w-full">
                        <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                            {type === 'svg' ? (
                                <QRCodeSVG
                                    value={content}
                                    size={qrSize}
                                    level="M"
                                    includeMargin={true}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                />
                            ) : (
                                qrCodeData ? (
                                    <img 
                                        src={qrCodeData} 
                                        alt="Generated QR Code" 
                                        className="block"
                                        style={{ width: qrSize, height: qrSize }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center" style={{ width: qrSize, height: qrSize }}>
                                        <div className="text-gray-400">Loading...</div>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                            {t('components.qrcode.scan_prompt')}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded break-all overflow-x-auto max-w-full">
                            {t('components.qrcode.content_label')}: {content}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8 w-full">
                        <div className="text-4xl mb-2">📱</div>
                        <div className="text-sm">{t('components.qrcode.enter_content')}</div>
                    </div>
                )}
            </div>
        </div>
    );
}