
import { Ollama } from 'ollama/browser';
import { Message, Role, GenerationConfig, ModelInfo } from "../types";
import { t } from "../utils/i18n";

/**
 * Service to handle Ollama API interactions using the official ollama-js library.
 * Supports both local instances and Ollama Cloud.
 */
export class OllamaService {
  
  /**
   * Creates a new Ollama client instance.
   * We create a new instance per request to ensure proper configuration (Host/Key) 
   * and to allow safe aborting of specific requests without affecting others.
   */
  private getClient(baseUrl: string, apiKey?: string): Ollama {
    // Robustly clean the URL: remove trailing slash and ensure protocol
    let host = baseUrl.trim().replace(/\/$/, '');
    if (!host.match(/^https?:\/\//)) {
        host = `http://${host}`;
    }

    const config: { host: string; headers?: Record<string, string> } = {
      host: host
    };
    
    // If API Key is provided (e.g. for Ollama Cloud or protected instances),
    // add it as a Bearer token.
    if (apiKey && apiKey.trim()) {
      config.headers = { Authorization: 'Bearer ' + apiKey.trim() };
    }
    
    return new Ollama(config);
  }

  /**
   * Tests the connection by attempting to list models.
   */
  public async testConnection(baseUrl: string, apiKey?: string): Promise<boolean> {
    try {
      const client = this.getClient(baseUrl, apiKey);
      await client.list();
      return true;
    } catch (e) {
      console.warn("Ollama connection test failed:", e);
      return false;
    }
  }

  /**
   * Fetches available models from the Ollama endpoint.
   */
  public async listModels(baseUrl: string, apiKey?: string): Promise<ModelInfo[]> {
    try {
      const client = this.getClient(baseUrl, apiKey);
      const response = await client.list();
      
      // Map Ollama models to App's ModelInfo structure
      return response.models.map((m: any) => ({
          name: m.name,
          displayName: m.name,
          // Ollama list API doesn't explicitly return context limits, default to reasonable values
          inputTokenLimit: 4096, 
          outputTokenLimit: 4096
      })).sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
    } catch (error: any) {
      console.error("Ollama list models failed:", error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new Error("Network Error: Failed to fetch. Ensure Ollama is running (OLLAMA_ORIGINS=\"*\") or check CORS.");
      }
      throw error;
    }
  }

  /**
   * Streams chat completion from Ollama API using the library's async generator.
   */
  public async streamChat(
    baseUrl: string,
    modelId: string,
    history: Message[],
    newMessage: string,
    systemInstruction: string | undefined,
    config: GenerationConfig,
    apiKey?: string,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const client = this.getClient(baseUrl, apiKey);

    // Map App's history to Ollama's expected message format
    // App uses 'model', Ollama uses 'assistant'
    const messages = history.map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content: msg.text
    }));

    // Prepend system instruction if present
    if (systemInstruction) {
      messages.unshift({ role: 'system', content: systemInstruction });
    }

    // Append the new user message
    messages.push({ role: 'user', content: newMessage });

    try {
      const response = await client.chat({
        model: modelId,
        messages: messages,
        stream: true,
        options: {
            temperature: config.temperature,
            top_p: config.topP,
            top_k: config.topK,
            num_predict: config.maxOutputTokens
        }
      });

      let fullText = "";
      
      // Iterate over the async generator
      for await (const part of response) {
        if (abortSignal?.aborted) {
             // Abort this specific client instance
             client.abort(); 
             break;
        }
        
        const chunkContent = part.message.content;
        fullText += chunkContent;
        if (onChunk) onChunk(fullText);
      }

      return fullText;

    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
         throw new Error("Aborted by user");
      }
      // Handle connection refused or other network errors generically
      if (error instanceof TypeError || error.message?.includes('Failed to fetch')) {
         throw new Error("Network Error: Failed to fetch. Check CORS/Server.");
      }
      throw error;
    }
  }
}
