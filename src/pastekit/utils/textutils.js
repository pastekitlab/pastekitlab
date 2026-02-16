/**
 * 文本处理工具类
 * 包含可打印字符检测、文本分析等通用功能
 */

/**
 * 可打印字符检测正则表达式
 * 包含：基本ASCII可打印字符、扩展Latin字符、CJK字符、各种符号等
 */
const EXTENDED_PRINTABLE_REGEX = /[ -~\u00A0-\u00FF\u2000-\u206F\u20A0-\u20CF\u2100-\u214F\u2200-\u22FF\u2300-\u23FF\u2400-\u243F\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u2800-\u28FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2E00-\u2E7F\u2E80-\u2EFF\u2F00-\u2FDF\u2FF0-\u2FFF\u3000-\u303F\u3040-\u309f\u30a0-\u30ff\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31A0-\u31BF\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE10-\uFE1F\uFE30-\uFE4F\uFE50-\uFE6F\uFF00-\uFFEF]/g;

/**
 * 检查文本中的可打印字符比例
 * @param {string} text - 要分析的文本
 * @returns {Object} 分析结果对象
 * {
 *   totalChars: 总字符数,
 *   printableChars: 可打印字符数,
 *   printableRatio: 可打印字符比例 (0-1),
 *   isReadable: 是否可读 (默认阈值0.5)
 * }
 */
export function analyzePrintableCharacters(text) {
    if (!text || typeof text !== 'string') {
        return {
            totalChars: 0,
            printableChars: 0,
            printableRatio: 0,
            isReadable: false
        };
    }
    
    const totalChars = text.length;
    const printableMatches = text.match(EXTENDED_PRINTABLE_REGEX);
    const printableChars = printableMatches ? printableMatches.length : 0;
    const printableRatio = totalChars > 0 ? printableChars / totalChars : 0;
    
    return {
        totalChars: totalChars,
        printableChars: printableChars,
        printableRatio: printableRatio,
        isReadable: printableRatio >= 0.5 // 默认可读性阈值
    };
}

/**
 * 判断文本是否具有良好的可读性
 * @param {string} text - 要检查的文本
 * @param {number} threshold - 可读性阈值 (0-1，默认0.5)
 * @returns {boolean} 是否可读
 */
export function isTextReadable(text, threshold = 0.5) {
    const analysis = analyzePrintableCharacters(text);
    return analysis.printableRatio >= threshold;
}

/**
 * 获取详细的文本分析报告
 * @param {string} text - 要分析的文本
 * @returns {Object} 详细分析报告
 */
export function getTextAnalysisReport(text) {
    const analysis = analyzePrintableCharacters(text);
    
    return {
        ...analysis,
        details: {
            nonPrintableChars: analysis.totalChars - analysis.printableChars,
            nonPrintableRatio: 1 - analysis.printableRatio,
            characterTypes: {
                ascii: (text.match(/[ -~]/g) || []).length,
                latinExtended: (text.match(/[\u00A0-\u00FF]/g) || []).length,
                cjk: (text.match(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g) || []).length,
                symbols: (text.match(/[\u2000-\u2BFF\u2E00-\u2EFF]/g) || []).length
            }
        }
    };
}

/**
 * 过滤文本中的不可打印字符
 * @param {string} text - 原始文本
 * @returns {string} 过滤后的文本
 */
export function filterNonPrintableCharacters(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text.replace(/[^ -~\u00A0-\u00FF\u2000-\u206F\u20A0-\u20CF\u2100-\u214F\u2200-\u22FF\u2300-\u23FF\u2400-\u243F\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u2800-\u28FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2E00-\u2E7F\u2E80-\u2EFF\u2F00-\u2FDF\u2FF0-\u2FFF\u3000-\u303F\u3040-\u309f\u30a0-\u30ff\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31A0-\u31BF\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE10-\uFE1F\uFE30-\uFE4F\uFE50-\uFE6F\uFF00-\uFFEF]/g, '');
}

// 导出默认对象
export default {
    analyzePrintableCharacters,
    isTextReadable,
    getTextAnalysisReport,
    filterNonPrintableCharacters
};