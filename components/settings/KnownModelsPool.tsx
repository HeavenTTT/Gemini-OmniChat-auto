import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Network, Sparkles, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { ModelInfo, KeyConfig, Language } from '../../types';
import { LLMService } from '../../services/llmService';
import { t } from '../../utils/i18n';

interface KnownModelsPoolProps {
    knownModels: ModelInfo[];
    keys: KeyConfig[];
    llmService: LLMService | null;
    lang: Language;
    onUpdateKnownModels: (models: ModelInfo[]) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * 已知模型缓存池管理组件
 * 管理和批量测试应用中的已知模型
 */
export const KnownModelsPool: React.FC<KnownModelsPoolProps> = ({
    knownModels,
    keys,
    llmService,
    lang,
    onUpdateKnownModels,
    onShowToast
}) => {
    const [isModelsSectionExpanded, setIsModelsSectionExpanded] = useState(false);
    const [isBatchTestingModels, setIsBatchTestingModels] = useState(false);
    const isTestingActiveRef = useRef(false);

    useEffect(() => {
        return () => {
            isTestingActiveRef.current = false;
        };
    }, []);

    /**
     * 清空模型缓存池
     */
    const handleClearCache = () => {
        onUpdateKnownModels([]);
        onShowToast(t('action.clear', lang) + ' ' + t('status.success', lang) , 'success');
    };

    /**
     * 批量测试已知模型的可用性
     * 依次对每一个已知模型发起极简聊天会话
     * 自动剔除报错或不可用的模型，并更新全局模型缓存
     */
    const handleBatchTestModels = async () => {
        if (!llmService) return;
        if (keys.length === 0) {
            onShowToast(t('msg.test_models_failed', lang), 'error');
            return;
        }

        setIsBatchTestingModels(true);
        isTestingActiveRef.current = true;
        
        let pendingCount = knownModels.filter(m => m.testStatus !== 'success' && m.testStatus !== 'failed').length;
        if (pendingCount === 0) {
            // 如果全部测试过了，重置所有状态再测
            knownModels.forEach(m => m.testStatus = 'idle');
        }

        const workingModels: ModelInfo[] = [];
        const failedModelNames: string[] = [];
        
        const currentModels = [...knownModels];

        for (let i = 0; i < currentModels.length; i++) {
            if (!isTestingActiveRef.current) break;
            
            const model = currentModels[i];
            
            if (model.testStatus === 'success' || model.testStatus === 'failed') {
                if (model.testStatus === 'success') workingModels.push(model);
                continue;
            }

            model.testStatus = 'testing';
            onUpdateKnownModels([...currentModels]);
            
            let success = false;
            let matchingKeys = keys.filter(k => model.provider ? k.provider === model.provider : k.provider === 'google');
            
            if (matchingKeys.length === 0) {
                matchingKeys = keys;
            }

            for (const keyToTest of matchingKeys) {
                success = await llmService.testModelAvailability(model.name, keyToTest);
                if (success) break;
            }
            
            if (!isTestingActiveRef.current) {
                 model.testStatus = 'idle';
                 break;
            }

            if (success) {
                model.testStatus = 'success';
                workingModels.push(model);
            } else {
                model.testStatus = 'failed';
                failedModelNames.push(model.name);
            }
            
            onUpdateKnownModels([...currentModels]);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (!isTestingActiveRef.current) {
            setIsBatchTestingModels(false);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        onUpdateKnownModels([...currentModels]);
        setIsBatchTestingModels(false);
        isTestingActiveRef.current = false;

        if (failedModelNames.length > 0) {
            onShowToast(
                t('msg.batch_test_completed_with_errors', lang)
                    .replace('{failed}', failedModelNames.length.toString())
                    .replace('{success}', workingModels.length.toString()),
                'success'
            );
        } else {
            onShowToast(t('msg.batch_test_completed_success', lang), 'success');
        }
    };

    /**
     * 渲染每个模型对应的测试状态徽章
     * @param status 测试状态
     * @returns React.ReactNode 对应的徽章 UI 节点
     */
    const renderModelTestStatusBadge = (status?: string) => {
        if (!status || status === 'idle') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-900 text-gray-500">
                    {t('status.pending_test', lang)}
                </span>
            );
        }
        if (status === 'testing') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    {t('status.testing', lang)}
                </span>
            );
        }
        if (status === 'success') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                    {t('status.available', lang)}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                {t('status.failed', lang)}
            </span>
        );
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden mt-4">
            <div 
                className="bg-gray-50/50 dark:bg-gray-900/20 px-4 py-3 flex items-center justify-between cursor-pointer border-b border-gray-100 dark:border-gray-800"
                onClick={() => setIsModelsSectionExpanded(!isModelsSectionExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-600 dark:text-amber-400">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                        {t('settings.known_models_pool', lang)}
                    </h4>
                    <span className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-900/50 px-1.5 py-0.5 rounded">
                        {knownModels.length}
                    </span>
                </div>
                <div className="text-gray-400">
                    {isModelsSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
            </div>
            
            {isModelsSectionExpanded && (
                <div className="p-4 space-y-4 animate-fade-in-up">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                            {t('settings.known_models_desc', lang)}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearCache}
                                disabled={isBatchTestingModels || knownModels.length === 0}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('action.clear', lang)}
                            </button>
                            <button
                                onClick={handleBatchTestModels}
                                disabled={isBatchTestingModels || knownModels.length === 0}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isBatchTestingModels ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Network className="w-3.5 h-3.5" />
                                )}
                                {t('action.batch_test_models', lang)}
                            </button>
                        </div>
                    </div>

                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-3 py-2 text-gray-500 font-semibold">{t('table.model_id', lang)}</th>
                                    <th className="px-3 py-2 text-gray-500 font-semibold text-right">{t('table.input_limit', lang)}</th>
                                    <th className="px-3 py-2 text-gray-500 font-semibold text-right">{t('table.output_limit', lang)}</th>
                                    <th className="px-3 py-2 text-gray-500 font-semibold text-center w-24">{t('table.test_status', lang)}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                {knownModels.length > 0 ? (
                                    knownModels.map((model) => (
                                        <tr key={model.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                                            <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 font-medium">
                                                {model.name}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-gray-500">
                                                {model.inputTokenLimit ? model.inputTokenLimit.toLocaleString() : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-gray-500">
                                                {model.outputTokenLimit ? model.outputTokenLimit.toLocaleString() : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {renderModelTestStatusBadge(model.testStatus)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-6 text-center text-gray-400 italic">
                                            {t('msg.no_known_models', lang)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};