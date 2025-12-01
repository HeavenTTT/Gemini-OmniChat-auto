
"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';
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
  return (
     <div className="space-y-4">
         {/* Notice about per-key model settings */}
         <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl text-sm text-primary-800 dark:text-primary-200 border border-primary-100 dark:border-primary-800/30 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{t('msg.model_url_moved', lang)}</p>
         </div>

        <CollapsibleSection id="ai-parameters" title={t('settings.ai_parameters', lang)} defaultOpen={true} lang={lang}>
            <div className="space-y-6">
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
        </CollapsibleSection>
     </div>
  );
};
