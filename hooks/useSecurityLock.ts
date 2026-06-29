import { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';

/**
 * 管理应用自动安全锁和用户活跃检测的自定义 Hook
 * @param isDbLoaded 数据库是否已加载
 * @param settings 全局应用配置
 * @param setSettings 设置更新函数
 */
export const useSecurityLock = (
    isDbLoaded: boolean,
    settings: AppSettings,
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
) => {
    const [isLocked, setIsLocked] = useState(false);
    const lastActivityRef = useRef<number>(Date.now());

    /**
     * 检查当前未活跃时间是否已超出安全锁阈值
     */
    const checkSecurityThreshold = () => {
        const now = Date.now();
        const lastActive = lastActivityRef.current;
        const limit = (settings.security.lockoutDurationSeconds || 86400) * 1000;
        
        if (now - lastActive > limit) {
            setIsLocked(true);
        } else {
            lastActivityRef.current = Date.now();
            setSettings(prev => ({
                ...prev,
                security: { ...prev.security, lastLogin: Date.now() }
            }));
        }
    };

    /**
     * 重置最后活跃时间并手动锁定/解锁
     */
    const unlock = () => {
        setIsLocked(false);
        lastActivityRef.current = Date.now();
        setSettings(prev => ({ 
            ...prev, 
            security: { ...prev.security, lastLogin: Date.now() } 
        }));
    };

    useEffect(() => {
        if (!isDbLoaded || !settings.security.enabled || isLocked) return;

        /**
         * 监听页面可见性或焦点变化
         */
        const onFocusChange = () => {
            if (document.visibilityState === 'visible' || document.hasFocus()) {
                checkSecurityThreshold();
            }
        };

        let lastUpdate = 0;
        /**
         * 监听用户的任意交互，更新最后活跃时间
         */
        const onUserInteraction = () => {
            const now = Date.now();
            lastActivityRef.current = now;
            
            if (now - lastUpdate > 10000) {
                lastUpdate = now;
                setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, lastLogin: now }
                }));
            }
        };

        window.addEventListener('focus', onFocusChange);
        document.addEventListener('visibilitychange', onFocusChange);
        window.addEventListener('mousedown', onUserInteraction, { passive: true });
        window.addEventListener('keydown', onUserInteraction, { passive: true });
        window.addEventListener('scroll', onUserInteraction, { passive: true });
        window.addEventListener('touchstart', onUserInteraction, { passive: true });

        return () => {
            window.removeEventListener('focus', onFocusChange);
            document.removeEventListener('visibilitychange', onFocusChange);
            window.removeEventListener('mousedown', onUserInteraction);
            window.removeEventListener('keydown', onUserInteraction);
            window.removeEventListener('scroll', onUserInteraction);
            window.removeEventListener('touchstart', onUserInteraction);
        };
    }, [isDbLoaded, settings.security.enabled, settings.security.lockoutDurationSeconds, isLocked]);

    return { isLocked, setIsLocked, lastActivityRef, unlock, checkSecurityThreshold };
};