

"use client";

import React, { useState, useRef } from 'react';
import { Plus, Key, ExternalLink, Network, Loader2, Upload, FolderPlus, Folder, Trash2, Edit2, Box, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { KeyConfig, Language, ModelProvider, GeminiModel, DialogConfig, AppSettings, ModelInfo, KeyGroup } from '../../types';
import { LLMService } from '../../services/llmService';
import { t } from '../../utils/i18n';
import { KeyConfigCard } from './KeyConfigCard';

interface ApiKeyManagementProps {
  keys: KeyConfig[];
  onUpdateKeys: (keys: KeyConfig[]) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
  defaultModel: string;
  llmService: LLMService | null;
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
  llmService,
  onShowToast,
  onShowDialog,
  knownModels,
  onUpdateKnownModels
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchKeysInput, setBatchKeysInput] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 导入文件的 input ref
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Derived from known models prop
  const sharedGeminiModels = knownModels.map(m => m.name) || [];

  /**
   * 添加新的 API 密钥
   * Add a new API key to the list, optionally assigning it to a group.
   * @param groupId - Optional ID of the group to add the key to.
   */
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
    onShowToast(t('msg.key_added', lang), 'success');
  };

  /**
   * 切换分组折叠状态
   * Toggle the expanded state of a key group.
   * Default state is COLLAPSED (not in set).
   * @param groupId - The ID of the group to toggle.
   */
  const toggleGroupExpansion = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) {
        next.delete(groupId);
    } else {
        next.add(groupId);
    }
    setExpandedGroups(next);
  };

  /**
   * 触发单个密钥配置导入的文件选择
   * Trigger the file input dialog for importing a single key config.
   */
  const handleImportSingleKeyTrigger = () => {
    importFileInputRef.current?.click();
  };

  /**
   * 处理单个密钥配置文件的导入
   * 读取 JSON 并作为新密钥添加到列表中
   * Handle the file selection and import a single key configuration JSON.
   * @param e - File input change event.
   */
  const handleImportSingleKeyConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            if (parsed.type === 'omnichat_key_config' && parsed.config) {
                 // 创建新密钥，赋予新 ID，但保留配置
                 const newKey: KeyConfig = {
                     ...parsed.config,
                     id: uuidv4(), // Generate new ID
                     isActive: true
                 };
                 
                 onUpdateKeys([...keys, newKey]);
                 
                 // 如果有缓存的模型列表，也可以尝试恢复到 localStorage (可选，针对新 ID)
                 if (parsed.cachedModels && Array.isArray(parsed.cachedModels)) {
                     localStorage.setItem(`gemini_model_cache_${newKey.id}`, JSON.stringify(parsed.cachedModels));
                 }
                 
                 onShowToast(t('msg.config_imported', lang), 'success');
            } else {
                onShowToast(t('msg.invalid_format', lang), 'error');
            }
        } catch (e) {
            onShowToast(t('error.load_file', lang), 'error');
        }
        if (importFileInputRef.current) importFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  /**
   * 批量导入 API 密钥
   * Import multiple API keys from a text block (one per line).
   */
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

  /**
   * 测试并批量导入
   * Test keys sequentially and only import those that pass connection test.
   */
  const handleTestAndBatchImport = async () => {
    if (!llmService) return;
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
                const passed = await llmService.testConnection(config);
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

  /**
   * 删除单个 API 密钥
   * Remove a single API key by ID.
   * @param id - The ID of the key to remove.
   */
  const handleRemoveKey = (id: string) => {
    onUpdateKeys(keys.filter(k => k.id !== id));
    onShowToast(t('msg.key_deleted', lang), 'info');
  };

  /**
   * 更新单个 API 密钥
   * Update properties of a single API key.
   * @param id - The ID of the key to update.
   * @param updates - Partial key configuration object.
   */
  const handleUpdateKey = (id: string, updates: Partial<KeyConfig>) => {
    onUpdateKeys(keys.map(k => k.id === id ? { ...k, ...updates } : k));
  };

  /**
   * 同步模型配置
   * Apply the model configuration from one key to all other keys of the same provider.
   * @param sourceId - The ID of the source key.
   */
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

  /**
   * 添加新分组
   * Create a new key group.
   */
  const handleAddGroup = () => {
    const name = newGroupName.trim() || `Group ${(settings.keyGroups?.length || 0) + 1}`;
    // Initialize isActive to true
    const newGroup: KeyGroup = { id: uuidv4(), name, isActive: true };
    onUpdateSettings({ ...settings, keyGroups: [...(settings.keyGroups || []), newGroup] });
    setNewGroupName('');
    onShowToast(t('msg.group_added', lang), 'success');
    // Auto-expand the new group
    setExpandedGroups(new Set(expandedGroups).add(newGroup.id));
  };

  /**
   * 删除分组
   * Delete a key group and unassign its keys.
   * @param groupId - The ID of the group to delete.
   */
  const handleDeleteGroup = (groupId: string) => {
    const updatedKeys = keys.map(k => k.groupId === groupId ? { ...k, groupId: undefined } : k);
    onUpdateKeys(updatedKeys);
    
    const updatedGroups = (settings.keyGroups || []).filter(g => g.id !== groupId);
    onUpdateSettings({ ...settings, keyGroups: updatedGroups });
    onShowToast(t('msg.group_deleted', lang), 'info');
  };

  /**
   * 重命名分组
   * Rename an existing key group.
   * @param groupId - The ID of the group to rename.
   * @param newName - The new name for the group.
   */
  const handleRenameGroup = (groupId: string, newName: string) => {
     const updatedGroups = (settings.keyGroups || []).map(g => g.id === groupId ? { ...g, name: newName } : g);
     onUpdateSettings({ ...settings, keyGroups: updatedGroups });
     setEditingGroupId(null);
     onShowToast(t('msg.group_renamed', lang), 'success');
  };

  /**
   * 切换分组的激活状态
   * Toggles whether the group is active or not. Does not affect keys internally.
   * @param groupId - The ID of the group.
   */
  const toggleGroupEnabled = (groupId: string) => {
      const updatedGroups = (settings.keyGroups || []).map(g => {
          if (g.id === groupId) {
              return { ...g, isActive: g.isActive === undefined ? false : !g.isActive };
          }
          return g;
      });
      onUpdateSettings({ ...settings, keyGroups: updatedGroups });
  };

  // --- Drag and Drop Logic for KEYS ---

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('type', 'key');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type !== 'key' || draggedIndex === null) return;
    
    const newKeys = [...keys];
    // Remove from old position
    const [movedItem] = newKeys.splice(draggedIndex, 1);
    
    // If grouping is enabled, adopt the group of the target key
    if (settings.enableKeyGrouping) {
        const targetKey = keys[targetIndex];
        if (targetKey) {
             movedItem.groupId = targetKey.groupId;
        }
    }

    newKeys.splice(targetIndex, 0, movedItem);
    
    onUpdateKeys(newKeys);
    setDraggedIndex(null);
  };
  
  const handleDragEnd = () => {
      setDraggedIndex(null);
  };

  // --- Drag and Drop Logic for GROUPS ---

  const handleGroupDragStart = (e: React.DragEvent, index: number) => {
    setDraggedGroupIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData('type', 'group');
    e.stopPropagation(); // Prevent bubbling up
  };

  const handleGroupDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedGroupIndex === null || draggedGroupIndex === index) return;
  };

  const handleGroupDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    if (type !== 'group' || draggedGroupIndex === null) return;

    const currentGroups = settings.keyGroups || [];
    const newGroups = [...currentGroups];
    const [movedGroup] = newGroups.splice(draggedGroupIndex, 1);
    newGroups.splice(targetIndex, 0, movedGroup);

    onUpdateSettings({ ...settings, keyGroups: newGroups });
    setDraggedGroupIndex(null);
  };

  // --- Rendering Helpers ---

  /**
   * 渲染密钥列表
   * Render the list of key config cards, filtered by group.
   */
  const renderKeyList = (filteredKeys: KeyConfig[], groupId?: string, showContextualAddButton: boolean = true) => {
      return (
          <div className="space-y-2">
            {filteredKeys.map((keyConfig) => {
                // Find actual index in main keys array for Drag & Drop
                const actualIndex = keys.findIndex(k => k.id === keyConfig.id);
                
                return (
                    <KeyConfigCard 
                        key={keyConfig.id}
                        config={keyConfig} 
                        index={actualIndex + 1}
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
                        llmService={llmService}
                        onShowToast={onShowToast}
                        sharedModels={sharedGeminiModels}
                        groups={settings.keyGroups}
                        enableGrouping={settings.enableKeyGrouping}
                        
                        // Drag Props
                        draggable={true} // Always draggable
                        onDragStart={(e) => handleDragStart(e, actualIndex)}
                        onDragOver={(e) => handleDragOver(e, actualIndex)}
                        onDrop={(e) => handleDrop(e, actualIndex)}
                        onDragEnd={handleDragEnd}
                    />
                );
            })}
            
            {/* Contextual Add Key Button for Groups */}
            {settings.enableKeyGrouping && showContextualAddButton && (
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

  /**
   * 渲染底部添加/导入按钮
   * Render the bottom action buttons for adding/importing keys.
   */
  const renderAddButtons = () => (
    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
        <div className="flex gap-2">
            {/* Standard Add Button */}
            <button 
                onClick={() => handleAddKey()}
                className={`flex-1 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-xl border border-dashed border-primary-300 dark:border-primary-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow`}
                aria-label={t('settings.add_new_api_key', lang)}
            >
                <Plus className="w-5 h-5" />
                {t('settings.add_key_placeholder', lang)}
            </button>
            
            {/* Batch Add Button */}
            <button 
                onClick={() => setIsBatchImporting(!isBatchImporting)}
                className={`px-4 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow`}
                title={t('action.batch_add', lang)}
            >
                <FolderPlus className="w-5 h-5" />
                <span className="hidden sm:inline text-xs">{t('action.batch_add', lang)}</span>
            </button>

             {/* Single Import Button (Moved to bottom right of Batch Add) */}
             <button 
                onClick={handleImportSingleKeyTrigger}
                className={`px-4 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow`}
                title={t('action.import_key', lang)}
            >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline text-xs">{t('action.import_key', lang)}</span>
            </button>
            <input type="file" ref={importFileInputRef} onChange={handleImportSingleKeyConfig} accept=".json" className="hidden" />
        </div>

        {isBatchImporting && (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 animate-fade-in-up mt-3">
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
  );
  
  // 计算是否有未分配的密钥
  const unassignedKeys = keys.filter(k => !k.groupId);

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
                    {(settings.keyGroups || []).map((group, groupIdx) => {
                        const groupKeys = keys.filter(k => k.groupId === group.id);
                        const isExpanded = expandedGroups.has(group.id);
                        const isGroupActive = group.isActive !== false; // Default to true

                        return (
                            <div 
                                key={group.id} 
                                className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/30 dark:bg-gray-900/20"
                                draggable
                                onDragStart={(e) => handleGroupDragStart(e, groupIdx)}
                                onDragOver={(e) => handleGroupDragOver(e, groupIdx)}
                                onDrop={(e) => handleGroupDrop(e, groupIdx)}
                                onDragEnd={() => setDraggedGroupIndex(null)}
                            >
                                <div 
                                    className="bg-gray-100/50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    onClick={() => toggleGroupExpansion(group.id)}
                                >
                                    <div className="flex items-center gap-3">
                                         {/* Drag Handle */}
                                        <div 
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-move"
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        <div className="text-gray-400">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </div>
                                        <Folder className={`w-4 h-4 ${isGroupActive ? 'text-gray-500' : 'text-gray-400 opacity-50'}`} />
                                        {editingGroupId === group.id ? (
                                            <input 
                                                autoFocus
                                                defaultValue={group.name}
                                                onBlur={(e) => handleRenameGroup(group.id, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup(group.id, e.currentTarget.value)}
                                                onClick={e => e.stopPropagation()}
                                                className="bg-white dark:bg-gray-900 border border-primary-500 rounded px-2 py-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none w-40"
                                            />
                                        ) : (
                                            <h4 className={`font-semibold text-sm ${isGroupActive ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{group.name}</h4>
                                        )}
                                        <span className="text-xs text-gray-400 font-mono bg-white dark:bg-gray-900 px-1.5 rounded">{groupKeys.length}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        {/* Large Group Toggle Switch */}
                                        <label className="relative inline-flex items-center cursor-pointer mr-2" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={isGroupActive}
                                                onChange={() => toggleGroupEnabled(group.id)}
                                            />
                                            <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                        </label>

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
                                {isExpanded && (
                                    <div className={`p-3 animate-fade-in-up ${!isGroupActive ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                        {renderKeyList(groupKeys, group.id)}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Unassigned Keys - 仅在有未分配密钥时显示 */}
                    {unassignedKeys.length > 0 && (
                        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/10">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <Box className="w-3.5 h-3.5" />
                                {t('label.unassigned_group', lang)}
                            </h4>
                            {renderKeyList(unassignedKeys, undefined, false)}
                        </div>
                    )}
                </div>
            ) : (
                /* Standard Flat List */
                <div className="space-y-4">
                     {renderKeyList(keys)}
                </div>
            )}
            
            {/* Add Buttons (Always visible at the bottom) */}
            {renderAddButtons()}
        </div>
    </div>
  );
};