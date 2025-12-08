

import React, { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-gray-950 flex flex-col animate-fade-in-up sm:p-6 p-0">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sm:rounded-t-xl">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
        <div className="flex gap-2">
            <button 
                onClick={onClose}
                className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
      </div>
      
      <div className="flex-1 bg-white dark:bg-gray-900 p-4 sm:border-x sm:border-gray-200 sm:dark:border-gray-800 relative">
        <textarea
            className="w-full h-full resize-none outline-none bg-transparent text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('input.instruction_placeholder', lang)}
            autoFocus
        />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sm:rounded-b-xl flex justify-end gap-3">
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
  );
};
