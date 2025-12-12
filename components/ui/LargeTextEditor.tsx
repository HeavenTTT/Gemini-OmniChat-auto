"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import { t } from '../../utils/i18n';
import { Language } from '../../types';

interface LargeTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialValue: string;
  onSave: (value: string) => void;
  lang: Language;
}

export const LargeTextEditor: React.FC<LargeTextEditorProps> = ({
  isOpen,
  onClose,
  title,
  initialValue,
  onSave,
  lang
}) => {
  const [value, setValue] = useState(initialValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  // If not open or not mounted on client yet, return null
  if (!isOpen || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black animate-fade-in-up">
      {/* 1. Main Content Container - Rendered First */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-2xl relative z-10 m-[4px]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                {title}
            </h3>
            <div className="flex gap-2">
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
        
        <div className="flex-1 bg-white dark:bg-gray-900 p-6 relative">
            <textarea
                className="w-full h-full resize-none outline-none bg-transparent text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed scrollbar-hide"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('input.instruction_placeholder', lang)}
                autoFocus
            />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
                {t('action.cancel', lang)}
            </button>
            <button 
                onClick={() => onSave(value)}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
                <Save className="w-4 h-4" />
                {t('action.confirm', lang)}
            </button>
        </div>
      </div>

      {/* 2. Rainbow Dynamic Gradient Background - Rendered Second */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vmax] h-[200vmax] rainbow-background" />
      </div>
    </div>
  );

  // Render to document.body
  return createPortal(content, document.body);
};