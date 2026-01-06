
"use client";

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './services/llmService';
import { Message, Role, GeminiModel, AppSettings, KeyConfig, ChatSession, ModelProvider, APP_VERSION, ToastMessage, DialogConfig, ModelInfo } from './types';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import { Header } from './components/Header';
import ChatInput from './components/ChatInput';
import { t } from './utils/i18n';
import { ToastContainer } from './components/ui/Toast';
import { CustomDialog } from './components/ui/CustomDialog';
import { executeFilterScript } from './utils/scriptExecutor';

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
  // --- 状态定义 ---
  const [sessions, setSessions] = useState<ChatSession[]>([]); // 会话列表
  const [activeSessionId, setActiveSessionId] = useState<string>(''); // 当前活动会话 ID
  const [messages, setMessages] = useState<Message[]>([]); // 当前会话的消息记录
  const [input, setInput] = useState(''); // 输入框文本
  const [inputImages, setInputImages] = useState<string[]>([]); // 待发送的图片
  const [isLoading, setIsLoading] = useState(false); // 是否正在生成回复
  const [isSummarizing, setIsSummarizing] = useState(false); // 是否正在总结标题
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 设置弹窗开关
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 移动端侧边栏开关
  const [isLocked, setIsLocked] = useState(false); // 隐私安全锁状态
  const [apiKeys, setApiKeys] = useState<KeyConfig[]>([]); // API 密钥池
  const [knownModels, setKnownModels] = useState<ModelInfo[]>(DEFAULT_KNOWN_MODELS); // 已知模型缓存
  
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
        stripThoughts: false 
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

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dialog, setDialog] = useState<DialogConfig>({
      isOpen: false,
      type: 'alert',
      title: '',
      onConfirm: () => {}
  });

  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);

  // --- 辅助工具函数 ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setToasts(prev => [...prev, { id: uuidv4(), message, type }]);
  };
  
  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showDialog = (config: Partial<DialogConfig> & { title: string, onConfirm: (value?: string) => void }) => {
      setDialog({
          isOpen: true,
          type: config.type || 'alert',
          title: config.title,
          message: config.message,
          inputValue: config.inputValue,
          inputPlaceholder: config.inputPlaceholder,
          onConfirm: config.onConfirm,
          onCancel: config.onCancel
      });
  };

  const closeDialog = () => {
      setDialog(prev => ({ ...prev, isOpen: false }));
  };

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
   * 节点 1: 挂载初始化
   * 从 LocalStorage 加载所有持久化数据，包括密钥、设置和会话历史。
   */
  useEffect(() => {
    const storedKeys = localStorage.getItem(STORAGE_KEYS_KEY);
    const oldKeysV3 = localStorage.getItem('gemini_omnichat_keys_v3');
    const oldSettingsStr = localStorage.getItem('gemini_omnichat_settings_v5');
    const oldSettings = safeJsonParse(oldSettingsStr);
    const globalModel = oldSettings?.model || DEFAULT_MODEL;
    const globalBaseUrl = oldSettings?.openAIBaseUrl || 'https://api.openai.com/v1';

    let initialKeys: KeyConfig[] = [];

    if (storedKeys) {
      initialKeys = safeJsonParse(storedKeys, []);
    } else if (oldKeysV3) {
      const parsed = safeJsonParse(oldKeysV3, []);
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
    
    const storedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    let loadedSettings = settings;
    let loadedKnownModels = DEFAULT_KNOWN_MODELS;

    const storedKnownModels = localStorage.getItem(STORAGE_KNOWN_MODELS_KEY);
    if (storedKnownModels) {
        // Merge stored models with defaults to ensure new defaults appear
        const parsedStoredModels = safeJsonParse(storedKnownModels, []);
        // Create a map for easy lookup by name
        const storedModelMap = new Map(parsedStoredModels.map((m: any) => [m.name, m]));
        
        // Start with defaults
        const mergedModels = [...DEFAULT_KNOWN_MODELS];
        
        // Add any stored models that are NOT in defaults
        parsedStoredModels.forEach((m: any) => {
            if (!mergedModels.find(dm => dm.name === m.name)) {
                mergedModels.push(m);
            }
        });
        
        loadedKnownModels = mergedModels;
    }

    if (storedSettings) {
      const parsedSettings = safeJsonParse(storedSettings);
      if (parsedSettings) {
          if (parsedSettings.knownModels && !storedKnownModels) {
              loadedKnownModels = parsedSettings.knownModels;
          }
          if ('knownModels' in parsedSettings) delete parsedSettings.knownModels;
          loadedSettings = { ...settings, ...parsedSettings };
      }
    } 
    setSettings(loadedSettings);
    setKnownModels(loadedKnownModels);
    
    const effectiveKeys = initialKeys.map(k => {
        if (!k.groupId) return k;
        const group = loadedSettings.keyGroups?.find(g => g.id === k.groupId);
        if (group && group.isActive === false) return { ...k, isActive: false };
        return k;
    });

    // 初始化核心 LLM 服务
    setLlmService(new LLMService(
        effectiveKeys, 
        {
            onKeyError: (id, errorCode, isFatal = true) => {
                setApiKeys(prev => prev.map(k => {
                    if (k.id !== id) return k;
                    if (isFatal) return { ...k, isActive: false, lastErrorCode: errorCode };
                    else return { ...k, isRateLimited: true, lastUsed: Date.now(), lastErrorCode: errorCode };
                }));
                // Only toast on fatal errors here, LLMService handles other status messages
                if (isFatal) addToast(`${t('error.key_auto_disabled', loadedSettings.language)}${errorCode ? ` (${errorCode})` : ''}`, 'error');
            },
            onStatusMessage: (msg, type) => addToast(msg, type)
        }
    ));

    // 安全锁检查
    if (loadedSettings.security.enabled) {
        const lockoutThresholdMs = (loadedSettings.security.lockoutDurationSeconds || 86400) * 1000;
        if (Date.now() - (loadedSettings.security.lastLogin || 0) > lockoutThresholdMs) setIsLocked(true);
        else setSettings({ ...loadedSettings, security: { ...loadedSettings.security, lastLogin: Date.now() } });
    }

    // 会话恢复
    const storedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
    const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
    
    if (storedSessions) {
      const parsedSessions = safeJsonParse(storedSessions, []) as ChatSession[];
      if (parsedSessions.length > 0) {
        setSessions(parsedSessions);
        const targetId = (storedActiveId && parsedSessions.find(s => s.id === storedActiveId)) ? storedActiveId : parsedSessions[0].id;
        setActiveSessionId(targetId);
        setMessages(parsedSessions.find(s => s.id === targetId)?.messages || []);
      } else createNewSession();
    } else createNewSession();
  }, []);

  const createNewSession = () => {
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      title: t('msg.new_chat_title', settings.language),
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMessages([]);
  };

  /**
   * 节点 2: 数据同步
   * 监听状态变动并同步至服务层或持久化存储。
   */
  useEffect(() => {
    const effectiveKeys = apiKeys.map(k => {
        if (!k.groupId) return k;
        const group = settings.keyGroups?.find(g => g.id === k.groupId);
        if (group && group.isActive === false) return { ...k, isActive: false };
        return k;
    });

    if (llmService) llmService.updateKeys(effectiveKeys, settings.keyGroups || []);
    localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(apiKeys));
  }, [apiKeys, llmService, settings.keyGroups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink', 'theme-sunrise', 'theme-lime', 'theme-panda', 'theme-chocolate', 'theme-vscode-light', 'theme-vscode-dark');
    root.classList.add(`theme-${settings.theme}`);
    if (['dark', 'twilight', 'vscode-dark', 'chocolate'].includes(settings.theme)) root.classList.add('dark');
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KNOWN_MODELS_KEY, JSON.stringify(knownModels));
  }, [knownModels]);

  useEffect(() => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === activeSessionId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], messages };
      return updated;
    });
  }, [messages, activeSessionId]);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, activeSessionId);
  }, [activeSessionId]);

  /**
   * 节点 3: 消息处理逻辑
   * 处理流式响应并将其分片渲染至 UI。
   */
  const triggerBotResponse = async (historyBefore: Message[], userMessage: Message) => {
    if (!llmService) return;
    setIsLoading(true);
    
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

    try {
      const systemInstruction = settings.systemPrompts.filter(p => p.isActive).map(p => p.content).join('\n\n');
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

      // 执行流式调用
      const { text: fullText, usedKeyIndex, provider, usedModel } = await llmService.streamChatResponse(
        '', 
        contextToSend, 
        userMessage.text, 
        userMessage.images, 
        systemInstruction,
        settings.generation,
        (chunkText) => {
           let processedChunk = chunkText;
           if (settings.scripts?.outputFilterEnabled && settings.scripts.outputFilterCode) {
               processedChunk = executeFilterScript(settings.scripts.outputFilterCode, chunkText, { role: 'model', history: [...historyBefore, userMessage] });
           }
           setMessages(prev => prev.map(msg => msg.id === tempBotId ? { ...msg, text: processedChunk } : msg));
        },
        controller.signal,
        settings.language
      );
      
      const executionTime = Date.now() - startTime;
      let processedFinalText = fullText;

      if (settings.scripts?.outputFilterEnabled && settings.scripts.outputFilterCode) {
          processedFinalText = executeFilterScript(settings.scripts.outputFilterCode, fullText, { role: 'model', history: [...historyBefore, userMessage] });
      }

      // Resolve Group Name
      let groupName: string | undefined;
      if (usedKeyIndex && usedKeyIndex > 0 && usedKeyIndex <= apiKeys.length) {
          const usedKey = apiKeys[usedKeyIndex - 1];
          if (usedKey && usedKey.groupId) {
              const group = settings.keyGroups?.find(g => g.id === usedKey.groupId);
              if (group) groupName = group.name;
          }
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempBotId ? { 
              ...msg, 
              text: processedFinalText, 
              keyIndex: usedKeyIndex, 
              provider: provider, 
              model: usedModel, 
              executionTime: executionTime,
              groupName: groupName
          } : msg
        )
      );
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
      setIsLoading(false);
      abortControllerRef.current = null;
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

  /**
   * 节点 4: 加载对话功能修复与增强
   * 将对话作为新会话导入，而不是覆盖当前会话，避免用户误操作。
   */
  const handleLoadSession = (loadedMessages: any[], title?: string) => {
      handleStopGeneration();
      
      // 生成新的会话对象
      const newId = uuidv4();
      const newSession: ChatSession = {
          id: newId,
          title: title || t('msg.new_chat_title', settings.language),
          messages: loadedMessages,
          createdAt: Date.now()
      };

      // 插入到会话列表最前端并立即切换
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newId);
      setMessages(loadedMessages);
      setInput('');
      
      // 使用更明确的“对话已导入”提示
      addToast(t('success.chat_import', settings.language) || t('msg.config_imported', settings.language), 'success');
  };

  const handleSaveChat = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const title = activeSession?.title || t('label.session', settings.language);
    const safeTitle = title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').substring(0, 50);
    const chatData = { title, date: new Date().toISOString(), messages };
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
  const currentSessionTitle = sessions.find(s => s.id === activeSessionId)?.title || t('app.title', settings.language);
  
  if (isLocked) return (
    <div className={`${['dark', 'twilight', 'vscode-dark', 'chocolate'].includes(settings.theme) ? 'dark' : ''}`}>
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-950"></div>}>
            <SecurityLock config={settings.security} onUnlock={() => setIsLocked(false)} lang={settings.language} theme={settings.theme} kirbyThemeColor={settings.kirbyThemeColor} />
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
             currentSessionTitle={currentSessionTitle} isSummarizing={isSummarizing} hasMessages={messages.length > 0}
             language={settings.language} onRename={() => {
                const currentSession = sessions.find(s => s.id === activeSessionId);
                showDialog({
                    type: 'input',
                    title: t('msg.rename_chat', settings.language),
                    inputValue: currentSession?.title || '',
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
             onShowToast={addToast}
          />

          <ChatInterface 
              messages={messages} isLoading={isLoading} 
              onEditMessage={(id, newText) => setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, text: newText } : msg))} 
              onDeleteMessage={(id) => setMessages(prev => prev.filter(msg => msg.id !== id))} 
              onRegenerate={async (id) => {
                if (!llmService) return;
                const index = messages.findIndex(m => m.id === id);
                if (index === -1) return;
                const targetMsg = messages[index];
                if (targetMsg.role === Role.USER) {
                   await triggerBotResponse(messages.slice(0, index), targetMsg);
                } else {
                  let userMsgIndex = index - 1;
                  while (userMsgIndex >= 0 && messages[userMsgIndex].role !== Role.USER) userMsgIndex--;
                  if (userMsgIndex !== -1) await triggerBotResponse(messages.slice(0, userMsgIndex), messages[userMsgIndex]);
                }
              }} 
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