

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Send, Square } from 'lucide-react';
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
  modelTokenLimit?: number;
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
  modelTokenLimit = 0,
  onGetTokenCount
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [exactTokenCount, setExactTokenCount] = useState<number | null>(null);
  const [tokenPercentage, setTokenPercentage] = useState(0);

  // Determine height constraints based on token usage display
  // When showing token usage, we add pb-8 (32px). 
  // Base height ~52px (padding + line height). 
  // With pb-8, we need approx 52 + 20 = ~72px to avoid scrollbar. Safe margin: 76px.
  const minHeight = showTokenUsage ? 76 : 52;
  const maxHeight = showTokenUsage ? 224 : 192; // Match max-h-56 vs max-h-48

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

  // Estimate tokens (local fallback) and calculate percentage
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

    // Determine which count to use for percentage
    const usedCount = exactTokenCount !== null ? exactTokenCount : estimate;

    if (modelTokenLimit > 0) {
        const pct = Math.round((usedCount / modelTokenLimit) * 100);
        setTokenPercentage(pct);
    } else {
        setTokenPercentage(0);
    }
  }, [input, history, showTokenUsage, historyLimit, modelTokenLimit, exactTokenCount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      if (!input) {
        // Reset to minimum if empty
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${minHeight}px`; 
      } else {
        // Re-adjust if content exists (e.g. when toggling token usage)
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
      }
    }
  }, [input, minHeight, maxHeight]);

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
             <div className="absolute left-4 bottom-0.5 pointer-events-none select-none">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1.5 transition-colors">
                   <span className="font-semibold text-gray-500 dark:text-gray-400">{t('label.token_usage', language)}:</span>
                   <span title={exactTokenCount !== null ? "Exact count from API" : "Estimated count"}>
                       {exactTokenCount === null ? `~${displayCount.toLocaleString()}` : displayCount.toLocaleString()}
                   </span>
                   
                   {modelTokenLimit > 0 && (
                       <>
                           <span className="text-gray-300 dark:text-gray-600">/</span>
                           <span>{modelTokenLimit.toLocaleString()}</span>
                           <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                               tokenPercentage > 90 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' : 
                               tokenPercentage > 75 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' : 
                               'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                           }`}>
                               {tokenPercentage}%
                           </span>
                       </>
                   )}
                </span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
