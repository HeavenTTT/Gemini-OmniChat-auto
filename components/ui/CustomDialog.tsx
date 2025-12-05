
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DialogConfig, Language } from '../../types';
import { t } from '../../utils/i18n';

interface CustomDialogProps {
  config: DialogConfig;
  onClose: () => void;
  lang: Language;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({ config, onClose, lang }) => {
  const [inputValue, setInputValue] = useState(config.inputValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(config.inputValue || '');
  }, [config.inputValue, config.isOpen]);

  useEffect(() => {
    if (config.isOpen && config.type === 'input') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [config.isOpen, config.type]);

  if (!config.isOpen) return null;

  const handleConfirm = () => {
    if (config.type === 'input') {
      config.onConfirm(inputValue);
    } else {
      config.onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (config.onCancel) config.onCancel();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{config.title}</h3>
          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {config.message && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed whitespace-pre-wrap">
              {config.message}
            </p>
          )}

          {config.type === 'input' && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.inputPlaceholder}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-gray-900 dark:text-white"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          {config.type !== 'alert' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('action.cancel', lang)}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                config.type === 'confirm' ? 'bg-primary-600 hover:bg-primary-500' : 'bg-primary-600 hover:bg-primary-500'
            }`}
          >
            {config.type === 'alert' ? t('action.ok', lang) : t('action.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
