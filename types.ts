

export const APP_VERSION = '1.5.0';

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
  provider?: ModelProvider; // Track which provider generated this
  model?: string; // The specific model used for this message
  executionTime?: number; // Time taken to generate response in ms
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type ModelProvider = 'google' | 'openai' | 'ollama';

export interface KeyGroup {
  id: string;
  name: string;
}

export interface KeyConfig {
  id: string;
  key: string;
  provider: ModelProvider; 
  label?: string;
  isActive: boolean;
  usageLimit: number; // Number of requests before switching
  isRateLimited: boolean;
  lastUsed: number;
  baseUrl?: string; // Specific Base URL for this key (OpenAI)
  model?: string;   // Specific Model for this key
  lastErrorCode?: string; // Code of the last error encountered
  groupId?: string; // Optional: ID of the group this key belongs to
}

export enum GeminiModel {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  FLASH_THINKING = 'gemini-2.5-flash-thinking-preview-01-21'
}

export interface ModelInfo {
  name: string;
  displayName?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

export interface SystemPrompt {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
}

export type Theme = 'light' | 'dark' | 'twilight' | 'sky' | 'pink' | 'sunrise' | 'lime' | 'panda' | 'vscode-light' | 'vscode-dark';
export type Language = 'en' | 'zh' | 'ja';
export type TextWrappingMode = 'default' | 'forced' | 'auto';
export type AvatarVisibility = 'always' | 'user-only' | 'model-only' | 'never';

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
  lockoutDurationSeconds?: number; // New: Duration in seconds for inactivity lockout
}

export interface GenerationConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  stream: boolean;
  thinkingBudget?: number; // New: For Gemini 2.5 thinking models
  stripThoughts?: boolean; // New: Strip <think> tags from history to save tokens
}

export interface ScriptConfig {
  inputFilterEnabled: boolean;
  inputFilterCode: string; // The content of the js/ts file
  inputFileName?: string;
  outputFilterEnabled: boolean;
  outputFilterCode: string; // The content of the js/ts file
  outputFileName?: string;
}

export interface AppSettings {
  // Removed global 'model' and 'openAIBaseUrl' as they are now per-key or defaults for new keys
  defaultModel: string; // Default model for new keys
  defaultBaseUrl: string; // Default URL for new OpenAI keys
  
  systemPrompts: SystemPrompt[];
  theme: Theme;
  language: Language;
  fontSize: number; 
  textWrapping: TextWrappingMode;
  avatarVisibility: AvatarVisibility; // New: Control avatar visibility
  bubbleTransparency: number; // 0-100
  showModelName: boolean; // New: Toggle model name visibility
  kirbyThemeColor: boolean; // New: Toggle kirby icon theme adaptation
  showTokenUsage: boolean; // New: Toggle token usage estimation
  showResponseTimer: boolean; // New: Toggle response execution time display
  smoothAnimation: boolean; // New: Toggle typewriter animation
  historyContextLimit: number; // New: Limit number of past messages sent (0 = unlimited)
  security: SecurityConfig;
  generation: GenerationConfig;
  scripts: ScriptConfig; // New: Script settings
  
  // API Key Grouping
  enableKeyGrouping?: boolean;
  keyGroups?: KeyGroup[];

  // knownModels removed from AppSettings to separate cache from configuration
  savedModels?: string[]; // Deprecated, kept for interface compat if needed, but logic moved to keys
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface DialogConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'input';
  title: string;
  message?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}