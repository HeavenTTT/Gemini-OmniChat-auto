import { common } from './ja/common';
import { action } from './ja/action';
import { setting } from './ja/setting';
import { message } from './ja/message';
import { error } from './ja/error';

/**
 * 日本語聚合ローカライズ入口
 */
export const ja: Record<string, string> = {
  ...common,
  ...action,
  ...setting,
  ...message,
  ...error,
};