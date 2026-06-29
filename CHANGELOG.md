# Changelog

All notable changes to this project will be documented in this file.

## [1.5.4] - 2026-06-28
### Added
- **Ollama 思考设置 (Ollama Think Mode)**：
  - 引入了对 Ollama 模型 "think" 思考配置参数的支持（提供默认、开启、关闭、高、中、低六种级别选择）。
  - 支持分别捕获、累加并合并 Ollama 接口返回的流式/非流式中的 `thinking` 字段 and `content` 字段。
  - 将累加的思考链内容自动用 `<think>...</think>` 标签包装，让前端消息渲染器能够漂亮地展示和实时折叠/渲染 Ollama 模型的思考过程。
  - 新增中、英、日三国语言本地化词条支持。
- **手机端对话按钮交互与高度展开动画**：
  - 优化手机端触屏体验，对话气泡的功能按钮（编辑、重试、删除）在移动端下默认显示，无需悬停。
  - 新增智能过滤逻辑：只对最近 6 条消息记录展示功能按钮，以前的消息自动隐藏。
  - 结合 Framer Motion 精确封装了容器级的折叠与展开高度过渡（AnimatePresence + height 变化），使得按钮展示和消失时极为顺滑。
- **消息流式文本更新节流 (State Update Throttling)**：
  - 在流式传输文本时引入了更新节流机制。对首个字符/分词即时无延迟渲染，后续流传输则按照 `60ms` 周期节流，有效降低高频流式重绘导致的页面重绘卡顿与输入阻尼。
- **存储层异步升级 (IndexedDB Engine)**：
  - 新增基于 HTML5 IndexedDB 的高容量持久化存储驱动，替换原有的 `5MB` 限制且同步阻塞的 LocalStorage，提供异步读写并具备自动故障转移/优雅降级回退。
  - 完整支持对旧 LocalStorage 中历史对话数据的无损检测与静默自动迁移 (Migration Tool)。
- **智能对话续写与截断处理 (Edit & Delete Continuation)**：
  - 完善了编辑消息 (Edit & Continue) 表现：当用户对历史聊天记录进行编辑保存时，自动对编辑点之后的消息执行智能截断，并自动使用新提示词和截断后的上下文发起续写，带来更加流畅和符合直觉的对话体验。
  - 完善了删除消息 (Delete & Continue) 表现：删除用户历史输入时，会自动递归截断并清理其引发的后续多轮对话上下文，保持上下文的高度语境完整性。
- **主动本地安全拦截机制 (Local Safety Safeguards)**：
  - 新增了应用级主动安全拦截器，用于在用户输入层提早识别和拦截潜在的 Prompt Injection 提示词指令篡改行为，并对模型输出中的敏感 API Key 提供智能检测和自动脱敏/遮蔽防护。

### Fixed
- **手机浏览器设置重置 Bug**：
  - 修复了在部分安卓浏览器（Chrome, Via 等）中唤起输入法或发生页面滚动等重新渲染时，设置弹窗内未保存的数据自动还原为旧设置的问题。优化了 `SettingsModal` 内部的状态重置生命周期。
- **手机模式下标题显示长度过短**：
  - 优化了 `Header` 组件中移动端标题的最大宽度配置。通过结合不同手机屏幕宽度的响应式断点（从 `120px` 提高至最高 `260px`），使得在 iPhone、各大 Android 机型等移动端浏览器下可以完美且更完整地展示长会话标题，防止过早被省略号截断。

### Removed
- 清理了 `migrated_prompt_history` 文件夹中的冗余历史提示词 JSON 文件。

## [1.5.3] - 2024-06-03
### Added
- **File Upload**: Users can now upload text files (e.g., .txt, .md, .json, .js) directly to the input box. Content is read and appended to the message.
- **Image Preview**: Added full-screen lightbox preview support for images in chat messages.
- **Documentation**: Added `PROJECT_STRUCTURE.md` providing a detailed overview of the project's file organization and purpose.

### Changed
- **Code Refactoring**: Major refactoring of `ChatMessage.tsx`. Split into smaller, decoupled components (`MessageContent`, `CodeBlock`, `ThoughtBlock`, `AutoResizeTextarea`) for improved maintainability and performance.

## [1.5.1] - 2024-06-02
### Changed
- **Ollama Integration**: 
  - Migrated Ollama service to use the official `ollama` JavaScript library (`ollama/browser`).
  - Improved compatibility with Ollama Cloud and custom authentication headers.
  - Optimized streaming response handling using AsyncGenerators.

## [1.5.0] - 2024-06-01
### Added
- **Ollama Cloud Support**: 
  - Integrated **Ollama Cloud (Preview)** as a new model provider.
  - Supports fetching model list (tags) and streaming chat responses.
  - Configurable Base URL (defaults to `http://localhost:11434` or remote endpoints).
  - Flexible API Key handling: optional for local instances, used as Bearer token for protected endpoints.

## [1.4.0] - 2024-05-30
### Added
- **Thinking Model Support**: 
  - Visualizes `<think>` blocks in chat with collapsible "Thought Process" sections.
  - Added option to **Strip Thoughts from History** in AI Parameters to save tokens during context window transmission.
- **API Key Grouping**: 
  - Users can now create named groups for API keys.
  - Features bulk activation/deactivation per group.
  - Drag-and-drop sorting support within groups.
- **Large Text Editor**:
  - Implemented a full-screen text editor for System Prompts, significantly improving the editing experience on mobile devices.
- **Key Indexing**: 
  - API keys now display a visual index number for easier reference.

### Changed
- **Settings UI Overhaul**:
  - **General**: "Appearance" settings are now nested within the "General" tab and collapsed by default.
  - **API Keys**: Moved to a dedicated, independent tab for better management space.
  - **AI Parameters**: Advanced parameters (Top P, Top K, etc.) are now collapsed by default to simplify the interface.
- **Refactoring**:
  - Decoupled `KeyConfigCard` component for better code modularity.
  - Improved drag-and-drop logic to handle grouped and ungrouped states more reliably.

## [1.3.9] - 2024-05-29
### Fixed
- **History Context Bug**: Fixed an issue where the new user message was accidentally duplicated in the history array sent to the API.
- **UI Tweaks**: Minor adjustments to spacing and mobile responsiveness.

## [1.3.8] - 2024-05-28
### Fixed
- **Duplicate Message Fix (Critical)**: Implemented a robust filter in the API call logic (`App.tsx`) to explicitly remove the current user message from the history context. This ensures that even if state updates race, the prompt is never duplicated in the payload sent to Gemini/OpenAI.
- **Input Box Height**: Updated chat input to calculate minimum height dynamically based on user font size settings. This prevents scrollbars from appearing on single-line text when font size is increased.
- **Concurrent Call Handling**: Added safeguards to prevent multiple simultaneous API calls. The app now displays a Toast notification ("An API call is already in progress") and gracefully aborts new actions instead of crashing or logging errors.
- **Translation**: Added missing translation keys for concurrency errors.
- **Console Cleanup**: Removed remaining `console.error` logs from services to ensure a clean console in production.

## [1.3.7] - 2024-05-28
### Fixed
- **Duplicate Message Bug**: Refactored the core message handling logic (`triggerBotResponse`) to explicitly separate the chat history context from the new user prompt. This eliminates race conditions and ensures the API receives the correct context without duplicating the user's latest message.
- **Console Errors**: Removed raw `console.error` logs and replaced them with user-friendly toast notifications or localized in-chat error messages.
- **Localization**: Added missing translation keys for error states.

## [1.3.6] - 2024-05-27
### Fixed
- **Translation Keys**: Corrected translation keys for chat session import and settings import success messages to ensure accurate user feedback.

## [1.3.5] - 2024-05-26
### Added
- **Batch Key Import**: Added ability to bulk import API keys.
- **Test & Import**: Validates keys during batch import, ensuring only working keys are added.
- **Compact Key UI**: API Key cards are now collapsed by default for a cleaner interface.
- **Thinking UI**: Added support/visibility for "Thinking" models in UI configuration.

### Changed
- **Shared Model Cache**: Gemini keys now share a global model cache to avoid redundant fetching.
- **Error Handling**: Enhanced handling for 403 Permission Denied errors.

## [1.3.4] - 2024-05-25
### Added
- **Smooth Animation Toggle**: Users can now enable/disable the typewriter text effect in Appearance settings.
- **Clear Chat Button**: Added a dedicated button with text label to clear conversation history.

### Changed
- **Scrolling Performance**: Optimized auto-scroll behavior. AI responses now snap to top initially, then track the bottom efficiently.
- **Token Usage**: Simplified display to show only the current request's token usage (estimated or exact).
- **Localization**: Fixed various hardcoded strings and improved translation coverage.

## [1.3.3] - 2024-05-24
### Added
- **Custom Model Selector**: Replaced the native browser dropdown with a custom, styled component for selecting models in API Key settings.
- **Enhanced UI**: The model selector now matches the application's design language, theme, and parent container width.

### Changed
- **Model List Behavior**: The dropdown now displays all available cached models regardless of the current text input, improving discoverability.
- **Token Usage Display**: Improved layout and integration with the new model fetching logic.

## [1.3.2] - 2024-05-24
### Added
- **New Themes**: Added 'Sunrise' (Orange/Warm) and 'Lime' (Green) themes.
- **Adaptive Icon**: Added setting to make the Kirby icon adapt colors based on the selected theme.
- **Model Name Visibility**: Added a setting toggle to hide/show the model name in chat bubbles.
- **Documentation**: Added direct links to the GitHub repository for Script Filter examples.

### Changed
- Refactored `Kirby` component for better maintainability and theming support.
- Updated `ScriptFilterSettings` UI with clearer documentation links.
- Cleaned up translation strings.

## [1.3.1] - 2024-05-23
### Added
- Added `CHANGELOG.md`.
- Implemented handling for empty AI responses: if the model returns no text (e.g., due to safety filters), the chat bubble now displays the specific `finishReason` (e.g., `SAFETY`, `RECITATION`) to the user.
- Added custom `Toast` (Notification) and `CustomDialog` (Alert/Confirm/Input) components to provide a consistent, non-intrusive UI experience.
- Added footer with version number and AI disclaimer.
- Added "About & Open Source" section in Settings.
- Added visual watermark to README.

### Changed
- Replaced native browser `alert`, `confirm`, and `prompt` dialogs with custom UI components across the application (`App`, `Header`, `SettingsModal`, `ApiKeyManagement`).
- Refactored `SettingsModal` into modular components (`GeneralAppearanceSettings`, `ApiKeyManagement`, etc.) for better maintainability.
- Refactored `ChatInterface` to use a dedicated `ChatMessage` component.
- Removed "Rainbow" theme.
- Removed visual drag handles from sorting lists to maintain a cleaner UI while keeping functionality.

### Fixed
- Fixed various accessibility issues by adding ARIA labels.
- Fixed `Header.tsx` syntax error.
- Fixed `i18n.ts` trailing comma syntax errors.

## [1.3.0] - Previous
- Initial Drag-and-Drop support for API keys and System Prompts.
- UI/UX improvements.