import { useState } from 'react';
import { DialogConfig } from '../types';

/**
 * 管理自定义对话框（Alert, Confirm, Input）状态的自定义 Hook
 */
export const useDialog = () => {
    const [dialog, setDialog] = useState<DialogConfig>({
        isOpen: false,
        type: 'alert',
        title: '',
        onConfirm: () => {}
    });

    /**
     * 显示一个对话框
     * @param config 对话框配置参数
     */
    const showDialog = (config: Partial<DialogConfig> & { title: string, onConfirm: (value?: string) => void }) => {
        setDialog({
            isOpen: true,
            type: config.type || 'alert',
            title: config.title,
            message: config.message,
            inputValue: config.inputValue,
            inputPlaceholder: config.inputPlaceholder,
            onConfirm: config.onConfirm,
            onCancel: config.onCancel
        });
    };

    /**
     * 关闭当前对话框
     */
    const closeDialog = () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
    };

    return { dialog, showDialog, closeDialog };
};