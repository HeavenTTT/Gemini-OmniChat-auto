import { common } from './en/common';
import { action } from './en/action';
import { setting } from './en/setting';
import { message } from './en/message';
import { error } from './en/error';

/**
 * English localization entry point
 */
export const en: Record<string, string> = {
  ...common,
  ...action,
  ...setting,
  ...message,
  ...error,
};