import React, { useRef } from 'react';
import { Plus, FolderPlus, Upload, Network, Loader2 } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../utils/i18n';

interface ApiKeyBatchImportProps {
    lang: Language;
    isBatchImporting: boolean;
    setIsBatchImporting: (value: boolean) => void;
    batchKeysInput: string;
    setBatchKeysInput: (value: string) => void;
    isBatchTesting: boolean;
    handleAddKey: () => void;
    handleImportSingleKeyTrigger: () => void;
    handleImportSingleKeyConfig: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTestAndBatchImport: () => void;
    handleBatchImport: () => void;
    importFileInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * API密钥批量导入和添加操作组件
 */
export const ApiKeyBatchImport: React.FC<ApiKeyBatchImportProps> = ({
    lang,
    isBatchImporting,
    setIsBatchImporting,
    batchKeysInput,
    setBatchKeysInput,
    isBatchTesting,
    handleAddKey,
    handleImportSingleKeyTrigger,
    handleImportSingleKeyConfig,
    handleTestAndBatchImport,
    handleBatchImport,
    importFileInputRef,
}) => {
    return (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
            <div className="flex gap-2">
                <button 
                    onClick={handleAddKey}
                    className="flex-1 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-primary-600 dark:text-primary-400 rounded-xl border border-dashed border-primary-300 dark:border-primary-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow"
                    aria-label={t('settings.add_new_api_key', lang)}
                >
                    <Plus className="w-5 h-5" />
                    {t('settings.add_key_placeholder', lang)}
                </button>
                
                <button 
                    onClick={() => setIsBatchImporting(!isBatchImporting)}
                    className="px-4 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow"
                    title={t('action.batch_add', lang)}
                >
                    <FolderPlus className="w-5 h-5" />
                    <span className="hidden sm:inline text-xs">{t('action.batch_add', lang)}</span>
                </button>

                 <button 
                    onClick={handleImportSingleKeyTrigger}
                    className="px-4 py-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700/50 transition-all flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow"
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
};
