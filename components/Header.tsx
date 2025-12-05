
"use client";

import React, { useRef } from 'react';
import { Menu, Plus, Settings, Loader2, Sparkles, Download, Upload } from 'lucide-react';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface HeaderProps {
  currentSessionTitle: string;
  isSummarizing: boolean;
  hasMessages: boolean;
  language: Language;
  onRename: () => void;
  onSummarize: () => void;
  onOpenMobileMenu: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onSaveChat: () => void;
  onLoadSession: (messages: any[], title?: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSessionTitle,
  isSummarizing,
  hasMessages,
  language,
  onRename,
  onSummarize,
  onOpenMobileMenu,
  onNewChat,
  onOpenSettings,
  onSaveChat,
  onLoadSession,
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          onLoadSession(parsed.messages, parsed.title);
        } else {
          onShowToast("Invalid chat file format.", 'error');
        }
      } catch (err) {
        onShowToast(t('error.load_file', language), 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const ActionButtons = () => (
    <div className="flex items-center gap-1">
      <button 
        onClick={onSaveChat} 
        className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1"
        title={t('action.save', language)}
        aria-label={t('action.save_current_chat', language)}
      >
        <Download className="w-5 h-5" />
        <span className="hidden md:inline">{t('action.save', language)}</span>
      </button>
      <button 
        onClick={handleLoadTrigger} 
        className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1"
        title={t('action.load', language)}
        aria-label={t('action.load_chat_file', language)}
      >
        <Upload className="w-5 h-5" />
        <span className="hidden md:inline">{t('action.load', language)}</span>
      </button>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" aria-label={t('action.select_chat_file', language)} />
    </div>
  );

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/30 dark:bg-black/30 backdrop-blur-sm z-10 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
          <h1 
            className="font-bold text-lg text-gray-800 dark:text-white truncate max-w-xl cursor-pointer hover:underline decoration-dashed underline-offset-4" 
            onClick={onRename} 
            title={t('action.rename_manually', language)}
            aria-label={t('action.rename_current_chat', language)}
          >
            {currentSessionTitle}
          </h1>
          <button 
            onClick={onSummarize} 
            disabled={isSummarizing || !hasMessages} 
            className="p-1.5 text-gray-400 hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" 
            title={t('action.summarize', language)}
            aria-label={t('action.summarize_chat_title', language)}
          >
            {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
            <ActionButtons />
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <button 
            onClick={onOpenMobileMenu} 
            className="p-1 flex-shrink-0 text-gray-700 dark:text-gray-200"
            aria-label={t('action.open_mobile_navigation', language)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1 overflow-hidden min-w-0">
            <span 
                className="font-bold text-lg dark:text-white truncate max-w-[120px] cursor-pointer hover:underline decoration-dashed underline-offset-4"
                onClick={onRename}
                title={t('action.rename_manually', language)}
                aria-label={t('action.rename_current_chat', language)}
            >
                {currentSessionTitle}
            </span>
            <button 
              onClick={onSummarize} 
              disabled={isSummarizing || !hasMessages} 
              className="p-1 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0" 
              title={t('action.summarize', language)}
              aria-label={t('action.summarize_chat_title', language)}
            >
              {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0 ml-1">
          <ActionButtons />
          <button 
            onClick={onNewChat} 
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" 
            title={t('action.new_chat', language)}
            aria-label={t('action.create_new_chat', language)}
          >
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenSettings} 
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white" 
            title={t('action.settings', language)}
            aria-label={t('action.open_settings', language)}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>
    </>
  );
};
