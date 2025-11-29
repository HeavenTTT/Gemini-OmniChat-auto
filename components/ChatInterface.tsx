
"use client";

import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role, Language, TextWrappingMode } from '../types';
import { User, AlertCircle, Copy, Check, Edit2, Trash2, RefreshCw, X, Save } from 'lucide-react';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onEditMessage: (id: string, newText: string) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerate: (id: string) => void;
  language: Language;
  fontSize: number;
  textWrapping: TextWrappingMode;
  bubbleTransparency: number;
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
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading, onEditMessage, onDeleteMessage, onRegenerate, language, fontSize, textWrapping, bubbleTransparency }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const startEditing = (msg: Message) => { setEditingId(msg.id); setEditText(msg.text); };
  const cancelEditing = () => { setEditingId(null); setEditText(''); };
  const saveEdit = (msg: Message) => { if (editText.trim() !== msg.text) onEditMessage(msg.id, editText); setEditingId(null); };
  const handleKeyDown = (e: React.KeyboardEvent, msg: Message) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg); } if (e.key === 'Escape') cancelEditing(); };

  const getWrappingClass = () => {
    switch (textWrapping) {
      case 'forced': return 'whitespace-pre-wrap break-all';
      case 'auto': return 'whitespace-normal break-words';
      case 'default': default: return 'whitespace-pre-wrap break-words';
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-48 h-48 mb-6 animate-fade-in-up"><KirbyIcon /></div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('app.title', language)}</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">{t('msg.welcome_desc', language)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 pb-4">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}>
          <div className={`flex max-w-[95%] md:max-w-[85%] gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 overflow-hidden ${msg.role === Role.USER ? 'bg-primary-600' : 'bg-transparent'} ${msg.isError ? 'bg-red-500' : ''}`}>
              {msg.role === Role.USER ? <User className="w-5 h-5 text-white" /> : <div className="w-full h-full scale-150"><KirbyIcon /></div>}
            </div>
            <div className={`flex flex-col min-w-0 ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
              <div 
                  className={`relative px-3 py-2.5 rounded-2xl shadow-sm w-full backdrop-blur-sm transition-all duration-300 ${
                    msg.role === Role.USER 
                      ? 'text-white rounded-tr-sm' 
                      : msg.isError 
                        ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-tl-sm' 
                        : 'border border-primary-100 dark:border-primary-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                  }`}
                  style={
                    msg.role === Role.USER 
                    ? { backgroundColor: `rgba(var(--color-theme-primary-rgb), ${bubbleTransparency / 100})` }
                    : (msg.role === Role.MODEL && !msg.isError) 
                      ? { 
                          // Apply a lighter tint of the theme color for the bot (15% opacity scaling)
                          backgroundColor: `rgba(var(--color-theme-primary-rgb), ${(bubbleTransparency / 100) * 0.15})` 
                        } 
                      : {}
                  }
              >
                {editingId === msg.id ? (
                  <div className="w-full min-w-[280px]">
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => handleKeyDown(e, msg)} className="w-full bg-transparent text-inherit rounded-none p-0 outline-none border-none focus:ring-0 resize-none overflow-hidden leading-relaxed font-inherit" rows={Math.max(1, editText.split('\n').length)} style={{ fontSize: `${fontSize}px` }} autoFocus />
                    <div className="flex justify-end gap-2 mt-2">
                       <button onClick={cancelEditing} className={`p-2 rounded-lg transition-colors flex items-center justify-center ${msg.role === Role.USER ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400'}`} title={t('action.cancel', language)}><X className="w-5 h-5 md:w-4 md:h-4"/></button>
                       <button onClick={() => saveEdit(msg)} className={`p-2 rounded-lg transition-colors flex items-center justify-center ${msg.role === Role.USER ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50'}`} title={t('action.confirm', language)}><Save className="w-5 h-5 md:w-4 md:h-4"/></button>
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
               
              <div className="flex items-center gap-2 mt-1 px-1 h-8">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === Role.MODEL && !msg.isError && (
                  <div className="flex items-center gap-1">
                      {msg.keyIndex && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800" title="API Key Index">#{msg.keyIndex}</span>
                      )}
                      {msg.model && (
                        <span className="text-[10px] font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1 rounded border border-primary-100 dark:border-primary-800" title="Model Used">{msg.model}</span>
                      )}
                  </div>
                )}
                {!isLoading && editingId !== msg.id && (
                  <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button onClick={() => startEditing(msg)} className="p-4 md:p-1 text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 rounded transition-colors" title={t('action.edit', language)}><Edit2 className="w-5 h-5 md:w-3 md:h-3" /></button>
                    <button onClick={() => onRegenerate(msg.id)} className="p-4 md:p-1 text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 rounded transition-colors" title={msg.role === Role.USER ? t('action.edit', language) : t('action.regenerate', language)}><RefreshCw className="w-5 h-5 md:w-3 md:h-3" /></button>
                    <button onClick={() => onDeleteMessage(msg.id)} className="p-4 md:p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-colors" title={t('action.delete', language)}><Trash2 className="w-5 h-5 md:w-3 md:h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start animate-fade-in-up px-2 md:px-0">
           <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"><div className="w-full h-full scale-150"><KirbyIcon /></div></div>
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
           </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatInterface;
