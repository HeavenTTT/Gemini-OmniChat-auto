# OmniChat 工程文件结构说明

本文档详细列出了 OmniChat 项目中的所有文件及其用途，旨在帮助开发者快速理解项目结构。

## 根目录配置与入口

| 文件名 | 用途 |
| :--- | :--- |
| `index.html` | **HTML 入口文件**。包含应用挂载点 root，引入了 Tailwind CSS 配置和 importmap 依赖。 |
| `index.tsx` | **React 入口文件**。负责渲染根组件 `App` 到 DOM 中，并引入全局样式。 |
| `App.tsx` | **主应用组件**。核心逻辑所在，管理全局状态（会话、消息、设置、API密钥）、初始化 LLM 服务、处理消息发送与接收逻辑。 |
| `package.json` | **项目依赖配置**。定义了项目名称、版本、脚本命令以及 npm 依赖包。 |
| `tsconfig.json` | **TypeScript 配置文件**。定义了编译选项，如目标版本 ES2022、JSX 处理方式等。 |
| `vite.config.ts` | **Vite 构建配置**。包含插件配置、路径别名、代理设置（用于解决 Ollama 跨域问题）以及构建优化选项。 |
| `vercel.json` | **Vercel 部署配置**。主要用于配置路由重写，支持 SPA 单页应用和 Ollama 代理。 |
| `metadata.json` | **元数据配置**。定义应用名称、描述以及所需的权限（如麦克风等）。 |
| `.gitignore` | **Git 忽略文件**。指定不需要纳入版本控制的文件和目录（如 node_modules）。 |
| `styles.css` | **全局样式表**。包含基础样式重置、自定义滚动条样式、Markdown 渲染样式等。 |
| `theme.css` | **主题变量定义**。定义了不同主题（Light, Dark, Twilight 等）的 CSS 变量颜色。 |

## 文档

| 文件名 | 用途 |
| :--- | :--- |
| `README.md` | **项目说明文档 (英文)**。项目介绍、功能特性、安装与使用指南。 |
| `README_zh.md` | **项目说明文档 (中文)**。中文版的项目介绍。 |
| `README_en.md` | **项目说明文档 (英文备份)**。英文版的项目介绍。 |
| `CHANGELOG.md` | **更新日志**。记录项目的版本迭代历史和变更内容。 |

## 核心组件 (`components/`)

### 布局与基础 UI
| 文件名 | 用途 |
| :--- | :--- |
| `Header.tsx` | **顶部导航栏**。显示当前会话标题、提供新建对话、设置、清除历史等操作入口。 |
| `Sidebar.tsx` | **侧边栏 (桌面端)**。显示历史会话列表、活跃密钥状态，提供新建对话入口。 |
| `MobileMenu.tsx` | **移动端菜单**。移动设备上的侧边栏抽屉组件。 |
| `ChatInterface.tsx` | **聊天主界面**。负责渲染消息列表容器，处理自动滚动、图片预览灯箱效果。 |
| `ChatInput.tsx` | **输入框组件**。包含文本输入、文件上传按钮、Token 估算显示、发送/停止按钮。 |
| `SecurityLock.tsx` | **安全锁屏界面**。当启用安全设置且超时未操作时显示的密码或安全问题验证界面。 |
| `Kirby.tsx` | **Logo 组件**。渲染应用的吉祥物 SVG 图标，支持根据主题自适应颜色。 |

### 消息渲染 (`components/` & `components/message/`)
| 文件名 | 用途 |
| :--- | :--- |
| `ChatMessage.tsx` | **单条消息组件**。负责组装消息气泡，包含头像、时间戳、操作按钮（编辑、删除、重生成），并根据内容调用子组件渲染。 |
| `message/MessageContent.tsx` | **消息内容渲染器**。负责解析和渲染 Markdown 内容，处理 `<think>` 标签和图片。 |
| `message/CodeBlock.tsx` | **代码块组件**。使用 `react-syntax-highlighter` 提供代码语法高亮和复制功能。 |
| `message/ThoughtBlock.tsx` | **思考过程组件**。专门用于渲染 Gemini 2.5 等模型的思维链 (`<think>...</think>`) 内容，支持折叠。 |

### 设置相关 (`components/SettingsModal.tsx` & `components/settings/`)
| 文件名 | 用途 |
| :--- | :--- |
| `SettingsModal.tsx` | **设置弹窗主容器**。管理设置 Tabs 切换（通用、API密钥、模型参数、安全），负责保存和加载配置。 |
| `settings/GeneralAppearanceSettings.tsx` | **通用与外观设置**。语言、主题、字体大小、气泡透明度等设置。 |
| `settings/ApiKeyManagement.tsx` | **API 密钥管理**。核心功能区，支持添加/删除密钥、密钥分组、批量导入、连接测试。 |
| `settings/KeyConfigCard.tsx` | **密钥卡片组件**。单个 API 密钥的配置界面，包含模型选择、轮询次数设置、状态显示。 |
| `settings/ModelParameterSettings.tsx` | **AI 参数设置**。温度、Top-P、Top-K、最大 Token、流式传输开关、思考预算等。 |
| `settings/SystemPromptManagement.tsx` | **系统提示词管理**。增删改查系统预设指令。 |
| `settings/SecuritySettings.tsx` | **安全设置**。配置密码锁、安全问题和自动锁定时间。 |
| `settings/ScriptFilterSettings.tsx` | **脚本过滤器设置**。管理用于拦截输入/输出的自定义 JavaScript 中间件。 |
| `settings/ModelList.tsx` | **模型列表查看器**。展示已获取到的模型及其 Token 限制信息。 |
| `settings/CollapsibleSection.tsx` | **可折叠区块**。通用的设置折叠容器 UI。 |

### 通用 UI 组件 (`components/ui/`)
| 文件名 | 用途 |
| :--- | :--- |
| `ui/Toast.tsx` | **全局提示组件**。用于显示成功、错误或信息提示的浮动通知。 |
| `ui/CustomDialog.tsx` | **自定义对话框**。替代浏览器原生的 alert/confirm/prompt，提供一致的视觉体验。 |
| `ui/ModelSelect.tsx` | **模型选择器**。自定义的下拉选择组件，用于选择 AI 模型。 |
| `ui/LargeTextEditor.tsx` | **全屏文本编辑器**。用于编辑较长的系统提示词，提供沉浸式体验。 |
| `ui/AutoResizeTextarea.tsx` | **自适应文本框**。用于聊天输入和消息编辑，高度随内容自动调整。 |

## 服务层 (`services/`)

处理与不同 LLM 提供商的 API 通信。

| 文件名 | 用途 |
| :--- | :--- |
| `llmService.ts` | **核心 LLM 服务**。统一接口层，负责 API 密钥轮询策略、错误处理、负载均衡，并根据配置分发请求给具体的 Provider 服务。 |
| `googleService.ts` | **Google Gemini 服务**。封装 `@google/genai` SDK，处理 Gemini 模型的对话、流式传输、Token 计算和图片生成。 |
| `openaiService.ts` | **OpenAI 兼容服务**。处理 OpenAI 格式的 API 请求，支持自定义 Base URL (可用于 vLLM, DeepSeek 等)。 |
| `ollamaService.ts` | **Ollama 服务**。封装 `ollama/browser` 库，处理与本地或远程 Ollama 实例的通信。 |

## 工具类 (`utils/`)

| 文件名 | 用途 |
| :--- | :--- |
| `i18n.ts` | **国际化工具**。简单的翻译函数，根据当前语言加载对应的语言包。 |
| `scriptExecutor.ts` | **脚本执行器**。在浏览器沙箱中安全执行用户上传的过滤脚本 (Middleware)。 |
| `filterScriptExamples.ts` | **脚本示例**。包含内置的过滤器脚本模板代码。 |
| `locales/en.ts` | **英文语言包**。 |
| `locales/zh.ts` | **中文语言包**。 |
| `locales/ja.ts` | **日文语言包**。 |

## 类型定义

| 文件名 | 用途 |
| :--- | :--- |
| `types.ts` | **TypeScript 类型定义**。定义了整个项目使用的数据结构接口，如 `Message`, `AppSettings`, `KeyConfig` 等。 |
