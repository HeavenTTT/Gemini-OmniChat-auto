
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role, KeyConfig, GenerationConfig } from "../types";

// Helper to wait/sleep
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Service class for handling Google Gemini API interactions.
 * Manages API key rotation, model listing, and streaming chat responses.
 */
export class GeminiService {
  private keys: KeyConfig[] = [];
  private currentKeyIndex: number = 0;
  private currentKeyUsageCount: number = 0;

  /**
   * Initializes the service with a list of API keys.
   * @param initialKeys Array of KeyConfig objects.
   */
  constructor(initialKeys: KeyConfig[]) {
    this.updateKeys(initialKeys);
  }

  /**
   * Updates the internal list of API keys.
   * Resets usage counters if the current index becomes invalid.
   * @param newKeys New array of KeyConfig objects.
   */
  public updateKeys(newKeys: KeyConfig[]) {
    this.keys = newKeys;
    // Reset counters if current index is out of bounds
    if (this.currentKeyIndex >= this.keys.length) {
      this.currentKeyIndex = 0;
      this.currentKeyUsageCount = 0;
    }
  }

  /**
   * Fetches the list of available models using a specific API key.
   * Handles differences in SDK response formats (iterator vs array).
   * @param apiKey The API key to use for the request.
   * @returns A promise resolving to an array of model names (strings).
   */
  public async listModels(apiKey: string): Promise<string[]> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.list();
      
      const models: string[] = [];
      
      // Handle response being iterable (Pager)
      try {
          for await (const model of response) {
            const m = model as any;
            if (m.name) {
              models.push(m.name.replace('models/', ''));
            }
          }
      } catch (iterError) {
          console.warn("Async iteration failed, checking properties", iterError);
          const raw = response as any;
          if (Array.isArray(raw.models)) {
             raw.models.forEach((m: any) => {
                 if (m.name) models.push(m.name.replace('models/', ''));
             });
          }
      }
      
      return models.filter(m => 
          m.includes('gemini') || 
          m.includes('flash') || 
          m.includes('pro') || 
          m.includes('thinking')
      );
    } catch (error) {
      console.error("Failed to list models", error);
      throw error;
    }
  }

  /**
   * Retrieves the next available active API key based on rotation logic.
   * Checks for rate limits and usage limits per key.
   * @returns The selected API key string.
   * @throws Error if no active or usable keys are available.
   */
  private getNextAvailableKey(): string {
    const activeKeys = this.keys.filter(k => k.isActive);
    
    if (activeKeys.length === 0) {
      throw new Error("No active API keys available. Please enable at least one key in settings.");
    }

    const currentKeyConfig = this.keys[this.currentKeyIndex];
    let shouldSwitch = false;

    // Check conditions to switch key
    if (!currentKeyConfig || !currentKeyConfig.isActive) {
      shouldSwitch = true;
    }
    else if (currentKeyConfig.isRateLimited) {
      // If rate limited, check if cooldown period (1 min) has passed
      if (Date.now() - currentKeyConfig.lastUsed > 60000) {
         currentKeyConfig.isRateLimited = false;
      } else {
         shouldSwitch = true;
      }
    }
    // Check usage limit (polling count)
    else if (this.currentKeyUsageCount >= (currentKeyConfig.usageLimit || 1)) {
      shouldSwitch = true;
    }

    if (!shouldSwitch) {
      this.currentKeyUsageCount++;
      return currentKeyConfig.key;
    }

    // Find next usable key
    const startIndex = (this.currentKeyIndex + 1) % this.keys.length;
    let foundIndex = -1;

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (startIndex + i) % this.keys.length;
      const key = this.keys[idx];
      
      if (key.isActive) {
        if (key.isRateLimited && Date.now() - key.lastUsed > 60000) {
          key.isRateLimited = false;
        }

        if (!key.isRateLimited) {
          foundIndex = idx;
          break;
        }
      }
    }

    if (foundIndex !== -1) {
      this.currentKeyIndex = foundIndex;
      this.currentKeyUsageCount = 1; 
      return this.keys[foundIndex].key;
    }

    // Fallback: If all are rate limited, pick the first active one anyway
    const fallbackIndex = this.keys.findIndex((k, i) => i >= startIndex && k.isActive) 
                         ?? this.keys.findIndex(k => k.isActive);
    
    if (fallbackIndex !== -1) {
      this.currentKeyIndex = fallbackIndex;
      this.currentKeyUsageCount = 1;
      return this.keys[fallbackIndex].key;
    }

    throw new Error("No usable API keys found.");
  }

  /**
   * Marks a specific key as rate-limited and records the timestamp.
   * @param keyString The API key to mark.
   */
  private markKeyRateLimited(keyString: string) {
    const config = this.keys.find(k => k.key === keyString);
    if (config) {
      config.isRateLimited = true;
      config.lastUsed = Date.now();
      console.warn(`Key ...${keyString.slice(-4)} marked as rate limited.`);
    }
  }

  /**
   * Helper to get the 1-based index of a key for display purposes.
   * @param keyString The API key.
   * @returns The index + 1.
   */
  private getKeyIndex(keyString: string): number {
    return this.keys.findIndex(k => k.key === keyString) + 1;
  }

  /**
   * Sends a message to the Gemini API and streams the response.
   * Handles key rotation automatically on 429/403 errors.
   * 
   * @param modelId The model to use.
   * @param history Previous chat history.
   * @param newMessage The new user message.
   * @param systemInstruction Optional system instruction/prompt.
   * @param generationConfig Config for temperature, topP, etc.
   * @param onChunk Callback for receiving streaming text chunks.
   * @param abortSignal Signal to abort the request.
   * @returns Object containing the full text response and the key index used.
   */
  public async streamChatResponse(
    modelId: string,
    history: Message[],
    newMessage: string,
    systemInstruction: string | undefined,
    generationConfig: GenerationConfig,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal
  ): Promise<{ text: string, usedKeyIndex: number }> {
    const maxRetries = this.keys.filter(k => k.isActive).length * 2 || 2;
    let attempts = 0;

    // Filter history to strictly valid messages
    const validHistory = history
      .filter(msg => msg.text && msg.text.trim().length > 0 && !msg.isError)
      .map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    while (attempts < maxRetries) {
      let apiKey = "";
      try {
        apiKey = this.getNextAvailableKey();
      } catch (e: any) {
        throw e;
      }
      
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Common config
        const commonConfig = {
          systemInstruction: systemInstruction,
          temperature: generationConfig.temperature,
          topP: generationConfig.topP,
          topK: generationConfig.topK,
          maxOutputTokens: generationConfig.maxOutputTokens
        };

        const client = ai.chats.create({
          model: modelId,
          config: commonConfig,
          history: validHistory
        });

        // Handle Streaming
        if (generationConfig.stream) {
          const resultStream = await client.sendMessageStream({ message: newMessage });
          let fullText = '';
          for await (const chunk of resultStream) {
            if (abortSignal?.aborted) {
                break;
            }
            const chunkText = (chunk as GenerateContentResponse).text;
            if (chunkText) {
              fullText += chunkText;
              if (onChunk) onChunk(fullText);
            }
          }
          return { 
            text: fullText, 
            usedKeyIndex: this.getKeyIndex(apiKey) 
          };
        } 
        // Handle Non-Streaming
        else {
          const result = await client.sendMessage({ message: newMessage });
          const text = result.text || '';
          return { 
             text, 
             usedKeyIndex: this.getKeyIndex(apiKey) 
          };
        }

      } catch (error: any) {
        if (abortSignal?.aborted) {
             throw new Error("Aborted by user");
        }
        console.error("API Call failed with key", apiKey.slice(-4), error);

        const isRateLimit = error.message?.includes('429') || error.status === 429;
        const isQuota = error.message?.includes('403') || error.status === 403;

        // If rate limited, mark key and retry loop will pick next key
        if (isRateLimit || isQuota) {
          this.markKeyRateLimited(apiKey);
          attempts++;
          await delay(500); 
          continue; 
        } else {
          // Fatal error (e.g. bad request), rethrow
          throw error;
        }
      }
    }

    throw new Error("All active API keys exhausted or failed.");
  }
}
