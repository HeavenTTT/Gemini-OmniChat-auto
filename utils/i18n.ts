import { Language } from '../types';
import { en } from './locales/en';
import { zh } from './locales/zh';
import { ja } from './locales/ja';

const translations: Record<Language, Record<string, string>> = {
  en,
  zh,
  ja
};

export const t = (key: string, lang: Language): string => {
  return translations[lang]?.[key] || key;
};
