
import React, { useState } from 'react';
import { AlertCircle, RotateCcw, ChevronDown, ChevronUp, Brain, BookOpen } from 'lucide-react';
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
        enableAutoMemory: false,
        autoMemoryInterval: 20,
        generation: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            stream: false,
            thinkingBudget: 0,
            stripThoughts: false,
            frequencyPenalty: 0
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

        <CollapsibleSection id="ai-parameters" title={t('settings.ai_parameters', lang)} defaultOpen={false} lang={lang}>
            <div className="space-y-6">
                
                {/* Stream Toggle */}
                <div className="flex items-center justify-between">
                    <label htmlFor="stream-toggle" className="text-gray-700 dark:text-gray-300 font-medium text-sm">{t('param.stream', lang)}</label>
                    <label htmlFor="stream-toggle" className="toggle-switch-label">
                        <input 
                            id="stream-toggle"
                            type="checkbox" 
                            className="toggle-checkbox"
                            checked={settings.generation.stream}
                            onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, stream: e.target.checked}})}
                            aria-label={t('param.stream_response_toggle', lang)}
                        />
                        <div className="toggle-slider"></div>
                    </label>
                </div>

                {/* Thinking Budget (Gemini 2.5) */}
                <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                    <div className="flex justify-between text-sm mb-2 items-center">
                        <label htmlFor="thinking-budget-input" className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-500" />
                            {t('param.thinkingBudget', lang)}
                        </label>
                        <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-mono">
                            {settings.generation.thinkingBudget || 0}
                        </span>
                    </div>
                    <input 
                        id="thinking-budget-input"
                        type="range" min="0" max="32768" step="1024"
                        value={settings.generation.thinkingBudget || 0}
                        onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, thinkingBudget: parseInt(e.target.value)}})}
                        className="slider-standard accent-purple-500"
                        aria-label={t('param.thinking_budget_input', lang)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t('param.thinkingBudget_desc', lang)}
                    </p>
                </div>

                {/* Auto Role Memory Config */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <label htmlFor="auto-memory-toggle" className="text-gray-800 dark:text-gray-200 font-medium text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            {t('settings.enable_auto_memory', lang)}
                        </label>
                        <label htmlFor="auto-memory-toggle" className="toggle-switch-label">
                            <input 
                                id="auto-memory-toggle"
                                type="checkbox" 
                                className="toggle-checkbox"
                                checked={settings.enableAutoMemory || false}
                                onChange={(e) => onUpdateSettings({...settings, enableAutoMemory: e.target.checked})}
                            />
                            <div className="toggle-slider"></div>
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.auto_memory_desc', lang)}
                    </p>

                    {settings.enableAutoMemory && (
                        <div className="animate-fade-in-up pt-1 border-t border-blue-100 dark:border-blue-800/30 mt-2">
                            <div className="flex justify-between text-sm mb-2 items-center">
                                <label htmlFor="auto-memory-interval" className="text-gray-700 dark:text-gray-300 font-medium text-xs">
                                    {t('settings.auto_memory_interval', lang)}
                                </label>
                                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-mono">
                                    {settings.autoMemoryInterval || 20}
                                </span>
                            </div>
                            <input 
                                id="auto-memory-interval"
                                type="range" min="2" max="100" step="1"
                                value={settings.autoMemoryInterval || 20}
                                onChange={(e) => onUpdateSettings({...settings, autoMemoryInterval: parseInt(e.target.value)})}
                                className="slider-standard accent-blue-500"
                                aria-label={t('param.auto_memory_interval_input', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('settings.auto_memory_interval_desc', lang)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Strip Thoughts Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <label htmlFor="strip-thoughts-toggle" className="text-gray-700 dark:text-gray-300 font-medium text-sm block">{t('param.strip_thoughts', lang)}</label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('param.strip_thoughts_desc', lang)}</span>
                    </div>
                    <label htmlFor="strip-thoughts-toggle" className="toggle-switch-label ml-4 flex-shrink-0">
                        <input 
                            id="strip-thoughts-toggle"
                            type="checkbox" 
                            className="toggle-checkbox"
                            checked={settings.generation.stripThoughts || false}
                            onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, stripThoughts: e.target.checked}})}
                            aria-label={t('param.strip_thoughts', lang)}
                        />
                         <div className="toggle-slider"></div>
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
                                className="slider-standard"
                                aria-label={t('param.temperature_slider', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('param.temperature_desc', lang)}
                            </p>
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
                                className="slider-standard"
                                aria-label={t('param.top_p_slider', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('param.topP_desc', lang)}
                            </p>
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
                                className="slider-standard"
                                aria-label={t('param.top_k_slider', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('param.topK_desc', lang)}
                            </p>
                        </div>

                        {/* Frequency Penalty */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="frequency-penalty-slider" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.frequencyPenalty', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.generation.frequencyPenalty || 0}</span>
                            </div>
                            <input 
                                id="frequency-penalty-slider"
                                type="range" min="0" max="2" step="0.1"
                                value={settings.generation.frequencyPenalty || 0}
                                onChange={(e) => onUpdateSettings({...settings, generation: {...settings.generation, frequencyPenalty: parseFloat(e.target.value)}})}
                                className="slider-standard"
                                aria-label={t('param.frequency_penalty_slider', lang)}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('param.frequencyPenalty_desc', lang)}
                            </p>
                        </div>

                        {/* Context Limit */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label htmlFor="context-limit-input" className="text-gray-700 dark:text-gray-300 font-medium">{t('param.historyContextLimit', lang)}</label>
                                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">
                                    {settings.historyContextLimit === 0 ? t('label.unlimited', lang) : settings.historyContextLimit}
                                </span>
                            </div>
                            <input 
                                id="context-limit-input"
                                type="range" min="0" max="50" step="2"
                                value={settings.historyContextLimit || 0}
                                onChange={(e) => onUpdateSettings({...settings, historyContextLimit: parseInt(e.target.value)})}
                                className="slider-standard"
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
                                className="input-standard"
                                aria-label={t('param.max_output_tokens_input', lang)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={handleReset}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                                title={t('action.reset_default', lang)}
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                {t('action.reset_default', lang)}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </CollapsibleSection>
     </div>
  );
};