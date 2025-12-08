

"use client";

import React, { useState, useEffect } from 'react';
import { Key, RotateCw, RefreshCw, Server, ChevronDown, ChevronUp, Network, Copy, Download, Trash2, GripVertical } from 'lucide-react';
import { KeyConfig, Language, ModelProvider, ModelInfo, KeyGroup } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { t } from '../../utils/i18n';
import { ModelSelect } from '../ui/ModelSelect';

interface KeyConfigCardProps {
  config: KeyConfig;
  index: number;
  onUpdate: (updates: Partial<KeyConfig>) => void;
  onRemove: () => void;
  onSyncModel: () => void;
  onUpdateKnownModels: (models: ModelInfo[]) => void;
  lang: Language;
  geminiService: GeminiService | null;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  sharedModels: string[];
  enableGrouping?: boolean;
  groups?: KeyGroup[];
  
  // Drag and Drop props
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export const KeyConfigCard: React.FC<KeyConfigCardProps> = ({ 
  config, 
  onUpdate, 
  onRemove, 
  onSyncModel, 
  onUpdateKnownModels, 
  lang, 
  geminiService, 
  onShowToast, 
  sharedModels, 
  enableGrouping, 
  groups, 
  index,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isEditingKey, setIsEditingKey] = useState(false);
    const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
    
    // Load cached models specific to this key
    useEffect(() => {
        const cacheKey = `gemini_model_cache_${config.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setAvailableModels(JSON.parse(cached));
            } catch(e) { /* ignore */ }
        }
    }, [config.id]);

    /**
     * 测试 API 密钥连接
     * Test the connection for this specific API key.
     */
    const handleTest = async () => {
        if (!geminiService || !config.key) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const success = await geminiService.testConnection(config);
            setTestResult(success);
            if (success) {
                onShowToast(t('msg.connection_success', lang), 'success');
            } else {
                onShowToast(t('msg.connection_failed', lang), 'error');
            }
        } catch (e: any) {
            if (e.message === 'error.call_in_progress') {
                onShowToast(t('error.call_in_progress', lang), 'error');
            } else {
                onShowToast(t('msg.connection_failed', lang), 'error');
            }
            setTestResult(false);
        } finally {
            setIsTesting(false);
            setTimeout(() => setTestResult(null), 3000);
        }
    };

    /**
     * 获取可用模型列表
     * Fetch the list of available models using this API key.
     */
    const handleFetchModels = async () => {
        if (!geminiService || !config.key) return;
        setIsFetching(true);
        try {
            const modelsInfo = await geminiService.listModels(config);
            const modelNames = modelsInfo.map(m => m.name);
            
            if (modelNames.length > 0) {
                setAvailableModels(modelNames);
                localStorage.setItem(`gemini_model_cache_${config.id}`, JSON.stringify(modelNames));
                
                // Update global known models with limits via callback
                // Only for Google provider to separate lists
                if (config.provider === 'google') {
                    onUpdateKnownModels(modelsInfo);
                }

                if (!config.model) onUpdate({ model: modelNames[0] });
                onShowToast(t('msg.fetch_success_count', lang).replace('{count}', modelNames.length.toString()), 'success');
            } else {
                onShowToast(t('msg.fetch_no_models', lang), 'info');
            }
        } catch (e: any) {
            if (e.message === 'error.call_in_progress') {
                onShowToast(t('error.call_in_progress', lang), 'error');
            } else {
                onShowToast(t('msg.fetch_error', lang), 'error');
            }
        } finally {
            setIsFetching(false);
        }
    };

    /**
     * 导出密钥配置
     * Export this single key configuration to a JSON file.
     */
    const handleExportConfig = () => {
        const data = {
            type: 'omnichat_key_config',
            version: 1,
            config: config,
            cachedModels: availableModels
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `key_config_${config.provider}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onShowToast(t('msg.config_exported', lang), 'success');
    };

    /**
     * 掩码显示密钥
     * Helper to mask the API key for display.
     * @param key - The API key string.
     */
    const getMaskedKey = (key: string) => {
        if (!key || key.length < 8) return '********';
        return `...${key.substring(key.length - 4)}`;
    };

    // Combine local availableModels with sharedModels if provider is google
    const displayModels = config.provider === 'google' 
        ? Array.from(new Set([...availableModels, ...sharedModels])) 
        : availableModels;

    const Header = (
        <div 
            className="flex items-center gap-3 w-full cursor-pointer select-none" 
            onClick={() => {
                setIsExpanded(!isExpanded);
                if (isExpanded) setIsModelSelectOpen(false); // Reset dropdown state on close
            }}
        >
            {/* Drag Handle */}
            {draggable && (
                <div 
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    onMouseDown={(e) => {
                        // Prevent click from toggling accordion when grabbing handle
                         e.stopPropagation(); 
                    }}
                    // Ensure the parent's drag events fire
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            )}

            {/* Key Index */}
            <div className="flex-shrink-0 w-5 text-center text-xs font-mono font-medium text-gray-400">
                {index}
            </div>

             {/* Provider Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config.provider === 'openai' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
               {config.provider === 'openai' ? <Server className="w-4 h-4" /> : <Network className="w-4 h-4" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                        {config.model || t('input.model_placeholder', lang)}
                    </span>
                    {config.key && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{getMaskedKey(config.key)}</span>}
                </div>
                <div className="text-[10px] text-gray-500 truncate flex gap-2">
                    <span>{config.provider === 'google' ? 'Google Gemini' : 'OpenAI Compatible'}</span>
                    {config.provider === 'openai' && config.baseUrl && <span>• {config.baseUrl}</span>}
                </div>
            </div>

             {/* Error Code Badge - Displayed when inactive due to error */}
             {config.lastErrorCode && !config.isActive && (
                 <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800 mr-2" title="Last Error Code">
                     {config.lastErrorCode}
                 </span>
             )}

             {/* Controls */}
             <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => onUpdate({ isActive: !config.isActive, lastErrorCode: undefined })} // Clear error code on toggle
                    className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${config.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    aria-label={config.isActive ? t('action.deactivate_key', lang) : t('action.activate_key', lang)}
                >
                     <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${config.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
             </div>
             
             <div className="text-gray-400">
                 {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </div>
        </div>
    );

    return (
        <div 
            className={`p-3 rounded-xl border transition-all duration-300 relative ${config.isActive ? 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-60'} ${isModelSelectOpen ? 'z-20' : ''}`}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
        >
            {Header}

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-3 animate-fade-in-up"> 
                    
                    {/* Row 1: Provider, Group (if enabled), Base URL */}
                    <div className="flex flex-col sm:flex-row gap-3">
                         <div className="relative flex-1">
                             <select
                                value={config.provider}
                                onChange={(e) => onUpdate({ provider: e.target.value as ModelProvider, baseUrl: e.target.value === 'openai' ? 'https://api.openai.com/v1' : '' })}
                                className={`appearance-none w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs py-2 pl-3 pr-8 outline-none font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/20`}
                                aria-label={t('settings.model_provider_select', lang)}
                            >
                                <option value="google">Google Gemini</option>
                                <option value="openai">OpenAI Compatible</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                        </div>
                        
                        {enableGrouping && (
                            <div className="relative flex-1">
                                <select
                                    value={config.groupId || ''}
                                    onChange={(e) => onUpdate({ groupId: e.target.value || undefined })} // Empty string means undefined (unassigned)
                                    className={`appearance-none w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs py-2 pl-3 pr-8 outline-none font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/20`}
                                    aria-label={t('label.group', lang)}
                                >
                                    <option value="">{t('label.no_group', lang)}</option>
                                    {(groups || []).map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                            </div>
                        )}

                         {config.provider === 'openai' && (
                            <div className="flex items-center gap-2 group flex-[2]">
                                <div className={`p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md`}>
                                    <Server className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder={t('input.base_url_placeholder', lang)}
                                    className={`flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 text-xs py-1.5 outline-none font-mono text-gray-600 dark:text-gray-400 focus:border-primary-500 transition-colors`}
                                    value={config.baseUrl || ''}
                                    onChange={(e) => onUpdate({ baseUrl: e.target.value })}
                                    aria-label={t('input.base_url_field', lang)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Row 2: API Key Input */}
                    <div className={`flex items-center gap-2 bg-gray-50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus-within:border-primary-400 dark:focus-within:border-primary-600 transition-colors cursor-text`} onClick={() => setIsEditingKey(true)}>
                        <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {isEditingKey ? (
                                <input 
                                type="text" 
                                autoFocus
                                placeholder={t('input.apikey_placeholder', lang)}
                                className="flex-1 bg-transparent text-sm outline-none font-mono text-gray-800 dark:text-gray-200 min-w-0"
                                value={config.key}
                                onChange={(e) => onUpdate({ key: e.target.value })}
                                onBlur={() => setIsEditingKey(false)}
                                aria-label={t('input.apikey_field', lang)}
                            />
                        ) : (
                            <span className="flex-1 text-sm font-mono text-gray-500 dark:text-gray-400 truncate select-none">
                                {config.key ? config.key : <span className="text-gray-400 italic opacity-50">{t('input.apikey_placeholder', lang)}</span>}
                            </span>
                        )}
                    </div>

                    {/* Row 3: Actions & Model Select */}
                    <div className="flex items-center gap-2 flex-wrap">
                        
                         <div className={`flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700`} title={t('settings.poll_count', lang)}>
                            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{t('label.poll_count', lang)}:</span>
                            <input 
                                type="number" min="1" max="100"
                                value={config.usageLimit}
                                onChange={(e) => onUpdate({ usageLimit: parseInt(e.target.value) || 1 })}
                                className="w-8 bg-transparent text-xs text-center outline-none font-mono text-gray-800 dark:text-gray-200"
                                aria-label={t('label.poll_count_input', lang)}
                            />
                        </div>
                        
                        <button 
                            onClick={handleExportConfig}
                            className="px-2 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5 text-xs font-medium"
                            title={t('action.export_key', lang)}
                            aria-label={t('action.export_key', lang)}
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('action.export_key', lang)}</span>
                        </button>

                         <button 
                            onClick={handleTest}
                            disabled={isTesting || !config.key}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm border justify-center whitespace-nowrap min-w-[70px] ${
                                testResult === true ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400' :
                                testResult === false ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
                                'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            title={t('action.test_key', lang)}
                            aria-label={t('action.test_key_connection', lang)}
                        >
                            {isTesting ? <RotateCw className="w-3 h-3 animate-spin"/> : <Network className="w-3 h-3"/>}
                            {testResult === true ? t('action.ok', lang) : testResult === false ? t('action.error', lang) : t('action.test', lang)}
                        </button>

                         <button 
                            onClick={onRemove} 
                            className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800 whitespace-nowrap"
                            title={t('action.delete_key', lang)}
                            aria-label={t('action.delete_api_key', lang)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <div className={`relative flex-1 flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all z-10`}>
                            
                            <ModelSelect 
                               value={config.model || ''}
                               onChange={(val) => onUpdate({ model: val })}
                               options={displayModels}
                               placeholder={t('input.model_placeholder', lang)}
                               className="static flex-1"
                               emptyMessage={t('msg.fetch_models_hint', lang)}
                               onOpenChange={setIsModelSelectOpen}
                            />
                        </div>
                        
                        <button 
                            onClick={onSyncModel}
                            disabled={!config.model}
                            className={`px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 text-xs transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={t('action.sync_model', lang)}
                            aria-label={t('action.sync_model_config', lang)}
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>

                         <button 
                            onClick={handleFetchModels}
                            disabled={isFetching || !config.key}
                            className={`px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
                            title={t('action.fetch_models', lang)}
                            aria-label={t('action.fetch_models_list', lang)}
                        >
                           <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                           <span className="hidden sm:inline">{t('action.fetch', lang)}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}