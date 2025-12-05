

"use client";

import React from 'react';
import { AppSettings, Language, Theme, TextWrappingMode } from '../../types';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../utils/i18n';

interface GeneralAppearanceSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
}

export const GeneralAppearanceSettings: React.FC<GeneralAppearanceSettingsProps> = ({
  settings,
  onUpdateSettings,
  lang
}) => {
  return (
    <div className="space-y-4">
      {/* Language & Theme */}
      <CollapsibleSection id="general-settings" title={t('settings.general', lang)} defaultOpen={true} lang={lang}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="language-select" className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('settings.language', lang)}</label>
            <select 
              id="language-select"
              value={settings.language}
              onChange={(e) => onUpdateSettings({...settings, language: e.target.value as Language})}
              className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all`}
              aria-label={t('settings.language_select', lang)}
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div>
            <label htmlFor="theme-select" className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('settings.theme', lang)}</label>
            <select 
              id="theme-select"
              value={settings.theme}
              onChange={(e) => onUpdateSettings({...settings, theme: e.target.value as Theme})}
              className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all`}
              aria-label={t('settings.theme_select', lang)}
            >
              <option value="light">{t('theme.light', lang)}</option>
              <option value="dark">{t('theme.dark', lang)}</option>
              <option value="twilight">{t('theme.twilight', lang)}</option>
              <option value="sky">{t('theme.sky', lang)}</option>
              <option value="pink">{t('theme.pink', lang)}</option>
              <option value="sunrise">{t('theme.sunrise', lang)}</option>
              <option value="lime">{t('theme.lime', lang)}</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Appearance */}
      <CollapsibleSection id="appearance-settings" title={t('settings.appearance', lang)} lang={lang}>
        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label htmlFor="font-size-slider" className="text-gray-700 dark:text-gray-300 font-medium">{t('settings.font_size', lang)}</label>
              <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.fontSize}px</span>
            </div>
            <input 
              id="font-size-slider"
              type="range" min="12" max="24" step="1"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({...settings, fontSize: parseInt(e.target.value)})}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
              aria-label={t('settings.font_size_slider', lang)}
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label htmlFor="bubble-transparency-slider" className="text-gray-700 dark:text-gray-300 font-medium">{t('settings.bubble_transparency', lang)}</label>
              <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{settings.bubbleTransparency}%)</span>
            </div>
            <input 
              id="bubble-transparency-slider"
              type="range" min="0" max="100" step="5"
              value={settings.bubbleTransparency}
              onChange={(e) => onUpdateSettings({...settings, bubbleTransparency: parseInt(e.target.value)})}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600`}
              aria-label={t('settings.bubble_transparency_slider', lang)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="show-model-name-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.show_model_name', lang)}</label>
            <label htmlFor="show-model-name-toggle" className="relative inline-flex items-center cursor-pointer">
                <input 
                    id="show-model-name-toggle"
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.showModelName}
                    onChange={(e) => onUpdateSettings({...settings, showModelName: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="kirby-color-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.kirby_theme_color', lang)}</label>
            <label htmlFor="kirby-color-toggle" className="relative inline-flex items-center cursor-pointer">
                <input 
                    id="kirby-color-toggle"
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.kirbyThemeColor}
                    onChange={(e) => onUpdateSettings({...settings, kirbyThemeColor: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
            <label htmlFor="text-wrapping-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.text_wrapping', lang)}</label>
            <select 
              id="text-wrapping-select"
              value={settings.textWrapping}
              onChange={(e) => onUpdateSettings({...settings, textWrapping: e.target.value as TextWrappingMode})}
              className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all`}
              aria-label={t('settings.text_wrapping_select', lang)}
            >
              <option value="default">{t('wrap.default', lang)}</option>
              <option value="forced">{t('wrap.forced', lang)}</option>
              <option value="auto">{t('wrap.auto', lang)}</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};