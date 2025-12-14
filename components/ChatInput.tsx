"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Send, Square, Zap, Paperclip, X } from 'lucide-react';
import { Language, Message, Theme } from '../types';
import { t } from '../utils/i18n';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  inputImages?: string[]; // New: base64 images
  setInputImages?: (images: string[]) => void;
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
  theme?: Theme;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  inputImages = [],
  setInputImages,
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
  onGetTokenCount,
  theme
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [exactTokenCount, setExactTokenCount] = useState<number | null>(null);

  const isVSCodeTheme = theme === 'vscode-light' || theme === 'vscode-dark';
  const containerClass = isVSCodeTheme ? 'max-w-[85rem]' : 'max-w-5xl';

  // Determine dynamic min-height based on fontSize to prevent scrollbars for single lines
  const minHeight = Math.floor(fontSize * 1.5 + 36);
  const maxHeight = showTokenUsage ? 224 : 192;

  // Debounced API call for exact token count
  useEffect(() => {
    if (!showTokenUsage || !onGetTokenCount) return;
    setExactTokenCount(null);
    const timer = setTimeout(async () => {
        if (input.trim() || history.length > 0) {
            try {
                const count = await onGetTokenCount(input);
                if (count > -1) {
                    setExactTokenCount(count);
                }
            } catch (e) { }
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [input, history, showTokenUsage, onGetTokenCount]);

  // Estimate tokens (local fallback)
  useEffect(() => {
    if (!showTokenUsage) return;
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
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const currentScrollHeight = textareaRef.current.scrollHeight;
      const targetHeight = Math.min(Math.max(currentScrollHeight, minHeight), maxHeight);
      textareaRef.current.style.height = `${targetHeight}px`;
    }
  }, [input, minHeight, maxHeight, fontSize]);

  const displayCount = exactTokenCount !== null ? exactTokenCount : tokenEstimate;

  // --- Image Handling ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && setInputImages) {
      const files = Array.from(e.target.files) as File[];
      readAndAddImages(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!setInputImages) return;
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) files.push(file);
        }
    }
    if (files.length > 0) {
        readAndAddImages(files);
    }
  };

  const readAndAddImages = (files: File[]) => {
      if (!setInputImages) return;
      const newImages: string[] = [];
      let processed = 0;

      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result && typeof e.target.result === 'string') {
                  newImages.push(e.target.result);
              }
              processed++;
              if (processed === files.length) {
                  setInputImages([...inputImages, ...newImages]);
              }
          };
          reader.readAsDataURL(file);
      });
  };

  const removeImage = (index: number) => {
      if (!setInputImages) return;
      const updated = [...inputImages];
      updated.splice(index, 1);
      setInputImages(updated);
  };

  return (
    <div className="p-3 md:p-4 pb-2 bg-transparent flex flex-col items-center">
      <div className={`${containerClass} w-full`}>
        
        {/* Image Preview Area */}
        {inputImages.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto p-1 scrollbar-hide">
                {inputImages.map((img, idx) => (
                    <div key={idx} className="relative group shrink-0">
                        <img 
                            src={img} 
                            alt={`upload-${idx}`} 
                            className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" 
                        />
                        <button 
                            onClick={() => removeImage(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="relative flex items-center glass-panel rounded-2xl shadow-xl focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all">
          
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="ml-3 p-2 text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 transition-colors"
             title={t('action.upload_image', language)}
             disabled={isDisabled}
          >
              <Paperclip className="w-5 h-5" />
          </button>
          <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileSelect} 
             accept="image/*" 
             multiple 
             className="hidden" 
          />

          <textarea 
            ref={textareaRef}
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder={activeKeysCount === 0 ? t('input.no_keys', language) : t('input.placeholder', language)} 
            disabled={isDisabled} 
            className={`w-full bg-transparent text-gray-900 dark:text-white p-3 md:p-4 pr-12 resize-none outline-none scrollbar-hide ${showTokenUsage ? 'pb-8 max-h-56' : 'max-h-48'}`}
            rows={1} 
            style={{ height: 'auto', minHeight: `${minHeight}px`, fontSize: `${fontSize}px`, lineHeight: '1.5' }} 
          />
          
          <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1">
             <button 
              onClick={isLoading ? onStop : onSend} 
              disabled={(!input.trim() && inputImages.length === 0 && !isLoading) || isDisabled} 
              className={`p-2 rounded-xl flex items-center justify-center transition-all border-none ${isLoading ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' : ((input.trim() || inputImages.length > 0) && !isDisabled ? 'bg-primary-600 text-white shadow-lg hover:bg-primary-500' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed')}`} 
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