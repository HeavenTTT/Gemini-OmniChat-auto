

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Key, RotateCw, RefreshCw, Server, ChevronDown, Copy, ExternalLink, Network, ChevronUp, Edit2, Upload, Loader2, CheckCircle, Download, FolderPlus, Folder, ToggleRight, X, Box } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { KeyConfig, Language, ModelProvider, GeminiModel, DialogConfig, AppSettings, ModelInfo, KeyGroup } from '../../types';
import { CollapsibleSection } from './CollapsibleSection';
import { GeminiService } from '../../services/geminiService';
import { t } from '../../utils/i18n';
import { ModelSelect } from '../ui/ModelSelect';

interface ApiKeyManagementProps {
  keys: KeyConfig[];
  onUpdateKeys: (keys: KeyConfig[]) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
  defaultModel: string;
  geminiService: GeminiService | null;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onShowDialog: (config: Partial<DialogConfig> & { title: string, onConfirm: (value?: string) => void }) => void;
  knownModels: ModelInfo[];
  onUpdateKnownModels: (models: ModelInfo[]) => void;
}

export const ApiKeyManagement: React.FC<ApiKeyManagementProps> = ({
  keys,
  onUpdateKeys,
  settings,
  onUpdateSettings,
  lang,
  defaultModel,
  geminiService,
  onShowToast,
  onShowDialog,
  knownModels,
  onUpdateKnownModels
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchKeysInput, setBatchKeysInput] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Derived from known models prop
  const sharedGeminiModels = knownModels.map(m => m.name) || [];

  const handleAddKey = (groupId?: string) => {
    onUpdateKeys([
      ...keys, 
      {
        id: uuidv4(),
        key: '',
        provider: 'google',
        isActive: true,
        usageLimit: 5,
        isRateLimited: false,
        lastUsed: 0,
        model: defaultModel || GeminiModel.FLASH,
        baseUrl: '',
        groupId: groupId // Assign to group if provided
      }
    ]);
  };

  const handleBatchImport = () => {
      const lines = batchKeysInput.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) return;

      const newKeys: KeyConfig[] = lines.map(k => ({
          id: uuidv4(),
          key: k,
          provider: 'google', // Default to Google for batch import
          isActive: true,
          usageLimit: 5, // Default usage limit for batch import
          isRateLimited: false,
          lastUsed: 0,
          model: defaultModel || GeminiModel.FLASH,
          baseUrl: ''
      }));
      
      onUpdateKeys([...keys, ...newKeys]);
      setBatchKeysInput('');
      setIsBatchImporting(false);
      onShowToast(t('msg.batch_import_success', lang).replace('{count}', newKeys.length.toString()), 'success');
  };

  const handleTestAndBatchImport = async () => {
    if (!geminiService) return;
    const lines = batchKeysInput.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return;

    setIsBatchTesting(true);
    let successCount = 0;
    let failCount = 0;
    const validKeys: KeyConfig[] = [];
    const failedLines: string[] = [];

    // Create temp configs for testing
    const tempConfigs = lines.map(k => ({
        id: uuidv4(),
        key: k,
        provider: 'google' as ModelProvider, // Default to Google for batch import testing
        isActive: true,
        usageLimit: 5, // Default usage limit for batch import
        isRateLimited: false,
        lastUsed: 0,
        model: defaultModel || GeminiModel.FLASH,
        baseUrl: ''
    }));

    try {
        // Run tests strictly sequentially to avoid "Call in progress" lock errors
        for (const config of tempConfigs) {
            try {
                const passed = await geminiService.testConnection(config);
                if (passed) {
                    validKeys.push(config);
                    successCount++;
                } else {
                    failedLines.push(config.key);
                    failCount++;
                }
            } catch (e: any) {
                if (e.message === 'error.call_in_progress') {
                     onShowToast(t('error.call_in_progress', lang), 'error');
                     // If locked, we stop processing rest to avoid cascading errors or just mark as failed?
                     // Mark as failed and continue might be safer, but user should wait.
                     failedLines.push(config.key);
                     failCount++;
                } else {
                    failedLines.push(config.key);
                    failCount++;
                }
            }
        }
    } catch (e) {
        console.error("Batch test unexpected error", e);
    }

    if (successCount > 0) {
        onUpdateKeys([...keys, ...validKeys]);
    }

    // Update input to only show failed keys
    setBatchKeysInput(failedLines.join('\n'));

    // Close if everything passed
    if (failCount === 0) {
        setIsBatchImporting(false);
    }

    onShowToast(t('msg.batch_import_test_result', lang)
        .replace('{success}', successCount.toString())
        .replace('{failed}', failCount.toString()),
        failCount > 0 ? 'info' : 'success'
    );

    setIsBatchTesting(false);
  };

  const handleRemoveKey = (id: string) => {
    onUpdateKeys(keys.filter(k => k.id !== id));
  };

  const handleUpdateKey = (id: string, updates: Partial<KeyConfig>) => {
    onUpdateKeys(keys.map(k => k.id === id ? { ...k, ...updates } : k));
  };

  const handleSyncModel = (sourceId: string) => {
    const sourceKey = keys.find(k => k.id === sourceId);
    if (!sourceKey || !sourceKey.model) return;
    
    const count = keys.filter(k => k.id !== sourceId && k.provider === sourceKey.provider).length;
    if (count === 0) {
         onShowToast(t('msg.sync_no_targets', lang), 'info');
         return;
    }
    
    onShowDialog({
        type: 'confirm',
        title: t('action.sync_model', lang),
        message: t('msg.confirm_sync_model', lang).replace('{model}', sourceKey.model).replace('{count}', count.toString()),
        onConfirm: () => {
             onUpdateKeys(keys.map(k => {
                 if (k.id !== sourceId && k.provider === sourceKey.provider) {
                     return { ...k, model: sourceKey.model };
                 }
                 return k;
             }));
             onShowToast(t('msg.sync_success', lang), 'success');
        }
    });
  };

  // --- Grouping Logic ---
  // Add a new group
  const handleAddGroup = () => {
    const name = newGroupName.trim() || `Group ${(settings.keyGroups?.length || 0) + 1}`;
    const newGroup: KeyGroup = { id: uuidv4(), name };
    onUpdateSettings({ ...settings, keyGroups: [...(settings.keyGroups || []), newGroup] });
    setNewGroupName('');
  };

  // Delete a group and release its keys
  const handleDeleteGroup = (groupId: string) => {
    // Move keys in this group to unassigned (undefined groupId)
    const updatedKeys = keys.map(k => k.groupId === groupId ? { ...k, groupId: undefined } : k);
    onUpdateKeys(updatedKeys);
    
    // Remove group
    const updatedGroups = (settings.keyGroups || []).filter(g => g.id !== groupId);
    onUpdateSettings({ ...settings, keyGroups: updatedGroups });
  };

  // Rename a group
  const handleRenameGroup = (groupId: string, newName: string) => {
     const updatedGroups = (settings.keyGroups || []).map(g => g.id === groupId ? { ...g, name: newName } : g);
     onUpdateSettings({ ...settings, keyGroups: updatedGroups });
     setEditingGroupId(null);
  };

  // Toggle active state for all keys in a group
  const toggleGroupActive = (groupId: string | undefined, currentState: boolean) => {
      // Toggle all keys in this group
      const updatedKeys = keys.map(k => {
          if (k.groupId === groupId) return { ...k, isActive: !currentState };
          return k;
      });
      onUpdateKeys(updatedKeys);
  };

  // --- Drag and Drop Logic (Only active when grouping is DISABLED for simplicity) ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (settings.enableKeyGrouping) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const newKeys = [...keys];
    const [movedItem] = newKeys.splice(draggedIndex, 1);
    newKeys.splice(targetIndex, 0, movedItem);
    
    onUpdateKeys(newKeys);
    setDraggedIndex(null);
  };
  
  const handleDragEnd = () => {
      setDraggedIndex(null);
  };

  // --- Rendering Groups ---
  const renderKeyList = (filteredKeys: KeyConfig[], groupId?: string) => {
      return (
          <div className="space-y-2">
            {filteredKeys.map((keyConfig, index) => (
                <div 
                    key={keyConfig.id}
                    draggable={!settings.enableKeyGrouping}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className="transition-all duration-200"
                >
                    <KeyConfigCard 
                        config={keyConfig} 
                        index={index + 1}
                        onUpdate={(updates) => handleUpdateKey(keyConfig.id, updates)}
                        onRemove={() => handleRemoveKey(keyConfig.id)}
                        onSyncModel={() => handleSyncModel(keyConfig.id)}
                        onUpdateKnownModels={(newModels) => {
                            const existing = knownModels || [];
                            const merged = [...existing];
                            newModels.forEach(nm => {
                                const idx = merged.findIndex(em => em.name === nm.name);
                                if (idx !== -1) merged[idx] = nm;
                                else merged.push(nm);
                            });
                            onUpdateKnownModels(merged);
                        }}
                        lang={lang}
                        geminiService={geminiService}
                        onShowToast={onShowToast}
                        sharedModels={sharedGeminiModels}
                        groups={settings.keyGroups}
                        enableGrouping={settings.enableKeyGrouping}
                    />
                </div>
            ))}
            
            {/* Add Key Button (Contextual if grouped) */}
            {settings.enableKeyGrouping && (
                <button 
                    onClick={() => handleAddKey(groupId)}
                    className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1 mt-2"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {t('settings.add_new_api_key', lang)}
                </button>
            )}
          </div>
      );
  };

  return (
    <div className="space-y-4">
        {/* Header / Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                    <Key className="w-5 h-5" />
                 </div>
                 <div>
                     <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('settings.api_keys_pool', lang)}</h3>
                     <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            {keys.filter(k => k.isActive).length} {t('status.active', lang)}
                        </span>
                    </div>
                 </div>
            </div>

            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <label htmlFor="grouping-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        {t('settings.enable_grouping', lang)}
                    </label>
                    <label htmlFor="grouping-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input 
                            id="grouping-toggle"
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.enableKeyGrouping || false}
                            onChange={(e) => onUpdateSettings({...settings, enableKeyGrouping: e.target.checked})}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                 </div>

                 <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 text-primary-600 hover:underline bg-primary-50 dark:bg-primary-900/20 px-2 py-1.5 rounded-lg transition-colors"
                >
                    <ExternalLink className="w-3 h-3" />
                    {t('action.get_api_key', lang)}
                </a>
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
            
            {/* If Grouping Enabled */}
            {settings.enableKeyGrouping ? (
                <div className="space-y-6">
                    {/* Add Group Input */}
                    <div className="flex gap-2">
                         <input 
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder={t('input.group_name_placeholder', lang)}
                            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500"
                        />
                        <button 
                            onClick={handleAddGroup}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" /> {t('action.add_group', lang)}
                        </button>
                    </div>

                    {/* Render Groups */}
                    {(settings.keyGroups || []).map(group => {
                        const groupKeys = keys.filter(k => k.groupId === group.id);
                        const allActive = groupKeys.length > 0 && groupKeys.every(k => k.isActive);
                        const someActive = groupKeys.some(k => k.isActive);

                        return (
                            <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/20">
                                <div className="bg-gray-100/50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <Folder className="w-4 h-4 text-gray-500" />
                                        {editingGroupId === group.id ? (
                                            <input 
                                                autoFocus
                                                defaultValue={group.name}
                                                onBlur={(e) => handleRenameGroup(group.id, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup(group.id, e.currentTarget.value)}
                                                className="bg-white dark:bg-gray-900 border border-primary-500 rounded px-2 py-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none w-40"
                                            />
                                        ) : (
                                            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">{group.name}</h4>
                                        )}
                                        <span className="text-xs text-gray-400 font-mono bg-white dark:bg-gray-900 px-1.5 rounded">{groupKeys.length}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                         <button 
                                            onClick={() => toggleGroupActive(group.id, allActive)}
                                            className={`p-1.5 rounded-lg transition-colors ${allActive ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : someActive ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 bg-gray-200 dark:bg-gray-800'}`}
                                            title={t('action.toggle_group', lang)}
                                        >
                                            <ToggleRight className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setEditingGroupId(group.id)}
                                            className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors"
                                            title={t('action.rename_group', lang)}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteGroup(group.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            title={t('action.delete_group', lang)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    {renderKeyList(groupKeys, group.id)}
                                </div>
                            </div>
                        );
                    })}

                    {/* Unassigned Keys */}
                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/10">
                         <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <Box className="w-3.5 h-3.5" />
                            {t('label.unassigned_group', lang)}
                         </h4>
                         {renderKeyList(keys.filter(k => !k.groupId))}
                    </div>
                </div>
            ) : (
                /* Standard Flat List */
                <div className="space-y-4">
                     {renderKeyList(keys)}
                     
                     <div className="flex gap-2">
                        <button 
                            onClick={() => handleAddKey()}
                            className={`flex-1 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-xl border border-dashed border-primary-300 dark:border-primary-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow`}
                            aria-label={t('settings.add_new_api_key', lang)}
                        >
                            <Plus className="w-5 h-5" />
                            {t('settings.add_key_placeholder', lang)}
                        </button>
                        <button 
                            onClick={() => setIsBatchImporting(!isBatchImporting)}
                            className={`px-4 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow`}
                            title={t('action.batch_add', lang)}
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                    </div>

                    {isBatchImporting && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 animate-fade-in-up">
                            <textarea 
                                value={batchKeysInput}
                                onChange={(e) => setBatchKeysInput(e.target.value)}
                                placeholder={t('input.batch_keys_placeholder', lang)}
                                className="w-full h-32 p-3 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 mb-3 resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => setIsBatchImporting(false)} 
                                    disabled={isBatchTesting}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                                >
                                    {t('action.cancel', lang)}
                                </button>
                                
                                <button 
                                    onClick={handleTestAndBatchImport}
                                    disabled={!batchKeysInput.trim() || isBatchTesting}
                                    className="px-4 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isBatchTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Network className="w-3 h-3" />}
                                    {t('action.test_and_import', lang)}
                                </button>

                                <button 
                                    onClick={handleBatchImport} 
                                    disabled={!batchKeysInput.trim() || isBatchTesting}
                                    className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-50 disabled:opacity-50 transition-colors"
                                >
                                    {t('action.import', lang)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

// Internal Component: KeyConfigCard
interface KeyConfigCardProps {
  config: KeyConfig;
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
  index: number;
}

const KeyConfigCard: React.FC<KeyConfigCardProps> = ({ config, onUpdate, onRemove, onSyncModel, onUpdateKnownModels, lang, geminiService, onShowToast, sharedModels, enableGrouping, groups, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isEditingKey, setIsEditingKey] = useState(false);
    const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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

    const handleTest = async () => {
        if (!geminiService || !config.key) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const success = await geminiService.testConnection(config);
            setTestResult(success);
        } catch (e: any) {
            if (e.message === 'error.call_in_progress') {
                onShowToast(t('error.call_in_progress', lang), 'error');
            }
            setTestResult(false);
        } finally {
            setIsTesting(false);
            setTimeout(() => setTestResult(null), 3000);
        }
    };

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

    const handleImportConfigTrigger = () => {
        fileInputRef.current?.click();
    };

    const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parsed = JSON.parse(content);
                if (parsed.type === 'omnichat_key_config' && parsed.config) {
                     onUpdate({ 
                         ...parsed.config, 
                         id: config.id, // Keep original ID to persist slot
                         isActive: parsed.config.isActive ?? true 
                     });
                     if (parsed.cachedModels && Array.isArray(parsed.cachedModels)) {
                         setAvailableModels(parsed.cachedModels);
                         localStorage.setItem(`gemini_model_cache_${config.id}`, JSON.stringify(parsed.cachedModels));
                     }
                     onShowToast(t('msg.config_imported', lang), 'success');
                } else {
                    onShowToast(t('msg.invalid_format', lang), 'error');
                }
            } catch (e) {
                onShowToast(t('error.load_file', lang), 'error');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

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
            className="flex items-center gap-3 w-full cursor-pointer" 
            onClick={() => {
                setIsExpanded(!isExpanded);
                if (isExpanded) setIsModelSelectOpen(false); // Reset dropdown state on close
            }}
        >
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
        <div className={`p-3 rounded-xl border transition-all duration-300 relative ${config.isActive ? 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-60'} ${isModelSelectOpen ? 'z-20' : ''}`}>
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
                            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                            title={t('action.export_key', lang)}
                            aria-label={t('action.export_key', lang)}
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>

                        <button 
                            onClick={handleImportConfigTrigger}
                            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                            title={t('action.import_key', lang)}
                            aria-label={t('action.import_key', lang)}
                        >
                            <Upload className="w-3.5 h-3.5" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportConfig} accept=".json" className="hidden" />

                         <button 
                            onClick={handleTest}
                            disabled={isTesting || !config.key}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm border flex-1 justify-center whitespace-nowrap ${
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
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800 whitespace-nowrap"
                            title={t('action.delete_key', lang)}
                            aria-label={t('action.delete_api_key', lang)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <div className={`relative flex-1 flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all z-10`}>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('label.model', lang)}</span>
                            
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
