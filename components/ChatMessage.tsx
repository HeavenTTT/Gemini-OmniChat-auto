
"use client";

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, AlertCircle, Check, Copy, X, Save, Edit2, RefreshCw, Trash2 } from 'lucide-react';
import { Message, Role, Language, TextWrappingMode } from '../types';
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
  language: Language;
  onEditMessage: (id: string, newText: string) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerate: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setConfirmDeleteId: (id: string | null) => void;
  startEditing: (msg: Message) => void;
  deleteTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

const CodeBlock = ({ children, className, lang }: { children?: React.ReactNode, className?: string, lang: Language }) => {
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

export const ChatMessage: React.FC<ChatMessageProps> = ({
  msg,
  isEditing,
  isConfirmingDelete,
  isLoading,
  bubbleTransparency,
  textWrapping,
  fontSize,
  language,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
  setEditingId,
  setConfirmDeleteId,
  startEditing,
  deleteTimerRef
}) => {
  const [editText, setEditText] = useState(msg.text);

  // Sync edit text when starting to edit
  useEffect(() => {
    if (isEditing) setEditText(msg.text);
  }, [isEditing, msg.text]);

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

  return (
    <div className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}>
        <div className={`flex gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'} ${isEditing ? 'w-full max-w-full' : 'max-w-[95%] md:max-w-[85%]'}`}>
            
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 overflow-hidden ${msg.role === Role.USER ? 'bg-primary-600' : 'bg-transparent'} ${msg.isError ? 'bg-red-500' : ''}`}>
            {msg.role === Role.USER ? <User className="w-5 h-5 text-white" /> : <div className="w-full h-full scale-150"><KirbyIcon /></div>}
            </div>

            {/* Message Content Wrapper */}
            <div className={`flex flex-col min-w-0 ${msg.role === Role.USER ? 'items-end' : 'items-start'} w-full`}>
            <div 
                className={`relative px-3 py-2.5 rounded-2xl shadow-sm backdrop-blur-sm transition-all duration-300 w-full max-w-full ${
                    msg.role === Role.USER 
                    ? 'text-white rounded-tr-sm border' 
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
                        <ReactMarkdown components={{ code({node, className, children, ...props}) { const match = /language-(\w+)/.exec(className || ''); const isInline = !match && !String(children).includes('\n'); return !isInline ? (<CodeBlock className={className} lang={language}>{children}</CodeBlock>) : (<code className="bg-primary-100 dark:bg-primary-900/40 px-1.5 py-0.5 rounded text-primary-800 dark:text-primary-200 text-xs font-mono" {...props}>{children}</code>) } }}>{msg.text}</ReactMarkdown>
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
                    {msg.model && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800 whitespace-nowrap" title="Model Used">{msg.model}</span>
                    )}
                </div>
                )}
                {!isLoading && !isEditing && (
                <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button 
                    onClick={() => startEditing(msg)} 
                    className="p-4 md:p-1 text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 rounded transition-colors" 
                    title={t('action.edit', language)}
                    aria-label={t('action.edit_message', language)}
                    >
                    <Edit2 className="w-5 h-5 md:w-3 md:h-3" />
                    </button>
                    <button 
                    onClick={handleRegenerateClick} 
                    className="p-4 md:p-1 text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 rounded transition-colors" 
                    title={msg.role === Role.USER ? t('action.regenerate_from_this_message', language) : t('action.regenerate', language)}
                    aria-label={msg.role === Role.USER ? t('action.regenerate_from_user_message', language) : t('action.regenerate_response', language)}
                    >
                    <RefreshCw className="w-5 h-5 md:w-3 md:h-3" />
                    </button>
                    <button 
                    onClick={handleDeleteClick} 
                    className={`p-4 md:p-1 rounded transition-colors flex items-center justify-center ${isConfirmingDelete ? 'bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400' : 'text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400'}`} 
                    title={isConfirmingDelete ? t('action.confirm_delete', language) : t('action.delete', language)}
                    aria-label={isConfirmingDelete ? t('action.confirm_delete_message', language) : t('action.delete_message', language)}
                    >
                    <Trash2 className="w-5 h-5 md:w-3 h-3" />
                    </button>
                </div>
                )}
            </div>
            </div>
        </div>
    </div>
  );
};
