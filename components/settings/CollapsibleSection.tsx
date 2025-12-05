
"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../utils/i18n';

interface CollapsibleSectionProps {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  rightElement?: React.ReactNode;
  count?: React.ReactNode;
  id: string;
  lang: Language;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  defaultOpen = false, 
  rightElement = null,
  count = null,
  id,
  lang 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `${id}-content`;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 mb-4 shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-600">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left rounded-t-xl"
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={t('action.toggle_section', lang).replace('{section}', title)}
      >
        <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">
                {title}
            </h3>
            {count && <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-mono">{count}</span>}
        </div>
        <div className="flex items-center gap-3">
             {rightElement && <div onClick={e => e.stopPropagation()}>{rightElement}</div>}
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && (
        <div id={contentId} role="region" aria-labelledby={id} className="p-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in-up rounded-b-xl">
            {children}
        </div>
      )}
    </div>
  );
};
