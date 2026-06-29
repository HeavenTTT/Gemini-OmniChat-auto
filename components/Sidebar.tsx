"use client";

import React, { useRef, useState } from 'react';
import { Plus, MessageSquare, Trash2, Settings, Search, X } from 'lucide-react';
import { ChatSession, Language, Theme } from '../types';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  activeKeysCount: number;
  language: Language;
  theme: Theme;
  kirbyThemeColor: boolean;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onOpenSettings: () => void;
}

/**
 * 侧边栏组件：显示应用标题、新建会话按钮、支持对会话标题/消息内容进行高亮片段检索的搜索栏、会话历史列表、状态统计及设置入口。
 */
const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  activeKeysCount,
  language,
  theme,
  kirbyThemeColor,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSettings
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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
    <aside className="hidden md:flex flex-col w-72 bg-white/40 dark:bg-black/40 backdrop-blur-md border-r border-gray-200 dark:border-gray-800 p-4 transition-colors">
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 overflow-hidden rounded-full drop-shadow-md">
            <KirbyIcon theme={theme} isThemed={kirbyThemeColor} />
        </div>
        <span className="font-bold text-xl tracking-tight dark:text-white">{t('app.title', language)}</span>
      </div>
      
      <button 
        onClick={onNewChat} 
        className="flex items-center gap-2 w-full bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-lg transition-all border border-gray-200 dark:border-gray-700 mb-4 group shadow-sm hover:shadow-md cursor-pointer"
        aria-label={t('action.create_new_chat', language)}
      >
        <Plus className="w-5 h-5 text-primary-500 group-hover:text-primary-400 transition-colors" />
        <span className="font-medium">{t('action.new_chat', language)}</span>
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
          className="w-full pl-9 pr-8 py-2 text-sm bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-all border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
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

      <div className="flex-1 scrollbar-overlay -mx-2 px-2 mb-4 scrollbar-hide">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">{t('status.history', language)}</div>
        <div className="space-y-1" role="menu">
          {filteredSessionsWithSnippets.map(({ session, snippet }) => (
            <div 
                key={session.id} 
                onClick={() => onSelectSession(session.id)} 
                className={`group sidebar-item flex flex-col items-start gap-1 py-2 px-3 ${activeSessionId === session.id ? 'active' : ''}`}
                role="menuitem"
                aria-label={`${t('action.select_chat_session', language)}: ${session.title || t('msg.new_chat_title', language)}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                  <span className="truncate font-medium">{session.title || t('msg.new_chat_title', language)}</span>
                </div>
                <button 
                  onClick={(e) => onDeleteSession(e, session.id)} 
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded transition-all flex-shrink-0"
                  aria-label={`${t('action.delete_chat_session', language)}: ${session.title || t('msg.new_chat_title', language)}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {snippet && (
                <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono pl-6 truncate w-full italic" title={snippet}>
                  {snippet}
                </div>
              )}
            </div>
          ))}
          {filteredSessionsWithSnippets.length === 0 && (
            <div className="text-xs text-gray-400 px-2 italic">
              {searchQuery ? t('sidebar.no_search_results', language) : t('status.no_history', language)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2">{t('status.title', language)}</div>
        <div className="space-y-1 px-2">
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
            <span>{t('status.active_keys', language)}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeKeysCount > 0 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>{activeKeysCount}</span>
            </div>
        </div>
        
        <button 
          onClick={onOpenSettings} 
          className="btn-secondary w-full"
          aria-label={t('action.open_settings', language)}
        >
          <Settings className="w-4 h-4" /><span>{t('action.settings', language)}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;