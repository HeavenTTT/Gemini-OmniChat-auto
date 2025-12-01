

"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Message, Role, Language, TextWrappingMode } from '../types';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';
import ChatMessage from './ChatMessage'; // Import the new ChatMessage component

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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading, onEditMessage, onDeleteMessage, onRegenerate, language, fontSize, textWrapping, bubbleTransparency }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => {
    // Cleanup any pending timer when component unmounts or messages/state changes significantly
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, [messages]); // Dependency on messages to reset timer if messages change (e.g., new chat, delete)

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
        <ChatMessage
          key={msg.id}
          msg={msg}
          isEditing={editingId === msg.id}
          isConfirmingDelete={confirmDeleteId === msg.id}
          isLoading={isLoading}
          language={language}
          fontSize={fontSize}
          textWrapping={textWrapping}
          bubbleTransparency={bubbleTransparency}
          editText={editText}
          deleteTimerRef={deleteTimerRef}
          setEditingId={setEditingId}
          setEditText={setEditText}
          setConfirmDeleteId={setConfirmDeleteId}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onRegenerate={onRegenerate}
        />
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