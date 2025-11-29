
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Key, Save, Eye, EyeOff, RotateCw, RefreshCw, CheckCircle, AlertCircle, Edit2, ChevronUp, ChevronDown, Download, Upload, Shield, Sliders, ExternalLink, Globe, Zap, Network, Server, Link, Settings, Activity, Power } from 'lucide-react';
import { GeminiModel, AppSettings, KeyConfig, SystemPrompt, Language, Theme, TextWrappingMode, ModelProvider, SecurityConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from '../services/geminiService';
import { t } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: KeyConfig[];
  onUpdateKeys: (keys: KeyConfig[]) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  geminiService: GeminiService | null;
}

/**
 * CollapsibleSection Component
 * Renders a collapsible section with a title and content.
 */
const CollapsibleSection = ({ 
  title, 
  children, 
  defaultOpen = false, 
  rightElement = null,
  count = null
}: { 
  title: string, 
  children?: React.ReactNode, 
  defaultOpen?: boolean, 
  rightElement?: React.ReactNode,
  count?: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 overflow-hidden mb-4 shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-600">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">
                {title}
            </h3>
            {count && <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-mono">{count}</span>}
        </div>
        <div className="flex items-center gap-3">
             {rightElement && <div onClick={e => e.stopPropagation()}>{rightElement}</div>}
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in-up">
            {children}
        </div>
      )}
    </div>
  );
};

/**
 * SettingsModal Component
 * Manages application settings including API keys, model parameters, and security.
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onUpdateKeys,
  settings,
  onUpdateSettings,
  geminiService
}) => {
  const [localKeys, setLocalKeys] = useState<KeyConfig[]>([]);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'model' | 'security'>('general');
  const lang = localSettings.language;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For System Prompts content editing
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptContent, setEditingPromptContent] = useState('');

  // For Security Config editing
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [tempSecurityConfig, setTempSecurityConfig] = useState<SecurityConfig | null>(null);

  // Initialize local state
  useEffect(() => {
    if (isOpen) {
      setLocalKeys(JSON.parse(JSON.stringify(apiKeys))); 
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
      
      // Reset prompt editing state
      setEditingPromptId(null);
      setEditingPromptContent('');

      // Reset security editing state
      setIsEditingSecurity(false);
      setTempSecurityConfig(null);

      // Automatically open security edit if enabled but no configs
      if (settings.security.enabled && !settings.security.password && settings.security.questions.length === 0) {
        setIsEditingSecurity(true);
        setTempSecurityConfig(JSON.parse(JSON.stringify(settings.security)));
      }
    }
  }, [isOpen, apiKeys, settings]);

  // --- Theme Preview Logic ---
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    // Remove all possible theme classes
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink');
    
    // Add the currently selected local theme (Preview)
    root.classList.add(`theme-${localSettings.theme}`);
    if (['dark', 'twilight'].includes(localSettings.theme)) {
        root.classList.add('dark');
    }
  }, [localSettings.theme, isOpen]);

  const handleCloseOrCancel = () => {
    // Revert to original settings theme on cancel
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink');
    
    root.classList.add(`theme-${settings.theme}`);
    if (['dark', 'twilight'].includes(settings.theme)) {
        root.classList.add('dark');
    }
    onClose();
  };

  // --- Handlers for API Keys ---
  const handleAddKey = () => {
    setLocalKeys([
      ...localKeys, 
      {
        id: uuidv4(),
        key: '',
        provider: 'google',
        isActive: true,
        usageLimit: 1,
        isRateLimited: false,
        lastUsed: 0,
        model: localSettings.defaultModel || GeminiModel.FLASH,
        baseUrl: ''
      }
    ]);
  };

  const handleRemoveKey = (id: string) => {
    setLocalKeys(localKeys.filter(k => k.id !== id));
  };

  const handleUpdateKey = (id: string, updates: Partial<KeyConfig>) => {
    setLocalKeys(localKeys.map(k => k.id === id ? { ...k, ...updates } : k));
  };

  // --- Handlers for System Prompts ---
  const startEditingPromptContent = (prompt: SystemPrompt) => {
    setEditingPromptId(prompt.id);
    setEditingPromptContent(prompt.content);
  };

  const savePromptContent = (promptId: string) => {
    handleUpdatePrompt(promptId, { content: editingPromptContent });
    setEditingPromptId(null);
    setEditingPromptContent('');
  };

  const cancelPromptContentEdit = () => {
    setEditingPromptId(null);
    setEditingPromptContent('');
  };

  const handleAddPrompt = () => {
    const newId = uuidv4();
    const newPrompt: SystemPrompt = {
      id: newId,
      title: t('input.prompt_title_default', localSettings.language), // Localized default title
      content: '',
      isActive: true
    };
    const updatedPrompts = [...localSettings.systemPrompts, newPrompt];
    setLocalSettings({
      ...localSettings,
      systemPrompts: updatedPrompts
    });
    // Immediately start editing the content of the new prompt
    startEditingPromptContent(newPrompt);
  };

  const handleUpdatePrompt = (id: string, updates: Partial<SystemPrompt>) => {
    setLocalSettings({
      ...localSettings,
      systemPrompts: localSettings.systemPrompts.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    });
  };

  const handleRemovePrompt = (id: string) => {
    setLocalSettings({
      ...localSettings,
      systemPrompts: localSettings.systemPrompts.filter(p => p.id !== id)
    });
    if (editingPromptId === id) {
      setEditingPromptId(null);
      setEditingPromptContent('');
    }
  };

  // --- Handlers for Security Config ---
  const startEditingSecurity = () => {
    setIsEditingSecurity(true);
    setTempSecurityConfig(JSON.parse(JSON.stringify(localSettings.security))); // Save current state for cancel
  };

  const saveSecurityConfig = () => {
    setIsEditingSecurity(false);
    setTempSecurityConfig(null);
    // localSettings.security is already updated via onChange handlers
  };

  const cancelEditingSecurity = () => {
    if (tempSecurityConfig) {
      setLocalSettings(prev => ({ ...prev, security: tempSecurityConfig }));
    }
    setIsEditingSecurity(false);
    setTempSecurityConfig(null);
  };

  const handleAddSecurityQuestion = () => {
    if (newQuestion.q && newQuestion.a) {
        setLocalSettings(prev => ({
            ...prev,
            security: {
                ...prev.security,
                questions: [...prev.security.questions, { id: uuidv4(), question: newQuestion.q, answer: newQuestion.a }]
            }
        }));
        setNewQuestion({ q: '', a: '' });
    }
  };

  // --- Main Save ---
  const handleSave = () => {
    onUpdateKeys(localKeys);
    onUpdateSettings(localSettings);
    // Note: No need to revert theme here, as App.tsx will pick up the new settings
    onClose();
  };

  // --- Config Export/Import ---
  const handleExportSettings = () => {
    const data = {
      version: 3,
      type: 'omnichat_settings',
      timestamp: new Date().toISOString(),
      keys: localKeys,
      settings: localSettings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnichat_config_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.type === 'omnichat_settings') {
           if (parsed.keys && Array.isArray(parsed.keys)) setLocalKeys(parsed.keys);
           if (parsed.settings) setLocalSettings({ ...localSettings, ...parsed.settings });
           alert(t('success.import', lang));
        } else {
           alert("Invalid format.");
        }
      } catch (err) {
        console.error(err);
        alert(t('error.load_file', lang));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Security ---
  const [newQuestion, setNewQuestion] = useState({ q: '', a: '' });
  

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', icon: <Sliders className="w-4 h-4"/>, label: t('settings.title', lang) },
    { id: 'model', icon: <RotateCw className="w-4 h-4"/>, label: t('settings.ai_parameters', lang) },
    { id: 'security', icon: <Shield className="w-4 h-4"/>, label: t('settings.security', lang) }
  ];

  const hasPassword = !!localSettings.security.password;
  const hasQuestions = localSettings.security.questions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm md:p-4 p-0 animate-fade-in-up">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 md:rounded-2xl rounded-none w-full md:max-w-3xl h-full md:h-auto md:max-h-[90vh] shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between md:p-5 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-50/50 dark:bg-gray-900/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            {t('settings.title', lang)}
          </h2>
          <button onClick={handleCloseOrCancel} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 md:px-6 px-3 gap-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto md:p-6 px-4 py-3 scrollbar-hide bg-gray-50/30 dark:bg-black/20">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
                {/* Language & Theme */}
                <CollapsibleSection title={t('settings.general', lang)} defaultOpen={true}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('settings.language', lang)}</label>
                            <select 
                                value={localSettings.language}
                                onChange={(e) => setLocalSettings({...localSettings, language: e.target.value as Language})}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            >
                                <option value="en">English</option>
                                <option value="zh">中文</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('settings.theme', lang)}</label>
                            <select 
                                value={localSettings.theme}
                                onChange={(e) => setLocalSettings({...localSettings, theme: e.target.value as Theme})}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            >
                                <option value="light">{t('theme.light', lang)}</option>
                                <option value="dark">{t('theme.dark', lang)}</option>
                                <option value="twilight">{t('theme.twilight', lang)}</option>
                                <option value="sky">{t('theme.sky', lang)}</option>
                                <option value="pink">{t('theme.pink', lang)}</option>
                            </select>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Appearance */}
                <CollapsibleSection title={t('settings.appearance', lang)}>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('settings.font_size', lang)}</span>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{localSettings.fontSize}px</span>
                            </div>
                            <input 
                                type="range" min="12" max="24" step="1"
                                value={localSettings.fontSize}
                                onChange={(e) => setLocalSettings({...localSettings, fontSize: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                            />
                        </div>
                        
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('settings.bubble_transparency', lang)}</span>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{localSettings.bubbleTransparency}%)</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" step="5"
                                value={localSettings.bubbleTransparency}
                                onChange={(e) => setLocalSettings({...localSettings, bubbleTransparency: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.text_wrapping', lang)}</label>
                            <select 
                                value={localSettings.textWrapping}
                                onChange={(e) => setLocalSettings({...localSettings, textWrapping: e.target.value as TextWrappingMode})}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            >
                                <option value="default">{t('wrap.default', lang)}</option>
                                <option value="forced">{t('wrap.forced', lang)}</option>
                                <option value="auto">{t('wrap.auto', lang)}</option>
                            </select>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* API Keys Configuration */}
                <CollapsibleSection 
                    title={t('settings.api_keys_pool', lang)} 
                    defaultOpen={true}
                    rightElement={
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                {localKeys.filter(k => k.isActive).length} {t('status.active', lang)}
                            </span>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <a 
                                href="https://aistudio.google.com/app/apikey" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1 text-primary-600 hover:underline"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {t('action.get_api_key', lang)}
                            </a>
                        </div>

                        {localKeys.map((keyConfig) => (
                            <KeyConfigCard 
                                key={keyConfig.id} 
                                config={keyConfig} 
                                onUpdate={(updates) => handleUpdateKey(keyConfig.id, updates)}
                                onRemove={() => handleRemoveKey(keyConfig.id)}
                                lang={lang}
                                geminiService={geminiService}
                            />
                        ))}
                        
                        <button 
                            onClick={handleAddKey}
                            className="w-full py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-xl border border-dashed border-primary-300 dark:border-primary-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow"
                        >
                            <Plus className="w-5 h-5" />
                            {t('settings.add_key_placeholder', lang)}
                        </button>
                    </div>
                </CollapsibleSection>

                {/* Config Management */}
                <CollapsibleSection title={t('settings.manage', lang)}>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExportSettings} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-sm">
                            <Download className="w-4 h-4" />{t('action.export_settings', lang)}
                        </button>
                        <button onClick={handleImportTrigger} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-sm">
                            <Upload className="w-4 h-4" />{t('action.import_settings', lang)}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
                    </div>
                </CollapsibleSection>
            </div>
          )}

          {/* Model Params Tab */}
          {activeTab === 'model' && (
             <div className="space-y-4">
                 {/* Notice about per-key model settings */}
                 <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl text-sm text-primary-800 dark:text-primary-200 border border-primary-100 dark:border-primary-800/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{t('msg.model_url_moved', lang)}</p>
                 </div>

                <CollapsibleSection title={t('settings.ai_parameters', lang)} defaultOpen={true}>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('param.temperature', lang)}</span>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{localSettings.generation.temperature}</span>
                            </div>
                            <input 
                                type="range" min="0" max="2" step="0.1"
                                value={localSettings.generation.temperature}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, temperature: parseFloat(e.target.value)}})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                            />
                        </div>

                         <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('param.topP', lang)}</span>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{localSettings.generation.topP}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.05"
                                value={localSettings.generation.topP}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, topP: parseFloat(e.target.value)}})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                            />
                        </div>

                         <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('param.topK', lang)}</span>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{localSettings.generation.topK}</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" step="1"
                                value={localSettings.generation.topK}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, topK: parseInt(e.target.value)}})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('param.maxTokens', lang)}</span>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{localSettings.generation.maxOutputTokens}</span>
                            </div>
                            <input 
                                type="number" 
                                value={localSettings.generation.maxOutputTokens}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, maxOutputTokens: parseInt(e.target.value)}})}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* System Prompts */}
                <CollapsibleSection title={t('settings.system_instructions', lang)}>
                    <div className="space-y-4">
                    {localSettings.systemPrompts.map(prompt => (
                        <div key={prompt.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md">
                           <div className="flex justify-between items-center mb-3">
                               <input 
                                 className="bg-transparent font-semibold text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                 value={prompt.title} 
                                 onChange={e => handleUpdatePrompt(prompt.id, {title: e.target.value})}
                                 placeholder={t('input.prompt_title_placeholder', lang)}
                               />
                               <div className="flex gap-2">
                                   <button 
                                      onClick={() => handleUpdatePrompt(prompt.id, {isActive: !prompt.isActive})}
                                      className={`p-1.5 rounded-lg transition-colors ${prompt.isActive ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
                                      title={prompt.isActive ? t('action.deactivate', lang) : t('action.activate', lang)}
                                   >
                                       <CheckCircle className="w-4 h-4"/>
                                   </button>
                                   {editingPromptId !== prompt.id && (
                                    <button 
                                        onClick={() => startEditingPromptContent(prompt)}
                                        className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 transition-colors"
                                        title={t('action.edit', lang)}
                                    >
                                        <Edit2 className="w-4 h-4"/>
                                    </button>
                                   )}
                                   <button 
                                      onClick={() => handleRemovePrompt(prompt.id)}
                                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 transition-colors"
                                      title={t('action.delete', lang)}
                                   >
                                       <Trash2 className="w-4 h-4"/>
                                   </button>
                               </div>
                           </div>
                           {editingPromptId === prompt.id && ( // Only render textarea and buttons if editing
                               <>
                                <textarea 
                                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-3 text-xs resize-y min-h-[80px] md:h-auto outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all mt-2"
                                  rows={3}
                                  value={editingPromptContent}
                                  onChange={e => setEditingPromptContent(e.target.value)}
                                  placeholder={t('input.instruction_placeholder', lang)}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button 
                                        onClick={cancelPromptContentEdit} 
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
                                    >
                                        <X className="w-4 h-4 mr-1"/>{t('action.cancel', lang)}
                                    </button>
                                    <button 
                                        onClick={() => savePromptContent(prompt.id)} 
                                        className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                    >
                                        <Save className="w-4 h-4"/>{t('action.confirm', lang)}
                                    </button>
                                </div>
                               </>
                           )}
                        </div>
                    ))}
                    <button onClick={handleAddPrompt} className="w-full py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 border border-dashed border-primary-300 dark:border-primary-700 rounded-xl transition-colors">
                        {t('action.add_prompt', lang)}
                    </button>
                    </div>
                </CollapsibleSection>
             </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">{t('settings.security', lang)}</span>
                    <label htmlFor="security-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input 
                            id="security-toggle"
                            type="checkbox" 
                            className="sr-only peer"
                            checked={localSettings.security.enabled}
                            onChange={() => setLocalSettings({...localSettings, security: {...localSettings.security, enabled: !localSettings.security.enabled}})}
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  {localSettings.security.enabled && (
                      <CollapsibleSection
                        title={t('settings.security_details', lang)}
                        defaultOpen={isEditingSecurity} // Auto open if just enabled or no config
                        rightElement={
                            !isEditingSecurity ? (
                                <button 
                                    onClick={startEditingSecurity}
                                    className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 transition-colors"
                                    title={t('action.edit', lang)}
                                >
                                    <Edit2 className="w-4 h-4"/>
                                </button>
                            ) : null
                        }
                      >
                        {isEditingSecurity ? (
                            <div className="space-y-4 animate-fade-in-up">
                                <input 
                                    type="password"
                                    placeholder={t('input.password_placeholder', lang)}
                                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    value={localSettings.security.password || ''}
                                    onChange={e => setLocalSettings(prev => ({...prev, security: {...prev.security, password: e.target.value}}))}
                                />
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('settings.lockout_duration', lang)} ({t('label.seconds', lang)})
                                    </label>
                                    <input
                                        type="number"
                                        min="60" // sensible minimum, 1 minute
                                        step="60" // step in minutes (60 seconds)
                                        placeholder="86400" // 24 hours
                                        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                                        value={localSettings.security.lockoutDurationSeconds || ''}
                                        onChange={e => setLocalSettings(prev => ({...prev, security: {...prev.security, lockoutDurationSeconds: parseInt(e.target.value) || undefined}}))}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('settings.lockout_duration_desc', lang)}
                                    </p>
                                </div>

                                <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800/30">
                                    <h4 className="text-xs font-semibold text-primary-800 dark:text-primary-300 uppercase mb-3">{t('action.add_question', lang)}</h4>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input 
                                            className="flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none focus:border-primary-500"
                                            placeholder={t('input.question', lang)}
                                            value={newQuestion.q}
                                            onChange={e => setNewQuestion({...newQuestion, q: e.target.value})}
                                        />
                                        <input 
                                            className="flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none focus:border-primary-500"
                                            placeholder={t('input.answer', lang)}
                                            value={newQuestion.a}
                                            onChange={e => setNewQuestion({...newQuestion, a: e.target.value})}
                                        />
                                        <button onClick={handleAddSecurityQuestion} className="bg-primary-600 hover:bg-primary-500 text-white p-2.5 rounded-lg shadow-sm transition-colors whitespace-nowrap">
                                            <Plus className="w-5 h-5"/>
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {localSettings.security.questions.map((q, idx) => (
                                            <div key={q.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-300">{q.question}</span>
                                                <button onClick={() => {
                                                    const newQs = [...localSettings.security.questions];
                                                    newQs.splice(idx, 1);
                                                    setLocalSettings(prev => ({...prev, security: {...prev.security, questions: newQs}}));
                                                }} className="text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button 
                                        onClick={cancelEditingSecurity} 
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
                                    >
                                        <X className="w-4 h-4 mr-1"/>{t('action.cancel', lang)}
                                    </button>
                                    <button 
                                        onClick={saveSecurityConfig} 
                                        className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                    >
                                        <Save className="w-4 h-4"/>{t('action.confirm', lang)}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-600 dark:text-gray-400 text-sm">
                                <p className="mb-1">{t('msg.security_desc', lang)}</p>
                                <p className="font-semibold">{t('settings.status', lang)}: {hasPassword ? t('settings.password_set', lang) : t('settings.no_password', lang)} / {hasQuestions ? t('settings.questions_set', lang) : t('settings.no_questions', lang)}</p>
                                <p className="text-xs mt-1 text-gray-500">
                                    {t('settings.lockout_duration', lang)}: {localSettings.security.lockoutDurationSeconds} {t('label.seconds', lang)}
                                </p>
                            </div>
                        )}
                      </CollapsibleSection>
                  )}
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="md:p-5 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-2xl flex justify-end gap-3 flex-shrink-0">
          <button onClick={handleCloseOrCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm">
            {t('action.cancel', lang)}
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {t('action.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Key Config Card Component ---
const KeyConfigCard: React.FC<{
  config: KeyConfig;
  onUpdate: (updates: Partial<KeyConfig>) => void;
  onRemove: () => void;
  lang: Language;
  geminiService: GeminiService | null;
}> = ({ config, onUpdate, onRemove, lang, geminiService }) => {
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isEditingKey, setIsEditingKey] = useState(false);
    
    // Load cached models specific to this key (or generic cache)
    useEffect(() => {
        const cacheKey = `gemini_model_cache_${config.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setAvailableModels(JSON.parse(cached));
            } catch(e) { /* ignore */ }
        }
    }, [config.id]);

    const handleTest = async () => {
        if (!geminiService || !config.key) return;
        setIsTesting(true);
        setTestResult(null);
        // Test connection using the service
        const success = await geminiService.testConnection(config);
        setTestResult(success);
        setIsTesting(false);
        setTimeout(() => setTestResult(null), 3000);
    };

    const handleFetchModels = async () => {
        if (!geminiService || !config.key) return;
        setIsFetching(true);
        try {
            // Fetch models for the specific provider
            const models = await geminiService.listModels(config);
            if (models.length > 0) {
                setAvailableModels(models);
                localStorage.setItem(`gemini_model_cache_${config.id}`, JSON.stringify(models));
                // If it's a new key without a model, set the first one
                if (!config.model) onUpdate({ model: models[0] });
                // Small toast/alert
                alert(`${models.length} ${t('msg.fetch_success', lang)}`);
            } else {
                alert(t('msg.fetch_no_models', lang));
            }
        } catch (e) {
            alert(t('msg.fetch_error', lang));
        } finally {
            setIsFetching(false);
        }
    };

    const getMaskedKey = (key: string) => {
        if (!key || key.length < 8) return '********';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${config.isActive ? 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-60'}`}>
            <div className="flex flex-col gap-3">
                {/* Row 1: Provider & Delete Button */}
                <div className="flex justify-between items-center">
                    <div className="relative flex-1 mr-2">
                         <select
                            value={config.provider}
                            onChange={(e) => onUpdate({ provider: e.target.value as ModelProvider, baseUrl: e.target.value === 'openai' ? 'https://api.openai.com/v1' : '' })}
                            className="appearance-none w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs py-2 pl-3 pr-8 outline-none font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/20"
                        >
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI Compatible</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                    {/* Delete Button - Moved here */}
                    <button 
                        onClick={onRemove} 
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800 whitespace-nowrap"
                        title={t('action.delete_key', lang)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Row 2: API Key Input (Full width) */}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus-within:border-primary-400 dark:focus-within:border-primary-600 transition-colors cursor-text" onClick={() => setIsEditingKey(true)}>
                    <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {isEditingKey ? (
                            <input 
                            type="text" 
                            autoFocus
                            placeholder={t('input.apikey_placeholder', lang)}
                            className="flex-1 bg-transparent text-sm outline-none font-mono text-gray-800 dark:text-gray-200 min-w-0"
                            value={config.key}
                            onChange={(e) => onUpdate({ key: e.target.value })}
                            onBlur={() => setIsEditingKey(false)}
                        />
                    ) : (
                        <span className="flex-1 text-sm font-mono text-gray-500 dark:text-gray-400 truncate select-none">
                            {config.key ? getMaskedKey(config.key) : <span className="text-gray-400 italic opacity-50">{t('input.apikey_placeholder', lang)}</span>}
                        </span>
                    )}
                </div>

                {/* Row 3: Action Buttons (Activation, Poll, Test) */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Activation Toggle */}
                    <button 
                        onClick={() => onUpdate({ isActive: !config.isActive })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all flex-1 justify-center border whitespace-nowrap ${
                            config.isActive 
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                                : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        }`}
                        title={config.isActive ? t('action.deactivate', lang) : t('action.activate', lang)}
                    >
                        {config.isActive ? <Power className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5 opacity-50" />}
                        {config.isActive ? t('status.active', lang) : t('status.inactive', lang)}
                    </button>

                     {/* Polling Count */}
                     <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700" title={t('settings.poll_count', lang)}>
                        <Activity className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{t('label.poll_count', lang)}:</span>
                        <input 
                            type="number" min="1" max="100"
                            value={config.usageLimit}
                            onChange={(e) => onUpdate({ usageLimit: parseInt(e.target.value) || 1 })}
                            className="w-8 bg-transparent text-xs text-center outline-none font-mono text-gray-800 dark:text-gray-200"
                        />
                    </div>
                    
                    {/* Test Button */}
                     <button 
                        onClick={handleTest}
                        disabled={isTesting || !config.key}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm border flex-1 justify-center whitespace-nowrap ${
                            testResult === true ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400' :
                            testResult === false ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
                            'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={t('action.test_key', lang)}
                    >
                        {isTesting ? <RotateCw className="w-3 h-3 animate-spin"/> : <Network className="w-3 h-3"/>}
                        {testResult === true ? t('action.ok', lang) : testResult === false ? t('action.error', lang) : t('action.test', lang)}
                    </button>
                </div>

                {/* Row 4: Base URL (Conditional) */}
                {config.provider === 'openai' && (
                    <div className="flex items-center gap-2 group">
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                            <Server className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder={t('input.base_url_placeholder', lang)}
                            className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 text-xs py-1.5 outline-none font-mono text-gray-600 dark:text-gray-400 focus:border-primary-500 transition-colors"
                            value={config.baseUrl || ''}
                            onChange={(e) => onUpdate({ baseUrl: e.target.value })}
                        />
                    </div>
                )}

                {/* Row 5: Model Selector */}
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('label.model', lang)}</span>
                        <input 
                           type="text"
                           list={`models-${config.id}`}
                           className="flex-1 bg-transparent text-xs outline-none font-medium text-gray-700 dark:text-gray-200 min-w-0"
                           placeholder={t('input.model_placeholder', lang)}
                           value={config.model || ''}
                           onChange={(e) => onUpdate({ model: e.target.value })}
                        />
                        <datalist id={`models-${config.id}`}>
                            {availableModels.map(m => <option key={m} value={m} />)}
                        </datalist>
                    </div>
                    
                     <button 
                        onClick={handleFetchModels}
                        disabled={isFetching || !config.key}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title={t('action.fetch_models', lang)}
                    >
                       <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                       <span className="hidden sm:inline">{t('action.fetch', lang)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
