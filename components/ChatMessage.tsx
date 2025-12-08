

"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, AlertCircle, Check, Copy, X, Save, Edit2, RefreshCw, Trash2, Clock, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { Message, Role, Language, TextWrappingMode, Theme } from '../types';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';

interface ChatMessageProps {
  msg: Message;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  isLoading: boolean;
  bubbleTransparency: number;
  textWrapping: TextWrappingMode;
  fontSize: number;
  showModelName: boolean;
  showResponseTimer?: boolean;
  language: Language;
  theme: Theme;
  kirbyThemeColor: boolean;
  onEditMessage: (id: string, newText: string) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerate: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setConfirmDeleteId: (id: string | null) => void;
  startEditing: (msg: Message) => void;
  deleteTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  smoothAnimation?: boolean;
  isLast?: boolean;
  onScrollToBottom?: () => void;
}

const CodeBlock = ({ children, className, lang, onShowToast }: { children?: React.ReactNode, className?: string, lang: Language, onShowToast: (msg: string, type: 'success') => void }) => {
  const [copied, setCopied] = React.useState(false);
  const textRef = useRef<string>("");

  useEffect(() => {
    if (typeof children === 'string') {
      textRef.current = children;
    } else if (Array.isArray(children)) {
      textRef.current = children.map(c => typeof c === 'string' ? c : '').join('');
    }
  }, [children]);

  const handleCopy = () => {
    navigator.clipboard.writeText(textRef.current);
    setCopied(true);
    onShowToast(t('action.copied_code', lang), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-primary-200 dark:border-primary-800 bg-white/50 dark:bg-black/20 group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 text-xs text-primary-700 dark:text-primary-300">
        <span className="font-mono">{language || 'text'}</span>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          aria-label={copied ? t('action.copied_code', lang) : t('action.copy_code', lang)}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('action.copied', lang) : t('action.copy', lang)}
        </button>
      </div>
      <div className="p-3 overflow-x-auto">
        <code className={`font-mono text-sm ${className} text-gray-800 dark:text-gray-200`}>{children}</code>
      </div>
    </div>
  );
};

const AutoResizeTextarea = ({ 
  value, 
  onChange, 
  onKeyDown, 
  fontSize, 
  autoFocus,
  lang 
}: { 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
  onKeyDown: (e: React.KeyboardEvent) => void, 
  fontSize: number,
  autoFocus?: boolean,
  lang: Language
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea 
      ref={textareaRef}
      value={value} 
      onChange={onChange} 
      onKeyDown={onKeyDown} 
      className="w-full bg-transparent text-inherit rounded-none p-0 outline-none border-none focus:ring-0 resize-none overflow-hidden leading-relaxed font-inherit min-w-[200px] whitespace-normal break-words" 
      rows={1}
      style={{ fontSize: `${fontSize}px` }} 
      autoFocus={autoFocus} 
      aria-label={t('input.edit_message_content', lang)}
    />
  );
};

// Fix: Explicitly define props interface for ThoughtBlock to resolve TypeScript error with 'key' prop in mapping.
interface ThoughtBlockProps {
  text: string;
  lang: Language;
}

// Thought Block Component
// Displays the reasoning process (extracted from <think> tags) in a collapsible section.
const ThoughtBlock: React.FC<ThoughtBlockProps> = ({ text, lang }) => {
  const [isOpen, setIsOpen] = useState(false); // Default collapsed
  
  // If streaming and text is actively updating (not likely passed here, but good to know), keep open?
  // Actually, usually users prefer thoughts collapsed by default or open if interesting.
  // Default to collapsed to reduce noise.

  return (
    <div className="my-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-gray-400" />
        <span>{t('label.thought_process', lang)}</span>
        <div className="ml-auto">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>
      {isOpen && (
         <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
             {text}
         </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({
  msg,
  isEditing,
  isConfirmingDelete,
  isLoading,
  bubbleTransparency,
  textWrapping,
  fontSize,
  showModelName,
  showResponseTimer = false,
  language,
  theme,
  kirbyThemeColor,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
  setEditingId,
  setConfirmDeleteId,
  startEditing,
  deleteTimerRef,
  onShowToast,
  smoothAnimation = true,
  isLast = false,
  onScrollToBottom
}) => {
  const [editText, setEditText] = useState(msg.text);
  
  // Local buffer state for smooth streaming
  const [displayedText, setDisplayedText] = useState(msg.text);
  const targetTextRef = useRef(msg.text);
  const animationRef = useRef<number>(0);

  // Sync target text when prop changes
  useEffect(() => {
    targetTextRef.current = msg.text;
    
    // If animation is disabled, or not a model message, or editing, sync immediately
    if (!smoothAnimation || msg.role !== Role.MODEL || isEditing) {
        setDisplayedText(msg.text);
    }
  }, [msg.text, msg.role, isEditing, smoothAnimation]);

  // Sync edit text when starting to edit
  useEffect(() => {
    if (isEditing) setEditText(msg.text);
  }, [isEditing, msg.text]);

  // Smooth Text Animation Loop
  // This effect handles the typewriter effect for the model's response.
  // It interpolates between the current displayed text and the target text (msg.text).
  useEffect(() => {
    if (!smoothAnimation || msg.role !== Role.MODEL || msg.isError || isEditing) return;

    const animate = () => {
      setDisplayedText((current) => {
        const target = targetTextRef.current;
        
        // If synchronized, stop updates
        if (current === target) return current;

        // If current is longer than target (e.g. deletion/rewrite), sync immediately
        if (current.length > target.length) return target;

        // Determine speed based on buffer size (catch up logic)
        const diff = target.length - current.length;
        
        // Base speed: 2 chars per frame (approx 120 chars/sec at 60fps)
        // Adaptive speed: If buffer grows large (lag), increase speed significantly
        let chunk = 2;
        if (diff > 50) chunk = 5;
        if (diff > 100) chunk = 15;
        if (diff > 500) chunk = 50; 

        const nextLen = Math.min(target.length, current.length + chunk);
        const nextText = target.substring(0, nextLen);

        return nextText;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [msg.role, msg.isError, isEditing, smoothAnimation]);

  // Scroll Synchronization
  // Ensures that when new content is added via animation, the view scrolls to bottom if it was already at the bottom.
  useLayoutEffect(() => {
      if (isLast && onScrollToBottom && smoothAnimation && msg.role === Role.MODEL && !isEditing) {
          onScrollToBottom();
      }
  }, [displayedText, isLast, onScrollToBottom, smoothAnimation, msg.role, isEditing]);

  // Parse Text for Thoughts
  // Extracts <think> tags from the raw message text to separate "thought process" from "visible content".
  // Note: <think> tags are specific to some Gemini models (e.g. 2.5).
  const { thoughts, content } = useMemo(() => {
    if (msg.role !== Role.MODEL || isEditing) {
        return { thoughts: [], content: displayedText };
    }
    
    // Regex to extract <think>...</think> blocks
    // Handles multiple blocks, and open blocks at end (streaming)
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    const extractedThoughts: string[] = [];
    let match;
    
    // We assume standard usage: <think> content </think>
    // This loop extracts the *content* of the think tags
    while ((match = thinkRegex.exec(displayedText)) !== null) {
        extractedThoughts.push(match[1]);
    }

    // Remove the tags and content to get the clean display text
    // Note: If streaming, we might have <think>... without </think> yet.
    // In that case, the content is still "thinking", so we might want to hide it from main view
    const cleanContent = displayedText.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();

    return { thoughts: extractedThoughts, content: cleanContent };
  }, [displayedText, msg.role, isEditing]);


  const cancelEditing = () => { 
    setEditingId(null); 
    setEditText(''); 
    setConfirmDeleteId(null);
  };

  const saveEdit = () => { 
    if (editText.trim() !== msg.text) onEditMessage(msg.id, editText); 
    setEditingId(null); 
    setConfirmDeleteId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      saveEdit(); 
    } 
    if (e.key === 'Escape') cancelEditing(); 
  };

  const handleDeleteClick = () => {
    setEditingId(null);
    if (isConfirmingDelete) {
      onDeleteMessage(msg.id);
      setConfirmDeleteId(null);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    } else {
      setConfirmDeleteId(msg.id);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
        deleteTimerRef.current = null;
      }, 3000);
    }
  };

  const handleRegenerateClick = () => {
    onRegenerate(msg.id);
    setConfirmDeleteId(null);
  }

  const getWrappingClass = () => {
    switch (textWrapping) {
      case 'forced': return 'whitespace-pre-wrap break-all';
      case 'auto': return 'whitespace-normal break-words';
      case 'default': default: return 'whitespace-pre-wrap break-words';
    }
  };

  // Dynamic opacity
  const effectiveTransparency = isEditing ? 100 : bubbleTransparency;
  const borderAlpha = 0.5 + (effectiveTransparency / 100) * 0.5;
  const shadowAlpha = (100 - effectiveTransparency) / 100;
  
  const textShadowStyle = effectiveTransparency < 90 
    ? `0 1px 2px rgba(var(--color-theme-primary-rgb), ${shadowAlpha})` 
    : 'none';

  let backgroundColor;
  if (msg.role === Role.USER) {
       backgroundColor = `rgba(var(--color-theme-primary-rgb), ${effectiveTransparency / 100})`;
  } else if (msg.role === Role.MODEL && !msg.isError) {
       backgroundColor = `rgba(var(--color-theme-primary-rgb), ${(effectiveTransparency / 100) * 0.15})`;
  }

  // Animation class only if enabled
  const animationClass = smoothAnimation ? 'animate-pop-in' : '';

  return (
    <div className={`flex w-full max-w-5xl mx-auto ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}>
        <div className={`flex gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'} ${isEditing ? 'w-full max-w-full' : 'max-w-[95%] md:max-w-[85%]'}`}>
            
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 overflow-hidden ${msg.role === Role.USER ? 'bg-primary-600' : 'bg-transparent'} ${msg.isError ? 'bg-red-500' : ''}`}>
            {msg.role === Role.USER ? <User className="w-5 h-5 text-white" /> : <div className="w-full h-full scale-150"><KirbyIcon theme={theme} isThemed={kirbyThemeColor} /></div>}
            </div>

            {/* Message Content Wrapper */}
            <div className={`flex flex-col min-w-0 ${msg.role === Role.USER ? 'items-end' : 'items-start'} w-full`}>
            <div 
                className={`relative px-3 py-2.5 rounded-2xl shadow-sm backdrop-blur-sm transition-all duration-300 w-full max-w-full origin-bottom-left ${animationClass} ${
                    msg.role === Role.USER 
                    ? 'text-white rounded-tr-sm border origin-bottom-right' 
                    : msg.isError 
                        ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-tl-sm' 
                        : 'border text-gray-800 dark:text-gray-100 rounded-tl-sm'
                }`}
                style={
                    !msg.isError ? { 
                        backgroundColor,
                        borderColor: `rgba(var(--color-theme-primary-rgb), ${borderAlpha})`,
                        textShadow: textShadowStyle
                    } : {}
                }
            >
                {isEditing ? (
                <div className="w-full min-w-[200px]">
                    <AutoResizeTextarea 
                        value={editText} 
                        onChange={(e) => setEditText(e.target.value)} 
                        onKeyDown={handleKeyDown} 
                        fontSize={fontSize}
                        autoFocus
                        lang={language}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button 
                        onClick={cancelEditing} 
                        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            msg.role === Role.USER 
                                ? 'bg-white/20 text-white hover:bg-white/30' 
                                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                        }`} 
                        title={t('action.cancel', language)}
                        aria-label={t('action.cancel_edit', language)}
                    >
                            <X className="w-5 h-5 md:w-4 md:h-4"/>
                        </button>
                        <button 
                        onClick={saveEdit} 
                        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            msg.role === Role.USER 
                                ? 'bg-white/20 text-white hover:bg-white/30' 
                                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                        }`} 
                        title={t('action.confirm', language)}
                        aria-label={t('action.save_edit', language)}
                    >
                            <Save className="w-5 h-5 md:w-4 md:h-4"/>
                        </button>
                    </div>
                </div>
                ) : (
                <>
                    {msg.isError ? (
                    <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{msg.text}</span></div>
                    ) : (
                    <div className={`prose prose-sm max-w-none leading-relaxed dark:prose-invert ${getWrappingClass()}`} style={{ fontSize: `${fontSize}px` }}>
                        {/* Render Thought Blocks if present */}
                        {thoughts.length > 0 && (
                            <div className="mb-3 flex flex-col gap-2">
                                {thoughts.map((thought, idx) => (
                                    <ThoughtBlock key={idx} text={thought} lang={language} />
                                ))}
                            </div>
                        )}

                        <ReactMarkdown components={{ code({node, className, children, ...props}) { const match = /language-(\w+)/.exec(className || ''); const isInline = !match && !String(children).includes('\n'); return !isInline ? (<CodeBlock className={className} lang={language} onShowToast={onShowToast}>{children}</CodeBlock>) : (<code className="bg-primary-100 dark:bg-primary-900/40 px-1.5 py-0.5 rounded text-primary-800 dark:text-primary-200 text-xs font-mono" {...props}>{children}</code>) } }}>
                            {/* Use clean content for markdown rendering */}
                            {content}
                        </ReactMarkdown>
                    </div>
                    )}
                </>
                )}
            </div>
                
            {/* Meta Info & Actions */}
            <div className="flex items-center gap-2 mt-1 px-1 h-8">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === Role.MODEL && !msg.isError && (
                <div className="flex items-center gap-1">
                    {msg.keyIndex && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800 whitespace-nowrap" title="API Key Index">#{msg.keyIndex}</span>
                    )}
                    {showModelName && msg.model && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800 whitespace-nowrap" title="Model Used">{msg.model}</span>
                    )}
                    {showResponseTimer && msg.executionTime && (
                        <div className="flex items-center gap-0.5 text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800 whitespace-nowrap" title="Response Time">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{t('label.response_time', language).replace('{duration}', (msg.executionTime / 1000).toFixed(1))}</span>
                        </div>
                    )}
                </div>
                )}
                {!isLoading && !isEditing && (
                <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button 
                    onClick={() => startEditing(msg)} 
                    className="p-4 md:p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title={t('action.edit', language)}
                    aria-label={t('action.edit_message', language)}
                    >
                    <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                    onClick={handleRegenerateClick} 
                    className="p-4 md:p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title={msg.role === Role.USER ? t('action.regenerate_from_user_message', language) : t('action.regenerate_response', language)}
                    aria-label={t('action.regenerate', language)}
                    >
                    <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                    onClick={handleDeleteClick} 
                    className={`p-4 md:p-1 transition-colors ${isConfirmingDelete ? 'text-red-500 bg-red-50 dark:bg-red-900/20 rounded' : 'text-gray-400 hover:text-red-500'}`}
                    title={isConfirmingDelete ? t('action.confirm_delete', language) : t('action.delete', language)}
                    aria-label={t('action.delete_message', language)}
                    >
                    <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
                )}
            </div>
            </div>
        </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.msg === next.msg &&
    prev.isEditing === next.isEditing &&
    prev.isConfirmingDelete === next.isConfirmingDelete &&
    prev.isLoading === next.isLoading &&
    prev.bubbleTransparency === next.bubbleTransparency &&
    prev.textWrapping === next.textWrapping &&
    prev.fontSize === next.fontSize &&
    prev.showModelName === next.showModelName &&
    prev.showResponseTimer === next.showResponseTimer &&
    prev.language === next.language &&
    prev.theme === next.theme &&
    prev.kirbyThemeColor === next.kirbyThemeColor &&
    prev.smoothAnimation === next.smoothAnimation &&
    prev.isLast === next.isLast
  );
});