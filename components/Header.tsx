"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Menu, Plus, Settings, Loader2, Sparkles, Download, Upload, Eraser, MoreHorizontal, ChevronUp } from 'lucide-react';
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
  onClearChat: () => void;
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
  onClearChat,
  onOpenSettings,
  onSaveChat,
  onLoadSession,
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * 点击外部关闭菜单
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
      setIsActionsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * 触发加载文件的文件选择器
   */
  const handleLoadTrigger = () => {
    fileInputRef.current?.click();
    setIsActionsOpen(false);
  };

  /**
   * 处理加载聊天记录文件
   */
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
          onShowToast(t('error.invalid_chat_file', language), 'error');
        }
      } catch (err) {
        onShowToast(t('error.load_file', language), 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  /**
   * 操作按钮子组件
   * 采用纵向折叠展开逻辑
   */
  const ActionButtons = () => (
    <div className="relative flex items-center" ref={menuRef}>
      {/* 展开/收起 触发按钮 */}
      <button
        onClick={() => setIsActionsOpen(!isActionsOpen)}
        className={`p-2 rounded-full transition-all duration-300 z-20 ${isActionsOpen ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        title={t('settings.manage', language)}
      >
        {isActionsOpen ? <ChevronUp className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
      </button>

      {/* 纵向展开的内容容器 */}
      <div 
        className={`absolute top-full right-0 mt-2 flex flex-col gap-1.5 p-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl transition-all duration-300 origin-top-right z-30 ${
          isActionsOpen 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* 总结对话 - 已移动到此折叠按钮中 */}
        <button
          onClick={() => { onSummarize(); setIsActionsOpen(false); }}
          disabled={isSummarizing || !hasMessages}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap disabled:opacity-30"
        >
          {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
          <span>{t('action.summarize', language)}</span>
        </button>

        {/* 设置按钮 - 仅在移动模式下显示在折叠菜单中 */}
        <button
          onClick={() => { onOpenSettings(); setIsActionsOpen(false); }}
          className="md:hidden flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap"
        >
          <Settings className="w-4 h-4" />
          <span>{t('action.settings', language)}</span>
        </button>

        <button
            onClick={() => { onClearChat(); setIsActionsOpen(false); }}
            disabled={!hasMessages}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap disabled:opacity-30"
        >
            <Eraser className="w-4 h-4" />
            <span>{t('action.clear_chat', language)}</span>
        </button>
        
        <button 
          onClick={() => { onSaveChat(); setIsActionsOpen(false); }} 
          disabled={!hasMessages}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap disabled:opacity-30"
        >
          <Download className="w-4 h-4" />
          <span>{t('action.save', language)}</span>
        </button>

        <button 
          onClick={handleLoadTrigger} 
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          <span>{t('action.load', language)}</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" aria-label={t('action.select_chat_file', language)} />
    </div>
  );

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/30 dark:bg-black/30 backdrop-blur-sm z-30 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
          <h1 
            className="font-bold text-lg text-gray-800 dark:text-white truncate max-w-xl cursor-pointer hover:underline decoration-dashed underline-offset-4" 
            onClick={onRename} 
            title={t('action.rename_manually', language)}
            aria-label={t('action.rename_current_chat', language)}
          >
            {currentSessionTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
            <ActionButtons />
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
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
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0 ml-1">
          <ActionButtons />
        </div>
      </header>
    </>
  );
};