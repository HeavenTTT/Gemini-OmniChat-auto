

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role, KeyConfig, GenerationConfig, ModelProvider, ModelInfo, Language } from "../types";
import { OpenAIService } from "./openaiService";
import { t } from "../utils/i18n";

// Helper to wait/sleep
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Service class for handling Multi-Provider LLM interactions.
 * Manages API key rotation, load balancing, and delegates to specific provider services (Google Gemini or OpenAI).
 */
export class GeminiService {
  private keys: KeyConfig[] = [];
  private keyIndex: number = 0;
  private keyUsageCount: number = 0;
  
  private openAIService: OpenAIService;
  private onKeyError?: (id: string, errorCode?: string) => void;

  constructor(initialKeys: KeyConfig[], onKeyError?: (id: string, errorCode?: string) => void) {
    this.updateKeys(initialKeys);
    this.openAIService = new OpenAIService();
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
   * Supports both Google GenAI and OpenAI compatible endpoints.
   */
  public async listModels(keyConfig: KeyConfig): Promise<ModelInfo[]> {
    if (keyConfig.provider === 'openai') {
        if (!keyConfig.baseUrl) throw new Error("Base URL is required for OpenAI provider");
        return this.openAIService.listModels(keyConfig.key, keyConfig.baseUrl);
    } else {
        // Google Implementation
        try {
            const ai = new GoogleGenAI({ apiKey: keyConfig.key });
            const response = await ai.models.list();
            const models: ModelInfo[] = [];
            
            // @ts-ignore - The types for list() response iterator might vary slightly in some SDK versions
            for await (const model of response) {
                const m = model as any;
                if (m.name) {
                    const name = m.name.replace('models/', '');
                    models.push({
                        name: name,
                        displayName: m.displayName || name,
                        inputTokenLimit: m.inputTokenLimit,
                        outputTokenLimit: m.outputTokenLimit
                    });
                }
            }
            return models.filter(m => 
                m.name.includes('gemini') || m.name.includes('flash') || m.name.includes('pro') || m.name.includes('thinking')
            );
        } catch (e: any) {
            console.error("List models failed", e);
            // If list models fails (e.g. 403), we return empty to handle gracefully
            if (e.status === 403 || (e.message && e.message.includes("403"))) {
                return [];
            }
            // For other errors, return empty as well to avoid breaking the UI flow, 
            // but log it.
            return [];
        }
    }
  }

  /**
   * Tests connection for a specific key configuration to ensure validity.
   * Performs a minimal chat generation request to verify the key works for chat.
   */
  public async testConnection(keyConfig: KeyConfig): Promise<boolean> {
      const modelToUse = keyConfig.model || (keyConfig.provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-2.5-flash');

      try {
          if (keyConfig.provider === 'openai') {
              if (!keyConfig.baseUrl) return false;
              return await this.openAIService.testChat(
                  keyConfig.key, 
                  keyConfig.baseUrl, 
                  modelToUse
              );
          } else {
              const ai = new GoogleGenAI({ apiKey: keyConfig.key });
              await ai.models.generateContent({
                  model: modelToUse,
                  contents: 'Test',
              });
              // If we get here without error (403/404 throws exception), the key is valid.
              // Even if the content is blocked by safety (empty text), the connection is established.
              return true;
          }
      } catch (e) {
          console.error("Test connection failed", e);
          return false;
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
    // In a mixed-provider pool, this means we might switch from Gemini to OpenAI per message.
    
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

  /**
   * Marks a specific key as rate-limited to avoid using it temporarily.
   */
  private markKeyRateLimited(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.isRateLimited = true;
      key.lastUsed = Date.now();
    }
  }

  private getKeyDisplayIndex(id: string): number {
      return this.keys.findIndex(k => k.id === id) + 1;
  }

  /**
   * Streams chat response using the next available key and its specific configuration.
   * Handles retries on failure and switches keys automatically.
   */
  public async streamChatResponse(
    // We no longer accept global modelId, we use key's preferred model
    _ignoredGlobalModelId: string, 
    history: Message[],
    newMessage: string,
    systemInstruction: string | undefined,
    generationConfig: GenerationConfig,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal,
    lang: Language = 'en'
  ): Promise<{ text: string, usedKeyIndex: number, provider: ModelProvider, usedModel: string }> {

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
                if (!keyConfig.baseUrl) throw new Error("Base URL missing for OpenAI key");
                text = await this.openAIService.streamChat(
                    keyConfig.key,
                    keyConfig.baseUrl,
                    modelToUse,
                    history,
                    newMessage,
                    systemInstruction,
                    generationConfig,
                    onChunk,
                    abortSignal
                );
            } else {
                // Google Gemini API Call
                text = await this.callGoogle(
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
            
            console.error(`API Call failed (${keyConfig.provider})`, error);
            
            // Extract Error Code
            let errorCode = 'Error';
            if (error.status) {
                errorCode = error.status.toString();
            } else if (error.statusCode) {
                errorCode = error.statusCode.toString();
            } else {
                 const match = error.message?.match(/\b\d{3}\b/);
                 if (match) errorCode = match[0];
                 else if (error.message?.includes("429")) errorCode = "429";
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
  }

  /**
   * Direct call to Google GenAI SDK.
   */
  private async callGoogle(
      apiKey: string, 
      modelId: string, 
      history: Message[], 
      newMessage: string, 
      systemInstruction: string | undefined, 
      config: GenerationConfig,
      onChunk?: (text: string) => void,
      abortSignal?: AbortSignal
  ): Promise<string> {
      const ai = new GoogleGenAI({ apiKey });
      const googleHistory = history.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const commonConfig: any = {
        systemInstruction: systemInstruction,
        temperature: config.temperature,
        topP: config.topP,
        topK: config.topK,
        maxOutputTokens: config.maxOutputTokens
      };

      // Apply thinking budget if set and > 0
      if (config.thinkingBudget && config.thinkingBudget > 0) {
          commonConfig.thinkingConfig = { thinkingBudget: config.thinkingBudget };
      }

      const client = ai.chats.create({
        model: modelId,
        config: commonConfig,
        history: googleHistory
      });

      if (config.stream) {
        const resultStream = await client.sendMessageStream({ message: newMessage });
        let fullText = '';
        let stopReason = '';

        for await (const chunk of resultStream) {
          if (abortSignal?.aborted) break;
          
          const response = chunk as GenerateContentResponse;
          const chunkText = response.text;

          if (chunkText) {
            fullText += chunkText;
            if (onChunk) onChunk(fullText);
          } else {
            // If text is undefined/empty, check candidates for finishReason
            const candidate = response.candidates?.[0];
            if (candidate?.finishReason) {
                stopReason = candidate.finishReason;
            }
          }
        }
        
        // If we have no text but a stop reason (e.g., SAFETY, RECITATION), display it
        if (!fullText && stopReason) {
             const reasonMessage = `[Response blocked. Reason: ${stopReason}]`;
             if (onChunk) onChunk(reasonMessage);
             return reasonMessage;
        }

        return fullText;
      } else {
        const result = await client.sendMessage({ message: newMessage });
        // Handling non-streaming empty response
        if (!result.text && result.candidates?.[0]?.finishReason) {
             return `[Response blocked. Reason: ${result.candidates[0].finishReason}]`;
        }
        return result.text || '';
      }
  }

  /**
   * Counts tokens for a given context using the Gemini API.
   * Returns -1 if provider is not Google or error occurs.
   */
  public async countTokens(
      keyConfig: KeyConfig,
      history: Message[],
      newMessage: string,
      systemInstruction: string | undefined
  ): Promise<number> {
      if (keyConfig.provider !== 'google') return -1;

      const ai = new GoogleGenAI({ apiKey: keyConfig.key });
      
      // Filter out invalid messages (error or empty) to match generation logic
      const validHistory = history.filter(msg => msg.text && msg.text.trim().length > 0 && !msg.isError);

      const googleHistory = validHistory.map(msg => ({
          role: msg.role === Role.USER ? 'user' : 'model',
          parts: [{ text: msg.text }]
      }));

      const contents = [...googleHistory];

      if (newMessage && newMessage.trim().length > 0) {
          contents.push({
              role: 'user',
              parts: [{ text: newMessage }]
          });
      }

      try {
          // Note: systemInstruction parameter is often not supported in countTokens for certain models/SDK versions 
          // or needs to be part of contents. Removing it from config to avoid API errors.
          const response = await ai.models.countTokens({
              model: keyConfig.model || 'gemini-2.5-flash',
              contents: contents,
          });
          return response.totalTokens || 0;
      } catch (error) {
          console.error("Count tokens failed", error);
          return -1;
      }
  }
}