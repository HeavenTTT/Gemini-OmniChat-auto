<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

<h1>Built with AI Studio</h2>

<p>The fastest path from prompt to production with Gemini.</p>

<a href="https://aistudio.google.com/apps">Start building</a>

<h1>Gemini OmniChat</h1>
<p>一个支持多服务商（Gemini, OpenAI, Ollama）且具备强大密钥管理的高性能聊天界面。</p>

<p>
  <a href="./README_en.md">🇺🇸 English</a> ｜ <strong>🇨🇳 简体中文</strong>
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

### 核心连接能力
*   **多服务商支持**: 无缝切换 **Google Gemini**, **OpenAI 兼容接口** (包含 vLLM/LM Studio 等本地 LLM), 以及 **Ollama** (支持 Ollama Cloud/Proxy)。
*   **高可用密钥轮询**: 配置多个 API Key 并设置轮询策略，优雅应对速率限制。
*   **密钥分组管理 (v1.5)**: 将 API Key 组织成命名分组，支持一键批量激活/停用和拖拽排序。

### 高级 AI 能力
*   **思考模型支持**: 原生支持 Gemini 2.5 "Thinking" 模型，可视化 `<think>` 思考过程标签，支持折叠/展开。
*   **思考预算控制**: 可调整思考 Token 预算 (Thinking Budget) 以控制推理深度。
*   **系统提示词管理**: 创建、编辑和切换多个系统指令 (System Prompts)，内置全屏编辑器，移动端体验更佳。
*   **上下文控制**: 可配置历史消息上下文限制，精准控制 Token 消耗。

### 丰富的聊天体验
*   **Markdown 与数学公式**: 完整支持 Markdown 渲染、代码块高亮以及 LaTeX 数学公式。
*   **消息编辑**: 支持编辑用户提问或 AI 回复，方便修正对话方向。
*   **分支重生成**: 可从历史记录的任意位置重新生成回复。
*   **实时统计**: 实时显示响应耗时以及 Token 用量（支持本地估算与 API 精确计数）。

### UI 与 定制
*   **多主题支持**: 内置 10+ 种主题，包括 VSCode 亮/暗色、黄昏、熊猫配色等，Kirby 图标颜色会随主题自适应。
*   **聊天记录管理**: 自动保存会话，支持导入/导出 JSON，自动生成标题摘要。
*   **隐私安全锁**: 可选密码或安全问题保护，防止他人查看聊天记录。
*   **脚本过滤器 (中间件)**: 支持上传 JS/TS 文件，在浏览器本地拦截和修改输入/输出消息。

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

**关于 Ollama 的说明:**
本项目在 `vercel.json` 中包含了代理重写规则 (`/ollama-proxy`)，以帮助在 HTTPS 部署环境下连接 Ollama 实例（如 Ollama Cloud）时绕过混合内容（Mixed Content）限制。

---
<div align="center">
  <p style="color: #ccc; font-style: italic; font-size: 0.7rem;">
    * 免责声明：本项目是 AI 编程能力的演示。 *
  </p>
</div>

## 📄 开源协议

MIT License