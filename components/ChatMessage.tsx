"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { User, X, Save, Edit2, RefreshCw, Trash2, Clock } from 'lucide-react';
import { Message, Role, Language, TextWrappingMode, Theme, AvatarVisibility } from '../types';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';
import { AutoResizeTextarea } from './ui/AutoResizeTextarea';
import { MessageContent } from './message/MessageContent';

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
  onViewImage?: (url: string) => void;
}

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
  avatarVisibility,
  onViewImage
}) => {
  const [editText, setEditText] = useState(msg.text);
  const [displayedText, setDisplayedText] = useState(msg.text);
  const targetTextRef = useRef(msg.text);
  const animationRef = useRef<number>(0);

  const isVSCodeTheme = theme === 'vscode-light' || theme === 'vscode-dark';
  const containerClass = isVSCodeTheme ? 'max-w-[85rem]' : 'max-w-5xl';

  // 检测消息是否为生成的图片（Markdown 图片且包含 Data URI）
  // 对于生成的图片跳过动画，避免 base64 源码闪烁
  const isGeneratedImage = useMemo(() => {
      const trimmed = msg.text.trim();
      return msg.role === Role.MODEL && trimmed.startsWith('![') && trimmed.includes('(data:image/');
  }, [msg.text, msg.role]);

  // --- 动画逻辑 ---
  useEffect(() => {
    targetTextRef.current = msg.text;
    // 如果关闭动画、不是 AI 消息、错误消息、正在编辑或生成的图片，则直接显示完整文本
    if (!smoothAnimation || msg.role !== Role.MODEL || isEditing || isGeneratedImage) {
        setDisplayedText(msg.text);
    }
  }, [msg.text, msg.role, isEditing, smoothAnimation, isGeneratedImage]);

  useEffect(() => {
    if (isEditing) setEditText(msg.text);
  }, [isEditing, msg.text]);

  /**
   * 打字机动画循环
   * 根据缓冲区待处理字符数动态调整打字速度
   */
  useEffect(() => {
    if (!smoothAnimation || msg.role !== Role.MODEL || msg.isError || isEditing || isGeneratedImage) return;

    const animate = () => {
      setDisplayedText((current) => {
        const target = targetTextRef.current;
        if (current === target) return current;
        if (current.length > target.length) return target;

        const diff = target.length - current.length;
        
        /**
         * 动态调整打字步长：
         * 根据用户需求，提高比例为缓冲区字数 (diff) / 50。
         * 设置最小步长为 1，确保即使剩余字数较少也能匀速完成渲染。
         */
        const chunk = Math.max(1, Math.ceil(diff / 50));

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
  }, [msg.role, msg.isError, isEditing, smoothAnimation, isGeneratedImage]);

  useLayoutEffect(() => {
      if (isLast && onScrollToBottom && smoothAnimation && msg.role === Role.MODEL && !isEditing && !isGeneratedImage) {
          onScrollToBottom();
      }
  }, [displayedText, isLast, onScrollToBottom, smoothAnimation, msg.role, isEditing, isGeneratedImage]);

  // --- 处理方法 ---

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

  const handleImageClick = (src: string) => {
      if (onViewImage) {
          onViewImage(src);
      } else {
          window.open(src, '_blank');
      }
  };

  // --- 样式计算 ---

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

  const animationClass = smoothAnimation ? 'animate-pop-in' : '';
  const wrapperWidthClass = isEditing ? 'w-full max-w-full' : 'max-w-[95%] md:max-w-[85%]'; 
  const bubbleBorderColor = isVSCodeTheme ? 'transparent' : `rgba(var(--color-theme-primary-rgb), ${borderAlpha})`;

  const showAvatar = 
    avatarVisibility === 'always' || 
    (avatarVisibility === 'user-only' && msg.role === Role.USER) ||
    (avatarVisibility === 'model-only' && msg.role === Role.MODEL);

  return (
    <div className={`flex w-full ${containerClass} mx-auto ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}>
        <div className={`flex gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'} ${wrapperWidthClass}`}>
            
            {showAvatar && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 overflow-hidden ${msg.role === Role.USER ? 'bg-primary-600' : 'bg-transparent'} ${msg.isError ? 'bg-red-500' : ''}`}>
                    {msg.role === Role.USER ? <User className="w-5 h-5 text-white" /> : <div className="w-full h-full scale-150"><KirbyIcon theme={theme} isThemed={kirbyThemeColor} /></div>}
                </div>
            )}

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
                {/* 消息附件图片网格 */}
                {msg.images && msg.images.length > 0 && !isEditing && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {msg.images.map((img, idx) => (
                            <div key={idx} className="relative group">
                                <img 
                                    src={img} 
                                    alt="Message Attachment" 
                                    className="max-h-64 max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => handleImageClick(img)}
                                />
                            </div>
                        ))}
                    </div>
                )}

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
                    <MessageContent 
                        content={displayedText}
                        role={msg.role}
                        isError={msg.isError}
                        images={msg.images}
                        textWrapping={textWrapping}
                        fontSize={fontSize}
                        language={language}
                        theme={theme}
                        onShowToast={onShowToast}
                        onViewImage={onViewImage}
                    />
                )}
            </div>
                
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