"use client";

import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  // 当时间戳更新时，重新设定定时器以重置该 Toast 的生命周期
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 3500); // 适当调整至 3.5s 以提供更充裕的阅读时间
    return () => clearTimeout(timer);
  }, [onRemove, toast.timestamp]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
     switch (toast.type) {
      case 'success': return 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900/30';
      case 'error': return 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-900/30 ring-1 ring-red-100 dark:ring-red-900/20';
      case 'warning': return 'bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-900/30';
      case 'info': default: return 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900/30';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-fade-in-up min-w-[300px] max-w-sm transition-all duration-300 ${getStyles()}`}>
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 break-words flex items-center flex-wrap gap-1.5">
        <span>{toast.message}</span>
        {toast.count && toast.count > 1 && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white dark:bg-amber-600 animate-pulse transition-transform duration-200">
            x{toast.count}
          </span>
        )}
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};