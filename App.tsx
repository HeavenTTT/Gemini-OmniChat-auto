
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Plus, Loader2, Download, Upload, MessageSquare, Trash2, X, Menu, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from './services/geminiService';
import { Message, Role, GeminiModel, AppSettings, KeyConfig, SystemPrompt, Theme, Language, ChatSession } from './types';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import SecurityLock from './components/SecurityLock';
import { t } from './utils/i18n';
import { KirbyIcon } from './components/Kirby';

// --- Default Configuration ---
const DEFAULT_MODEL = GeminiModel.FLASH;
const STORAGE_KEYS_KEY = 'gemini_omnichat_keys_v3'; 
const STORAGE_SETTINGS_KEY = 'gemini_omnichat_settings_v4'; 
const STORAGE_SESSIONS_KEY = 'gemini_omnichat_sessions_v1';
const STORAGE_ACTIVE_SESSION_KEY = 'gemini_omnichat_active_session_v1';

const ENV_KEY = process.env.API_KEY || '';

const App: React.FC = () => {
  // --- State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  
  // Displayed messages are derived from the active session, 
  // but we keep a local state for immediate UI responsiveness and sync back.
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Settings & Keys
  const [apiKeys, setApiKeys] = useState<KeyConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    model: DEFAULT_MODEL,
    systemPrompts: [],
    theme: 'dark',
    language: 'en',
    security: {
        enabled: false,
        questions: [],
        lastLogin: Date.now()
    },
    generation: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        stream: true
    }
  });

  // Service Instance
  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);

  // File Input Ref for loading chat
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    // 1. Load Keys
    const storedKeys = localStorage.getItem(STORAGE_KEYS_KEY);
    const oldStoredKeys = localStorage.getItem('gemini_omnichat_keys_v2');
    let initialKeys: KeyConfig[] = [];

    if (storedKeys) {
      initialKeys = JSON.parse(storedKeys);
    } else if (oldStoredKeys) {
      initialKeys = JSON.parse(oldStoredKeys);
    } else if (ENV_KEY) {
      initialKeys = ENV_KEY.split(',').map(k => k.trim()).filter(Boolean).map(k => ({
        id: uuidv4(),
        key: k,
        isActive: true,
        usageLimit: 1,
        isRateLimited: false,
        lastUsed: 0
      }));
    }
    setApiKeys(initialKeys);
    setGeminiService(new GeminiService(initialKeys));

    // 2. Load Settings & Security Check
    const storedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    const oldStoredSettings = localStorage.getItem('gemini_omnichat_settings_v3');
    
    let loadedSettings = settings;

    if (storedSettings) {
      loadedSettings = { ...settings, ...JSON.parse(storedSettings) };
      // Ensure deeper objects exist if migrating from older versions
      if (!loadedSettings.security) loadedSettings.security = settings.security;
      if (!loadedSettings.generation) loadedSettings.generation = settings.generation;
    } else if (oldStoredSettings) {
      const old = JSON.parse(oldStoredSettings);
      loadedSettings = {
        ...settings,
        model: old.model || DEFAULT_MODEL,
        systemPrompts: old.systemPrompts || [],
        theme: old.theme || 'dark',
        language: old.language || 'en'
      };
    }
    setSettings(loadedSettings);

    // Check Lock
    if (loadedSettings.security.enabled) {
        const now = Date.now();
        const lastLogin = loadedSettings.security.lastLogin || 0;
        // 24 hours = 86400000 ms
        if (now - lastLogin > 86400000) {
            setIsLocked(true);
        } else {
             // Update last login if valid session
             const newSettings = { 
                 ...loadedSettings, 
                 security: { ...loadedSettings.security, lastLogin: now } 
             };
             setSettings(newSettings);
        }
    }


    // 3. Load Sessions (History)
    const storedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
    const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
    
    if (storedSessions) {
      const parsedSessions = JSON.parse(storedSessions) as ChatSession[];
      if (parsedSessions.length > 0) {
        setSessions(parsedSessions);
        // Determine active session
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

  // Helper to create initial session
  const createNewSession = () => {
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setSessions([newSession]);
    setActiveSessionId(newId);
    setMessages([]);
  };

  // Sync Keys to LocalStorage
  useEffect(() => {
    if (geminiService) {
      geminiService.updateKeys(apiKeys);
    } else {
       setGeminiService(new GeminiService(apiKeys));
    }
    localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(apiKeys));
  }, [apiKeys, geminiService]);

  // Sync Settings to LocalStorage & Apply Theme
  useEffect(() => {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    
    const root = document.documentElement;
    // Remove all previous theme classes
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink');
    
    // Add specific theme class
    root.classList.add(`theme-${settings.theme}`);

    // If it's a dark-based theme, add 'dark' for Tailwind utilities
    if (['dark', 'twilight'].includes(settings.theme)) {
      root.classList.add('dark');
    }
  }, [settings]);

  // Sync Active Session Messages to Sessions State
  useEffect(() => {
    if (!activeSessionId) return;

    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prevSessions;
      
      const currentSession = prevSessions[sessionIndex];
      // Generate title from first user message if title is still default
      let newTitle = currentSession.title;
      if (messages.length > 0) {
         const firstUserMsg = messages.find(m => m.role === Role.USER);
         if (firstUserMsg) {
             if (currentSession.title === 'New Chat') {
                 newTitle = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
             }
         }
      }

      const updatedSession = { 
          ...currentSession, 
          messages: messages,
          title: newTitle 
      };

      const newSessions = [...prevSessions];
      newSessions[sessionIndex] = updatedSession;
      return newSessions;
    });
  }, [messages, activeSessionId]);

  // Persist Sessions to LocalStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Persist Active Session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);


  // --- Logic Helpers ---

  const triggerBotResponse = async (history: Message[], promptText: string) => {
    if (!geminiService) return;
    setIsLoading(true);
    const tempBotId = uuidv4();
    
    const botMessage: Message = {
      id: tempBotId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now()
    };
    setMessages([...history, botMessage]);

    try {
      const combinedSystemInstruction = settings.systemPrompts
        .filter(p => p.isActive)
        .map(p => p.content)
        .join('\n\n');

      const { text: fullText, usedKeyIndex } = await geminiService.streamChatResponse(
        settings.model,
        history, 
        promptText,
        combinedSystemInstruction,
        settings.generation,
        (chunkText) => {
           setMessages(prev => 
            prev.map(msg => 
              msg.id === tempBotId ? { ...msg, text: chunkText } : msg
            )
          );
        }
      );
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempBotId ? { ...msg, text: fullText, keyIndex: usedKeyIndex } : msg
        )
      );

    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: Role.MODEL,
        text: `Error: ${error.message || 'Something went wrong.'}`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => prev.filter(m => m.id !== tempBotId).concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = () => {
      setIsLocked(false);
      const newSettings = {
          ...settings,
          security: { ...settings.security, lastLogin: Date.now() }
      };
      setSettings(newSettings);
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
  };


  // --- Handlers ---

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
    } 
    else {
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
    const newId = uuidv4();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
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
    if (sessionId === activeSessionId) {
        setIsMobileMenuOpen(false);
        return;
    }
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
       if (newSessions.length > 0) {
         setActiveSessionId(newSessions[0].id);
         setMessages(newSessions[0].messages);
       } else {
         createNewSession();
       }
    }
  };

  const handleSaveChat = () => {
    const chatData = {
      title: sessions.find(s => s.id === activeSessionId)?.title || "Gemini OmniChat Session",
      date: new Date().toISOString(),
      messages: messages
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnichat_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadChatTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
          setInput('');
        } else {
          alert("Invalid chat file format.");
        }
      } catch (err) {
        console.error(err);
        alert(t('error.load_file', settings.language));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const activeKeysCount = apiKeys.filter(k => k.isActive).length;
  const activePromptsCount = settings.systemPrompts.filter(p => p.isActive).length;

  if (isLocked) {
      return (
          <div className={`${settings.theme === 'dark' || settings.theme === 'twilight' ? 'dark' : ''}`}>
             <SecurityLock config={settings.security} onUnlock={handleUnlock} lang={settings.language} />
          </div>
      );
  }

  return (
    <div className={`flex h-screen font-sans ${settings.theme === 'dark' || settings.theme === 'twilight' ? 'dark' : ''}`}>
      <div className="flex w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:border-gray-800 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-72 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-r border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 overflow-hidden rounded-full">
              <KirbyIcon />
            </div>
            <span className="font-bold text-xl tracking-tight dark:text-white">{t('app.title', settings.language)}</span>
          </div>

          <button 
            onClick={handleNewChat}
            className="flex items-center gap-2 w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-lg transition-all border border-gray-200 dark:border-gray-700 mb-6 group shadow-sm"
          >
            <Plus className="w-5 h-5 text-blue-500 group-hover:text-blue-400" />
            <span className="font-medium">{t('action.new_chat', settings.language)}</span>
          </button>

          {/* History List */}
          <div className="flex-1 overflow-y-auto -mx-2 px-2 mb-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
              {t('status.history', settings.language)}
            </div>
            <div className="space-y-1">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`
                    group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-sm
                    ${activeSessionId === session.id 
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                    <span className="truncate">{session.title || 'New Chat'}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded transition-all"
                    title={t('action.delete', settings.language)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                 <div className="text-xs text-gray-400 px-2 italic">{t('status.no_history', settings.language)}</div>
              )}
            </div>
          </div>

          {/* Status Section */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
              {t('status.title', settings.language)}
            </div>
            <div className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>{t('status.active_keys', settings.language)}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeKeysCount > 0 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                {activeKeysCount} / {apiKeys.length}
              </span>
            </div>
            <div className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-1 mt-1">
              <span>{t('status.current_model', settings.language)}</span>
              <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono truncate" title={settings.model}>
                {settings.model}
              </span>
            </div>
            
            <div className="flex gap-2 px-1 mt-4">
              <button onClick={handleSaveChat} className="flex-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs py-2 rounded flex items-center justify-center gap-1 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm" title={t('action.download_json', settings.language)}>
                  <Download className="w-3 h-3" /> {t('action.save', settings.language)}
              </button>
              <button onClick={handleLoadChatTrigger} className="flex-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs py-2 rounded flex items-center justify-center gap-1 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm" title={t('action.load_json', settings.language)}>
                  <Upload className="w-3 h-3" /> {t('action.load', settings.language)}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 px-2 py-3 mt-3 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              <Settings className="w-4 h-4" />
              <span>{t('action.settings', settings.language)}</span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-out Menu (Drawer) */}
        {isMobileMenuOpen && (
           <div className="fixed inset-0 z-50 flex md:hidden">
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              
              {/* Drawer Content */}
              <div className="relative w-[80%] max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col p-4 animate-slide-in-left">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5"/> {t('status.history', settings.language)}
                    </span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                        <X className="w-6 h-6"/>
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleNewChat}
                    className="flex items-center gap-2 w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-lg transition-all border border-blue-200 dark:border-blue-800 mb-6"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">{t('action.new_chat', settings.language)}</span>
                  </button>

                  <div className="flex-1 overflow-y-auto -mx-2 px-2">
                    <div className="space-y-1">
                    {sessions.map(session => (
                        <div 
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`
                            flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm
                            ${activeSessionId === session.id 
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium border-l-4 border-blue-500' 
                            : 'text-gray-600 dark:text-gray-400 border-l-4 border-transparent'
                            }
                        `}
                        >
                        <span className="truncate flex-1">{session.title || 'New Chat'}</span>
                        <button 
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                    ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                     <button 
                        onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                     >
                        <Settings className="w-5 h-5" />
                        {t('action.settings', settings.language)}
                     </button>
                  </div>
              </div>
           </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative h-full min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 text-gray-700 dark:text-gray-200">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-bold text-lg dark:text-white flex items-center gap-2">
                    <div className="w-6 h-6"><KirbyIcon/></div>
                    {t('app.title', settings.language)}
                </span>
            </div>
            <div className="flex gap-1">
                <button onClick={handleNewChat} className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
                  <Plus className="w-5 h-5" />
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
                  <Settings className="w-5 h-5" />
                </button>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto scroll-smooth p-2 md:p-4">
            <div className="max-w-5xl mx-auto h-full">
              <ChatInterface 
                messages={messages} 
                isLoading={isLoading} 
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onRegenerate={handleRegenerate}
                language={settings.language}
              />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-transparent">
            <div className="max-w-5xl mx-auto">
              <div className="relative flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={activeKeysCount === 0 ? t('input.no_keys', settings.language) : t('input.placeholder', settings.language)}
                  disabled={activeKeysCount === 0}
                  className="w-full bg-transparent text-gray-900 dark:text-white p-3 md:p-4 pr-12 max-h-48 min-h-[52px] resize-none outline-none scrollbar-hide text-base"
                  rows={1}
                  style={{ height: 'auto', minHeight: '52px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
                  }}
                />
                <div className="absolute right-2 bottom-2">
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading || activeKeysCount === 0}
                    className={`
                      p-2 rounded-xl flex items-center justify-center transition-all
                      ${input.trim() && !isLoading && activeKeysCount > 0 
                        ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-500' 
                        : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'}
                    `}
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="text-center mt-2 flex justify-center gap-4 md:hidden">
                <button onClick={handleSaveChat} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><Download className="w-3 h-3"/> {t('action.save', settings.language)}</button>
                <button onClick={handleLoadChatTrigger} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><Upload className="w-3 h-3"/> {t('action.load', settings.language)}</button>
              </div>
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
        />
      </div>
    </div>
  );
};

export default App;
