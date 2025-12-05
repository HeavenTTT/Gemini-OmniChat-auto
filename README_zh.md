

<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

<h1>Built with AI Studio</h2>

<p>The fastest path from prompt to production with Gemini.</p>

<a href="https://aistudio.google.com/apps">Start building</a>

<h1>Gemini OmniChat</h1>
<p>一个基于 Google Gemini API 的高性能聊天界面。</p>

<p>
  <a href="./README.md">🇺🇸 English</a> ｜ <strong>🇨🇳 简体中文</strong>
</p>

<!-- Watermark / Disclaimer -->
<br>
<h3 style="color: #cccccc; opacity: 0.5; font-style: italic;">
  ⚠️ AI 生成内容 ⚠️
</h3>
<p style="color: #999999; font-size: 0.8em; font-style: italic;">
  本项目所有内容 —— 包括代码、逻辑、界面设计以及本文档 —— 均完全由人工智能生成。
</p>
<br>

</div>

---

## 🚀 主要功能

*   **多 Key 轮询**: 自动切换 Key 以应对速率限制。
*   **Markdown 支持**: 完整渲染及代码高亮。
*   **历史记录**: 自动保存，支持导入/导出 JSON。
*   **多主题**: 白天、黑夜、黄昏、天空、粉色。
*   **安全锁**: 密码保护聊天记录。
*   **模型选择**: 自动获取可用模型。
*   **脚本过滤器 (中间件)**: 支持上传 JS/TS 文件，用于拦截和修改消息。

## 🛠 快速开始

1.  **克隆**: `git clone https://github.com/HeavenTTT/Gemini-OmniChat-auto.git`
2.  **安装**: `npm install`
3.  **运行**: `npm run dev`
4.  **访问**: [http://localhost:3000](http://localhost:3000)

## 🧩 脚本过滤器 (中间件)

OmniChat 允许您上传自定义 JavaScript 中间件来拦截和修改消息。这对于隐藏敏感数据、强制格式化或添加自定义日志非常有用。

**📥 下载示例:**
您可以直接在应用内下载包含详细注释的示例脚本（`example_input_filter.js` 和 `example_output_filter.js`）：
1. 进入 **设置** -> **通用设置**。
2. 滚动到 **脚本过滤器 (Middleware)** 部分。
3. 点击 **下载示例** 按钮。

### 快速逻辑预览

**输入过滤器 (用户 -> AI):**
在消息发送前执行。
```javascript
// 示例：过滤敏感词
const sensitiveWords = ['secret', 'password'];
let modified = input;

sensitiveWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    modified = modified.replace(regex, '******');
});

return modified;
```

**输出过滤器 (AI -> 用户):**
在回复显示前执行（也适用于流式传输）。
```javascript
// 示例：添加免责声明
if (!input.includes('AI Generated')) {
    return input + "\n\n> *Processed by local filter*";
}
return input;
```

## 📦 部署

针对 Vercel 优化。推送到 GitHub 并在 Vercel 导入即可。

---
<div align="center">
  <p style="color: #ccc; font-style: italic; font-size: 0.7rem;">
    * 免责声明：本项目是 AI 编程能力的演示。 *
  </p>
</div>

## 📄 开源协议

MIT License