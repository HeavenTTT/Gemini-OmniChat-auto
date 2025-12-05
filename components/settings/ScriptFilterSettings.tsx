
"use client";

import React, { useRef } from 'react';
import { Upload, FileCode, Download, Trash2, FileText, Code } from 'lucide-react';
import { AppSettings, Language } from '../../types';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../utils/i18n';
import { EXAMPLE_INPUT_FILTER, EXAMPLE_OUTPUT_FILTER } from '../../utils/filterScriptExamples';

interface ScriptFilterSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ScriptFilterSettings: React.FC<ScriptFilterSettingsProps> = ({
  settings,
  onUpdateSettings,
  lang,
  onShowToast
}) => {
  const inputScriptRef = useRef<HTMLInputElement>(null);
  const outputScriptRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'input' | 'output') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (type === 'input') {
        onUpdateSettings({
          ...settings,
          scripts: {
            ...settings.scripts,
            inputFilterCode: content,
            inputFileName: file.name,
            inputFilterEnabled: true
          }
        });
      } else {
        onUpdateSettings({
          ...settings,
          scripts: {
            ...settings.scripts,
            outputFilterCode: content,
            outputFileName: file.name,
            outputFilterEnabled: true
          }
        });
      }
      onShowToast(t('msg.script_loaded', lang), 'success');
      // Reset input value to allow re-uploading same file if needed
      if (type === 'input' && inputScriptRef.current) inputScriptRef.current.value = '';
      if (type === 'output' && outputScriptRef.current) outputScriptRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDownloadExample = (type: 'input' | 'output') => {
    const content = type === 'input' ? EXAMPLE_INPUT_FILTER : EXAMPLE_OUTPUT_FILTER;
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'input' ? 'example_input_filter.js' : 'example_output_filter.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = (type: 'input' | 'output') => {
    if (type === 'input') {
      onUpdateSettings({
        ...settings,
        scripts: { ...settings.scripts, inputFilterCode: '', inputFileName: '', inputFilterEnabled: false }
      });
    } else {
      onUpdateSettings({
        ...settings,
        scripts: { ...settings.scripts, outputFilterCode: '', outputFileName: '', outputFilterEnabled: false }
      });
    }
  };

  const renderSection = (type: 'input' | 'output', title: string) => {
    const isEnabled = type === 'input' ? settings.scripts?.inputFilterEnabled : settings.scripts?.outputFilterEnabled;
    const fileName = type === 'input' ? settings.scripts?.inputFileName : settings.scripts?.outputFileName;
    const code = type === 'input' ? settings.scripts?.inputFilterCode : settings.scripts?.outputFilterCode;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                {type === 'input' ? <FileText className="w-4 h-4 text-blue-500" /> : <Code className="w-4 h-4 text-green-500" />}
                {title}
            </h4>
            <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={!!isEnabled}
                    disabled={!code}
                    onChange={(e) => {
                        const val = e.target.checked;
                        onUpdateSettings({
                            ...settings,
                            scripts: {
                                ...settings.scripts,
                                [type === 'input' ? 'inputFilterEnabled' : 'outputFilterEnabled']: val
                            }
                        });
                    }}
                />
                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 ${!code ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
            </label>
        </div>

        {fileName ? (
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileCode className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">{fileName}</span>
                </div>
                <button onClick={() => handleClear(type)} className="text-gray-400 hover:text-red-500 p-1" title={t('action.clear_script', lang)}>
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ) : (
            <div className="text-xs text-gray-400 italic text-center py-2 bg-gray-50/50 dark:bg-gray-900/30 rounded border border-dashed border-gray-200 dark:border-gray-700">
                No script loaded
            </div>
        )}

        <div className="flex gap-2">
            <button 
                onClick={() => type === 'input' ? inputScriptRef.current?.click() : outputScriptRef.current?.click()}
                className="flex-1 py-2 text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors flex items-center justify-center gap-1.5"
            >
                <Upload className="w-3.5 h-3.5" /> {t('action.upload_script', lang)}
            </button>
            <button 
                onClick={() => handleDownloadExample(type)}
                className="py-2 px-3 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={t('action.download_example', lang)}
            >
                <Download className="w-3.5 h-3.5" />
            </button>
        </div>

        <input 
            type="file" 
            ref={type === 'input' ? inputScriptRef : outputScriptRef} 
            onChange={(e) => handleFileUpload(e, type)} 
            accept=".js,.ts,.txt" 
            className="hidden" 
        />
      </div>
    );
  };

  return (
    <CollapsibleSection id="scripts" title={t('settings.scripts', lang)} lang={lang}>
        <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                {t('settings.script_desc', lang)}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
                {renderSection('input', t('settings.input_filter', lang))}
                {renderSection('output', t('settings.output_filter', lang))}
            </div>
        </div>
    </CollapsibleSection>
  );
};
