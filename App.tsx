"use client";

import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './services/llmService';
import { Message, Role, GeminiModel, AppSettings, KeyConfig, ChatSession, ModelProvider, APP_VERSION, ToastMessage, DialogConfig, ModelInfo, LoadingStatus } from './types';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import { Header } from './components/Header';
import ChatInput from './components/ChatInput';
import { t } from './utils/i18n';
import { ToastContainer } from './components/ui/Toast';
import { CustomDialog } from './components/ui/CustomDialog';
import { executeFilterScript } from './utils/scriptExecutor';
import { dbGetItem, dbSetItem } from './utils/indexedDB';
import { calculateSimilarity } from './utils/similarity';
import { useToast } from './hooks/useToast';
import { useDialog } from './hooks/useDialog';
import { useSecurityLock } from './hooks/useSecurityLock';
import { useChatSessions } from './hooks/useChatSessions';

const SettingsModal = lazy(() => import('./components/SettingsModal'));
const SecurityLock = lazy(() => import('./components/SecurityLock'));
const MobileMenu = lazy(() => import('./components/MobileMenu'));

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const STORAGE_KEYS_KEY = 'gemini_omnichat_keys_v4';
const STORAGE_SETTINGS_KEY = 'gemini_omnichat_settings_v8'; 
const STORAGE_SESSIONS_KEY = 'gemini_omnichat_sessions_v1';
const STORAGE_ACTIVE_SESSION_KEY = 'gemini_omnichat_active_session_v1';
const STORAGE_KNOWN_MODELS_KEY = 'gemini_omnichat_known_models_v1';

const ENV_KEY = process.env.API_KEY || '';

const DEFAULT_KNOWN_MODELS: ModelInfo[] = [
    { name: 'gemini-3-flash-preview', inputTokenLimit: 1048576, outputTokenLimit: 8192 },
    { name: 'gemini-3-pro-preview', inputTokenLimit: 2097152, outputTokenLimit: 8192 }
];

const App: React.FC = () => {
  // --- 状态与自定义 Hooks 引入 ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 设置弹窗开关
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 移动端侧边栏开关
  const [apiKeys, setApiKeys] = useState<KeyConfig[]>([]); // API 密钥池
  const [knownModels, setKnownModels] = useState<ModelInfo[]>(DEFAULT_KNOWN_MODELS); // 已知模型缓存
  const [isDbLoaded, setIsDbLoaded] = useState(false); // 数据库加载完毕状态
  
  // --- 应用配置 ---
  const [settings, setSettings] = useState<AppSettings>({
    defaultModel: DEFAULT_MODEL,
    defaultBaseUrl: 'https://api.openai.com/v1',
    systemPrompts: [],
    theme: 'light', 
    language: 'zh', 
    fontSize: 14,
    textWrapping: 'auto', 
    bubbleTransparency: 100, 
    showModelName: true, 
    showGroupName: false,
    kirbyThemeColor: false, 
    showTokenUsage: false, 
    showResponseTimer: false, 
    smoothAnimation: true, 
    avatarVisibility: 'always', 
    enableAutoMemory: false, 
    autoMemoryInterval: 20, 
    historyContextLimit: 0, 
    security: {
        enabled: false,
        questions: [],
        lastLogin: Date.now(),
        lockoutDurationSeconds: 86400 
    },
    generation: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        stream: false, 
        thinkingBudget: 0, 
        stripThoughts: false,
        frequencyPenalty: 0,
        googleSearch: false,
        // 关键节点：给全局 generation 设置默认的 ollamaThink 参数
        // Key Node: Set the default ollamaThink parameter for the global generation settings
        ollamaThink: 'none'
    },
    scripts: {
        inputFilterEnabled: false,
        inputFilterCode: '',
        outputFilterEnabled: false,
        outputFilterCode: ''
    },
    enableKeyGrouping: false,
    keyGroups: []
  });

  const [input, setInput] = useState(''); // 输入框文本
  const [inputImages, setInputImages] = useState<string[]>([]); // 待发送的图片
  const [isLoading, setIsLoading] = useState(false); // 是否正在生成回复
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({ status: 'idle' }); // 正在生成时的加载状态
  const [isSummarizing, setIsSummarizing] = useState(false); // 是否正在总结标题

  // 使用自定义 Hook
  const { toasts, addToast, removeToast } = useToast();
  const { dialog, showDialog, closeDialog } = useDialog();
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    createNewSession,
    loadInitialSessions,
    handleUpdateSessionMemory
  } = useChatSessions(isDbLoaded, settings.language);

  const { isLocked, setIsLocked, lastActivityRef, unlock } = useSecurityLock(isDbLoaded, settings, setSettings);

  // 保持一个对最新 messages 状态的引用，以便在 useCallback 依赖不改变的情况下获取最新值
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);

  const safeJsonParse = (str: string | null, fallback: any = null) => {
    if (!str || !str.trim()) return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn("Failed to parse JSON from storage:", e);
      return fallback;
    }
  };

  /**
   * 节点 1: 挂载初始化与安全检测
   */
  useEffect(() => {
    const initApp = async () => {
      // 核心更新：全异步从 IndexedDB 加载
      const storedKeys = await dbGetItem<KeyConfig[]>(STORAGE_KEYS_KEY);
      const oldKeysV3 = await dbGetItem<any>('gemini_omnichat_keys_v3') || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_omnichat_keys_v3') : null);
      const oldSettings = await dbGetItem<any>(STORAGE_SETTINGS_KEY);
      
      const globalModel = oldSettings?.defaultModel || DEFAULT_MODEL;
      const globalBaseUrl = oldSettings?.defaultBaseUrl || 'https://api.openai.com/v1';

      let initialKeys: KeyConfig[] = [];

      if (storedKeys) {
        initialKeys = storedKeys;
      } else if (oldKeysV3) {
        const parsed = typeof oldKeysV3 === 'string' ? safeJsonParse(oldKeysV3, []) : oldKeysV3;
        initialKeys = parsed.map((k: any) => ({
            ...k,
            model: globalModel,
            baseUrl: k.provider === 'openai' ? globalBaseUrl : ''
        }));
      } else if (ENV_KEY) {
        initialKeys = ENV_KEY.split(',').map(k => k.trim()).filter(Boolean).map(k => ({
          id: uuidv4(),
          key: k,
          provider: 'google' as ModelProvider,
          isActive: true,
          usageLimit: 5, 
          isRateLimited: false,
          lastUsed: 0,
          model: DEFAULT_MODEL
        }));
      }
      setApiKeys(initialKeys);
      
      const storedSettings = await dbGetItem<AppSettings>(STORAGE_SETTINGS_KEY);
      let loadedSettings = settings;
      let loadedKnownModels = DEFAULT_KNOWN_MODELS;

      const storedKnownModels = await dbGetItem<ModelInfo[]>(STORAGE_KNOWN_MODELS_KEY);
      if (storedKnownModels) {
          const mergedModels = [...DEFAULT_KNOWN_MODELS];
          storedKnownModels.forEach((m: any) => {
              if (!mergedModels.find(dm => dm.name === m.name)) {
                  mergedModels.push(m);
              }
          });
          loadedKnownModels = mergedModels;
      }

      if (storedSettings) {
         loadedSettings = { ...settings, ...storedSettings };
      } 
      setSettings(loadedSettings);
      setKnownModels(loadedKnownModels);
      
      const effectiveKeys = initialKeys.map(k => {
          if (!k.groupId) return k;
          const group = loadedSettings.keyGroups?.find(g => g.id === k.groupId);
          if (group && group.isActive === false) return { ...k, isActive: false };
          return k;
      });

      setLlmService(new LLMService(
          effectiveKeys, 
          {
              onKeyError: (id, errorCode, isFatal = true) => {
                  setApiKeys(prev => prev.map(k => {
                      if (k.id !== id) return k;
                      if (isFatal) return { ...k, isActive: false, lastErrorCode: errorCode };
                      else return { ...k, isRateLimited: true, lastUsed: Date.now(), lastErrorCode: errorCode };
                  }));
                  if (isFatal) addToast(`${t('error.key_auto_disabled', loadedSettings.language)}${errorCode ? ` (${errorCode})` : ''}`, 'error');
              },
              onStatusMessage: (msg, type) => addToast(msg, type)
          }
      ));

      // --- 核心更新：初始加载与自动锁逻辑 ---
      if (loadedSettings.security.enabled) {
          const lastActive = loadedSettings.security.lastLogin || 0;
          const lockoutThresholdMs = (loadedSettings.security.lockoutDurationSeconds || 86400) * 1000;
          
          if (Date.now() - lastActive > lockoutThresholdMs) {
              setIsLocked(true);
          } else {
              // 更新活跃状态
              lastActivityRef.current = Date.now();
              setSettings(prev => ({ 
                  ...prev, 
                  security: { ...prev.security, lastLogin: Date.now() } 
              }));
          }
      }

      const storedSessions = await dbGetItem<ChatSession[]>(STORAGE_SESSIONS_KEY);
      const storedActiveId = await dbGetItem<string>(STORAGE_ACTIVE_SESSION_KEY);
      loadInitialSessions(storedSessions, storedActiveId);

      setIsDbLoaded(true);
    };

    initApp();
  }, []);

  /**
   * 节点 2: 数据同步与持久化
   */
  useEffect(() => {
    if (!isDbLoaded) return;
    const effectiveKeys = apiKeys.map(k => {
        if (!k.groupId) return k;
        const group = settings.keyGroups?.find(g => g.id === k.groupId);
        if (group && group.isActive === false) return { ...k, isActive: false };
        return k;
    });

    if (llmService) llmService.updateKeys(effectiveKeys, settings.keyGroups || []);
    dbSetItem(STORAGE_KEYS_KEY, apiKeys);
  }, [apiKeys, llmService, settings.keyGroups, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSetItem(STORAGE_SETTINGS_KEY, settings);
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink', 'theme-sunrise', 'theme-lime', 'theme-panda', 'theme-chocolate', 'theme-vscode-light', 'theme-vscode-dark');
    root.classList.add(`theme-${settings.theme}`);
    if (['dark', 'twilight', 'vscode-dark', 'chocolate'].includes(settings.theme)) root.classList.add('dark');
  }, [settings, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSetItem(STORAGE_KNOWN_MODELS_KEY, knownModels);
  }, [knownModels, isDbLoaded]);

  /**
   * 节点 3: 消息处理逻辑
   */
  /**
   * 触发 AI 的回复响应生成，管理整个请求的生命周期和加载状态。
   * 
   * @param historyBefore 消息发送前的会话历史记录
   * @param userMessage 新发送的用户消息
   */
  const triggerBotResponse = async (historyBefore: Message[], userMessage: Message) => {
    if (!llmService) return;
    setIsLoading(true);
    setLoadingStatus({ status: 'connecting' });
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const tempBotId = uuidv4();
    const botMessage: Message = {
      id: tempBotId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now()
    };
    
    setMessages([...historyBefore, userMessage, botMessage]);

    const startTime = Date.now();
    let bufferInterval: any = null;

    try {
      const globalSystemInstruction = settings.systemPrompts.filter(p => p.isActive).map(p => p.content).join('\n\n');
      const currentSession = sessions.find(s => s.id === activeSessionId);
      const sessionMemory = currentSession?.memory || '';
      const finalSystemInstruction = [globalSystemInstruction, sessionMemory].filter(Boolean).join('\n\n');

      let historyForApi = historyBefore.filter(m => m.id !== userMessage.id);

      if (settings.generation.stripThoughts) {
        historyForApi = historyForApi.map(msg => {
            if (msg.role === Role.MODEL && msg.text.includes('<think>')) {
                 const cleanText = msg.text.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
                 return { ...msg, text: cleanText };
            }
            return msg;
        });
      }

      let contextToSend = historyForApi;
      if (settings.historyContextLimit > 0 && historyForApi.length > settings.historyContextLimit) {
          contextToSend = historyForApi.slice(-settings.historyContextLimit);
      }

      // 设立文本缓冲区与控制状态，以削减极高频流式渲染对主线程 CPU 的过度占用
      let latestText = '';
      let lastRenderedText = '';

      /**
       * 执行渲染帧缓冲更新，按控制帧率将最新流数据刷入组件状态
       * @param text 待刷入的流文本
       */
      const updateBufferedState = (text: string) => {
        let processedChunk = text;
        if (settings.scripts?.outputFilterEnabled && settings.scripts.outputFilterCode) {
            processedChunk = executeFilterScript(settings.scripts.outputFilterCode, text, { role: 'model', history: [...historyBefore, userMessage] });
        }
        setMessages(prev => prev.map(msg => msg.id === tempBotId ? { ...msg, text: processedChunk } : msg));
        lastRenderedText = text;
      };

      // 开启流频率控制（每 80ms 检查并刷新一次数据），阻断不必要的 React 渲染，大幅降低流式输出时的卡顿与 CPU 高开销
      bufferInterval = setInterval(() => {
        if (latestText !== lastRenderedText) {
          updateBufferedState(latestText);
        }
      }, 80);

      const { text: fullText, usedKeyIndex, provider, usedModel, groundingMetadata } = await llmService.streamChatResponse(
        '', 
        contextToSend, 
        userMessage.text, 
        userMessage.images, 
        finalSystemInstruction,
        settings.generation,
        (chunkText) => {
           latestText = chunkText;
        },
        controller.signal,
        settings.language,
        (status, details) => {
            setLoadingStatus({ status, ...details });
        }
      );

      // 停止流式缓冲控制计时器
      if (bufferInterval) {
        clearInterval(bufferInterval);
        bufferInterval = null;
      }
      
      const executionTime = Date.now() - startTime;
      let processedFinalText = fullText;

      if (settings.scripts?.outputFilterEnabled && settings.scripts.outputFilterCode) {
          processedFinalText = executeFilterScript(settings.scripts.outputFilterCode, fullText, { role: 'model', history: [...historyBefore, userMessage] });
      }

      let groupName: string | undefined;
      if (usedKeyIndex && usedKeyIndex > 0 && usedKeyIndex <= apiKeys.length) {
          const usedKey = apiKeys[usedKeyIndex - 1];
          if (usedKey && usedKey.groupId) {
              const group = settings.keyGroups?.find(g => g.id === usedKey.groupId);
              if (group) groupName = group.name;
          }
      }

      // 将最终获得的完整 AI 文本与模型元数据一并刷入状态，确保完整性与功能逻辑
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempBotId ? { 
              ...msg, 
              text: processedFinalText, 
              keyIndex: usedKeyIndex, 
              provider: provider, 
              model: usedModel, 
              executionTime: executionTime,
              groupName: groupName,
              groundingMetadata: groundingMetadata 
          } : msg
        )
      );

      if (settings.enableAutoMemory && !controller.signal.aborted) {
          const totalMessages = historyBefore.length + 2; 
          const interval = settings.autoMemoryInterval || 20;
          if (totalMessages > 0 && totalMessages % interval === 0) {
              generateAutoMemory(sessionMemory, userMessage.text, processedFinalText);
          }
      }

    } catch (error: any) {
      if (error.message !== "Aborted by user") {
         const errorMessage: Message = {
            id: uuidv4(),
            role: Role.MODEL,
            text: `${t('action.error', settings.language)}: ${error.message || t('error.unexpected_error', settings.language)}`,
            timestamp: Date.now(),
            isError: true,
            executionTime: Date.now() - startTime
         };
         setMessages(prev => prev.filter(m => m.id !== tempBotId).concat(errorMessage));
      }
    } finally {
      if (bufferInterval) {
         clearInterval(bufferInterval);
      }
      setIsLoading(false);
      setLoadingStatus({ status: 'idle' });
      abortControllerRef.current = null;
    }
  };

  /**
   * 编辑特定消息的内容并保存
   * @param id 消息 ID
   * @param newText 新的消息内容文本
   */
  const handleEditMessage = useCallback((id: string, newText: string) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, text: newText } : msg));
  }, [setMessages]);

  /**
   * 删除特定消息并刷新聊天列表
   * @param id 待删除的消息 ID
   */
  const handleDeleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, [setMessages]);

  /**
   * 基于特定消息重新生成模型回复
   * @param id 消息 ID，若是用户消息则基于此消息重新生成，若是模型消息则基于前一条用户消息重新生成
   */
  const handleRegenerateMessage = useCallback(async (id: string) => {
    if (!llmService) return;
    const currentMessages = messagesRef.current;
    const index = currentMessages.findIndex(m => m.id === id);
    if (index === -1) return;
    const targetMsg = currentMessages[index];
    if (targetMsg.role === Role.USER) {
       await triggerBotResponse(currentMessages.slice(0, index), targetMsg);
    } else {
       let userMsgIndex = index - 1;
       while (userMsgIndex >= 0 && currentMessages[userMsgIndex].role !== Role.USER) userMsgIndex--;
       if (userMsgIndex !== -1) await triggerBotResponse(currentMessages.slice(0, userMsgIndex), currentMessages[userMsgIndex]);
    }
  }, [llmService]);

  /**
   * 对话框上方快速切换模型逻辑：
   * 切换后将所有 API 密钥 (KeyConfigs) 的 model 字段同步更新为目标模型，并触发持久化与全局服务更新。
   * @param modelName 选中的新模型名称
   */
  const handleQuickChangeModel = useCallback((modelName: string) => {
    setApiKeys(prevKeys => {
      const updated = prevKeys.map(key => ({
        ...key,
        model: modelName
      }));
      return updated;
    });
    
    // 触发提示气泡，增加用户体验感知
    const localizedMsg = settings.language === 'zh' 
      ? `所有 API 密钥的模型已同步切换为：${modelName}` 
      : settings.language === 'ja'
        ? `すべての API キーのモデルが同期されました: ${modelName}`
        : `All API keys have been synced to model: ${modelName}`;
    addToast(localizedMsg, 'success');
  }, [setApiKeys, settings.language, addToast]);

  const generateAutoMemory = async (currentMemory: string, userText: string, aiText: string) => {
      if (!llmService) return;
      const memoryPrompt = `
Existing Memory: ${currentMemory}
User Input: ${userText.slice(0, 500)}
AI Response: ${aiText.slice(0, 500)}
Instruction: Analyze the exchange and update the Existing Memory. Focus on preserving key facts, user preferences, important conclusions, and context. Remove obsolete details. Keep it concise. Return ONLY the updated memory text.
`;
      try {
          const memoryGenConfig = { ...settings.generation, stream: false, googleSearch: false };
          const { text: newMemory } = await llmService.streamChatResponse(
              '', 
              [], 
              memoryPrompt, 
              undefined, 
              undefined, 
              memoryGenConfig, 
              undefined,
              undefined,
              settings.language
          );

          if (newMemory && newMemory.trim()) {
              handleUpdateSessionMemory(newMemory.trim());
              addToast(t('msg.memory_updated', settings.language), 'info');
          }
      } catch (e) {
          console.warn("Auto-memory generation failed", e);
      }
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsLoading(false);
      }
  };

  const handleSendMessage = async () => {
    if (!llmService || isProcessingRef.current) return;
    if (!input.trim() && inputImages.length === 0) return;

    if (apiKeys.filter(k => k.isActive).length === 0) {
      setIsSettingsOpen(true);
      return;
    }

    isProcessingRef.current = true; 

    let processedInput = input.trim();
    if (settings.scripts?.inputFilterEnabled && settings.scripts.inputFilterCode) {
        processedInput = executeFilterScript(settings.scripts.inputFilterCode, processedInput, { role: 'user', history: messages });
    }

    const newMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: processedInput,
      images: inputImages.length > 0 ? [...inputImages] : undefined, 
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setInputImages([]); 
    
    try {
        await triggerBotResponse(messages, newMessage);
    } finally {
        isProcessingRef.current = false; 
    }
  };

  const handleLoadSession = (loadedMessages: any[], title?: string) => {
      handleStopGeneration();
      const newId = uuidv4();
      const newSession: ChatSession = {
          id: newId,
          title: title || t('msg.new_chat_title', settings.language),
          messages: loadedMessages,
          createdAt: Date.now(),
          memory: '' 
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newId);
      setMessages(loadedMessages);
      setInput('');
      addToast(t('success.chat_import', settings.language) || t('msg.config_imported', settings.language), 'success');
  };

  const handleSaveChat = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const title = activeSession?.title || t('label.session', settings.language);
    const safeTitle = title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').substring(0, 50);
    const chatData = { 
        title, 
        date: new Date().toISOString(), 
        messages,
        memory: activeSession?.memory || '' 
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniChat-${safeTitle}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) { setIsMobileMenuOpen(false); return; }
    handleStopGeneration();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
      setInput('');
      setIsMobileMenuOpen(false);
    }
  };

  const activeKeysCount = apiKeys.filter(k => k.isActive).length;
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const currentSessionTitle = currentSession?.title || t('app.title', settings.language);
  const currentSessionMemory = currentSession?.memory || '';
  
  if (!isDbLoaded) return (
    <div className={`flex h-screen items-center justify-center font-sans ${['dark', 'twilight', 'vscode-dark', 'chocolate'].includes(settings.theme) ? 'dark bg-gray-950 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="animate-pulse text-xs tracking-wider font-mono">LOADING DATABASE...</span>
      </div>
    </div>
  );

  if (isLocked) return (
    <div className={`${['dark', 'twilight', 'vscode-dark', 'chocolate'].includes(settings.theme) ? 'dark' : ''}`}>
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950"></div>}>
            <SecurityLock 
                config={settings.security} 
                onUnlock={() => {
                    setIsLocked(false);
                    lastActivityRef.current = Date.now(); // 解锁后重置时间
                    setSettings(prev => ({ 
                        ...prev, 
                        security: { ...prev.security, lastLogin: Date.now() } 
                    }));
                }} 
                lang={settings.language} 
                theme={settings.theme} 
                kirbyThemeColor={settings.kirbyThemeColor} 
            />
        </Suspense>
    </div>
  );

  return (
    <div className={`flex h-screen font-sans ${['dark', 'twilight', 'vscode-dark', 'chocolate'].includes(settings.theme) ? 'dark' : ''}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <CustomDialog config={dialog} onClose={closeDialog} lang={settings.language} />

      <div className="flex w-full h-full bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Sidebar 
            sessions={sessions} activeSessionId={activeSessionId} activeKeysCount={activeKeysCount} 
            language={settings.language} theme={settings.theme} kirbyThemeColor={settings.kirbyThemeColor}
            onNewChat={() => { handleStopGeneration(); createNewSession(); setIsMobileMenuOpen(false); }} 
            onSelectSession={handleSelectSession} 
            onDeleteSession={(e, id) => {
                e.stopPropagation();
                const newSessions = sessions.filter(s => s.id !== id);
                setSessions(newSessions);
                if (activeSessionId === id) {
                   handleStopGeneration();
                   if (newSessions.length > 0) {
                     setActiveSessionId(newSessions[0].id);
                     setMessages(newSessions[0].messages);
                   } else createNewSession();
                }
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <Suspense fallback={null}>
            <MobileMenu 
                isOpen={isMobileMenuOpen} sessions={sessions} activeSessionId={activeSessionId} language={settings.language}
                onClose={() => setIsMobileMenuOpen(false)} onNewChat={() => { handleStopGeneration(); createNewSession(); setIsMobileMenuOpen(false); }} 
                onSelectSession={handleSelectSession}
                onDeleteSession={(e, id) => {
                    e.stopPropagation();
                    const newSessions = sessions.filter(s => s.id !== id);
                    setSessions(newSessions);
                    if (activeSessionId === id) {
                       handleStopGeneration();
                       if (newSessions.length > 0) {
                         setActiveSessionId(newSessions[0].id);
                         setMessages(newSessions[0].messages);
                       } else createNewSession();
                    }
                }} 
                onOpenSettings={() => setIsSettingsOpen(true)}
            />
        </Suspense>

        <main className="flex-1 flex flex-col relative h-full min-w-0 overflow-hidden">
          <Header 
             currentSessionTitle={currentSessionTitle} 
             isSummarizing={isSummarizing} 
             hasMessages={messages.length > 0}
             language={settings.language}
             currentSessionMemory={currentSessionMemory}
             onRename={() => {
                const session = sessions.find(s => s.id === activeSessionId);
                showDialog({
                    type: 'input',
                    title: t('msg.rename_chat', settings.language),
                    inputValue: session?.title || '',
                    onConfirm: (newTitle) => {
                        if (newTitle && newTitle.trim()) setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle.trim() } : s));
                    }
                });
             }} 
             onSummarize={async () => {
                if (messages.length === 0 || !llmService) return;
                setIsSummarizing(true); 
                try {
                    const historyText = messages.map(m => `${m.role === Role.USER ? 'User' : 'Model'}: ${m.text}`).join('\n');
                    const prompt = t('msg.summarize_prompt', settings.language) + '\n\n' + historyText;
                    const { text } = await llmService.streamChatResponse('', [], prompt, [], undefined, settings.generation, undefined, undefined, settings.language);
                    const newTitle = text.trim().replace(/['"]/g, '').replace(/\.$/, '').replace(/\*\*/g, ''); 
                    if (newTitle) {
                        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle } : s));
                        addToast(t('action.ok', settings.language), 'success');
                    }
                } catch (e) {
                    addToast(t('msg.summarize_error', settings.language), 'error');
                } finally { setIsSummarizing(false); }
             }}
             onOpenMobileMenu={() => setIsMobileMenuOpen(true)} 
             onNewChat={() => { handleStopGeneration(); createNewSession(); }} 
             onClearChat={() => {
                if (messages.length === 0) return;
                showDialog({
                    type: 'confirm',
                    title: t('action.clear_chat', settings.language),
                    message: t('msg.confirm_clear_chat', settings.language),
                    onConfirm: () => {
                        handleStopGeneration();
                        setMessages([]);
                        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
                    }
                });
             }}
             onOpenSettings={() => setIsSettingsOpen(true)} 
             onSaveChat={handleSaveChat} 
             onLoadSession={handleLoadSession}
             onUpdateMemory={handleUpdateSessionMemory}
             onShowToast={addToast}
          />

          <ChatInterface 
              messages={messages} isLoading={isLoading} 
              loadingStatus={loadingStatus}
              onEditMessage={handleEditMessage} 
              onDeleteMessage={handleDeleteMessage} 
              onRegenerate={handleRegenerateMessage} 
              language={settings.language} fontSize={settings.fontSize} 
              textWrapping={settings.textWrapping} bubbleTransparency={settings.bubbleTransparency}
              showModelName={settings.showModelName} showGroupName={settings.showGroupName} showResponseTimer={settings.showResponseTimer} theme={settings.theme}
              kirbyThemeColor={settings.kirbyThemeColor} onShowToast={addToast} smoothAnimation={settings.smoothAnimation}
              avatarVisibility={settings.avatarVisibility}
          />

          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 dark:to-transparent pt-10 pb-0">
             <ChatInput 
                input={input} setInput={setInput} inputImages={inputImages} setInputImages={setInputImages}
                onSend={handleSendMessage} onStop={handleStopGeneration} isLoading={isLoading} isDisabled={activeKeysCount === 0}
                fontSize={settings.fontSize} language={settings.language} activeKeysCount={activeKeysCount} showTokenUsage={settings.showTokenUsage}
                history={messages} historyLimit={settings.historyContextLimit} 
                onGetTokenCount={async (currentInput) => {
                    if (!llmService || apiKeys.length === 0) return 0;
                    const activeKey = apiKeys.find(k => k.isActive);
                    if (!activeKey) return 0;
                    return await llmService.countTokens(activeKey, messages, currentInput, settings.systemPrompts.filter(p => p.isActive).map(p => p.content).join('\n\n'));
                }} 
                theme={settings.theme}
                isSearchEnabled={settings.generation.googleSearch}
                onToggleSearch={(enabled) => setSettings({ ...settings, generation: { ...settings.generation, googleSearch: enabled } })}
                knownModels={knownModels}
                currentModel={apiKeys.length > 0 ? (apiKeys.find(k => k.isActive)?.model || apiKeys[0].model) : ''}
                onQuickChangeModel={handleQuickChangeModel}
             />
             <div className="text-center text-[10px] text-gray-400 dark:text-gray-600 pb-0 select-none">
                {t('footer.ai_generated', settings.language)}{APP_VERSION}
             </div>
          </div>
        </main>

        <Suspense fallback={null}>
            <SettingsModal 
                isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKeys={apiKeys} onUpdateKeys={setApiKeys} 
                settings={settings} onUpdateSettings={setSettings} llmService={llmService} onShowToast={addToast}
                onShowDialog={showDialog} knownModels={knownModels} onUpdateKnownModels={setKnownModels}
            />
        </Suspense>
      </div>
    </div>
  );
};

export default App;