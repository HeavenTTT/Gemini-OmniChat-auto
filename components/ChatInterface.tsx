
"use client";

import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Message, Language, TextWrappingMode, Theme, Role } from '../types';
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
  theme: Theme;
  kirbyThemeColor: boolean;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  smoothAnimation?: boolean;
}

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
    theme,
    kirbyThemeColor,
    onShowToast,
    smoothAnimation = true
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track if the user has manually scrolled up to pause auto-scrolling
  const isUserScrolledUp = useRef(false);
  const scrollRafId = useRef<number | null>(null);
  const lastIsLoading = useRef(isLoading);

  // --- Scroll Logic ---

  // 1. Check if user is near bottom to enable/disable sticky mode
  // Updated: Removed isLoading check to correctly handle animation tail phase
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // If we are within 50px of the bottom, we consider it "at bottom"
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // If we are NOT at bottom, user must have scrolled up (or content grew up)
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

  // 3. Initial Snap to Top on New Generation
  useLayoutEffect(() => {
    // Detect edge: isLoading goes false -> true
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


  // 4. The Sticky Loop (Bottom Tracking during loading)
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
        // We only force scroll if the bottom is obscured
        if (distanceFromBottom > 10) {
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

  // 5. Fallback: Handle new messages appearing (Non-streaming additions or load)
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
                />
            </div>
        ))}
        
        {isLoading && (
            <div className="flex justify-start animate-fade-in-up px-2 md:px-0" data-role="loading">
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full scale-150">
                        <KirbyIcon theme={theme} isThemed={kirbyThemeColor} />
                    </div>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
            </div>
        )}
        
        {/* Dynamic Bottom Buffer */}
        <div 
            className="w-full transition-all duration-300 ease-out flex-shrink-0" 
            style={{ height: isLoading ? '160px' : '0px' }} 
            aria-hidden="true" 
        />
      </div>
    </div>
  );
};

export default ChatInterface;
