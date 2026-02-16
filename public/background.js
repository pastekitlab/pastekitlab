// Background script for handling keyboard shortcuts
// This script runs in the background and listens for extension commands

// 简单直接的实现
chrome.commands.onCommand.addListener((command) => {
  console.log('[PasteKitLab] 收到命令:', command);
  
  if (command === '_execute_action') {
    console.log('[PasteKitLab] 快捷键触发成功:', command);

    // 同时尝试激活扩展（在支持的窗口中）
    chrome.action.openPopup().catch(err => {
      console.log('[PasteKitLab] openPopup 在此窗口不可用（正常）:', err.message);
      console.log('[PasteKitLab] ℹ️ 这是正常现象，特别是在全屏或特殊窗口中');
    });
  }
});

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PasteKitLab extension installed');
  } else if (details.reason === 'update') {
    console.log('PasteKitLab extension updated');
  }
});

console.log('Background script loaded - 监听快捷键 Ctrl+Shift+A');