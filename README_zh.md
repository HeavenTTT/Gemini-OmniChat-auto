
<div align="center">
<img width="150" height="150" alt="Logo" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/39.svg" />
<h1>Gemini OmniChat</h1>
<p>一个基于 Google Gemini API 的高性能、功能丰富的聊天界面。</p>

<p>
  <span>🇨🇳 中文说明</span> | 
  <a href="./README.md">🇺🇸 English</a>
</p>
</div>

---

## 🚀 功能特性

*   **多 API Key 轮询**: 自动在 API Key 池中轮询切换，有效应对速率限制 (Rate Limits) 和配额问题。
*   **Markdown 支持**: 完整的 Markdown 渲染，包含代码块高亮和一键复制功能。
*   **持久化历史记录**: 自动保存聊天会话，支持导出和导入 JSON 格式的聊天记录。
*   **多主题支持**: 内置白天 (Day)、黑夜 (Night)、黄昏 (Twilight)、天空 (Sky) 和粉色 (Pink) 主题。
*   **安全锁**: 可选的密码和安全问题保护，防止他人查看您的聊天记录。
*   **系统提示词 (System Instructions)**: 管理并合并多个系统提示词（人设/指令）。
*   **模型选择**: 支持从 API 自动获取当前 Key 可用的模型列表。

## 🛠 快速开始

### 1. 获取 Gemini API Key

要使用 OmniChat，您需要至少一个来自 Google AI Studio 的有效 API Key。

1.  访问 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2.  点击 **"Create API Key"** (创建 API 密钥)。
3.  选择一个项目或新建一个项目以生成密钥。
4.  复制密钥字符串（以 `AIza...` 开头）。

### 2. 本地运行

**前提条件:** Node.js (v18 或更高版本) 和 npm。

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/yourusername/gemini-omnichat.git
    cd gemini-omnichat
    ```

2.  **安装依赖:**
    ```bash
    npm install
    ```

3.  **(可选) 配置环境变量:**
    您可以使用环境变量预配置 API Key。在根目录下创建一个 `.env.local` 文件：
    ```bash
    echo "GEMINI_API_KEY=your_api_key_here" > .env.local
    ```

4.  **运行开发服务器:**
    ```bash
    npm run dev
    ```

5.  在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 3. 使用指南

1.  **配置 API Keys**: 
    *   点击界面上的 **设置** (齿轮图标) 按钮。
    *   在 "通用设置" -> "API 密钥池" 下，粘贴您的 API Key 并点击 **+** 按钮。
    *   您可以添加多个 Key 以分担负载。
2.  **选择模型**:
    *   进入 **模型设置** 标签页。
    *   点击 **从 API 获取** 来查看当前 Key 可用的模型，或者手动输入模型名称 (例如 `gemini-2.5-flash`)。
3.  **开始聊天**:
    *   在输入框中输入内容，按回车键或发送按钮即可。

## 📦 部署

本项目针对 Vercel 部署进行了优化。

1.  将代码推送到 GitHub 仓库。
2.  在 Vercel 中导入该项目。
3.  (可选) 在 Vercel 设置的 Environment Variables (环境变量) 中添加 `GEMINI_API_KEY`。
4.  点击 Deploy 部署！

## 📄 开源协议

MIT License
