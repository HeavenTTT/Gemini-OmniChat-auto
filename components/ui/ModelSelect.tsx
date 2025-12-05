
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Box } from 'lucide-react';

interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className={className || "relative flex-1"} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          className="w-full bg-transparent text-xs outline-none font-medium text-gray-700 dark:text-gray-200 min-w-0 py-0.5"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
        />
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
          disabled={disabled}
          tabIndex={-1}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in-up">
            {options.length > 0 ? (
                <div className="py-1">
                    {options.map((option) => (
                        <button
                            key={option}
                            onClick={() => handleSelect(option)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center gap-2 group transition-colors"
                        >
                           <Box className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500" />
                           <span className="flex-1 truncate font-mono">{option}</span>
                           {value === option && <Check className="w-3.5 h-3.5 text-primary-500" />}
                        </button>
                    ))}
                </div>
            ) : (
                 <div className="px-3 py-2 text-xs text-gray-400 italic">
                    Fetch models to see list
                </div>
            )}
        </div>
      )}
    </div>
  );
};
