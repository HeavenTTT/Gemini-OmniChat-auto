

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
  private onKeyError?: (id: string, errorCode?: string, isFatal?: boolean) => void;

  constructor(initialKeys: KeyConfig[], onKeyError?: (id: string, errorCode?: string, isFatal?: boolean) => void) {
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

    // Attempt to find a usable key (not rate limited recently)
    const attempts = activeKeys.length;
    let selectedKey: KeyConfig | null = null;
    
    // Check next N keys starting from current index
    for (let i = 0; i < attempts; i++) {
        const idx = (this.keyIndex + i) % activeKeys.length;
        const candidate = activeKeys[idx];

        // Check if rate limited and within cooldown period (60s)
        if (candidate.isRateLimited && Date.now() - candidate.lastUsed < 60000) {
            continue; // Skip this key
        }

        // Key is good to use (or at least we should try)
        // Check poll usage limit
        if (i === 0 && this.keyUsageCount >= (candidate.usageLimit || 1)) {
             // Current key exhausted usage limit, force rotate to next
             continue; 
        }

        selectedKey = candidate;
        // Update global index to point to this selected key
        this.keyIndex = idx;
        break;
    }

    // If all keys are rate limited, fallback to the one with oldest usage or just current rotation
    if (!selectedKey) {
        // Fallback: Just rotate to next to try anyway
        this.keyIndex = (this.keyIndex + 1) % activeKeys.length;
        selectedKey = activeKeys[this.keyIndex];
    }
    
    // Reset usage count if we switched indices from original
    // (Note: this logic is simplified; strict round robin tracks index persistently)
    // Here we just increment usage for the selected key.
    this.keyUsageCount++;
    
    return selectedKey;
  }

  private getKeyDisplayIndex(id: string): number {
      return this.keys.findIndex(k => k.id === id) + 1;
  }

  /**
   * Helper to map raw error objects/codes to user-friendly messages
   */
  private getErrorMessage(error: any, lang: Language): string {
      const status = error.status || error.statusCode;
      const msg = error.message?.toLowerCase() || '';

      if (status === 401 || msg.includes('401') || msg.includes('invalid api key')) return t('error.invalid_api_key', lang);
      if (status === 402 || msg.includes('402') || msg.includes('billing')) return t('error.billing_required', lang);
      if (status === 403 || msg.includes('403') || msg.includes('permission denied')) return t('error.permission_denied', lang);
      if (status === 404 || msg.includes('404') || msg.includes('not found')) return t('error.model_not_found', lang);
      if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) return t('error.quota_exceeded', lang);
      if (status === 400 || msg.includes('400')) {
          if (msg.includes('safety') || error.isSafety) return t('error.safety_block', lang);
          if (msg.includes('context')) return t('error.context_length_exceeded', lang);
          return t('error.bad_request', lang);
      }
      if (status === 500 || status === 502 || status === 503 || msg.includes('500')) return t('error.server_error', lang);
      if (status === 0 || msg.includes('network') || msg.includes('fetch')) return t('error.network_issue', lang);
      if (msg.includes('refused')) return t('error.connection_refused', lang);
      
      return error.message || t('error.unexpected_error', lang);
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
        const activeKeysCount = this.keys.filter(k => k.isActive).length;
        // Retry logic: Try at least 2 times per key to handle transient network blips, 
        // but avoid infinite loops. Limit total attempts relative to key count.
        const maxRetries = Math.max(activeKeysCount * 2, 2); 
        let attempts = 0;
        const validHistory = history.filter(msg => msg.text && msg.text.trim().length > 0 && !msg.isError);
        
        let lastError: any = null;

        while (attempts < maxRetries) {
            let keyConfig: KeyConfig;
            try {
                keyConfig = this.getNextAvailableKey(lang);
            } catch (e: any) {
                // If getNextAvailableKey throws (e.g. no active keys), stop immediately
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
                
                lastError = error;

                // Extract Error Code for internal tracking/display
                let errorCode = 'Error';
                let statusCode = error.status || error.statusCode;

                if (statusCode) {
                    errorCode = statusCode.toString();
                } else {
                     const match = error.message?.match(/\b\d{3}\b/);
                     if (match) {
                         errorCode = match[0];
                         statusCode = parseInt(errorCode);
                     }
                     else if (error.message?.includes("Network")) errorCode = "Network";
                }

                // Determine if fatal
                // 401 (Invalid Key), 403 (Permission), 404 (Model Not Found), 400 (Bad Request) are usually configuration errors -> Disable Key
                // 429 (Rate Limit), 500+ (Server), 0 (Network) are transient -> Keep Active but Rate Limit
                let isFatal = false;
                if ([400, 401, 402, 403, 404].includes(statusCode)) {
                    isFatal = true;
                }
                
                // Specific check for Safety Block (400) - usually prompt specific, not key specific, but treated as error
                if (error.isSafety) {
                    isFatal = false; // Don't disable key for safety blocks
                    // But we should probably throw immediately for safety blocks as rotating won't help?
                    // Actually, let's stop retrying if it's a safety block
                    throw new Error(this.getErrorMessage(error, lang));
                }

                // Notify App
                if (this.onKeyError) {
                    this.onKeyError(keyConfig.id, errorCode, isFatal);
                }
                
                // Mark inactive or rate-limited locally
                const localKey = this.keys.find(k => k.id === keyConfig.id);
                if (localKey) {
                    if (isFatal) {
                        localKey.isActive = false;
                    } else {
                        localKey.isRateLimited = true;
                        localKey.lastUsed = Date.now();
                    }
                    localKey.lastErrorCode = errorCode;
                }

                // If we ran out of active keys after this failure, stop
                if (this.keys.filter(k => k.isActive).length === 0) {
                     break; 
                }

                attempts++;
                continue;
            }
        }
        
        // If we exhausted retries or keys
        if (lastError) {
            throw new Error(this.getErrorMessage(lastError, lang));
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