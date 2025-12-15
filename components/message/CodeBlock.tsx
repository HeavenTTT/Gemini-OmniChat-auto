import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { Language, Theme } from '../../types';
import { t } from '../../utils/i18n';

interface CodeBlockProps {
  value: string;
  language: string;
  lang: Language;
  theme: Theme;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  value, 
  language, 
  lang, 
  theme,
  onShowToast 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    onShowToast(t('action.copied_code', lang), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const isDarkTheme = ['dark', 'twilight', 'panda', 'vscode-dark', 'chocolate'].includes(theme);
  const style = isDarkTheme ? vscDarkPlus : vs;

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e] group shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-gray-700">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 font-medium">{language || 'text'}</span>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors bg-gray-200/50 dark:bg-gray-700/50 px-2 py-1 rounded"
          aria-label={copied ? t('action.copied_code', lang) : t('action.copy_code', lang)}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? t('action.copied', lang) : t('action.copy', lang)}</span>
        </button>
      </div>
      <div className="overflow-x-auto text-sm">
        <SyntaxHighlighter
          language={language || 'text'}
          style={style}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: 'inherit',
          }}
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};