
"use client";

import React, { useRef } from 'react';
import { History, X, Plus, Trash2, Settings } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true"></div>
      <div className="relative w-[85%] max-w-sm h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl flex flex-col p-4 animate-slide-in-left border-r border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <span id="mobile-menu-title" className="font-bold text-lg dark:text-white flex items-center gap-2"><History className="w-5 h-5"/> {t('status.history', language)}</span>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white" aria-label={t('action.close_mobile_menu', language)}><X className="w-6 h-6"/></button>
          </div>
          
          <button 
            onClick={onNewChat} 
            className="flex items-center gap-2 w-full bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-4 py-3 rounded-lg transition-all border border-primary-200 dark:border-primary-800 mb-6 shadow-sm"
            aria-label={t('action.create_new_chat', language)}
          >
            <Plus className="w-5 h-5" /><span className="font-medium">{t('action.new_chat', language)}</span>
          </button>
          
          <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-hide" role="menu">
            <div className="space-y-1">
            {sessions.map(session => (
                <div 
                    key={session.id} 
                    onClick={() => onSelectSession(session.id)} 
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm ${activeSessionId === session.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium border-l-4 border-primary-500 shadow-sm' : 'text-gray-600 dark:text-gray-400 border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    role="menuitem"
                    aria-label={`${t('action.select_chat_session', language)}: ${session.title || 'New Chat'}`}
                >
                <span className="truncate flex-1">{session.title || 'New Chat'}</span>
                <button onClick={(e) => onDeleteSession(e, session.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" aria-label={`${t('action.delete_chat_session', language)}: ${session.title || 'New Chat'}`}><Trash2 className="w-4 h-4" /></button>
                </div>
            ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
             <button 
                onClick={() => { onOpenSettings(); onClose(); }} 
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
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