import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, Message } from '../types';
import { dbSetItem } from '../utils/indexedDB';
import { t } from '../utils/i18n';

const STORAGE_SESSIONS_KEY = 'gemini_omnichat_sessions_v1';
const STORAGE_ACTIVE_SESSION_KEY = 'gemini_omnichat_active_session_v1';

/**
 * 管理聊天会话、消息记录以及本地存储同步的自定义 Hook
 * @param isDbLoaded 数据库是否已经加载完毕
 * @param language 当前界面语言
 */
export const useChatSessions = (isDbLoaded: boolean, language: string) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);

    /**
     * 创建一个全新的会话
     */
    const createNewSession = useCallback(() => {
        const newId = uuidv4();
        const newSession: ChatSession = {
            id: newId,
            title: t('msg.new_chat_title', language),
            messages: [],
            createdAt: Date.now(),
            memory: ''
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newId);
        setMessages([]);
        return newId;
    }, [language]);

    /**
     * 载入保存的会话，或新建会话
     */
    const loadInitialSessions = useCallback((storedSessions: ChatSession[] | null, storedActiveId: string | null) => {
        if (storedSessions && storedSessions.length > 0) {
            setSessions(storedSessions);
            const targetId = (storedActiveId && storedSessions.find(s => s.id === storedActiveId)) ? storedActiveId : storedSessions[0].id;
            setActiveSessionId(targetId);
            setMessages(storedSessions.find(s => s.id === targetId)?.messages || []);
        } else {
            const newId = uuidv4();
            const newSession: ChatSession = {
                id: newId,
                title: t('msg.new_chat_title', language),
                messages: [],
                createdAt: Date.now(),
                memory: ''
            };
            setSessions([newSession]);
            setActiveSessionId(newId);
            setMessages([]);
        }
    }, [language]);

    /**
     * 切换选择目标会话
     * @param sessionId 目标会话 ID
     */
    const handleSelectSession = useCallback((sessionId: string) => {
        if (sessionId === activeSessionId) return;
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            setActiveSessionId(sessionId);
            setMessages(session.messages);
        }
    }, [activeSessionId, sessions]);

    /**
     * 更新当前活动会话的背景记忆
     * @param newMemory 记忆内容
     */
    const handleUpdateSessionMemory = useCallback((newMemory: string) => {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, memory: newMemory } : s));
    }, [activeSessionId]);

    // 监听消息变化并实时同步到当前会话中
    useEffect(() => {
        if (!isDbLoaded) return;
        if (activeSessionId) {
            setSessions(prev => {
                const idx = prev.findIndex(s => s.id === activeSessionId);
                if (idx === -1) return prev;
                if (prev[idx].messages === messages) return prev;
                
                const updated = [...prev];
                updated[idx] = { ...updated[idx], messages };
                return updated;
            });
        }
    }, [messages, activeSessionId, isDbLoaded]);

    // 持久化存储会话列表
    useEffect(() => {
        if (!isDbLoaded) return;
        if (sessions.length > 0) {
            dbSetItem(STORAGE_SESSIONS_KEY, sessions);
        }
    }, [sessions, isDbLoaded]);

    // 持久化存储当前活动会话 ID
    useEffect(() => {
        if (!isDbLoaded) return;
        if (activeSessionId) {
            dbSetItem(STORAGE_ACTIVE_SESSION_KEY, activeSessionId);
        }
    }, [activeSessionId, isDbLoaded]);

    return {
        sessions,
        setSessions,
        activeSessionId,
        setActiveSessionId,
        messages,
        setMessages,
        createNewSession,
        loadInitialSessions,
        handleSelectSession,
        handleUpdateSessionMemory
    };
};