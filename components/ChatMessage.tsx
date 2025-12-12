"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, AlertCircle, Check, Copy, X, Save, Edit2, RefreshCw, Trash2, Clock, Brain, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Message, Role, Language, TextWrappingMode, Theme, AvatarVisibility } from '../types';
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
  avatarVisibility: AvatarVisibility;
}

const CodeBlock = ({ 
  value, 
  language, 
  lang, 
  theme,
  onShowToast 
}: { 
  value: string, 
  language: string, 
  lang: Language, 
  theme: Theme,
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void 
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    onShowToast(t('action.copied_code', lang), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine syntax highlighter style based on app theme
  const isDarkTheme = ['dark', 'twilight', 'panda', 'vscode-dark'].includes(theme);
  const style = isDarkTheme ? vscDarkPlus : vs;

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e] group shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-gray-700">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 font-medium">{language || 'text'}</span>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors bg-gray-200/50 dark:bg-gray-700/50 px-2 py-1 rounded"
          aria-label={copied ? t('action.copied_code', lang) : t('action.copy_code', lang)}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? t('action.copied', lang) : t('action.copy', lang)}</span>
        </button>
      </div>
      <div className="overflow-x-auto text-sm">
        <SyntaxHighlighter
          language={language || 'text'}
          style={style}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: 'inherit',
          }}
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }
          }}
        >
          {value}
        </SyntaxHighlighter>
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

interface ThoughtBlockProps {
  text: string;
  lang: Language;
}

// Thought Block Component
const ThoughtBlock: React.FC<ThoughtBlockProps> = ({ text, lang }) => {
  const [isOpen, setIsOpen] = useState(false); 

  return (
    <div className="my-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden">
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
  onScrollToBottom,
  avatarVisibility
}) => {
  const [editText, setEditText] = useState(msg.text);
  
  // Local buffer state for smooth streaming
  const [displayedText, setDisplayedText] = useState(msg.text);
  const targetTextRef = useRef(msg.text);
  const animationRef = useRef<number>(0);

  // VSCode Theme Logic
  const isVSCodeTheme = theme === 'vscode-light' || theme === 'vscode-dark';
  const containerClass = isVSCodeTheme ? 'max-w-[85rem]' : 'max-w-5xl'; // Wider container (1.33x)

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
  useLayoutEffect(() => {
      if (isLast && onScrollToBottom && smoothAnimation && msg.role === Role.MODEL && !isEditing) {
          onScrollToBottom();
      }
  }, [displayedText, isLast, onScrollToBottom, smoothAnimation, msg.role, isEditing]);

  // Parse Text for Thoughts
  const { thoughts, content } = useMemo(() => {
    if (msg.role !== Role.MODEL || isEditing) {
        return { thoughts: [], content: displayedText };
    }
    
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    const extractedThoughts: string[] = [];
    let match;
    
    while ((match = thinkRegex.exec(displayedText)) !== null) {
        extractedThoughts.push(match[1]);
    }

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

  // Animation class
  const animationClass = smoothAnimation ? 'animate-pop-in' : '';

  const wrapperWidthClass = isEditing 
      ? 'w-full max-w-full' 
      : 'max-w-[95%] md:max-w-[85%]'; // Standard constraint
  
  // VSCode Themes: No border color
  const bubbleBorderColor = isVSCodeTheme ? 'transparent' : `rgba(var(--color-theme-primary-rgb), ${borderAlpha})`;

  // Avatar Visibility Logic
  const showAvatar = 
    avatarVisibility === 'always' || 
    (avatarVisibility === 'user-only' && msg.role === Role.USER) ||
    (avatarVisibility === 'model-only' && msg.role === Role.MODEL);

  return (
    <div className={`flex w-full ${containerClass} mx-auto ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}>
        <div className={`flex gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'} ${wrapperWidthClass}`}>
            
            {/* Avatar */}
            {showAvatar && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 overflow-hidden ${msg.role === Role.USER ? 'bg-primary-600' : 'bg-transparent'} ${msg.isError ? 'bg-red-500' : ''}`}>
                    {msg.role === Role.USER ? <User className="w-5 h-5 text-white" /> : <div className="w-full h-full scale-150"><KirbyIcon theme={theme} isThemed={kirbyThemeColor} /></div>}
                </div>
            )}

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
                        borderColor: bubbleBorderColor,
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
                    /* Markdown Body Wrapper */
                    <div className={`markdown-body ${getWrappingClass()}`} style={{ fontSize: `${fontSize}px` }}>
                        {/* Render Thought Blocks if present */}
                        {thoughts.length > 0 && (
                            <div className="mb-3 flex flex-col gap-2">
                                {thoughts.map((thought, idx) => (
                                    <ThoughtBlock key={idx} text={thought} lang={language} />
                                ))}
                            </div>
                        )}

                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex]} 
                            components={{ 
                                code({node, className, children, ...props}) { 
                                    const match = /language-(\w+)/.exec(className || ''); 
                                    const isInline = !match && !String(children).includes('\n'); 
                                    
                                    if (isInline) {
                                      // Keep inline code somewhat standard but styled via class usually
                                      // Here we keep minimal JSX for logic, but styles could be fully external
                                      return (
                                        <code className={className} {...props}>
                                          {children}
                                        </code>
                                      );
                                    }

                                    return (
                                      <CodeBlock 
                                        language={match ? match[1] : 'text'} 
                                        value={String(children).replace(/\n$/, '')} 
                                        theme={theme}
                                        onShowToast={onShowToast}
                                        lang={language}
                                      />
                                    );
                                },
                                // Simplified components: Removed table, th, td, tr, blockquote, etc.
                                // because they are now handled by .markdown-body CSS
                                a({href, children}) {
                                    return (
                                        <a 
                                            href={href} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                        >
                                            {children}
                                            <ExternalLink className="w-3 h-3 inline-block ml-0.5 opacity-70" />
                                        </a>
                                    );
                                },
                                img({src, alt}) {
                                    return <img src={src} alt={alt} onClick={() => { if (typeof src === 'string') window.open(src, '_blank'); }} style={{cursor: 'pointer'}} />;
                                },
                                input({checked, readOnly}) {
                                    return <input type="checkbox" checked={checked} readOnly={readOnly} className="mr-2 accent-primary-600 rounded w-4 h-4 align-text-bottom cursor-default" />;
                                }
                            }}
                        >
                            {/* Use clean content for markdown rendering */}
                            {content}
                        </ReactMarkdown>
                    </div>
                    )}
                </>
                )}
            </div>
                
            {/* Meta Info & Actions */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 px-1 min-h-[1.5rem]">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === Role.MODEL && !msg.isError && (
                <div className="flex flex-wrap items-center gap-1">
                    {msg.keyIndex && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800 whitespace-nowrap" title="API Key Index">#{msg.keyIndex}</span>
                    )}
                    {showModelName && msg.model && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800 break-all max-w-[250px]" title="Model Used">{msg.model}</span>
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
    prev.isLast === next.isLast &&
    prev.avatarVisibility === next.avatarVisibility
  );
});