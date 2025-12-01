

"use client";

import React, { useRef } from 'react';
import { Plus, MessageSquare, Trash2, Settings } from 'lucide-react';
import { ChatSession, Language } from '../types';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  activeKeysCount: number;
  language: Language;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  activeKeysCount,
  language,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSettings
}) => {
  return (
    <aside className="hidden md:flex flex-col w-72 bg-white/40 dark:bg-black/40 backdrop-blur-md border-r border-gray-200 dark:border-gray-800 p-4 transition-colors">
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 overflow-hidden rounded-full drop-shadow-md"><KirbyIcon /></div>
        <span className="font-bold text-xl tracking-tight dark:text-white">{t('app.title', language)}</span>
      </div>
      
      <button 
        onClick={onNewChat} 
        className="flex items-center gap-2 w-full bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-lg transition-all border border-gray-200 dark:border-gray-700 mb-6 group shadow-sm hover:shadow-md"
        aria-label={t('action.create_new_chat', language)}
      >
        <Plus className="w-5 h-5 text-primary-500 group-hover:text-primary-400 transition-colors" />
        <span className="font-medium">{t('action.new_chat', language)}</span>
      </button>

      <div className="flex-1 overflow-y-auto -mx-2 px-2 mb-4 scrollbar-hide">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">{t('status.history', language)}</div>
        <div className="space-y-1" role="menu">
          {sessions.map(session => (
            <div 
                key={session.id} 
                onClick={() => onSelectSession(session.id)} 
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-sm ${activeSessionId === session.id ? 'bg-gray-200/80 dark:bg-gray-800/80 text-gray-900 dark:text-white font-medium shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 hover:text-gray-900 dark:hover:text-gray-200'}`}
                role="menuitem"
                aria-label={`${t('action.select_chat_session', language)}: ${session.title || 'New Chat'}`}
            >
              <div className="flex items-center gap-2 overflow-hidden"><MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" /><span className="truncate">{session.title || 'New Chat'}</span></div>
              <button 
                onClick={(e) => onDeleteSession(e, session.id)} 
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded transition-all"
                aria-label={`${t('action.delete_chat_session', language)}: ${session.title || 'New Chat'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && <div className="text-xs text-gray-400 px-2 italic">{t('status.no_history', language)}</div>}
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
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
          aria-label={t('action.open_settings', language)}
        >
          <Settings className="w-4 h-4" /><span>{t('action.settings', language)}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;