
"use client";

import React, { useState } from 'react';
import { CheckCircle, Edit2, Trash2, X, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { SystemPrompt, Language, AppSettings } from '../../types';
import { CollapsibleSection } from './CollapsibleSection';
import { t } from '../../utils/i18n';

interface SystemPromptManagementProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  lang: Language;
}

export const SystemPromptManagement: React.FC<SystemPromptManagementProps> = ({
  settings,
  onUpdateSettings,
  lang
}) => {
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptContent, setEditingPromptContent] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
      title: t('input.prompt_title_default', lang),
      content: '',
      isActive: true
    };
    const updatedPrompts = [...settings.systemPrompts, newPrompt];
    onUpdateSettings({
      ...settings,
      systemPrompts: updatedPrompts
    });
    startEditingPromptContent(newPrompt);
  };

  const handleUpdatePrompt = (id: string, updates: Partial<SystemPrompt>) => {
    onUpdateSettings({
      ...settings,
      systemPrompts: settings.systemPrompts.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    });
  };

  const handleRemovePrompt = (id: string) => {
    onUpdateSettings({
      ...settings,
      systemPrompts: settings.systemPrompts.filter(p => p.id !== id)
    });
    if (editingPromptId === id) {
      setEditingPromptId(null);
      setEditingPromptContent('');
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
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
    
    const newPrompts = [...settings.systemPrompts];
    const [movedItem] = newPrompts.splice(draggedIndex, 1);
    newPrompts.splice(targetIndex, 0, movedItem);
    
    onUpdateSettings({ ...settings, systemPrompts: newPrompts });
    setDraggedIndex(null);
  };

  return (
    <CollapsibleSection id="system-instructions" title={t('settings.system_instructions', lang)} lang={lang}>
        <div className="space-y-4">
        {settings.systemPrompts.map((prompt, index) => (
            <div 
                key={prompt.id} 
                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm transition-all duration-200 relative`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
            >
               <div className="">
                   <div className="flex justify-between items-center mb-3">
                       <input 
                         className="bg-transparent font-semibold text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400 flex-1"
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
                   {editingPromptId === prompt.id && (
                       <>
                        <textarea 
                          className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/50 rounded-lg p-3 text-xs resize-y min-h-[120px] md:h-auto outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all mt-2`}
                          rows={6}
                          value={editingPromptContent}
                          onChange={e => setEditingPromptContent(e.target.value)}
                          placeholder={t('input.instruction_placeholder', lang)}
                          autoFocus
                          aria-label={t('input.instruction_field', lang)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                                onClick={cancelPromptContentEdit} 
                                className={`p-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm`}
                                title={t('action.cancel', lang)}
                                aria-label={t('action.cancel_edit_prompt', lang)}
                            >
                                <X className="w-4 h-4"/>
                            </button>
                            <button 
                                onClick={() => savePromptContent(prompt.id)} 
                                className={`px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1`}
                                aria-label={t('action.save_prompt_edit', lang)}
                            >
                                <Save className="w-4 h-4"/>{t('action.confirm', lang)}
                            </button>
                        </div>
                       </>
                   )}
               </div>
            </div>
        ))}
        <button 
            onClick={handleAddPrompt} 
            className={`w-full py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 border border-dashed border-primary-300 dark:border-primary-700 rounded-xl transition-colors`}
            aria-label={t('action.add_system_prompt', lang)}
        >
            {t('action.add_prompt', lang)}
        </button>
        </div>
    </CollapsibleSection>
  );
};
