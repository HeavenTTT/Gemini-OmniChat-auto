"use client";

import React, { useState } from 'react';
import { Edit2, Save, X, Trash2, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, Language, SecurityConfig } from '../../types';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../utils/i18n';

interface SecuritySettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  settings,
  onUpdateSettings,
  lang
}) => {
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [tempSecurityConfig, setTempSecurityConfig] = useState<SecurityConfig | null>(null);
  const [newQuestion, setNewQuestion] = useState({ q: '', a: '' });

  const hasPassword = !!settings.security.password;
  const hasQuestions = settings.security.questions.length > 0;

  const startEditingSecurity = () => {
    setIsEditingSecurity(true);
    setTempSecurityConfig(JSON.parse(JSON.stringify(settings.security)));
  };

  const saveSecurityConfig = () => {
    setIsEditingSecurity(false);
    setTempSecurityConfig(null);
  };

  const cancelEditingSecurity = () => {
    if (tempSecurityConfig) {
      onUpdateSettings({ ...settings, security: tempSecurityConfig });
    }
    setIsEditingSecurity(false);
    setTempSecurityConfig(null);
  };

  const updateSecurity = (updates: Partial<SecurityConfig>) => {
      onUpdateSettings({ ...settings, security: { ...settings.security, ...updates } });
  };

  const handleAddSecurityQuestion = () => {
    if (newQuestion.q && newQuestion.a) {
        updateSecurity({
            questions: [...settings.security.questions, { id: uuidv4(), question: newQuestion.q, answer: newQuestion.a }]
        });
        setNewQuestion({ q: '', a: '' });
    }
  };

  return (
    <div className="space-y-4">
        <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700`}>
        <span className="font-medium text-gray-900 dark:text-white">{t('settings.security', lang)}</span>
        <label htmlFor="security-toggle" className="toggle-switch-label">
            <input 
                id="security-toggle"
                type="checkbox" 
                className="toggle-checkbox"
                checked={settings.security.enabled}
                onChange={() => updateSecurity({ enabled: !settings.security.enabled })}
                aria-label={t('settings.enable_security_lock', lang)}
            />
            <div className="toggle-slider"></div>
        </label>
        </div>
        
        {settings.security.enabled && (
            <CollapsibleSection
            id="security-details"
            title={t('settings.security_details', lang)}
            defaultOpen={isEditingSecurity}
            lang={lang}
            rightElement={
                !isEditingSecurity ? (
                    <button 
                        onClick={startEditingSecurity}
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 transition-colors"
                        title={t('action.edit', lang)}
                        aria-label={t('action.edit_security_settings', lang)}
                    >
                        <Edit2 className="w-4 h-4"/>
                    </button>
                ) : null
            }
            >
            {isEditingSecurity ? (
                <div className="space-y-4 animate-fade-in-up">
                    <input 
                        type="password"
                        placeholder={t('input.password_placeholder', lang)}
                        className="input-standard"
                        value={settings.security.password || ''}
                        onChange={e => updateSecurity({ password: e.target.value })}
                        aria-label={t('input.password_field', lang)}
                    />
                    
                    <div>
                        <label htmlFor="lockout-duration-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('settings.lockout_duration', lang)} ({t('label.seconds', lang)})
                        </label>
                        <input
                            id="lockout-duration-input"
                            type="number"
                            min="60"
                            step="60"
                            placeholder="86400"
                            className="input-standard"
                            value={settings.security.lockoutDurationSeconds || ''}
                            onChange={e => updateSecurity({ lockoutDurationSeconds: parseInt(e.target.value) || undefined })}
                            aria-label={t('settings.lockout_duration_input', lang)}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('settings.lockout_duration_desc', lang)}
                        </p>
                    </div>

                    <div className={`bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800/30`}>
                        <h4 className="text-xs font-semibold text-primary-800 dark:text-primary-300 uppercase mb-3">{t('action.add_question', lang)}</h4>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input 
                                className="input-standard"
                                placeholder={t('input.question', lang)}
                                value={newQuestion.q}
                                onChange={e => setNewQuestion({...newQuestion, q: e.target.value})}
                                aria-label={t('input.security_question_field', lang)}
                            />
                            <input 
                                className="input-standard"
                                placeholder={t('input.answer', lang)}
                                value={newQuestion.a}
                                onChange={e => setNewQuestion({...newQuestion, a: e.target.value})}
                                aria-label={t('input.security_answer_field', lang)}
                            />
                            <button 
                                onClick={handleAddSecurityQuestion} 
                                className={`bg-primary-600 hover:bg-primary-500 text-white p-2.5 rounded-lg shadow-sm transition-colors whitespace-nowrap`}
                                aria-label={t('action.add_security_question', lang)}
                            >
                                <Plus className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="mt-4 space-y-2">
                            {settings.security.questions.map((q, idx) => (
                                <div key={q.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-600 dark:text-gray-300">{q.question}</span>
                                    <button 
                                        onClick={() => {
                                            const newQs = [...settings.security.questions];
                                            newQs.splice(idx, 1);
                                            updateSecurity({ questions: newQs });
                                        }} 
                                        className="text-red-400 hover:text-red-500"
                                        aria-label={t('action.delete_security_question', lang)}
                                    >
                                        <Trash2 className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <button 
                            onClick={cancelEditingSecurity} 
                            className={`p-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm`}
                            title={t('action.cancel', lang)}
                            aria-label={t('action.cancel_security_edit', lang)}
                        >
                            <X className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={saveSecurityConfig} 
                            className={`px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1`}
                            aria-label={t('action.save_security_settings', lang)}
                        >
                            <Save className="w-4 h-4"/>{t('action.confirm', lang)}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                    <p className="mb-1">{t('msg.security_desc', lang)}</p>
                    <p className="font-semibold">{t('settings.status', lang)}: {hasPassword ? t('settings.password_set', lang) : t('settings.no_password', lang)} / {hasQuestions ? t('settings.questions_set', lang) : t('settings.no_questions', lang)}</p>
                    <p className="text-xs mt-1 text-gray-500">
                        {t('settings.lockout_duration', lang)}: {settings.security.lockoutDurationSeconds} {t('label.seconds', lang)}
                    </p>
                </div>
            )}
            </CollapsibleSection>
        )}
    </div>
  );
};