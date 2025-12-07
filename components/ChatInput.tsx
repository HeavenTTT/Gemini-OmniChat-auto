"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Send, Square, Zap } from 'lucide-react';
import { Language, Message } from '../types';
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
  showTokenUsage?: boolean;
  history?: Message[];
  historyLimit?: number;
  onGetTokenCount?: (text: string) => Promise<number>;
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
  activeKeysCount,
  showTokenUsage = false,
  history = [],
  historyLimit = 0,
  onGetTokenCount
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [exactTokenCount, setExactTokenCount] = useState<number | null>(null);

  // Determine height constraints based on token usage display
  const minHeight = showTokenUsage ? 76 : 52;
  const maxHeight = showTokenUsage ? 224 : 192;

  // Debounced API call for exact token count
  useEffect(() => {
    if (!showTokenUsage || !onGetTokenCount) return;

    // Reset exact count on input change to fallback to estimate immediately
    setExactTokenCount(null);

    const timer = setTimeout(async () => {
        if (input.trim() || history.length > 0) {
            const count = await onGetTokenCount(input);
            if (count > -1) {
                setExactTokenCount(count);
            }
        }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [input, history, showTokenUsage, onGetTokenCount]);

  // Estimate tokens (local fallback)
  useEffect(() => {
    if (!showTokenUsage) return;

    // Local estimation logic
    let textToCount = input;
    let historyContext = history;
    if (historyLimit > 0 && history.length > historyLimit) {
        historyContext = history.slice(-historyLimit);
    }
    const historyText = historyContext.map(m => m.text).join('');
    const totalChars = textToCount.length + historyText.length;
    const estimate = Math.ceil(totalChars / 4);
    
    setTokenEstimate(estimate);
  }, [input, history, showTokenUsage, historyLimit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent double submission during IME composition (e.g. Chinese Pinyin)
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
  };
  
  // Reset height when input is cleared or layout changes
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to ensure we get the correct scrollHeight based on content/font
      textareaRef.current.style.height = 'auto';
      
      // Calculate target height
      // We take the larger of content height (scrollHeight) and minHeight (UI consistency)
      // But clamp it to maxHeight
      const currentScrollHeight = textareaRef.current.scrollHeight;
      const targetHeight = Math.min(Math.max(currentScrollHeight, minHeight), maxHeight);
      
      textareaRef.current.style.height = `${targetHeight}px`;
    }
  }, [input, minHeight, maxHeight, fontSize]);

  const displayCount = exactTokenCount !== null ? exactTokenCount : tokenEstimate;

  return (
    <div className="p-3 md:p-4 pb-2 bg-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="relative flex items-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all">
          <textarea 
            ref={textareaRef}
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={activeKeysCount === 0 ? t('input.no_keys', language) : t('input.placeholder', language)} 
            disabled={isDisabled} 
            className={`w-full bg-transparent text-gray-900 dark:text-white p-3 md:p-4 pr-12 resize-none outline-none scrollbar-hide ${showTokenUsage ? 'pb-8 max-h-56' : 'max-h-48'}`}
            rows={1} 
            style={{ height: 'auto', minHeight: `${minHeight}px`, fontSize: `${fontSize}px` }} 
          />
          
          <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1">
             <button 
              onClick={isLoading ? onStop : onSend} 
              disabled={(!input.trim() && !isLoading) || isDisabled} 
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${isLoading ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' : (input.trim() && !isDisabled ? 'bg-primary-600 text-white shadow-lg hover:bg-primary-500' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed')}`} 
              title={isLoading ? t('action.stop', language) : t('action.send', language)}
            >
              {isLoading ? <Square className="w-5 h-5 fill-current" /> : <Send className="w-5 h-5" />}
            </button>
          </div>

          {showTokenUsage && (
             <div className="absolute left-4 bottom-2 pointer-events-none select-none">
                <span 
                    className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${exactTokenCount !== null ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}
                    title={exactTokenCount !== null ? t('label.exact_count', language) : t('label.estimated_count', language)}
                >
                   <Zap className="w-3 h-3" />
                   {exactTokenCount === null ? `~${displayCount.toLocaleString()}` : displayCount.toLocaleString()}
                </span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;