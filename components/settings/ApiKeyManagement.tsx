
"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, RotateCw, RefreshCw, CheckCircle, AlertCircle, Edit2, ChevronDown, Server, Link, Activity, Power, Copy, Network } from 'lucide-react';
import { KeyConfig, Language, ModelProvider, GeminiModel } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from '../../services/geminiService';
import { t } from '../../utils/i18n';
import CollapsibleSection from './CollapsibleSection';

interface ApiKeyManagementProps {
  localKeys: KeyConfig[];
  setLocalKeys: React.Dispatch<React.SetStateAction<KeyConfig[]>>;
  lang: Language;
  geminiService: GeminiService | null;
  isRainbow: boolean;
}

interface KeyConfigCardProps {
    config: KeyConfig;
    onUpdate: (updates: Partial<KeyConfig>) => void;
    onRemove: () => void;
    onSyncModel: () => void;
    lang: Language;
    geminiService: GeminiService | null;
    isRainbow: boolean;
    // Drag and drop props
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    // Fix: Add missing onDragLeave and onDrop to interface
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    className?: string; // To apply drag styles
}

// --- Key Config Card Component ---
const KeyConfigCard: React.FC<KeyConfigCardProps> = ({ config, onUpdate, onRemove, onSyncModel, lang, geminiService, isRainbow, draggable, onDragStart, onDragEnter, onDragEnd, onDragOver, onDragLeave, onDrop, className }) => {
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isEditingKey, setIsEditingKey] = useState(false);
    
    // Load cached models specific to this key (or generic cache)
    useEffect(() => {
        const cacheKey = `gemini_model_cache_${config.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setAvailableModels(JSON.parse(cached));
            } catch(e) { /* ignore */ }
        }
    }, [config.id]);

    const handleTest = async () => {
        if (!geminiService || !config.key) return;
        setIsTesting(true);
        setTestResult(null);
        // Test connection using the service
        const success = await geminiService.testConnection(config);
        setTestResult(success);
        setIsTesting(false);
        setTimeout(() => setTestResult(null), 3000);
    };

    const handleFetchModels = async () => {
        if (!geminiService || !config.key) return;
        setIsFetching(true);
        try {
            // Fetch models for the specific provider
            const models = await geminiService.listModels(config);
            if (models.length > 0) {
                setAvailableModels(models);
                localStorage.setItem(`gemini_model_cache_${config.id}`, JSON.stringify(models));
                // If it's a new key without a model, set the first one
                if (!config.model) onUpdate({ model: models[0] });
                // Small toast/alert
                alert(`${models.length} ${t('msg.fetch_success', lang)}`);
            } else {
                alert(t('msg.fetch_no_models', lang));
            }
        } catch (e) {
            alert(t('msg.fetch_error', lang));
        } finally {
            setIsFetching(false);
        }
    };

    const getMaskedKey = (key: string) => {
        if (!key || key.length < 8) return '********';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    const rainbowBorderClass = isRainbow ? 'border-animated-rainbow' : '';

    return (
        <div 
            className={`p-4 rounded-xl border transition-all duration-300 ${config.isActive ? 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-60'} ${rainbowBorderClass} ${className || ''}`}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="flex flex-col gap-3">
                {/* Row 1: Provider & Delete Button */}
                <div className="flex justify-between items-center">
                    <div className="relative flex-1 mr-2">
                         <select
                            value={config.provider}
                            onChange={(e) => onUpdate({ provider: e.target.value as ModelProvider, baseUrl: e.target.value === 'openai' ? 'https://api.openai.com/v1' : '' })}
                            className={`appearance-none w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs py-2 pl-3 pr-8 outline-none font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/20 ${rainbowBorderClass}`}
                            aria-label={t('settings.model_provider_select', lang)}
                        >
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI Compatible</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                    {/* Delete Button - Moved here */}
                    <button 
                        onClick={onRemove} 
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800 whitespace-nowrap"
                        title={t('action.delete_key', lang)}
                        aria-label={t('action.delete_api_key', lang)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Row 2: API Key Input (Full width) */}
                <div className={`flex items-center gap-2 bg-gray-50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus-within:border-primary-400 dark:focus-within:border-primary-600 transition-colors cursor-text ${rainbowBorderClass}`} onClick={() => setIsEditingKey(true)}>
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
                            {config.key ? getMaskedKey(config.key) : <span className="text-gray-400 italic opacity-50">{t('input.apikey_placeholder', lang)}</span>}
                        </span>
                    )}
                </div>

                {/* Row 3: Action Buttons (Activation, Poll, Test) */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Activation Toggle */}
                    <button 
                        onClick={() => onUpdate({ isActive: !config.isActive })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all flex-1 justify-center border whitespace-nowrap ${
                            config.isActive 
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                                : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        } ${rainbowBorderClass}`}
                        title={config.isActive ? t('action.deactivate', lang) : t('action.activate', lang)}
                        aria-label={config.isActive ? t('action.deactivate_key', lang) : t('action.activate_key', lang)}
                    >
                        {config.isActive ? <Power className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5 opacity-50" />}
                        {config.isActive ? t('status.active', lang) : t('status.inactive', lang)}
                    </button>

                     {/* Polling Count */}
                     <div className={`flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 ${rainbowBorderClass}`} title={t('settings.poll_count', lang)}>
                        <Activity className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{t('label.poll_count', lang)}:</span>
                        <input 
                            type="number" min="1" max="100"
                            value={config.usageLimit}
                            onChange={(e) => onUpdate({ usageLimit: parseInt(e.target.value) || 1 })}
                            className="w-8 bg-transparent text-xs text-center outline-none font-mono text-gray-800 dark:text-gray-200"
                            aria-label={t('label.poll_count_input', lang)}
                        />
                    </div>
                    
                    {/* Test Button */}
                     <button 
                        onClick={handleTest}
                        disabled={isTesting || !config.key}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm border flex-1 justify-center whitespace-nowrap ${
                            testResult === true ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400' :
                            testResult === false ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
                            'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } ${rainbowBorderClass}`}
                        title={t('action.test_key', lang)}
                        aria-label={t('action.test_key_connection', lang)}
                    >
                        {isTesting ? <RotateCw className="w-3 h-3 animate-spin"/> : <Network className="w-3 h-3"/>}
                        {testResult === true ? t('action.ok', lang) : testResult === false ? t('action.error', lang) : t('action.test', lang)}
                    </button>
                </div>

                {/* Row 4: Base URL (Conditional) */}
                {config.provider === 'openai' && (
                    <div className="flex items-center gap-2 group">
                        <div className={`p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md ${rainbowBorderClass}`}>
                            <Server className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder={t('input.base_url_placeholder', lang)}
                            className={`flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 text-xs py-1.5 outline-none font-mono text-gray-600 dark:text-gray-400 focus:border-primary-500 transition-colors ${rainbowBorderClass}`}
                            value={config.baseUrl || ''}
                            onChange={(e) => onUpdate({ baseUrl: e.target.value })}
                            aria-label={t('input.base_url_field', lang)}
                        />
                    </div>
                )}

                {/* Row 5: Model Selector */}
                <div className="flex items-center gap-2 mt-1">
                    <div className={`flex-1 flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all ${rainbowBorderClass}`}>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('label.model', lang)}</span>
                        <input 
                           type="text"
                           list={`models-${config.id}`}
                           className="flex-1 bg-transparent text-xs outline-none font-medium text-gray-700 dark:text-gray-200 min-w-0"
                           placeholder={t('input.model_placeholder', lang)}
                           value={config.model || ''}
                           onChange={(e) => onUpdate({ model: e.target.value })}
                           aria-label={t('input.model_field', lang)}
                        />
                        <datalist id={`models-${config.id}`}>
                            {availableModels.map(m => <option key={m} value={m} />)}
                        </datalist>
                    </div>
                    
                    {/* Sync Model Button */}
                    <button 
                        onClick={onSyncModel}
                        disabled={!config.model}
                        className={`px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 text-xs transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${rainbowBorderClass}`}
                        title={t('action.sync_model', lang)}
                        aria-label={t('action.sync_model_config', lang)}
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>

                     <button 
                        onClick={handleFetchModels}
                        disabled={isFetching || !config.key}
                        className={`px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${rainbowBorderClass}`}
                        title={t('action.fetch_models', lang)}
                        aria-label={t('action.fetch_models_list', lang)}
                    >
                       <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                       <span className="hidden sm:inline">{t('action.fetch', lang)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const ApiKeyManagement: React.FC<ApiKeyManagementProps> = ({ localKeys, setLocalKeys, lang, geminiService, isRainbow }) => {
    const rainbowBorderClass = isRainbow ? 'border-animated-rainbow' : '';

    const handleAddKey = () => {
        setLocalKeys([
          ...localKeys, 
          {
            id: uuidv4(),
            key: '',
            provider: 'google',
            isActive: true,
            usageLimit: 1,
            isRateLimited: false,
            lastUsed: 0,
            model: GeminiModel.FLASH, // Default model for new keys
            baseUrl: ''
          }
        ]);
    };

    const handleRemoveKey = (id: string) => {
        setLocalKeys(localKeys.filter(k => k.id !== id));
    };
    
    const handleUpdateKey = (id: string, updates: Partial<KeyConfig>) => {
        setLocalKeys(localKeys.map(k => k.id === id ? { ...k, ...updates } : k));
    };

    const handleSyncModel = (sourceId: string) => {
        const sourceKey = localKeys.find(k => k.id === sourceId);
        if (!sourceKey || !sourceKey.model) return;
        
        const count = localKeys.filter(k => k.id !== sourceId && k.provider === sourceKey.provider).length;
        if (count === 0) {
             alert(t('msg.sync_no_targets', lang));
             return;
        }
        
        if (confirm(t('msg.confirm_sync_model', lang).replace('{model}', sourceKey.model).replace('{count}', count.toString()))) {
             setLocalKeys(localKeys.map(k => {
                 if (k.id !== sourceId && k.provider === sourceKey.provider) {
                     return { ...k, model: sourceKey.model };
                 }
                 return k;
             }));
        }
    };

    // --- Drag and Drop Logic ---
    const [draggedKeyId, setDraggedKeyId] = useState<string | null>(null);
    const [dragOverKeyId, setDragOverKeyId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedKeyId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        e.currentTarget.classList.add('opacity-50', 'border-primary-500'); // Visual feedback for dragged item
    };

    const handleDragEnter = (e: React.DragEvent, id: string) => {
        e.preventDefault(); // Necessary to allow drop
        if (id !== draggedKeyId) {
            setDragOverKeyId(id);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if leaving the current drag-over target
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setDragOverKeyId(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedKeyId || !dragOverKeyId || draggedKeyId === dragOverKeyId) {
            setDraggedKeyId(null);
            setDragOverKeyId(null);
            return;
        }

        const newKeys = [...localKeys];
        const draggedIndex = newKeys.findIndex(k => k.id === draggedKeyId);
        const dragOverIndex = newKeys.findIndex(k => k.id === dragOverKeyId);

        if (draggedIndex === -1 || dragOverIndex === -1) {
            setDraggedKeyId(null);
            setDragOverKeyId(null);
            return;
        }

        const [removed] = newKeys.splice(draggedIndex, 1);
        newKeys.splice(dragOverIndex, 0, removed);
        setLocalKeys(newKeys);
        setDraggedKeyId(null);
        setDragOverKeyId(null);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50', 'border-primary-500');
        setDraggedKeyId(null);
        setDragOverKeyId(null);
    };

    return (
        <CollapsibleSection 
            id="api-keys-config"
            title={t('settings.api_keys_pool', lang)} 
            defaultOpen={true}
            lang={lang}
            isRainbow={isRainbow}
            rightElement={
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {localKeys.filter(k => k.isActive).length} {t('status.active', lang)}
                    </span>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex justify-end">
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-primary-600 hover:underline"
                        aria-label={t('action.get_gemini_api_key', lang)}
                    >
                        <Link className="w-3 h-3" />
                        {t('action.get_api_key', lang)}
                    </a>
                </div>

                {localKeys.map((keyConfig) => (
                    <KeyConfigCard 
                        key={keyConfig.id} 
                        config={keyConfig} 
                        onUpdate={(updates) => handleUpdateKey(keyConfig.id, updates)}
                        onRemove={() => handleRemoveKey(keyConfig.id)}
                        onSyncModel={() => handleSyncModel(keyConfig.id)}
                        lang={lang}
                        geminiService={geminiService}
                        isRainbow={isRainbow}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, keyConfig.id)}
                        onDragEnter={(e) => handleDragEnter(e, keyConfig.id)}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={dragOverKeyId === keyConfig.id && draggedKeyId !== keyConfig.id ? 'border-primary-500 ring-2 ring-primary-500/30' : ''}
                    />
                ))}
                
                <button 
                    onClick={handleAddKey}
                    className={`w-full py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-xl border border-dashed border-primary-300 dark:border-primary-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow ${rainbowBorderClass}`}
                    aria-label={t('settings.add_new_api_key', lang)}
                >
                    <Plus className="w-5 h-5" />
                    {t('settings.add_key_placeholder', lang)}
                </button>
            </div>
        </CollapsibleSection>
    );
};

export default ApiKeyManagement;
