"use client";

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from './services/geminiService';
import { Message, Role, GeminiModel, AppSettings, KeyConfig, ChatSession, ModelProvider } from './types';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import SecurityLock from './components/SecurityLock';
import Sidebar from './components/Sidebar';
import MobileMenu from './components/MobileMenu';
import Header from './components/Header';
import ChatInput from './components/ChatInput';
import { t } from './utils/i18n';

// --- Default Configuration ---
const DEFAULT_MODEL = GeminiModel.FLASH;
const STORAGE_KEYS_KEY = 'gemini_omnichat_keys_v4';
const STORAGE_SETTINGS_KEY = 'gemini_omnichat_settings_v8'; 
const STORAGE_SESSIONS_KEY = 'gemini_omnichat_sessions_v1';
const STORAGE_ACTIVE_SESSION_KEY = 'gemini_omnichat_active_session_v1';

const ENV_KEY = process.env.API_KEY || '';

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
  const [settings, setSettings] = useState<AppSettings>({
    defaultModel: DEFAULT_MODEL,
    defaultBaseUrl: 'https://api.openai.com/v1',
    systemPrompts: [],
    theme: 'light', // Default to Day/Light
    language: 'zh', // Default to Chinese
    fontSize: 14,
    textWrapping: 'auto', // Default to Auto
    bubbleTransparency: 100, // Default to 100% opacity
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
        stream: false // Default to false (closed)
    }
  });

  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        usageLimit: 1,
        isRateLimited: false,
        lastUsed: 0,
        model: DEFAULT_MODEL
      }));
    }
    setApiKeys(initialKeys);
    
    // 2. Load Settings
    const storedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    let loadedSettings = settings;

    if (storedSettings) {
      loadedSettings = { ...settings, ...JSON.parse(storedSettings) };
      // Ensure lockoutDurationSeconds is set, even if loaded from older schema
      if (loadedSettings.security && loadedSettings.security.lockoutDurationSeconds === undefined) {
          loadedSettings.security.lockoutDurationSeconds = 86400; // Default to 24 hours
      }
      // Ensure stream setting exists if loading from older schema
      if (loadedSettings.generation && loadedSettings.generation.stream === undefined) {
          loadedSettings.generation.stream = false;
      }
    } 
    setSettings(loadedSettings);
    
    // Init Service
    setGeminiService(new GeminiService(initialKeys));

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
       setGeminiService(new GeminiService(apiKeys));
    }
    localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(apiKeys));
  }, [apiKeys, geminiService]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink', 'theme-rainbow');
    root.classList.add(`theme-${settings.theme}`);
    if (['dark', 'twilight'].includes(settings.theme)) root.classList.add('dark');
  }, [settings]);

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
  const triggerBotResponse = async (history: Message[], promptText: string) => {
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
    setMessages([...history, botMessage]);

    try {
      const combinedSystemInstruction = settings.systemPrompts.filter(p => p.isActive).map(p => p.content).join('\n\n');

      const { text: fullText, usedKeyIndex, provider, usedModel } = await geminiService.streamChatResponse(
        '', // Global model ignored, uses key config
        history, 
        promptText,
        combinedSystemInstruction,
        settings.generation,
        (chunkText) => {
           setMessages(prev => prev.map(msg => msg.id === tempBotId ? { ...msg, text: chunkText } : msg));
        },
        controller.signal
      );
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempBotId ? { 
              ...msg, 
              text: fullText, 
              keyIndex: usedKeyIndex, 
              provider: provider,
              model: usedModel 
          } : msg
        )
      );
    } catch (error: any) {
      if (error.message !== "Aborted by user") {
          console.error(error);
          const errorMessage: Message = {
            id: uuidv4(),
            role: Role.MODEL,
            text: `Error: ${error.message || 'Something went wrong.'}`,
            timestamp: Date.now(),
            isError: true
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
    if (!input.trim() || isLoading || !geminiService) return;
    if (apiKeys.filter(k => k.isActive).length === 0) {
      setIsSettingsOpen(true);
      return;
    }
    const newMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: input.trim(),
      timestamp: Date.now()
    };
    const newHistory = [...messages, newMessage];
    setMessages(newHistory);
    setInput('');
    await triggerBotResponse(newHistory, newMessage.text);
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
       const newHistory = messages.slice(0, index + 1);
       setMessages(newHistory);
       await triggerBotResponse(newHistory, targetMsg.text);
    } else {
      let userMsgIndex = index - 1;
      while (userMsgIndex >= 0 && messages[userMsgIndex].role !== Role.USER) {
        userMsgIndex--;
      }
      if (userMsgIndex === -1) {
        handleDeleteMessage(id);
        return;
      }
      const newHistory = messages.slice(0, userMsgIndex + 1);
      setMessages(newHistory);
      await triggerBotResponse(newHistory, messages[userMsgIndex].text);
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

  const handleLoadSession = (loadedMessages: any[]) => {
      handleStopGeneration();
      setMessages(loadedMessages);
      setInput('');
  };

  const handleSummarize = async () => {
    if (messages.length === 0 || !geminiService) return;
    setIsSummarizing(true); 
    try {
        const historyText = messages.map(m => `${m.role === Role.USER ? 'User' : 'Model'}: ${m.text}`).join('\n');
        const prompt = t('msg.summarize_prompt', settings.language) + '\n\n' + historyText;
        // Pass empty history to treat prompt as independent context
        const { text } = await geminiService.streamChatResponse('', [], prompt, undefined, settings.generation);
        const newTitle = text.trim().replace(/['"]/g, '').replace(/\.$/, '').replace(/\*\*/g, ''); 
        if (newTitle) setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle } : s));
    } catch (error) {
        alert(t('msg.summarize_error', settings.language));
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleRenameSession = () => {
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const currentTitle = currentSession?.title || t('app.title', settings.language);
    const newTitle = prompt(t('msg.rename_chat', settings.language), currentTitle); 
    if (newTitle && newTitle.trim()) {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle.trim() } : s));
    }
  };

  const activeKeysCount = apiKeys.filter(k => k.isActive).length;
  const currentSessionTitle = sessions.find(s => s.id === activeSessionId)?.title || t('app.title', settings.language);

  if (isLocked) return <div className={`${settings.theme === 'dark' || settings.theme === 'twilight' ? 'dark' : ''}`}><SecurityLock config={settings.security} onUnlock={handleUnlock} lang={settings.language} /></div>;

  return (
    <div className={`flex h-screen font-sans ${settings.theme === 'dark' || settings.theme === 'twilight' ? 'dark' : ''}`}>
      <div className="flex w-full h-full bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Sidebar 
            sessions={sessions}
            activeSessionId={activeSessionId}
            activeKeysCount={activeKeysCount}
            language={settings.language}
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
             onOpenSettings={() => setIsSettingsOpen(true)}
             onSaveChat={handleSaveChat}
             onLoadSession={handleLoadSession}
          />

          <div className="flex-1 overflow-y-auto scroll-smooth p-2 md:p-4">
            <div className="max-w-5xl mx-auto h-full">
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
              />
            </div>
          </div>

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
          />
        </main>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKeys={apiKeys} onUpdateKeys={setApiKeys} settings={settings} onUpdateSettings={setSettings} geminiService={geminiService} />
      </div>
    </div>
  );
};

export default App;