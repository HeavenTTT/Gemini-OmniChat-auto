

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isError?: boolean;
  keyIndex?: number; // 1-based index of the key used
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface KeyConfig {
  id: string;
  key: string;
  label?: string;
  isActive: boolean;
  usageLimit: number; // Number of requests before switching
  isRateLimited: boolean;
  lastUsed: number;
}

export enum GeminiModel {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  FLASH_THINKING = 'gemini-2.5-flash-thinking-preview-01-21'
}

export interface SystemPrompt {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
}

export type Theme = 'light' | 'dark' | 'twilight' | 'sky' | 'pink';
export type Language = 'en' | 'zh';
export type TextWrappingMode = 'default' | 'forced' | 'auto';

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface SecurityConfig {
  enabled: boolean;
  password?: string;
  questions: SecurityQuestion[];
  lastLogin: number;
}

export interface GenerationConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  stream: boolean;
}

export interface AppSettings {
  model: string; 
  savedModels: string[]; // List of models fetched from API
  systemPrompts: SystemPrompt[];
  theme: Theme;
  language: Language;
  fontSize: number; // Font size in px
  textWrapping: TextWrappingMode; // Replaced enableTextWrapping
  security: SecurityConfig;
  generation: GenerationConfig;
}
