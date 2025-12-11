
import { Message, KeyConfig, GenerationConfig, ModelProvider, ModelInfo, Language } from "../types";
import { OpenAIService } from "./openaiService";
import { GoogleService } from "./googleService";
import { OllamaService } from "./ollamaService";
import { t } from "../utils/i18n";

/**
 * Service class for handling Multi-Provider LLM interactions.
 * Manages API key rotation, load balancing, and delegates to specific provider services (Google Gemini, OpenAI, or Ollama).
 */
export class LLMService {
  private keys: KeyConfig[] = [];
  private keyIndex: number = 0;
  private keyUsageCount: number = 0;
  private _isCallInProgress: boolean = false; // Lock to prevent concurrent calls
  
  private openAIService: OpenAIService;
  private googleService: GoogleService;
  private ollamaService: OllamaService;
  private onKeyError?: (id: string, errorCode?: string) => void;

  constructor(initialKeys: KeyConfig[], onKeyError?: (id: string, errorCode?: string) => void) {
    this.updateKeys(initialKeys);
    this.openAIService = new OpenAIService();
    this.googleService = new GoogleService();
    this.ollamaService = new OllamaService();
    this.onKeyError = onKeyError;
  }

  /**
   * Updates the pool of API keys available for rotation.
   * Resets usage counters if the key list changes significantly.
   */
  public updateKeys(newKeys: KeyConfig[]) {
    this.keys = newKeys;
    if (this.keyIndex >= this.keys.length) {
        this.keyIndex = 0;
        this.keyUsageCount = 0;
    }
  }

  /**
   * Lists available models for a specific key configuration.
   * Supports Google GenAI, OpenAI, and Ollama endpoints.
   */
  public async listModels(keyConfig: KeyConfig): Promise<ModelInfo[]> {
    if (this._isCallInProgress) {
        throw new Error("error.call_in_progress"); // UI will translate this key
    }
    this._isCallInProgress = true;
    try {
        if (keyConfig.provider === 'openai') {
            if (!keyConfig.baseUrl) throw new Error("Base URL is required for OpenAI provider");
            return await this.openAIService.listModels(keyConfig.key, keyConfig.baseUrl);
        } else if (keyConfig.provider === 'ollama') {
            // Allow empty baseUrl (defaults to /ollama-proxy)
            return await this.ollamaService.listModels(keyConfig.baseUrl || '', keyConfig.key);
        } else {
            // Google Implementation
            return await this.googleService.listModels(keyConfig.key);
        }
    } finally {
        this._isCallInProgress = false;
    }
  }

  /**
   * Tests connection for a specific key configuration to ensure validity.
   * Performs a minimal chat generation request or model list check.
   */
  public async testConnection(keyConfig: KeyConfig): Promise<boolean> {
      if (this._isCallInProgress) {
          throw new Error("error.call_in_progress");
      }
      this._isCallInProgress = true;
      try {
          const modelToUse = keyConfig.model || (keyConfig.provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-2.5-flash');

          try {
              if (keyConfig.provider === 'openai') {
                  if (!keyConfig.baseUrl) return false;
                  return await this.openAIService.testChat(
                      keyConfig.key, 
                      keyConfig.baseUrl, 
                      modelToUse
                  );
              } else if (keyConfig.provider === 'ollama') {
                  // Allow empty baseUrl (defaults to /ollama-proxy)
                  return await this.ollamaService.testConnection(keyConfig.baseUrl || '', keyConfig.key);
              } else {
                  return await this.googleService.testConnection(keyConfig.key, modelToUse);
              }
          } catch (e) {
              return false;
          }
      } finally {
          this._isCallInProgress = false;
      }
  }

  /**
   * Retrieves the next available active API key using a Round-Robin strategy.
   * Handles usage limits per key (Poll Count) and skips rate-limited keys.
   */
  private getNextAvailableKey(lang: Language): KeyConfig {
    const activeKeys = this.keys.filter(k => k.isActive);
    
    if (activeKeys.length === 0) {
      throw new Error(t('error.no_active_keys', lang));
    }

    // Simple round-robin strategy across ALL active keys
    const currentKey = activeKeys[this.keyIndex % activeKeys.length];
    
    // Check usage limits (Poll Count)
    if (this.keyUsageCount >= (currentKey.usageLimit || 1)) {
        this.keyIndex = (this.keyIndex + 1) % activeKeys.length;
        this.keyUsageCount = 0;
    }
    
    const selectedKey = activeKeys[this.keyIndex % activeKeys.length];
    
    // Check rate limits (basic check: skip if limited < 60s ago)
    if (selectedKey.isRateLimited && Date.now() - selectedKey.lastUsed < 60000) {
        // Find next non-limited key
        for (let i = 1; i < activeKeys.length; i++) {
            const nextIdx = (this.keyIndex + i) % activeKeys.length;
            const k = activeKeys[nextIdx];
            if (!k.isRateLimited || Date.now() - k.lastUsed > 60000) {
                this.keyIndex = nextIdx;
                this.keyUsageCount = 0;
                return k;
            }
        }
    }

    this.keyUsageCount++;
    return selectedKey;
  }

  private getKeyDisplayIndex(id: string): number {
      return this.keys.findIndex(k => k.id === id) + 1;
  }

  /**
   * Streams chat response using the next available key and its specific configuration.
   * Handles retries on failure and switches keys automatically.
   */
  public async streamChatResponse(
    _ignoredGlobalModelId: string, 
    history: Message[],
    newMessage: string,
    systemInstruction: string | undefined,
    generationConfig: GenerationConfig,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal,
    lang: Language = 'en'
  ): Promise<{ text: string, usedKeyIndex: number, provider: ModelProvider, usedModel: string }> {

    if (this._isCallInProgress) {
        throw new Error("error.call_in_progress");
    }
    this._isCallInProgress = true;

    try {
        const maxRetries = this.keys.filter(k => k.isActive).length * 2 || 2;
        let attempts = 0;
        const validHistory = history.filter(msg => msg.text && msg.text.trim().length > 0 && !msg.isError);

        while (attempts < maxRetries) {
            let keyConfig: KeyConfig;
            try {
                keyConfig = this.getNextAvailableKey(lang);
            } catch (e: any) {
                throw e;
            }

            const modelToUse = keyConfig.model || _ignoredGlobalModelId || 'gemini-2.5-flash';

            try {
                let text = "";
                if (keyConfig.provider === 'openai') {
                    if (!keyConfig.baseUrl) throw new Error(t('error.base_url_required', lang));
                    text = await this.openAIService.streamChat(
                        keyConfig.key,
                        keyConfig.baseUrl,
                        modelToUse,
                        validHistory,
                        newMessage,
                        systemInstruction,
                        generationConfig,
                        onChunk,
                        abortSignal
                    );
                } else if (keyConfig.provider === 'ollama') {
                    // Allow empty baseUrl
                    text = await this.ollamaService.streamChat(
                        keyConfig.baseUrl || '',
                        modelToUse,
                        validHistory,
                        newMessage,
                        systemInstruction,
                        generationConfig,
                        keyConfig.key, // Optional API key
                        onChunk,
                        abortSignal
                    );
                } else {
                    // Google Gemini API Call delegated to GoogleService
                    text = await this.googleService.streamChat(
                        keyConfig.key,
                        modelToUse,
                        validHistory,
                        newMessage,
                        systemInstruction,
                        generationConfig,
                        onChunk,
                        abortSignal
                    );
                }

                return { 
                    text, 
                    usedKeyIndex: this.getKeyDisplayIndex(keyConfig.id), 
                    provider: keyConfig.provider,
                    usedModel: modelToUse
                };

            } catch (error: any) {
                if (abortSignal?.aborted) throw new Error("Aborted by user");
                
                // Extract Error Code
                let errorCode = 'Error';
                if (error.status) { // e.g., from Gemini API client, or raw response status
                    errorCode = error.status.toString();
                } else if (error.statusCode) { // e.g., from some libraries
                    errorCode = error.statusCode.toString();
                } else {
                     const match = error.message?.match(/\b\d{3}\b/);
                     if (match) errorCode = match[0];
                     else if (error.message?.includes("429")) errorCode = "429";
                     else if (error.message?.includes(t('error.fetch_failed', 'en'))) errorCode = "Network"; // Specific code for network errors
                }

                // Auto-deactivate key on error if callback provided
                if (this.onKeyError) {
                    this.onKeyError(keyConfig.id, errorCode);
                }
                
                // Mark inactive locally to avoid reusing in this loop
                const localKey = this.keys.find(k => k.id === keyConfig.id);
                if (localKey) {
                    localKey.isActive = false;
                    localKey.lastErrorCode = errorCode;
                }

                attempts++;
                continue;
            }
        }
        throw new Error(t('error.all_keys_failed', lang));
    } finally {
        this._isCallInProgress = false;
    }
  }

  /**
   * Counts tokens for a given context.
   * Returns -1 if provider does not support counting (like generic OpenAI or Ollama) or error occurs.
   */
  public async countTokens(
      keyConfig: KeyConfig,
      history: Message[],
      newMessage: string,
      _ignoredSystemInstruction: string | undefined
  ): Promise<number> {
      if (this._isCallInProgress) {
          throw new Error("error.call_in_progress");
      }
      this._isCallInProgress = true;
      try {
          if (keyConfig.provider !== 'google') return -1;
          
          return await this.googleService.countTokens(
              keyConfig.key,
              keyConfig.model || 'gemini-2.5-flash',
              history,
              newMessage
          );
      } finally {
          this._isCallInProgress = false;
      }
  }
}
