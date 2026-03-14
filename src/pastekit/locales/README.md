# PasteKitLab 国际化翻译文件目录结构

## 目录结构说明

为提高可维护性，翻译文件已按模块拆分为独立的文件：

```
locales/
├── en/                          # 英文翻译
│   ├── common.json              # 通用翻译（保存、取消、删除等）
│   ├── popup.json               # Popup 页面翻译
│   ├── options.json             # Options 页面翻译
│   └── components/              # 组件翻译
│       ├── about.json
│       ├── aiprompts.json
│       ├── autociphertool.json
│       ├── autoencodetool.json
│       ├── ciphertest.json
│       ├── cipherutils.json
│       ├── cronetool.json
│       ├── devtoolsdecryptor.json
│       ├── dnrmanager.json
│       ├── dnstool.json
│       ├── encodetool.json
│       ├── encodingtool.json
│       ├── iptool.json
│       ├── jsontool.json
│       ├── keyconfigmanager.json
│       ├── panel.json
│       ├── proxydashboard.json
│       ├── qrcode.json
│       ├── requestlist.json
│       ├── signature.json
│       ├── timetool.json
│       ├── urltool.json
│       └── worldclock.json
├── zh/                          # 中文翻译
│   ├── common.json
│   ├── popup.json
│   ├── options.json
│   └── components/              # 与 en/components 结构相同
│       └── *.json
├── en.json                      # 已弃用 - 仅保留用于向后兼容
└── zh.json                      # 已弃用 - 仅保留用于向后兼容
```

## 文件说明

### 主翻译文件
- **common.json**: 通用翻译，包含常用的按钮文本、状态消息等
- **popup.json**: Popup 弹窗页面的翻译
- **options.json**: Options 设置页面的翻译

### 组件翻译文件
每个组件都有自己独立的翻译文件，以组件名称命名，例如：
- `iptool.json`: IP 工具的翻译
- `timetool.json`: 时间工具的翻译
- `ciphertest.json`: 加密测试组件的翻译

## 使用方式

翻译系统会自动加载所有相关文件并合并为一个翻译对象。在代码中使用翻译函数时，直接使用对应的键名即可：

```javascript
// 使用翻译函数
import { t } from './utils/i18n';

// 简单键
const text = await t('save');

// 嵌套键
const title = await t('iptool.title');

// 带参数的翻译
const message = await t('iptool.ipv_version', { version: '4' });
```

## 添加新组件的翻译

1. 在 `en/components/` 目录下创建新的翻译文件，如 `newcomponent.json`
2. 在 `zh/components/` 目录下创建对应的中文翻译文件
3. 在 `i18n.js` 的 `componentFiles` 数组中添加新文件名

示例文件格式：
```json
{
  "newcomponent": {
    "title": "New Component",
    "description": "Component description"
  }
}
```

## 优势

✅ **模块化**: 每个组件独立管理自己的翻译
✅ **易维护**: 修改某个组件的翻译时，只需编辑对应文件
✅ **协作友好**: 多人协作时减少文件冲突
✅ **性能优化**: 支持按需加载翻译文件
✅ **清晰结构**: 文件组织结构一目了然
