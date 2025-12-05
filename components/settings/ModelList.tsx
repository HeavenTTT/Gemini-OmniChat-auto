
"use client";

import React, { useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { ModelInfo, Language } from '../../types';
import { t } from '../../utils/i18n';

interface ModelListProps {
  models: ModelInfo[];
  lang: Language;
}

export const ModelList: React.FC<ModelListProps> = ({ models, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedModel, setCopiedModel] = useState<string | null>(null);

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (model.displayName && model.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedModel(text);
    setTimeout(() => setCopiedModel(null), 2000);
  };

  const formatNumber = (num?: number) => {
    return num ? num.toLocaleString() : '-';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder={t('action.search_models', lang)} 
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-800 dark:text-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Models Grid/List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{t('label.model', lang)}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">{t('label.input_limit', lang)}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">{t('label.output_limit', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <tr key={model.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary-600 dark:text-primary-400 font-medium">{model.name}</span>
                        <button 
                          onClick={() => handleCopy(model.name)} 
                          className="text-gray-400 hover:text-primary-500 transition-colors p-1"
                          title={t('action.copy', lang)}
                        >
                          {copiedModel === model.name ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      {model.displayName && model.displayName !== model.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{model.displayName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {formatNumber(model.inputTokenLimit)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {formatNumber(model.outputTokenLimit)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                    {t('msg.fetch_no_models', lang)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
