// DevTools 配置文件
// 创建自定义面板用于网络请求解密监控

chrome.devtools.panels.create(
  "PasteKit Decryptor",           // 面板标题
  "PasteKitLab_16.png",           // 面板图标
  "panel.html",                   // 面板 HTML 文件
  function(panel) {
    console.log('[DevTools] PasteKit Decryptor 面板创建成功');
    
    // 面板创建后的回调
    panel.onShown.addListener(function(window) {
      console.log('[DevTools] 面板显示');
      // 可以在这里向面板发送消息
      window.postMessage({
        type: 'DEVTOOLS_PANEL_SHOWN',
        tabId: chrome.devtools.inspectedWindow.tabId
      }, '*');
    });
    
    panel.onHidden.addListener(function() {
      console.log('[DevTools] 面板隐藏');
    });
  }
);