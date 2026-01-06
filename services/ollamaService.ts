
import { Ollama } from 'ollama/browser';
import { Message, Role, GenerationConfig, ModelInfo } from "../types";
import { t } from "../utils/i18n";

/**
 * Service to handle Ollama API interactions.
 * Uses the official library for management, but raw fetch for reliable streaming in browser.
 */
export class OllamaService {
  
  /**
   * Creates a new Ollama client instance.
   * Forces usage of the local proxy path (/ollama-proxy) derived from window.location.origin.
   */
  private getClient(apiKey?: string): Ollama {
    // Automatically determine host based on current origin to ensure correct proxying
    // This handles both http (localhost) and https (production) correctly via the proxy
    const currentOrigin = window.location.origin;
    const host = `${currentOrigin}/ollama-proxy`;
    
    const config: { host: string; headers?: Record<string, string> } = {
      host: host
    };
    
    // If API Key is provided (e.g. for Ollama Cloud), add it as a Bearer token.
    if (apiKey && apiKey.trim()) {
      config.headers = { Authorization: 'Bearer ' + apiKey.trim() };
    }
    
    return new Ollama(config);
  }

  /**
   * Tests the connection by attempting to list models.
   * Note: baseUrl argument is preserved for interface compatibility but ignored.
   */
  public async testConnection(baseUrl: string, apiKey?: string): Promise<boolean> {
    try {
      const client = this.getClient(apiKey);
      await client.list();
      return true;
    } catch (e) {
      console.warn("Ollama connection test failed:", e);
      return false;
    }
  }

  /**
   * Fetches available models from the Ollama endpoint.
   * Note: baseUrl argument is preserved for interface compatibility but ignored.
   */
  public async listModels(baseUrl: string, apiKey?: string): Promise<ModelInfo[]> {
    try {
      const client = this.getClient(apiKey);
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
      
      // Map status_code to status for consistent error handling in LLMService
      if (error.status_code) {
          (error as any).status = error.status_code;
      }

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          // Provide a more specific hint if it looks like a Mixed Content or CORS issue
          const netErr = new Error("Connection failed. Please check if the Ollama Cloud endpoint is reachable.");
          (netErr as any).status = 0; // Network error
          throw netErr;
      }
      throw error;
    }
  }

  /**
   * Helper to strip base64 header for Ollama (it expects raw base64 usually)
   */
  private extractBase64(dataUri: string): string {
      return dataUri.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  /**
   * Streams chat completion from Ollama API.
   * Uses raw fetch with ReadableStream for better compatibility with browser streaming than the library.
   */
  public async streamChat(
    baseUrl: string, // Ignored
    modelId: string,
    history: Message[],
    newMessage: string,
    images: string[] | undefined,
    systemInstruction: string | undefined,
    config: GenerationConfig,
    apiKey?: string,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal
  ): Promise<string> {
    // Determine proxy URL
    const currentOrigin = window.location.origin;
    const proxyUrl = `${currentOrigin}/ollama-proxy`;

    // Map App's history to Ollama's expected message format
    const messages = history.map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content: msg.text,
      // Pass images if present (strip prefix)
      images: msg.images ? msg.images.map(this.extractBase64) : undefined
    }));

    // Prepend system instruction if present
    if (systemInstruction) {
      messages.unshift({ role: 'system', content: systemInstruction, images: undefined });
    }

    // Append the new user message
    messages.push({ 
        role: 'user', 
        content: newMessage,
        images: images ? images.map(this.extractBase64) : undefined
    });

    const requestOptions = {
      model: modelId,
      messages: messages,
      stream: config.stream,
      options: {
          temperature: config.temperature,
          top_p: config.topP,
          top_k: config.topK,
          num_predict: config.maxOutputTokens,
          frequency_penalty: config.frequencyPenalty,
      }
    };

    try {
      if (config.stream) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (apiKey && apiKey.trim()) {
            headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }

        const response = await fetch(`${proxyUrl}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestOptions),
            signal: abortSignal
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = response.statusText;
            try {
                const json = JSON.parse(errorText);
                if (json.error) errorMessage = json.error;
            } catch { /* ignore */ }
            const error = new Error(`Ollama API Error: ${response.status} - ${errorMessage}`);
            (error as any).status = response.status;
            throw error;
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split('\n');
            // Keep the last partial line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.done) break;
                    
                    if (json.message?.content) {
                        const content = json.message.content;
                        fullText += content;
                        if (onChunk) onChunk(fullText);
                    }
                } catch (e) {
                    console.warn("Error parsing Ollama stream chunk:", e);
                }
            }
        }
        
        return fullText;

      } else {
        // Non-streaming mode: Use the library for simplicity
        const client = this.getClient(apiKey);
        const response = await client.chat({
          model: modelId,
          messages: messages,
          stream: false,
          options: requestOptions.options
        });
        
        if (abortSignal?.aborted) {
           throw new Error("Aborted by user");
        }

        return response.message.content;
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
         throw new Error("Aborted by user");
      }
      
      // Map status_code to status for consistent error handling in LLMService
      if (error.status_code) {
          (error as any).status = error.status_code;
      }

      // Handle connection refused or other network errors generically
      if (error instanceof TypeError || error.message?.includes('Failed to fetch')) {
         const netErr = new Error("Network Error: Failed to fetch. Check connection.");
         (netErr as any).status = 0;
         throw netErr;
      }
      throw error;
    }
  }
}
