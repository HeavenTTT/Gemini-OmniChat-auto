

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, Download, Upload, Sliders, RotateCw, Shield, Github, CheckCircle } from 'lucide-react';
import { AppSettings, KeyConfig, Language, APP_VERSION } from '../types';
import { GeminiService } from '../services/geminiService';
import { t } from '../utils/i18n';
import { GeneralAppearanceSettings } from './settings/GeneralAppearanceSettings';
import { ModelParameterSettings } from './settings/ModelParameterSettings';
import { ApiKeyManagement } from './settings/ApiKeyManagement';
import { SystemPromptManagement } from './settings/SystemPromptManagement';
import { SecuritySettings } from './settings/SecuritySettings';
import { CollapsibleSection } from './settings/CollapsibleSection';

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

  // Initialize local state
  useEffect(() => {
    if (isOpen) {
      setLocalKeys(JSON.parse(JSON.stringify(apiKeys))); 
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
    }
  }, [isOpen, apiKeys, settings]);

  // --- Theme Preview Logic ---
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink');
    
    root.classList.add(`theme-${localSettings.theme}`);
    if (['dark', 'twilight'].includes(localSettings.theme)) {
        root.classList.add('dark');
    }
  }, [localSettings.theme, isOpen]);

  const handleCloseOrCancel = () => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark', 'theme-light', 'theme-twilight', 'theme-sky', 'theme-pink');
    
    root.classList.add(`theme-${settings.theme}`);
    if (['dark', 'twilight'].includes(settings.theme)) {
        root.classList.add('dark');
    }
    onClose();
  };

  const handleSave = () => {
    onUpdateKeys(localKeys);
    onUpdateSettings(localSettings);
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

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', icon: <Sliders className="w-4 h-4"/>, label: t('settings.title', lang) },
    { id: 'model', icon: <RotateCw className="w-4 h-4"/>, label: t('settings.ai_parameters', lang) },
    { id: 'security', icon: <Shield className="w-4 h-4"/>, label: t('settings.security', lang) }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm md:p-4 p-0 animate-fade-in-up" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 md:rounded-2xl rounded-none w-full md:max-w-3xl h-full md:h-auto md:max-h-[90vh] shadow-2xl flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between md:p-5 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-50/50 dark:bg-gray-900/50 rounded-t-2xl">
          <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            {t('settings.title', lang)}
          </h2>
          <button onClick={handleCloseOrCancel} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors" aria-label={t('action.close_settings', lang)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 md:px-6 px-3 gap-6" role="tablist">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-controls={`panel-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    aria-label={tab.label}
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
            <div role="tabpanel" id="panel-general" aria-labelledby="tab-general" className="space-y-4">
                
                <GeneralAppearanceSettings 
                    settings={localSettings} 
                    onUpdateSettings={setLocalSettings} 
                    lang={lang} 
                />

                <ApiKeyManagement 
                    keys={localKeys} 
                    onUpdateKeys={setLocalKeys} 
                    lang={lang} 
                    defaultModel={localSettings.defaultModel}
                    geminiService={geminiService}
                />

                {/* Config Management */}
                <CollapsibleSection id="config-management" title={t('settings.manage', lang)} lang={lang}>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleExportSettings} 
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-sm`}
                            aria-label={t('action.export_app_settings', lang)}
                        >
                            <Download className="w-4 h-4" />{t('action.export_settings', lang)}
                        </button>
                        <button 
                            onClick={handleImportTrigger} 
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-sm`}
                            aria-label={t('action.import_app_settings', lang)}
                        >
                            <Upload className="w-4 h-4" />{t('action.import_settings', lang)}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" aria-label={t('action.select_config_file', lang)} />
                    </div>
                </CollapsibleSection>

                {/* About & Open Source */}
                <CollapsibleSection id="about" title={t('settings.about', lang)} lang={lang}>
                  <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{t('settings.version', lang)}</span>
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{APP_VERSION}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">{t('settings.source_code', lang)}</span>
                        <a href="https://github.com/HeavenTTT/Gemini-OmniChat-auto" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary-600 hover:underline bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded transition-colors">
                            <Github className="w-4 h-4" />
                            GitHub
                        </a>
                    </div>
                    <div className="text-xs italic opacity-70 mt-2 border-t border-gray-200 dark:border-gray-700 pt-3 text-center">
                        {t('msg.ai_generated_disclaimer', lang)}
                    </div>
                  </div>
                </CollapsibleSection>
            </div>
          )}

          {/* Model Params Tab */}
          {activeTab === 'model' && (
             <div role="tabpanel" id="panel-model" aria-labelledby="tab-model" className="space-y-4">
                
                <ModelParameterSettings 
                    settings={localSettings} 
                    onUpdateSettings={setLocalSettings} 
                    lang={lang}
                />

                <SystemPromptManagement 
                    settings={localSettings} 
                    onUpdateSettings={setLocalSettings} 
                    lang={lang}
                />
             </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
              <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" className="space-y-4">
                  <SecuritySettings 
                    settings={localSettings} 
                    onUpdateSettings={setLocalSettings} 
                    lang={lang}
                  />
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="md:p-5 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-2xl flex justify-end gap-3 flex-shrink-0">
          <button 
            onClick={handleCloseOrCancel} 
            className={`px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm`}
            aria-label={t('action.cancel_changes', lang)}
          >
            {t('action.cancel', lang)}
          </button>
          <button 
            onClick={handleSave} 
            className={`px-6 py-2.5 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2`}
            aria-label={t('action.save_all_settings', lang)}
          >
            <CheckCircle className="w-4 h-4" />
            {t('action.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
