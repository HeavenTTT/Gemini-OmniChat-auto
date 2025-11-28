
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Key, Save, Eye, EyeOff, RotateCw, RefreshCw, CheckCircle, AlertCircle, Edit2, ChevronUp, Download, Upload, Shield, Sliders } from 'lucide-react';
import { GeminiModel, AppSettings, KeyConfig, SystemPrompt, Language, Theme, TextWrappingMode } from '../types';
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
  
  // Model fetching state
  const [availableModels, setAvailableModels] = useState<string[]>([
    GeminiModel.FLASH,
    GeminiModel.PRO,
    GeminiModel.FLASH_THINKING,
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // New key inputs
  const [newKeyInput, setNewKeyInput] = useState('');

  // Prompt editing
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // Security editing
  const [newQuestion, setNewQuestion] = useState({ q: '', a: '' });

  useEffect(() => {
    if (isOpen) {
      setLocalKeys(JSON.parse(JSON.stringify(apiKeys))); // Deep copy
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
      
      // Merge saved models with default models and current setting model
      const saved = settings.savedModels || [];
      const combined = Array.from(new Set([...availableModels, ...saved, settings.model]));
      setAvailableModels(combined.sort());
    }
  }, [isOpen, apiKeys, settings]);

  const handleAddKey = () => {
    if (newKeyInput.trim()) {
      const isDuplicate = localKeys.some(k => k.key === newKeyInput.trim());
      if (!isDuplicate) {
        setLocalKeys([
          ...localKeys, 
          {
            id: uuidv4(),
            key: newKeyInput.trim(),
            isActive: true,
            usageLimit: 1,
            isRateLimited: false,
            lastUsed: 0
          }
        ]);
        setNewKeyInput('');
      }
    }
  };

  const handleRemoveKey = (id: string) => {
    setLocalKeys(localKeys.filter(k => k.id !== id));
  };

  const handleUpdateKey = (id: string, updates: Partial<KeyConfig>) => {
    setLocalKeys(localKeys.map(k => k.id === id ? { ...k, ...updates } : k));
  };

  const handleFetchModels = async () => {
    if (!geminiService) return;
    
    const activeKey = localKeys.find(k => k.isActive)?.key || localKeys[0]?.key;
    if (!activeKey) {
      setFetchError(t('input.no_keys', lang));
      return;
    }

    setIsFetchingModels(true);
    setFetchError(null);

    try {
      const models = await geminiService.listModels(activeKey);
      if (models.length > 0) {
        // Save fetched models to settings
        setLocalSettings(prev => ({ ...prev, savedModels: models }));
        
        const merged = Array.from(new Set([...availableModels, ...models]));
        setAvailableModels(merged.sort());
        alert(`${models.length} ${t('msg.fetch_success', lang)}`);
      } else {
        alert(t('msg.fetch_no_models', lang));
      }
    } catch (err: any) {
      console.error(err);
      setFetchError("Failed.");
      alert(t('msg.fetch_error', lang));
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleAddPrompt = () => {
    const newId = uuidv4();
    const newPrompt: SystemPrompt = {
      id: newId,
      title: 'New Prompt',
      content: '',
      isActive: true
    };
    setLocalSettings({
      ...localSettings,
      systemPrompts: [...localSettings.systemPrompts, newPrompt]
    });
    setEditingPromptId(newId);
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
    if (editingPromptId === id) setEditingPromptId(null);
  };

  const handleSave = () => {
    onUpdateKeys(localKeys);
    onUpdateSettings(localSettings);
    onClose();
  };

  const handleExportSettings = () => {
    const data = {
      version: 2,
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
           if (parsed.keys && Array.isArray(parsed.keys)) {
             setLocalKeys(parsed.keys);
           }
           if (parsed.settings) {
             setLocalSettings({
               ...localSettings,
               ...parsed.settings,
               security: { ...localSettings.security, ...(parsed.settings.security || {}) },
               generation: { ...localSettings.generation, ...(parsed.settings.generation || {}) }
             });
           }
           alert(t('success.import', lang));
        } else {
           alert("Invalid settings file format.");
        }
      } catch (err) {
        console.error(err);
        alert(t('error.load_file', lang));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleAddSecurityQuestion = () => {
    if (newQuestion.q && newQuestion.a) {
        setLocalSettings({
            ...localSettings,
            security: {
                ...localSettings.security,
                questions: [...localSettings.security.questions, { id: uuidv4(), question: newQuestion.q, answer: newQuestion.a }]
            }
        });
        setNewQuestion({ q: '', a: '' });
    }
  };

  const activePromptCount = localSettings.systemPrompts.filter(p => p.isActive).length;
  const mergedPreview = localSettings.systemPrompts
    .filter(p => p.isActive)
    .map(p => p.content)
    .join('\n\n');

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', icon: <Sliders className="w-4 h-4"/>, label: t('settings.title', lang) },
    { id: 'model', icon: <RotateCw className="w-4 h-4"/>, label: t('settings.model_settings', lang) },
    { id: 'security', icon: <Shield className="w-4 h-4"/>, label: t('settings.security', lang) }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            {t('settings.title', lang)}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
                {/* Language & Theme */}
                <section className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.language', lang)}</label>
                        <select 
                            value={localSettings.language}
                            onChange={(e) => setLocalSettings({...localSettings, language: e.target.value as Language})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="zh">中文</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.theme', lang)}</label>
                        <select 
                            value={localSettings.theme}
                            onChange={(e) => setLocalSettings({...localSettings, theme: e.target.value as Theme})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="light">{t('theme.light', lang)}</option>
                            <option value="dark">{t('theme.dark', lang)}</option>
                            <option value="twilight">{t('theme.twilight', lang)}</option>
                            <option value="sky">{t('theme.sky', lang)}</option>
                            <option value="pink">{t('theme.pink', lang)}</option>
                        </select>
                    </div>
                </section>

                {/* Appearance Settings */}
                <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.appearance', lang)}</h3>
                    
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-300">{t('settings.font_size', lang)}</span>
                            <span className="text-blue-500">{localSettings.fontSize}px</span>
                        </div>
                        <input 
                            type="range" min="12" max="24" step="1"
                            value={localSettings.fontSize}
                            onChange={(e) => setLocalSettings({...localSettings, fontSize: parseInt(e.target.value)})}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.text_wrapping', lang)}</label>
                        <select 
                            value={localSettings.textWrapping}
                            onChange={(e) => setLocalSettings({...localSettings, textWrapping: e.target.value as TextWrappingMode})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="default">{t('wrap.default', lang)}</option>
                            <option value="forced">{t('wrap.forced', lang)}</option>
                            <option value="auto">{t('wrap.auto', lang)}</option>
                        </select>
                    </div>
                </section>

                {/* API Keys */}
                <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.api_keys_pool', lang)}</h3>
                    <div className="text-xs text-gray-500">
                        {localKeys.filter(k => k.isActive).length} {t('status.active', lang)} / {localKeys.length} Total
                    </div>
                    </div>

                    <div className="space-y-3">
                    {localKeys.map((keyConfig) => (
                        <KeyRow 
                        key={keyConfig.id} 
                        config={keyConfig} 
                        onUpdate={(updates) => handleUpdateKey(keyConfig.id, updates)}
                        onRemove={() => handleRemoveKey(keyConfig.id)}
                        lang={lang}
                        />
                    ))}
                    
                    {localKeys.length === 0 && (
                        <div className="text-center p-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/20 text-gray-500 text-sm">
                        {t('input.no_keys', lang)}
                        </div>
                    )}
                    </div>

                    <div className="flex gap-2 pt-2">
                    <input 
                        type="text" 
                        placeholder={t('settings.add_key_placeholder', lang)}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                        value={newKeyInput}
                        onChange={(e) => setNewKeyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                    />
                    <button 
                        onClick={handleAddKey}
                        disabled={!newKeyInput.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white p-2.5 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    </div>
                    <p className="text-xs text-gray-500">
                    {t('msg.keys_rotated', lang)}
                    </p>
                </section>

                {/* Manage Config File */}
                <section className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.manage', lang)}</h3>
                    <div className="flex gap-3">
                    <button 
                        onClick={handleExportSettings}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        <Download className="w-4 h-4" />
                        {t('action.export_settings', lang)}
                    </button>
                    <button 
                        onClick={handleImportTrigger}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        <Upload className="w-4 h-4" />
                        {t('action.import_settings', lang)}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportFile} 
                        accept=".json" 
                        className="hidden" 
                    />
                    </div>
                </section>
            </>
          )}

          {/* Model Tab */}
          {activeTab === 'model' && (
             <div className="space-y-8">
                 {/* Model Selection */}
                 <section className="space-y-4">
                    <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.model_settings', lang)}</h3>
                    <button 
                        onClick={handleFetchModels}
                        disabled={isFetchingModels}
                        className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                    >
                        {isFetchingModels ? <RotateCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {t('settings.fetch', lang)}
                    </button>
                    </div>
                    
                    <div>
                        <div className="flex justify-between mb-1">
                        <label className="block text-sm text-gray-600 dark:text-gray-300">{t('settings.model_name', lang)}</label>
                        {fetchError && <span className="text-xs text-red-500">{fetchError}</span>}
                        </div>
                        <input
                            list="model-options"
                            type="text"
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={localSettings.model}
                            onChange={(e) => setLocalSettings({...localSettings, model: e.target.value})}
                            placeholder={t('input.model_placeholder', lang)}
                        />
                        <datalist id="model-options">
                            {availableModels.map(m => (
                            <option key={m} value={m} />
                            ))}
                        </datalist>
                    </div>
                </section>

                {/* AI Parameters */}
                <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.ai_parameters', lang)}</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-300">{t('param.temperature', lang)}</span>
                                <span className="text-blue-500">{localSettings.generation.temperature}</span>
                            </div>
                            <input 
                                type="range" min="0" max="2" step="0.1"
                                value={localSettings.generation.temperature}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, temperature: parseFloat(e.target.value)}})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                            />
                        </div>

                         <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-300">{t('param.topP', lang)}</span>
                                <span className="text-blue-500">{localSettings.generation.topP}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.05"
                                value={localSettings.generation.topP}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, topP: parseFloat(e.target.value)}})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                            />
                        </div>

                         <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-300">{t('param.topK', lang)}</span>
                                <span className="text-blue-500">{localSettings.generation.topK}</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" step="1"
                                value={localSettings.generation.topK}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, topK: parseInt(e.target.value)}})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-300">{t('param.maxTokens', lang)}</span>
                                <span className="text-blue-500">{localSettings.generation.maxOutputTokens}</span>
                            </div>
                            <input 
                                type="number" 
                                value={localSettings.generation.maxOutputTokens}
                                onChange={(e) => setLocalSettings({...localSettings, generation: {...localSettings.generation, maxOutputTokens: parseInt(e.target.value)}})}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{t('param.stream', lang)}</span>
                            <button 
                                onClick={() => setLocalSettings({...localSettings, generation: {...localSettings.generation, stream: !localSettings.generation.stream}})}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${localSettings.generation.stream ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${localSettings.generation.stream ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* System Instructions */}
                <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.system_instructions', lang)}</h3>
                    <div className="text-xs text-gray-500">{activePromptCount} {t('status.active', lang)}</div>
                    </div>

                    <div className="space-y-3">
                    {localSettings.systemPrompts.map(prompt => (
                        <div key={prompt.id} className="bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all">
                        <div className={`flex items-center p-3 gap-3 ${prompt.isActive ? 'bg-gray-100 dark:bg-gray-800/60' : ''}`}>
                            <button
                            onClick={() => handleUpdatePrompt(prompt.id, { isActive: !prompt.isActive })}
                            className={`flex-shrink-0 p-1 rounded transition-colors ${prompt.isActive ? 'text-green-500 dark:text-green-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title={prompt.isActive ? "Deactivate" : "Activate"}
                            >
                            {prompt.isActive ? <CheckCircle className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                            </button>

                            <div className="flex-1 min-w-0 flex flex-col cursor-pointer" onClick={() => setEditingPromptId(editingPromptId === prompt.id ? null : prompt.id)}>
                            <span className={`text-sm font-medium truncate ${prompt.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                {prompt.title || 'Untitled Prompt'}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                                {prompt.content.substring(0, 60)}{prompt.content.length > 60 ? '...' : ''}
                            </span>
                            </div>

                            <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setEditingPromptId(editingPromptId === prompt.id ? null : prompt.id)}
                                className={`p-1.5 rounded text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 ${editingPromptId === prompt.id ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : ''}`}
                            >
                                {editingPromptId === prompt.id ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => handleRemovePrompt(prompt.id)}
                                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            </div>
                        </div>

                        {editingPromptId === prompt.id && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3 animate-fade-in-up">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Title</label>
                                <input 
                                type="text" 
                                value={prompt.title} 
                                onChange={(e) => handleUpdatePrompt(prompt.id, { title: e.target.value })}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                                placeholder={t('input.title_placeholder', lang)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Instruction</label>
                                <textarea 
                                value={prompt.content}
                                onChange={(e) => handleUpdatePrompt(prompt.id, { content: e.target.value })}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 outline-none h-24 resize-y"
                                placeholder={t('input.instruction_placeholder', lang)}
                                />
                            </div>
                            </div>
                        )}
                        </div>
                    ))}

                    <button 
                        onClick={handleAddPrompt}
                        className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 hover:text-blue-500 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('action.add_prompt', lang)}
                    </button>
                    </div>

                    {activePromptCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800/50">
                        <label className="text-xs text-gray-500 block mb-2">{t('settings.instruction_preview', lang)}</label>
                        <div className="bg-gray-100 dark:bg-black/30 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap border border-gray-200 dark:border-gray-800">
                            {mergedPreview}
                        </div>
                    </div>
                    )}
                </section>
             </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.security', lang)}</h3>
                        <p className="text-xs text-gray-500">{t('msg.security_desc', lang)}</p>
                    </div>
                    <button 
                        onClick={() => setLocalSettings({...localSettings, security: {...localSettings.security, enabled: !localSettings.security.enabled}})}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${localSettings.security.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${localSettings.security.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {localSettings.security.enabled && (
                      <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                          <div>
                              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Password</label>
                              <input 
                                  type="text" 
                                  value={localSettings.security.password || ''}
                                  onChange={(e) => setLocalSettings({...localSettings, security: {...localSettings.security, password: e.target.value}})}
                                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white outline-none"
                                  placeholder={t('input.password_placeholder', lang)}
                              />
                          </div>

                          <div>
                              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">Security Questions</label>
                              <div className="space-y-2 mb-3">
                                  {localSettings.security.questions.map((q, idx) => (
                                      <div key={q.id} className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded flex justify-between items-center text-sm">
                                          <div className="flex-1">
                                              <div className="font-medium dark:text-gray-200">{q.question}</div>
                                              <div className="text-xs text-gray-500">{q.answer}</div>
                                          </div>
                                          <button 
                                              onClick={() => setLocalSettings({
                                                  ...localSettings, 
                                                  security: {
                                                      ...localSettings.security,
                                                      questions: localSettings.security.questions.filter(item => item.id !== q.id)
                                                  }
                                              })}
                                              className="text-red-500 hover:text-red-700 p-1"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>

                              <div className="grid grid-cols-1 gap-2 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg">
                                  <input 
                                      type="text"
                                      placeholder={t('input.question', lang)}
                                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm"
                                      value={newQuestion.q}
                                      onChange={(e) => setNewQuestion({...newQuestion, q: e.target.value})}
                                  />
                                  <input 
                                      type="text"
                                      placeholder={t('input.answer', lang)}
                                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm"
                                      value={newQuestion.a}
                                      onChange={(e) => setNewQuestion({...newQuestion, a: e.target.value})}
                                  />
                                  <button 
                                      onClick={handleAddSecurityQuestion}
                                      disabled={!newQuestion.q || !newQuestion.a}
                                      className="w-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm py-1.5 rounded disabled:opacity-50"
                                  >
                                      {t('action.add_question', lang)}
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-end gap-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {t('action.cancel', lang)}
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            {t('action.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual key row management
const KeyRow: React.FC<{
  config: KeyConfig;
  onUpdate: (updates: Partial<KeyConfig>) => void;
  onRemove: () => void;
  lang: Language;
}> = ({ config, onUpdate, onRemove, lang }) => {
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(config.key);

  const saveEdit = () => {
    if (editValue.trim() !== config.key) {
        onUpdate({ key: editValue.trim() });
    }
    setIsEditing(false);
  }

  return (
    <div className={`p-3 rounded-lg border transition-all ${config.isActive ? 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-70'}`}>
      <div className="flex items-center gap-3">
        {/* Active Toggle */}
        <button 
           onClick={() => onUpdate({ isActive: !config.isActive })}
           className={`p-1.5 rounded-md transition-colors ${config.isActive ? 'text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-400/10 hover:bg-green-200 dark:hover:bg-green-400/20' : 'text-gray-400 dark:text-gray-600 bg-gray-200 dark:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400'}`}
           title={config.isActive ? "Active" : "Disabled"}
        >
          {config.isActive ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>

        {/* Key Display/Edit */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
             <input 
               autoFocus
               type="text"
               className="w-full bg-gray-100 dark:bg-black/30 text-gray-900 dark:text-white text-xs font-mono p-1 rounded border border-blue-400 dark:border-blue-500/50 outline-none"
               value={editValue}
               onChange={(e) => setEditValue(e.target.value)}
               onBlur={saveEdit}
               onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
             />
          ) : (
             <div className="flex items-center gap-2">
               <div 
                 className="font-mono text-sm text-gray-600 dark:text-gray-300 truncate cursor-pointer hover:text-black dark:hover:text-white"
                 onClick={() => setIsEditing(true)}
                 title="Click to edit key"
               >
                 {showKey ? config.key : `${config.key.substring(0, 8)}...${config.key.substring(config.key.length - 6)}`}
               </div>
               {config.isRateLimited && (
                 <span className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-0.5 bg-red-100 dark:bg-red-400/10 px-1.5 py-0.5 rounded">
                   <AlertCircle className="w-3 h-3" /> {t('msg.rate_limited', lang)}
                 </span>
               )}
             </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
            {/* Poll Count */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded px-2 py-1" title={t('settings.poll_count', lang)}>
               <span className="text-[10px] text-gray-500">{t('settings.poll_count', lang)}:</span>
               <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={config.usageLimit}
                  onChange={(e) => onUpdate({ usageLimit: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-8 bg-transparent text-xs text-center text-blue-500 dark:text-blue-300 outline-none"
               />
            </div>

            {/* Show/Hide */}
            <button 
               onClick={() => setShowKey(!showKey)} 
               className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5"
            >
               {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Remove */}
            <button 
               onClick={onRemove}
               className="text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10 p-1.5 rounded-md transition-colors"
            >
               <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
