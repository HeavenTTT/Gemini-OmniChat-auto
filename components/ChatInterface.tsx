"use client";

import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
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
import { ChatMessage } from './ChatMessage';

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
  showModelName: boolean;
  showResponseTimer?: boolean;
  theme: Theme;
  kirbyThemeColor: boolean;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  smoothAnimation?: boolean;
  avatarVisibility: AvatarVisibility;
}

const LoadingTimer = () => {
  const [tenths, setTenths] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTenths(Math.floor(elapsed / 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-mono text-primary-600 dark:text-primary-400 ml-2 select-none min-w-[3ch]">
      {(tenths / 10).toFixed(1)}s
    </span>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    messages, 
    isLoading, 
    onEditMessage, 
    onDeleteMessage, 
    onRegenerate, 
    language, 
    fontSize, 
    textWrapping, 
    bubbleTransparency, 
    showModelName,
    showResponseTimer = false,
    theme, 
    kirbyThemeColor,
    onShowToast,
    smoothAnimation = true,
    avatarVisibility
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Track if the user has manually scrolled up to pause auto-scrolling
  const isUserScrolledUp = useRef(false);
  const scrollRafId = useRef<number | null>(null);
  const lastIsLoading = useRef(isLoading);

  const isVSCodeTheme = theme === 'vscode-light' || theme === 'vscode-dark';
  const containerClass = isVSCodeTheme ? 'max-w-[85rem]' : 'max-w-5xl';

  // --- Scroll Logic ---

  // 1. Check if user is near bottom to enable/disable sticky mode
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Threshold to consider "at bottom". 
    // Small threshold (20px) ensures that if user scrolls up slightly, we respect it immediately (stop auto-scroll).
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    
    // We strictly track this state to allow reading history while generating
    isUserScrolledUp.current = !isAtBottom;
  };

  // 2. Callback passed to ChatMessage to trigger scroll on text expansion
  // This ensures smooth scrolling even if the network request finished but animation is still playing
  const scrollToBottom = useCallback(() => {
     if (scrollContainerRef.current && !isUserScrolledUp.current) {
         // Force scroll to absolute bottom
         scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
     }
  }, []);

  // 3. Reset scroll lock when new messages are added (User sent one, or History loaded)
  useLayoutEffect(() => {
      isUserScrolledUp.current = false;
  }, [messages.length]);

  // 4. Initial Snap to Top on New Generation
  useLayoutEffect(() => {
    // Detect edge: isLoading goes false -> true (Start of generation)
    if (!lastIsLoading.current && isLoading) {
        // Reset user scroll lock
        isUserScrolledUp.current = false;

        // Find the AI message and snap it to top
        requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const messageElements = container.querySelectorAll('[data-role="model"]');
                const lastModelMessage = messageElements[messageElements.length - 1];

                if (lastModelMessage) {
                    lastModelMessage.scrollIntoView({ block: 'start', behavior: 'smooth' });
                } else {
                    container.scrollTop = container.scrollHeight;
                }
            }
        });
    }
    lastIsLoading.current = isLoading;
  }, [isLoading]);


  // 5. The Sticky Loop (Bottom Tracking during loading)
  // This runs continuously while isLoading is true for network phase
  useEffect(() => {
    if (!isLoading) {
      if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
      return;
    }

    const loop = () => {
      const container = scrollContainerRef.current;
      if (container && !isUserScrolledUp.current) {
        const { scrollHeight, scrollTop, clientHeight } = container;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

        // Sticky logic: If content pushes down, follow it, but allow the "Snap to Top" gap
        // We only force scroll if the bottom is obscured by more than threshold
        if (distanceFromBottom > 20) {
            container.scrollTop = scrollHeight - clientHeight;
        }
      }
      scrollRafId.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
    };
  }, [isLoading]);

  // 6. Fallback: Handle non-streaming loads
  useLayoutEffect(() => {
    if (!isLoading && scrollContainerRef.current && !isUserScrolledUp.current) {
       scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, [messages]);

  const startEditing = (msg: Message) => { 
    setEditingId(msg.id); 
    setConfirmDeleteId(null);
  };

  // Calculate dynamic background color for loading bubble based on transparency
  // Note: structure and basic styles are now in CSS .loading-bubble
  const borderAlpha = 0.5 + (bubbleTransparency / 100) * 0.5;
  const dynamicStyle = {
      backgroundColor: `rgba(var(--color-theme-primary-rgb), ${(bubbleTransparency / 100) * 0.15})`,
      borderColor: isVSCodeTheme ? 'transparent' : `rgba(var(--color-theme-primary-rgb), ${borderAlpha})`
  };

  const showLoadingAvatar = avatarVisibility === 'always' || avatarVisibility === 'model-only';

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-48 h-48 mb-6 animate-fade-in-up">
            <KirbyIcon theme={theme} isThemed={kirbyThemeColor} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('app.title', language)}</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">{t('msg.welcome_desc', language)}</p>
      </div>
    );
  }

  return (
    <>
      <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          // Removed scroll-smooth to prevent fighting with JS scroll
          className="flex-1 overflow-y-auto p-2 md:p-4 h-full relative"
      >
        <div className="flex flex-col space-y-4 pb-4 min-h-0">
          {messages.map((msg, index) => (
              <div key={msg.id} data-role={msg.role}>
                  <ChatMessage
                      msg={msg}
                      isEditing={editingId === msg.id}
                      isConfirmingDelete={confirmDeleteId === msg.id}
                      isLoading={isLoading}
                      bubbleTransparency={bubbleTransparency}
                      textWrapping={textWrapping}
                      fontSize={fontSize}
                      showModelName={showModelName}
                      showResponseTimer={showResponseTimer}
                      language={language}
                      theme={theme}
                      kirbyThemeColor={kirbyThemeColor}
                      onEditMessage={onEditMessage}
                      onDeleteMessage={onDeleteMessage}
                      onRegenerate={onRegenerate}
                      setEditingId={setEditingId}
                      setConfirmDeleteId={setConfirmDeleteId}
                      startEditing={startEditing}
                      deleteTimerRef={deleteTimerRef}
                      onShowToast={onShowToast}
                      smoothAnimation={smoothAnimation}
                      isLast={index === messages.length - 1}
                      onScrollToBottom={scrollToBottom}
                      avatarVisibility={avatarVisibility}
                      onViewImage={setPreviewImageUrl}
                  />
              </div>
          ))}
          
          {isLoading && (
              <div className={`flex justify-start w-full ${containerClass} mx-auto animate-fade-in-up px-2 md:px-0`} data-role="loading">
              <div className="flex gap-3">
                  {showLoadingAvatar && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                          <div className="w-full h-full scale-150">
                              <KirbyIcon theme={theme} isThemed={kirbyThemeColor} />
                          </div>
                      </div>
                  )}
                  <div 
                      className="loading-bubble"
                      style={dynamicStyle}
                  >
                      <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
                      <div className="typing-dot" style={{ animationDelay: '150ms' }}></div>
                      <div className="typing-dot" style={{ animationDelay: '300ms' }}></div>
                      {showResponseTimer && <LoadingTimer />}
                  </div>
              </div>
              </div>
          )}
          
          {/* Dynamic Bottom Buffer */}
          <div 
              className="w-full transition-all duration-300 ease-out flex-shrink-0" 
              style={{ height: isLoading ? '160px' : '128px' }} 
              aria-hidden="true" 
          />
        </div>
      </div>

      {/* Lightbox / Full Screen Image Preview */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in-up"
          onClick={() => setPreviewImageUrl(null)}
        >
          <img 
            src={previewImageUrl} 
            alt="Full Screen Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={() => setPreviewImageUrl(null)} // Ensure clicking image also closes
          />
          <button 
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
             <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </>
  );
};

export default ChatInterface;