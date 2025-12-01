
"use client";

import React, { useState, useEffect } from 'react';
import { AppSettings, Language, SecurityConfig, SecurityQuestion } from '../../types';
import { t } from '../../utils/i18n';
import CollapsibleSection from './CollapsibleSection';
import { Edit2, Plus, Trash2, X, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SecuritySettingsProps {
    localSettings: AppSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    lang: Language;
    isRainbow: boolean;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
    localSettings,
    setLocalSettings,
    lang,
    isRainbow,
}) => {
    const rainbowBorderClass = isRainbow ? 'border-animated-rainbow' : '';

    const [isEditingSecurity, setIsEditingSecurity] = useState(false);
    const [tempSecurityConfig, setTempSecurityConfig] = useState<SecurityConfig | null>(null);
    const [newQuestion, setNewQuestion] = useState({ q: '', a: '' });

    // Reset security editing state when security is toggled off
    useEffect(() => {
        if (!localSettings.security.enabled && isEditingSecurity) {
            cancelEditingSecurity();
        }
    }, [localSettings.security.enabled, isEditingSecurity]);

    // Automatically open security edit if enabled but no configs
    useEffect(() => {
        if (localSettings.security.enabled && !isEditingSecurity && !localSettings.security.password && localSettings.security.questions.length === 0) {
            startEditingSecurity();
        }
    }, [localSettings.security.enabled, isEditingSecurity, localSettings.security.password, localSettings.security.questions.length]);


    const startEditingSecurity = () => {
        setIsEditingSecurity(true);
        setTempSecurityConfig(JSON.parse(JSON.stringify(localSettings.security))); // Save current state for cancel
    };

    const saveSecurityConfig = () => {
        setIsEditingSecurity(false);
        setTempSecurityConfig(null);
        // localSettings.security is already updated via onChange handlers
    };

    const cancelEditingSecurity = () => {
        if (tempSecurityConfig) {
            setLocalSettings(prev => ({ ...prev, security: tempSecurityConfig }));
        }
        setIsEditingSecurity(false);
        setTempSecurityConfig(null);
    };

    const handleAddSecurityQuestion = () => {
        if (newQuestion.q && newQuestion.a) {
            setLocalSettings(prev => ({
                ...prev,
                security: {
                    ...prev.security,
                    questions: [...prev.security.questions, { id: uuidv4(), question: newQuestion.q, answer: newQuestion.a }]
                }
            }));
            setNewQuestion({ q: '', a: '' });
        }
    };

    const hasPassword = !!localSettings.security.password;
    const hasQuestions = localSettings.security.questions.length > 0;

    return (
        <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 ${rainbowBorderClass}`}>
                <span className="font-medium text-gray-900 dark:text-white">{t('settings.security', lang)}</span>
                <label htmlFor="security-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input 
                        id="security-toggle"
                        type="checkbox" 
                        className="sr-only peer"
                        checked={localSettings.security.enabled}
                        onChange={() => setLocalSettings(prev => ({...prev, security: {...prev.security, enabled: !prev.security.enabled}}))}
                        aria-label={t('settings.enable_security_lock', lang)}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
            </div>
            
            {localSettings.security.enabled && (
                <CollapsibleSection
                    id="security-details"
                    title={t('settings.security_details', lang)}
                    defaultOpen={isEditingSecurity} // Auto open if just enabled or no config
                    lang={lang}
                    isRainbow={isRainbow}
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
                                className={`w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${rainbowBorderClass}`}
                                value={localSettings.security.password || ''}
                                onChange={e => setLocalSettings(prev => ({...prev, security: {...prev.security, password: e.target.value}}))}
                                aria-label={t('input.password_field', lang)}
                            />
                            
                            <div>
                                <label htmlFor="lockout-duration-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('settings.lockout_duration', lang)} ({t('label.seconds', lang)})
                                </label>
                                <input
                                    id="lockout-duration-input"
                                    type="number"
                                    min="60" // sensible minimum, 1 minute
                                    step="60" // step in minutes (60 seconds)
                                    placeholder="86400" // 24 hours
                                    className={`w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900 dark:text-white ${rainbowBorderClass}`}
                                    value={localSettings.security.lockoutDurationSeconds || ''}
                                    onChange={e => setLocalSettings(prev => ({...prev, security: {...prev.security, lockoutDurationSeconds: parseInt(e.target.value) || undefined}}))}
                                    aria-label={t('settings.lockout_duration_input', lang)}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('settings.lockout_duration_desc', lang)}
                                </p>
                            </div>

                            <div className={`bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800/30 ${rainbowBorderClass}`}>
                                <h4 className="text-xs font-semibold text-primary-800 dark:text-primary-300 uppercase mb-3">{t('action.add_question', lang)}</h4>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        className={`flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none focus:border-primary-500 ${rainbowBorderClass}`}
                                        placeholder={t('input.question', lang)}
                                        value={newQuestion.q}
                                        onChange={e => setNewQuestion({...newQuestion, q: e.target.value})}
                                        aria-label={t('input.security_question_field', lang)}
                                    />
                                    <input 
                                        className={`flex-1 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none focus:border-primary-500 ${rainbowBorderClass}`}
                                        placeholder={t('input.answer', lang)}
                                        value={newQuestion.a}
                                        onChange={e => setNewQuestion({...newQuestion, a: e.target.value})}
                                        aria-label={t('input.security_answer_field', lang)}
                                    />
                                    <button 
                                        onClick={handleAddSecurityQuestion} 
                                        className={`bg-primary-600 hover:bg-primary-500 text-white p-2.5 rounded-lg shadow-sm transition-colors whitespace-nowrap ${rainbowBorderClass}`}
                                        aria-label={t('action.add_security_question', lang)}
                                    >
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {localSettings.security.questions.map((q, idx) => (
                                        <div key={q.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-300">{q.question}</span>
                                            <button 
                                                onClick={() => {
                                                    const newQs = [...localSettings.security.questions];
                                                    newQs.splice(idx, 1);
                                                    setLocalSettings(prev => ({...prev, security: {...prev.security, questions: newQs}}));
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
                                    className={`p-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm ${rainbowBorderClass}`}
                                    title={t('action.cancel', lang)}
                                    aria-label={t('action.cancel_security_edit', lang)}
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                <button 
                                    onClick={saveSecurityConfig} 
                                    className={`px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1 ${rainbowBorderClass}`}
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
                                {t('settings.lockout_duration', lang)}: {localSettings.security.lockoutDurationSeconds} {t('label.seconds', lang)}
                            </p>
                        </div>
                    )}
                </CollapsibleSection>
            )}
        </div>
    );
};

export default SecuritySettings;
