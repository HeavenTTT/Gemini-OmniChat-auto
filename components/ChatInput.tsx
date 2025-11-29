
"use client";

import React from 'react';
import { Send, Square } from 'lucide-react';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  fontSize: number;
  language: Language;
  activeKeysCount: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isLoading,
  isDisabled,
  fontSize,
  language,
  activeKeysCount
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
  };

  return (
    <div className="p-3 md:p-4 bg-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="relative flex items-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all">
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={activeKeysCount === 0 ? t('input.no_keys', language) : t('input.placeholder', language)} 
            disabled={isDisabled} 
            className="w-full bg-transparent text-gray-900 dark:text-white p-3 md:p-4 pr-12 max-h-48 min-h-[52px] resize-none outline-none scrollbar-hide" 
            rows={1} 
            style={{ height: 'auto', minHeight: '52px', fontSize: `${fontSize}px` }} 
          />
          <div className="absolute right-2 bottom-2">
            <button 
              onClick={isLoading ? onStop : onSend} 
              disabled={(!input.trim() && !isLoading) || isDisabled} 
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${isLoading ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' : (input.trim() && !isDisabled ? 'bg-primary-600 text-white shadow-lg hover:bg-primary-500' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed')}`} 
              title={isLoading ? t('action.stop', language) : t('action.send', language)}
            >
              {isLoading ? <Square className="w-5 h-5 fill-current" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
