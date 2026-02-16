import { useState, useEffect } from 'react';

/**
 * Chrome 扩展弹窗高度限制 Hook
 * 返回适合当前环境的最大高度
 */
export function useChromePopupHeight() {
  const [maxHeight, setMaxHeight] = useState(600); // 默认最大高度

  useEffect(() => {
    // Chrome 扩展弹窗的标准限制
    const chromePopupLimits = {
      maxHeight: 600,  // 最大高度限制
      maxWidth: 800,   // 最大宽度限制
      defaultWidth: 400 // 推荐宽度
    };

    // 根据屏幕可用空间调整
    const screenHeight = window.screen.availHeight;
    const calculatedMaxHeight = Math.min(
      chromePopupLimits.maxHeight,
      screenHeight - 100 // 留出一些边距
    );

    setMaxHeight(Math.floor(calculatedMaxHeight));
  }, []);

  return maxHeight;
}