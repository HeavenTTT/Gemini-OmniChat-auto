import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../utils/i18n';

interface ThoughtBlockProps {
  text: string;
  lang: Language;
}

export const ThoughtBlock: React.FC<ThoughtBlockProps> = ({ text, lang }) => {
  const [isOpen, setIsOpen] = useState(false); 

  return (
    <div className="my-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-gray-400" />
        <span>{t('label.thought_process', lang)}</span>
        <div className="ml-auto">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>
      {isOpen && (
         <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
             {text}
         </div>
      )}
    </div>
  );
};