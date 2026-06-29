"use client";

import React, { useRef, useState } from 'react';
import { History as HistoryIcon, X, Plus, Trash2, Settings, Search } from 'lucide-react';
import { ChatSession, Language } from '../types';
import { t } from '../utils/i18n';

interface MobileMenuProps {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  language: Language;
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onOpenSettings: () => void;
}

/**
 * 移动端菜单组件：提供响应式侧边抽屉，包含历史记录标题、快速新建会话按钮、本地化搜索过滤器、匹配消息气泡高亮和基础配置入口。
 */
const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  sessions,
  activeSessionId,
  language,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSettings
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  /**
   * 检查指定的会话标题或其消息中是否包含检索关键字。
   * 如果消息文本匹配，将提取包含匹配内容的一小段文本切片。
   * 
   * @param session 单个会话对象
   * @param query 过滤检索词
   * @returns 匹配结果及消息片段
   */
  const matchSession = (session: ChatSession, query: string) => {
    if (!query) return { matched: true, snippet: '' };
    const lowerQuery = query.toLowerCase();
    
    // 1. 先匹配会话标题
    if (session.title && session.title.toLowerCase().includes(lowerQuery)) {
      return { matched: true, snippet: '' };
    }
    
    // 2. 检索并匹配会话消息内容
    for (const msg of session.messages) {
      if (msg.text && msg.text.toLowerCase().includes(lowerQuery)) {
        const index = msg.text.toLowerCase().indexOf(lowerQuery);
        const start = Math.max(0, index - 12);
        const end = Math.min(msg.text.length, index + lowerQuery.length + 15);
        let snippet = msg.text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < msg.text.length) snippet = snippet + '...';
        return { matched: true, snippet };
      }
    }
    
    return { matched: false, snippet: '' };
  };

  // 根据当前检索词筛选出的会话列表
  const filteredSessionsWithSnippets = sessions
    .map(session => {
      const match = matchSession(session, searchQuery);
      return {
        session,
        matched: match.matched,
        snippet: match.snippet,
      };
    })
    .filter(item => item.matched);

  return (
    <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true"></div>
      <div className="relative w-[85%] max-w-sm h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl flex flex-col p-4 animate-slide-in-left border-r border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <span id="mobile-menu-title" className="font-bold text-lg dark:text-white flex items-center gap-2"><HistoryIcon className="w-5 h-5"/> {t('status.history', language)}</span>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white" aria-label={t('action.close_mobile_menu', language)}><X className="w-6 h-6"/></button>
          </div>
          
          <button 
            onClick={onNewChat} 
            className="flex items-center gap-2 w-full bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-4 py-3 rounded-lg transition-all border border-primary-200 dark:border-primary-800 mb-4 shadow-sm cursor-pointer"
            aria-label={t('action.create_new_chat', language)}
          >
            <Plus className="w-5 h-5" /><span className="font-medium">{t('action.new_chat', language)}</span>
          </button>

          {/* 会话与消息检索框 */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('sidebar.search_placeholder', language)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-all border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex-1 scrollbar-overlay -mx-2 px-2 scrollbar-hide" role="menu">
            <div className="space-y-1">
            {filteredSessionsWithSnippets.map(({ session, snippet }) => (
                <div 
                    key={session.id} 
                    onClick={() => onSelectSession(session.id)} 
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer transition-colors text-sm ${activeSessionId === session.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium border-l-4 border-primary-500 shadow-sm' : 'text-gray-600 dark:text-gray-400 border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    role="menuitem"
                    aria-label={`${t('action.select_chat_session', language)}: ${session.title || t('msg.new_chat_title', language)}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate flex-1 font-medium">{session.title || t('msg.new_chat_title', language)}</span>
                    <button onClick={(e) => onDeleteSession(e, session.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" aria-label={`${t('action.delete_chat_session', language)}: ${session.title || t('msg.new_chat_title', language)}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {snippet && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate w-full italic" title={snippet}>
                      {snippet}
                    </div>
                  )}
                </div>
            ))}
            {filteredSessionsWithSnippets.length === 0 && (
              <div className="text-xs text-gray-400 px-2 italic mt-2">
                {searchQuery ? t('sidebar.no_search_results', language) : t('status.no_history', language)}
              </div>
            )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
             <button 
                onClick={() => { onOpenSettings(); onClose(); }} 
                className="btn-secondary w-full justify-start"
                aria-label={t('action.open_settings', language)}
             >
               <Settings className="w-5 h-5" />{t('action.settings', language)}
             </button>
          </div>
      </div>
    </div>
  );
};

export default MobileMenu;