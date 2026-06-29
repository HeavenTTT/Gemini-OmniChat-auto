import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ToastMessage } from '../types';
import { calculateSimilarity } from '../utils/similarity';

/**
 * 管理 Toast 消息通知的自定义 Hook
 */
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    /**
     * 添加一个 Toast 消息通知
     * 自动合并 80% 及以上相似度的消息，合并刷屏，并刷新计时器和角标计数
     * @param message 消息内容
     * @param type 消息类型
     */
    const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setToasts(prev => {
            const similarIdx = prev.findIndex(t => {
                if (t.type !== type) return false;
                const sim = calculateSimilarity(t.message, message);
                return sim >= 0.8;
            });

            if (similarIdx !== -1) {
                const updated = [...prev];
                const existing = updated[similarIdx];
                updated[similarIdx] = {
                    ...existing,
                    message: message.length > existing.message.length ? message : existing.message,
                    count: (existing.count || 1) + 1,
                    timestamp: Date.now()
                };
                return updated;
            }

            return [...prev, { id: uuidv4(), message, type, count: 1, timestamp: Date.now() }];
        });
    };

    /**
     * 移除特定 ID 的 Toast
     * @param id Toast 的唯一 ID
     */
    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return { toasts, addToast, removeToast };
};