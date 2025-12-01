
"use client";

import React, { useState } from 'react';
import { AppSettings, SystemPrompt, Language } from '../../types';
import { t } from '../../utils/i18n';
import CollapsibleSection from './CollapsibleSection';
import { CheckCircle, Edit2, Trash2, Plus, X, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SystemPromptManagementProps {
    localSettings: AppSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    lang: Language;
    isRainbow: boolean;
}

const SystemPromptManagement: React.FC<SystemPromptManagementProps> = ({
    localSettings,
    setLocalSettings,
    lang,
    isRainbow,
}) => {
    const rainbowBorderClass = isRainbow ? 'border-animated-rainbow' : '';

    const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
    const [editingPromptContent, setEditingPromptContent] = useState('');

    const startEditingPromptContent = (prompt: SystemPrompt) => {
        setEditingPromptId(prompt.id);
        setEditingPromptContent(prompt.content);
    };
    
    const savePromptContent = (promptId: string) => {
        handleUpdatePrompt(promptId, { content: editingPromptContent });
        setEditingPromptId(null);
        setEditingPromptContent('');
    };
    
    const cancelPromptContentEdit = () => {
        setEditingPromptId(null);
        setEditingPromptContent('');
    };

    const handleAddPrompt = () => {
        const newId = uuidv4();
        const newPrompt: SystemPrompt = {
          id: newId,
          title: t('input.prompt_title_default', lang), // Localized default title
          content: '',
          isActive: true
        };
        const updatedPrompts = [...localSettings.systemPrompts, newPrompt];
        setLocalSettings(prev => ({
          ...prev,
          systemPrompts: updatedPrompts
        }));
        // Immediately start editing the content of the new prompt
        startEditingPromptContent(newPrompt);
    };

    const handleUpdatePrompt = (id: string, updates: Partial<SystemPrompt>) => {
        setLocalSettings(prev => ({
          ...prev,
          systemPrompts: prev.systemPrompts.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }));
    };

    const handleRemovePrompt = (id: string) => {
        setLocalSettings(prev => ({
          ...prev,
          systemPrompts: prev.systemPrompts.filter(p => p.id !== id)
        }));
        if (editingPromptId === id) {
          setEditingPromptId(null);
          setEditingPromptContent('');
        }
    };

    // --- Drag and Drop Logic ---
    const [draggedPromptId, setDraggedPromptId] = useState<string | null>(null);
    const [dragOverPromptId, setDragOverPromptId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedPromptId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        e.currentTarget.classList.add('opacity-50', 'border-primary-500'); // Visual feedback for dragged item
    };

    const handleDragEnter = (e: React.DragEvent, id: string) => {
        e.preventDefault(); // Necessary to allow drop
        if (id !== draggedPromptId) {
            setDragOverPromptId(id);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if leaving the current drag-over target
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setDragOverPromptId(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedPromptId || !dragOverPromptId || draggedPromptId === dragOverPromptId) {
            setDraggedPromptId(null);
            setDragOverPromptId(null);
            return;
        }

        const newPrompts = [...localSettings.systemPrompts];
        const draggedIndex = newPrompts.findIndex(p => p.id === draggedPromptId);
        const dragOverIndex = newPrompts.findIndex(p => p.id === dragOverPromptId);

        if (draggedIndex === -1 || dragOverIndex === -1) {
            setDraggedPromptId(null);
            setDragOverPromptId(null);
            return;
        }

        const [removed] = newPrompts.splice(draggedIndex, 1);
        newPrompts.splice(dragOverIndex, 0, removed);
        setLocalSettings(prev => ({ ...prev, systemPrompts: newPrompts }));
        setDraggedPromptId(null);
        setDragOverPromptId(null);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50', 'border-primary-500');
        setDraggedPromptId(null);
        setDragOverPromptId(null);
    };

    return (
        <CollapsibleSection id="system-instructions" title={t('settings.system_instructions', lang)} lang={lang} isRainbow={isRainbow}>
            <div className="space-y-4">
            {localSettings.systemPrompts.map(prompt => (
                <div 
                    key={prompt.id} 
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md ${dragOverPromptId === prompt.id && draggedPromptId !== prompt.id ? 'border-primary-500 ring-2 ring-primary-500/30' : ''}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, prompt.id)}
                    onDragEnter={(e) => handleDragEnter(e, prompt.id)}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                >
                   <div className="flex justify-between items-center mb-3">
                       <input 
                         className="bg-transparent font-semibold text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
                         value={prompt.title} 
                         onChange={e => handleUpdatePrompt(prompt.id, {title: e.target.value})}
                         placeholder={t('input.prompt_title_placeholder', lang)}
                         aria-label={t('input.prompt_title_field', lang)}
                       />
                       <div className="flex gap-2">
                           <button 
                              onClick={() => handleUpdatePrompt(prompt.id, {isActive: !prompt.isActive})}
                              className={`p-1.5 rounded-lg transition-colors ${prompt.isActive ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
                              title={prompt.isActive ? t('action.deactivate', lang) : t('action.activate', lang)}
                              aria-label={prompt.isActive ? t('action.deactivate_prompt', lang) : t('action.activate_prompt', lang)}
                           >
                               <CheckCircle className="w-4 h-4"/>
                           </button>
                           {editingPromptId !== prompt.id && (
                            <button 
                                onClick={() => startEditingPromptContent(prompt)}
                                className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 transition-colors"
                                title={t('action.edit', lang)}
                                aria-label={t('action.edit_prompt', lang)}
                            >
                                <Edit2 className="w-4 h-4"/>
                            </button>
                           )}
                           <button 
                              onClick={() => handleRemovePrompt(prompt.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 transition-colors"
                              title={t('action.delete', lang)}
                              aria-label={t('action.delete_prompt', lang)}
                           >
                               <Trash2 className="w-4 h-4"/>
                           </button>
                       </div>
                   </div>
                   {editingPromptId === prompt.id ? ( // Only render textarea and buttons if editing
                       <>
                        <textarea 
                          className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-3 text-xs resize-y min-h-[120px] md:h-auto outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all mt-2 ${rainbowBorderClass}`}
                          rows={6} /* Increased default rows for better editing experience */
                          value={editingPromptContent}
                          onChange={e => setEditingPromptContent(e.target.value)}
                          placeholder={t('input.instruction_placeholder', lang)}
                          autoFocus
                          aria-label={t('input.instruction_field', lang)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                                onClick={cancelPromptContentEdit} 
                                className={`p-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm ${rainbowBorderClass}`}
                                title={t('action.cancel', lang)}
                                aria-label={t('action.cancel_edit_prompt', lang)}
                            >
                                <X className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={() => savePromptContent(prompt.id)} 
                                className={`px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1 ${rainbowBorderClass}`}
                                aria-label={t('action.save_prompt_edit', lang)}
                            >
                                <Save className="w-4 h-4"/>{t('action.confirm', lang)}
                            </button>
                        </div>
                       </>
                   ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{prompt.content || <span className="text-gray-400 italic">{t('input.instruction_placeholder', lang)}</span>}</p>
                   )}
                </div>
            ))}
            <button 
                onClick={handleAddPrompt} 
                className={`w-full py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 border border-dashed border-primary-300 dark:border-primary-700 rounded-xl transition-colors ${rainbowBorderClass}`}
                aria-label={t('action.add_system_prompt', lang)}
            >
                {t('action.add_prompt', lang)}
            </button>
            </div>
        </CollapsibleSection>
    );
};

export default SystemPromptManagement;
