import { common } from './zh/common';
import { action } from './zh/action';
import { setting } from './zh/setting';
import { message } from './zh/message';
import { error } from './zh/error';

/**
 * 中文聚合本地化入口
 */
export const zh: Record<string, string> = {
  ...common,
  ...action,
  ...setting,
  ...message,
  ...error,
};