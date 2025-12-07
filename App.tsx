"use client";

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from './services/geminiService';
import { Message, Role, GeminiModel, AppSettings, KeyConfig, ChatSession, ModelProvider, APP_VERSION, ToastMessage, DialogConfig, ModelInfo } from './types';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import SecurityLock from './components/SecurityLock';
import Sidebar from './components/Sidebar';
import MobileMenu from './components/MobileMenu';
import { Header } from './components/Header';
import ChatInput from './components/ChatInput';
import { t } from './utils/i18n';
import { ToastContainer } from './components/ui/Toast';
import { CustomDialog } from './components/ui/CustomDialog';
import { executeFilterScript } from './utils/scriptExecutor';

// --- Default Configuration ---
const DEFAULT_MODEL = GeminiModel.FLASH;
const STORAGE_KEYS_KEY = 'gemini_omnichat_keys_v4';
const STORAGE_SETTINGS_KEY = 'gemini_omnichat_settings_v8'; 
const STORAGE_SESSIONS_KEY = 'gemini_omnichat_sessions_v1';
const STORAGE_ACTIVE_SESSION_KEY = 'gemini_omnichat_active_session_v1';
const STORAGE_KNOWN_MODELS_KEY = 'gemini_omnichat_known_models_v1';

const ENV_KEY = process.env.API_KEY || '';

const DEFAULT_KNOWN_MODELS: ModelInfo[] = [
    { name: 'gemini-2.5-flash', inputTokenLimit: 1048576, outputTokenLimit: 8192 },
    { name: 'gemini-3-pro-preview', inputTokenLimit: 2097152, outputTokenLimit: 8192 },
    { name: 'gemini-2.5-flash-thinking-preview-01-21', inputTokenLimit: 32768, outputTokenLimit: 8192 }
];

const App: React.FC = () => {
  // --- State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [apiKeys, setApiKeys] = useState<KeyConfig[]>([]);
  const [knownModels, setKnownModels] = useState<ModelInfo[]>(DEFAULT_KNOWN_MODELS);
  
  const [settings, setSettings] = useState<AppSettings>({
    defaultModel: DEFAULT_MODEL,
    defaultBaseUrl: 'https://api.openai.com/v1',
    systemPrompts: [],
    theme: 'light', // Default to Day/Light
    language: 'zh', // Default to Chinese
    fontSize: 14,
    textWrapping: 'auto', // Default to Auto
    bubbleTransparency: 100, // Default to 100% opacity
    showModelName: true, // Default to true
    kirbyThemeColor: false, // Default to false
    showTokenUsage: false, // Default to false
    showResponseTimer: false, // Default to false
    smoothAnimation: true, // Default to true
    historyContextLimit: 0, // Default to 0 (unlimited)
    security: {
        enabled: false,
        questions: [],
        lastLogin: Date.now(),
        lockoutDurationSeconds: 86400 // Default 24 hours in seconds
    },
    generation: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        stream: false, // Default to false (closed)
        thinkingBudget: 0 // Default 0
    },
    scripts: {
        inputFilterEnabled: false,
        inputFilterCode: '',
        outputFilterEnabled: false,
        outputFilterCode: ''
    }
  });

  // UI State
  const [toasts, setToasts] = useState<ToastMessage[]>([] );
  const [dialog, setDialog] = useState<DialogConfig>({
      isOpen: false,
      type: 'alert',
      title: '',
      onConfirm: () => {}
  });

  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);

  // --- Helpers for UI ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
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

  // --- Initialization ---
  useEffect(() => {
    // 1. Load Keys & Migration
    const storedKeys = localStorage.getItem(STORAGE_KEYS_KEY);
    const oldKeysV3 = localStorage.getItem('gemini_omnichat_keys_v3');
    
    // Retrieve old global settings to migrate model/url to keys
    const oldSettingsStr = localStorage.getItem('gemini_omnichat_settings_v5');
    const oldSettings = oldSettingsStr ? JSON.parse(oldSettingsStr) : null;
    const globalModel = oldSettings?.model || DEFAULT_MODEL;
    const globalBaseUrl = oldSettings?.openAIBaseUrl || 'https://api.openai.com/v1';

    let initialKeys: KeyConfig[] = [];

    if (storedKeys) {
      initialKeys = JSON.parse(storedKeys);
    } else if (oldKeysV3) {
      // Migrate v3 keys to v4: Add model and baseUrl to each key
      const parsed = JSON.parse(oldKeysV3);
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
        usageLimit: 5, // Default usage limit set to 5
        isRateLimited: false,
        lastUsed: 0,
        model: DEFAULT_MODEL
      }));
    }
    setApiKeys(initialKeys);
    
    // 2. Load Settings
    const storedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    let loadedSettings = settings;
    let loadedKnownModels = DEFAULT_KNOWN_MODELS;

    // 2.1 Load Known Models from separate cache
    const storedKnownModels = localStorage.getItem(STORAGE_KNOWN_MODELS_KEY);
    if (storedKnownModels) {
        try {
            loadedKnownModels = JSON.parse(storedKnownModels);
        } catch (e) {
            // console.error("Failed to parse known models from storage", e);
        }
    }

    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      
      // Migration: If knownModels existed in settings but not in separate cache, use it
      if (parsedSettings.knownModels && !storedKnownModels) {
          loadedKnownModels = parsedSettings.knownModels;
      }
      
      // Remove knownModels from settings object if present
      if ('knownModels' in parsedSettings) {
          delete parsedSettings.knownModels;
      }

      loadedSettings = { ...settings, ...parsedSettings };

      // Ensure lockoutDurationSeconds is set
      if (loadedSettings.security && loadedSettings.security.lockoutDurationSeconds === undefined) {
          loadedSettings.security.lockoutDurationSeconds = 86400; // Default to 24 hours
      }
      // Ensure stream setting exists
      if (loadedSettings.generation && loadedSettings.generation.stream === undefined) {
          loadedSettings.generation.stream = false;
      }
      // Ensure showModelName setting exists
      if (loadedSettings.showModelName === undefined) {
          loadedSettings.showModelName = true;
      }
      // Ensure kirbyThemeColor setting exists
      if (loadedSettings.kirbyThemeColor === undefined) {
          loadedSettings.kirbyThemeColor = false;
      }
       // Ensure showTokenUsage setting exists
       if (loadedSettings.showTokenUsage === undefined) {
          loadedSettings.showTokenUsage = false;
      }
      // Ensure showResponseTimer setting exists
      if (loadedSettings.showResponseTimer === undefined) {
          loadedSettings.showResponseTimer = false;
      }
      // Ensure smoothAnimation setting exists
      if (loadedSettings.smoothAnimation === undefined) {
          loadedSettings.smoothAnimation = true;
      }
      // Ensure historyContextLimit setting exists
      if (loadedSettings.historyContextLimit === undefined) {
          loadedSettings.historyContextLimit = 0;
      }
      // Ensure thinkingBudget exists
      if (loadedSettings.generation && loadedSettings.generation.thinkingBudget === undefined) {
          loadedSettings.generation.thinkingBudget = 0;
      }
      // Ensure scripts setting exists
      if (!loadedSettings.scripts) {
          loadedSettings.scripts = {
              inputFilterEnabled: false,
              inputFilterCode: '',
              outputFilterEnabled: false,
              outputFilterCode: ''
          };
      }
    } 
    setSettings(loadedSettings);
    setKnownModels(loadedKnownModels);
    
    // Init Service
    setGeminiService(new GeminiService(initialKeys, (id, errorCode) => {
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: false, lastErrorCode: errorCode } : k));
    }));

    // Security
    if (loadedSettings.security.enabled) {
        const lockoutThresholdMs = (loadedSettings.security.lockoutDurationSeconds || 86400) * 1000;
        if (Date.now() - (loadedSettings.security.lastLogin || 0) > lockoutThresholdMs) {
            setIsLocked(true);
        } else {
             const newSettings = { ...loadedSettings, security: { ...loadedSettings.security, lastLogin: Date.now() } };
             setSettings(newSettings);
        }
    }

    // 3. Load Sessions
    const storedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
    const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
    
    if (storedSessions) {
      const parsedSessions = JSON.parse(storedSessions) as ChatSession[];
      if (parsedSessions.length > 0) {
        setSessions(parsedSessions);
        const targetId = (storedActiveId && parsedSessions.find(s => s.id === storedActiveId))
          ? storedActiveId 
          : parsedSessions[0].id;
        setActiveSessionId(targetId);
        setMessages(parsedSessions.find(s => s.id === targetId)?.messages || []);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  const createNewSession = () => {
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      title: t('msg.new_chat_title', settings.language),
      messages: [],
      createdAt: Date.now()
    };
    setSessions([newSession]);
    setActiveSessionId(newId);
    setMessages([]);
  };

  // --- Persistence ---
  useEffect(() => {
    if (geminiService) {
      geminiService.updateKeys(apiKeys);
    } else {
       setGeminiService(new GeminiService(apiKeys, (id, errorCode) => {
           setApiKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: false, lastErrorCode: errorCode } : k));
       }));
    }
    localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(apiKeys));
  }, [apiKeys, geminiService]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink', 'theme-sunrise', 'theme-lime', 'theme-panda');
    root.classList.add(`theme-${settings.theme}`);
    if (['dark', 'twilight'].includes(settings.theme)) root.classList.add('dark');
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

  // --- Core Logic ---
  
  // REFACTORED: Now accepts historyBefore (context) and userMessage (new prompt) separately
  // This avoids ambiguity and prevents duplicate messages in the context.
  const triggerBotResponse = async (historyBefore: Message[], userMessage: Message) => {
    if (!geminiService) return;
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
    
    // Optimistic UI update: Previous History + New User Msg + Empty Bot Msg
    setMessages([...historyBefore, userMessage, botMessage]);

    const startTime = Date.now();

    try {
      const combinedSystemInstruction = settings.systemPrompts.filter(p => p.isActive).map(p => p.content).join('\n\n');

      // API Context: Use ONLY historyBefore (excludes the new message, as it is passed as promptText)
      const historyForApi = historyBefore;

      // Apply History Context Limit (Truncate history sent to model)
      let contextToSend = historyForApi;
      if (settings.historyContextLimit > 0 && historyForApi.length > settings.historyContextLimit) {
          contextToSend = historyForApi.slice(-settings.historyContextLimit);
      }

      const { text: fullText, usedKeyIndex, provider, usedModel } = await geminiService.streamChatResponse(
        '', // Global model ignored, uses key config
        contextToSend, 
        userMessage.text, // Explicit prompt text
        combinedSystemInstruction,
        settings.generation,
        (chunkText) => {
           // Apply Output Filter (Streaming)
           let processedChunk = chunkText;
           if (settings.scripts?.outputFilterEnabled && settings.scripts.outputFilterCode) {
               processedChunk = executeFilterScript(
                   settings.scripts.outputFilterCode,
                   chunkText,
                   { role: 'model', history: [...historyBefore, userMessage] }
               );
           }
           setMessages(prev => prev.map(msg => msg.id === tempBotId ? { ...msg, text: processedChunk } : msg));
        },
        controller.signal,
        settings.language
      );
      
      const executionTime = Date.now() - startTime;

      // Apply Output Filter (Final)
      let processedFinalText = fullText;
      if (settings.scripts?.outputFilterEnabled && settings.scripts.outputFilterCode) {
          processedFinalText = executeFilterScript(
              settings.scripts.outputFilterCode,
              fullText,
              { role: 'model', history: [...historyBefore, userMessage] }
          );
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempBotId ? { 
              ...msg, 
              text: processedFinalText, 
              keyIndex: usedKeyIndex, 
              provider: provider, 
              model: usedModel,
              executionTime: executionTime
          } : msg
        )
      );
    } catch (error: any) {
      if (error.message !== "Aborted by user") {
          // Replaced console.error with toast or inline message
          const errorMessage: Message = {
            id: uuidv4(),
            role: Role.MODEL,
            text: `Error: ${error.message || t('error.unexpected_error', settings.language)}`,
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

  const handleUnlock = () => {
      setIsLocked(false);
      const newSettings = { ...settings, security: { ...settings.security, lastLogin: Date.now() } };
      setSettings(newSettings);
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const handleSendMessage = async () => {
    // Prevent race conditions with isProcessingRef
    if (!input.trim() || isLoading || !geminiService || isProcessingRef.current) return;
    
    if (apiKeys.filter(k => k.isActive).length === 0) {
      setIsSettingsOpen(true);
      return;
    }

    isProcessingRef.current = true; // Lock

    // Apply Input Filter
    let processedInput = input.trim();
    if (settings.scripts?.inputFilterEnabled && settings.scripts.inputFilterCode) {
        processedInput = executeFilterScript(
            settings.scripts.inputFilterCode, 
            processedInput, 
            { role: 'user', history: messages }
        );
    }

    const newMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: processedInput,
      timestamp: Date.now()
    };
    
    // Update UI immediately (Optimistic)
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    
    try {
        // Pass the CURRENT messages (history before new message) and the NEW message object
        await triggerBotResponse(messages, newMessage);
    } finally {
        isProcessingRef.current = false; // Unlock
    }
  };

  const handleGetTokenCount = async (currentInput: string): Promise<number> => {
      if (!geminiService || apiKeys.length === 0) return 0;
      
      const activeKey = apiKeys.find(k => k.isActive);
      if (!activeKey) return 0;

      let contextToSend = messages;
      if (settings.historyContextLimit > 0 && messages.length > settings.historyContextLimit) {
          contextToSend = messages.slice(-settings.historyContextLimit);
      }
      
      const combinedSystemInstruction = settings.systemPrompts.filter(p => p.isActive).map(p => p.content).join('\n\n');

      return await geminiService.countTokens(
          activeKey,
          contextToSend,
          currentInput,
          combinedSystemInstruction
      );
  };

  const handleEditMessage = (id: string, newText: string) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, text: newText } : msg));
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleRegenerate = async (id: string) => {
    if (isLoading || !geminiService) return;
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return;
    const targetMsg = messages[index];
    
    if (targetMsg.role === Role.USER) {
       // Regenerate from User Message
       const historyBefore = messages.slice(0, index);
       await triggerBotResponse(historyBefore, targetMsg);
    } else {
      // Regenerate Model Response
      let userMsgIndex = index - 1;
      while (userMsgIndex >= 0 && messages[userMsgIndex].role !== Role.USER) {
        userMsgIndex--;
      }
      if (userMsgIndex === -1) {
        handleDeleteMessage(id);
        return;
      }
      const historyBefore = messages.slice(0, userMsgIndex);
      const userMsg = messages[userMsgIndex];
      await triggerBotResponse(historyBefore, userMsg);
    }
  };

  const handleNewChat = () => {
    handleStopGeneration();
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
    setInput('');
    setIsMobileMenuOpen(false);
  };

  const handleClearChat = () => {
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

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (activeSessionId === sessionId) {
       handleStopGeneration();
       if (newSessions.length > 0) {
         setActiveSessionId(newSessions[0].id);
         setMessages(newSessions[0].messages);
       } else {
         createNewSession();
       }
    }
  };

  const handleSaveChat = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const title = activeSession?.title || "Session";
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

  const handleLoadSession = (loadedMessages: any[], title?: string) => {
      handleStopGeneration();
      setMessages(loadedMessages);
      setInput('');
      if (title) {
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: title } : s));
      }
      addToast(t('success.chat_import', settings.language), 'success');
  };

  const handleSummarize = async () => {
    if (messages.length === 0 || !geminiService) return;
    setIsSummarizing(true); 
    try {
        const historyText = messages.map(m => `${m.role === Role.USER ? 'User' : 'Model'}: ${m.text}`).join('\n');
        const prompt = t('msg.summarize_prompt', settings.language) + '\n\n' + historyText;
        const { text } = await geminiService.streamChatResponse('', [], prompt, undefined, settings.generation, undefined, undefined, settings.language);
        const newTitle = text.trim().replace(/['"]/g, '').replace(/\.$/, '').replace(/\*\*/g, ''); 
        if (newTitle) {
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle } : s));
            addToast(t('action.ok', settings.language), 'success');
        }
    } catch (error) {
        addToast(t('msg.summarize_error', settings.language), 'error');
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleRenameSession = () => {
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const currentTitle = currentSession?.title || t('app.title', settings.language);
    
    showDialog({
        type: 'input',
        title: t('msg.rename_chat', settings.language),
        inputValue: currentTitle,
        onConfirm: (newTitle) => {
            if (newTitle && newTitle.trim()) {
                setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle.trim() } : s));
            }
        }
    });
  };

  const activeKeysCount = apiKeys.filter(k => k.isActive).length;
  const currentSessionTitle = sessions.find(s => s.id === activeSessionId)?.title || t('app.title', settings.language);
  
  if (isLocked) return (
    <div className={`${settings.theme === 'dark' || settings.theme === 'twilight' ? 'dark' : ''}`}>
        <SecurityLock 
            config={settings.security} 
            onUnlock={handleUnlock} 
            lang={settings.language} 
            theme={settings.theme}
            kirbyThemeColor={settings.kirbyThemeColor}
        />
    </div>
  );

  return (
    <div className={`flex h-screen font-sans ${settings.theme === 'dark' || settings.theme === 'twilight' ? 'dark' : ''}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <CustomDialog config={dialog} onClose={closeDialog} lang={settings.language} />

      <div className="flex w-full h-full bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Sidebar 
            sessions={sessions}
            activeSessionId={activeSessionId}
            activeKeysCount={activeKeysCount}
            language={settings.language}
            theme={settings.theme}
            kirbyThemeColor={settings.kirbyThemeColor}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <MobileMenu 
            isOpen={isMobileMenuOpen}
            sessions={sessions}
            activeSessionId={activeSessionId}
            language={settings.language}
            onClose={() => setIsMobileMenuOpen(false)}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <main className="flex-1 flex flex-col relative h-full min-w-0">
          <Header 
             currentSessionTitle={currentSessionTitle}
             isSummarizing={isSummarizing}
             hasMessages={messages.length > 0}
             language={settings.language}
             onRename={handleRenameSession}
             onSummarize={handleSummarize}
             onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
             onNewChat={handleNewChat}
             onClearChat={handleClearChat}
             onOpenSettings={() => setIsSettingsOpen(true)}
             onSaveChat={handleSaveChat}
             onLoadSession={handleLoadSession}
             onShowToast={addToast}
          />

          <ChatInterface 
              messages={messages} 
              isLoading={isLoading} 
              onEditMessage={handleEditMessage} 
              onDeleteMessage={handleDeleteMessage} 
              onRegenerate={handleRegenerate} 
              language={settings.language} 
              fontSize={settings.fontSize} 
              textWrapping={settings.textWrapping}
              bubbleTransparency={settings.bubbleTransparency}
              showModelName={settings.showModelName}
              showResponseTimer={settings.showResponseTimer}
              theme={settings.theme}
              kirbyThemeColor={settings.kirbyThemeColor}
              onShowToast={addToast}
              smoothAnimation={settings.smoothAnimation}
          />

          <div className="flex-shrink-0 z-20 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-black dark:via-black/90 dark:to-transparent pt-4">
             <ChatInput 
                input={input}
                setInput={setInput}
                onSend={handleSendMessage}
                onStop={handleStopGeneration}
                isLoading={isLoading}
                isDisabled={activeKeysCount === 0}
                fontSize={settings.fontSize}
                language={settings.language}
                activeKeysCount={activeKeysCount}
                showTokenUsage={settings.showTokenUsage}
                history={messages}
                historyLimit={settings.historyContextLimit}
                onGetTokenCount={handleGetTokenCount}
             />
             <div className="text-center text-[10px] text-gray-400 dark:text-gray-600 pb-1 select-none">
                {t('footer.ai_generated', settings.language)}{APP_VERSION}
             </div>
          </div>
        </main>

        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            apiKeys={apiKeys} 
            onUpdateKeys={setApiKeys} 
            settings={settings} 
            onUpdateSettings={setSettings} 
            geminiService={geminiService}
            onShowToast={addToast}
            onShowDialog={showDialog}
            knownModels={knownModels}
            onUpdateKnownModels={setKnownModels}
        />
      </div>
    </div>
  );
};

export default App;