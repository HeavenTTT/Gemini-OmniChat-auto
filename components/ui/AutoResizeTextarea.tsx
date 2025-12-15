import React, { useRef, useLayoutEffect } from 'react';
import { Language } from '../../types';
import { t } from '../../utils/i18n';

interface AutoResizeTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  fontSize: number;
  autoFocus?: boolean;
  lang: Language;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ 
  value, 
  onChange, 
  onKeyDown, 
  fontSize, 
  autoFocus,
  lang 
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