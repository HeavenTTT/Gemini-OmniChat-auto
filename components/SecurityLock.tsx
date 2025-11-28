
"use client";

import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, HelpCircle, ArrowRight } from 'lucide-react';
import { SecurityConfig, Language } from '../types';
import { t } from '../utils/i18n';
import { KirbyIcon } from './Kirby';

interface SecurityLockProps {
  config: SecurityConfig;
  onUnlock: () => void;
  lang: Language;
}

/**
 * SecurityLock Component
 * Displays a lock screen requiring a password or security question answer to proceed.
 */
const SecurityLock: React.FC<SecurityLockProps> = ({ config, onUnlock, lang }) => {
  const [mode, setMode] = useState<'password' | 'question'>('password');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);

  // Initialize state based on configuration
  useEffect(() => {
    // If no password set but enabled (edge case), default to question or disable
    if (!config.password && config.questions.length > 0) {
      setMode('question');
      setQuestionIndex(Math.floor(Math.random() * config.questions.length));
    }
    // If neither (bad state), just unlock to prevent lockout
    if (!config.password && config.questions.length === 0) {
        onUnlock();
    }
  }, [config, onUnlock]);

  // Handle form submission
  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (mode === 'password') {
      if (input === config.password) {
        onUnlock();
      } else {
        setError("Incorrect password");
        setInput('');
      }
    } else {
      const currentQ = config.questions[questionIndex];
      if (input.trim().toLowerCase() === currentQ.answer.trim().toLowerCase()) {
        onUnlock();
      } else {
        setError("Incorrect answer");
        setInput('');
      }
    }
  };

  // Toggle between Password and Security Question modes
  const switchMode = () => {
      setMode(mode === 'password' ? 'question' : 'password');
      setInput('');
      setError('');
      if (mode === 'password' && config.questions.length > 0) {
          setQuestionIndex(Math.floor(Math.random() * config.questions.length));
      }
  };

  const hasQuestions = config.questions.length > 0;
  const hasPassword = !!config.password;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800 animate-fade-in-up">
        <div className="flex justify-center mb-6">
            <div className="w-24 h-24">
                <KirbyIcon />
            </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {t('app.title', lang)} {t('settings.security', lang)}
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
            {mode === 'password' ? t('msg.enter_password', lang) : t('msg.answer_question', lang)}
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
            {mode === 'question' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                    <p className="text-blue-800 dark:text-blue-200 text-sm font-medium text-center">
                        {config.questions[questionIndex]?.question}
                    </p>
                </div>
            )}

            <div className="relative">
                <input 
                    type={mode === 'password' ? 'password' : 'text'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white"
                    placeholder={mode === 'password' ? 'Password' : 'Your Answer'}
                    autoFocus
                />
                <button 
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            {error && (
                <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>
            )}
        </form>

        <div className="mt-6 flex justify-center">
            {hasQuestions && hasPassword && (
                <button 
                    onClick={switchMode}
                    className="text-sm text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-2 transition-colors"
                >
                    {mode === 'password' ? <HelpCircle className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                    {mode === 'password' ? t('msg.answer_question', lang) : t('msg.enter_password', lang)}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default SecurityLock;
