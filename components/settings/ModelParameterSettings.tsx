

"use client";

import React, { useState } from 'react';
import { AlertCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { AppSettings, Language } from '../../types';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../utils/i18n';

interface ModelParameterSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
}

export const ModelParameterSettings: React.FC<ModelParameterSettingsProps> = ({
  settings,
  onUpdateSettings,
  lang
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReset = () => {
    onUpdateSettings({
        ...settings,
        historyContextLimit: 0,
        generation: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            stream: false,
            thinkingBudget: 0,
            stripThoughts: false
        }
    });
  };

  return (
     <div className="space-y-4">
         {/* Notice about per-key model settings */}
         <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl text-sm text-primary-800 dark:text-primary-200 border border-primary-100 dark:border-primary-800/30 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{t('msg.model_url_moved', lang)}</p>
         </div>

        <CollapsibleSection id="ai-parameters" title={t('settings.ai_parameters', lang)} defaultOpen={true} lang={lang}>
            <div className="space-y-6">
                <div className="flex justify-end mb-2">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                        title={t('action.reset_default', lang)}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t('action.reset_default', lang)}
                    </button>
                </div>

                {/* Stream Toggle */}
                <div className="flex items-center justify-between">
                    <label htmlFor="stream-toggle" className="text-gray-700 dark:text-gray-300 font-medium text-sm">{t('param.stream', lang)}</label>
                    <label htmlFor="stream-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input 
                            id="stream-toggle"
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.generation.stream}
                            onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, stream: e.target.checked}})}
                            aria-label={t('param.stream_response_toggle', lang)}
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600`}></div>
                    </label>
                </div>

                {/* Strip Thoughts Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <label htmlFor="strip-thoughts-toggle" className="text-gray-700 dark:text-gray-300 font-medium text-sm block">{t('param.strip_thoughts', lang)}</label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('param.strip_thoughts_desc', lang)}</span>
                    </div>
                    <label htmlFor="strip-thoughts-toggle" className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                        <input 
                            id="strip-thoughts-toggle"
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.generation.stripThoughts || false}
                            onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, stripThoughts: e.target.checked}})}
                            aria-label={t('param.strip_thoughts', lang)}
                        />
                         <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600`}></div>
                    </label>
                </div>

                {/* Advanced Parameters Toggle */}
                <div className="pt-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                        {showAdvanced ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                        {t('settings.advanced_params', lang)}
                    </button>
                </div>
                
                {/* Advanced Parameters Content */}
                {showAdvanced && (
                    <div className="space-y-6 animate-fade-in-up pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="temperature-slider" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.temperature', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.generation.temperature}</span>
                            </div>
                            <input 
                                id="temperature-slider"
                                type="range" min="0" max="2" step="0.1"
                                value={settings.generation.temperature}
                                onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, temperature: parseFloat(e.target.value)}})}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
                                aria-label={t('param.temperature_slider', lang)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="top-p-slider" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.topP', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.generation.topP}</span>
                            </div>
                            <input 
                                id="top-p-slider"
                                type="range" min="0" max="1" step="0.05"
                                value={settings.generation.topP}
                                onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, topP: parseFloat(e.target.value)}})}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
                                aria-label={t('param.top_p_slider', lang)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="top-k-slider" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.topK', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.generation.topK}</span>
                            </div>
                            <input 
                                id="top-k-slider"
                                type="range" min="1" max="100" step="1"
                                value={settings.generation.topK}
                                onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, topK: parseInt(e.target.value)}})}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
                                aria-label={t('param.top_k_slider', lang)}
                            />
                        </div>

                        {/* Thinking Budget (Gemini 2.5) */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="thinking-budget-input" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.thinkingBudget', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">
                                    {settings.generation.thinkingBudget || 0}
                                </span>
                            </div>
                            <input 
                                id="thinking-budget-input"
                                type="range" min="0" max="32768" step="1024"
                                value={settings.generation.thinkingBudget || 0}
                                onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, thinkingBudget: parseInt(e.target.value)}})}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
                                aria-label={t('param.thinking_budget_input', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('param.thinkingBudget_desc', lang)}
                            </p>
                        </div>

                        {/* Context Limit */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="context-limit-input" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.historyContextLimit', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">
                                    {settings.historyContextLimit === 0 ? 'Unlimited' : settings.historyContextLimit}
                                </span>
                            </div>
                            <input 
                                id="context-limit-input"
                                type="range" min="0" max="50" step="2"
                                value={settings.historyContextLimit || 0}
                                onChange={(e) => onUpdateSettings({...settings, historyContextLimit: parseInt(e.target.value)})}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
                                aria-label={t('param.history_context_limit_input', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('param.historyContextLimit_desc', lang)}
                            </p>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="max-tokens-input" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.maxTokens', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.generation.maxOutputTokens}</span>
                            </div>
                            <input 
                                id="max-tokens-input"
                                type="number" 
                                value={settings.generation.maxOutputTokens}
                                onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, maxOutputTokens: parseInt(e.target.value)}})}
                                className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                                aria-label={t('param.max_output_tokens_input', lang)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleSection>
     </div>
  );
};