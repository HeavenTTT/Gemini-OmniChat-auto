import { Message, Role, GenerationConfig, ModelInfo } from "../types";
import { t } from "../utils/i18n";

/**
 * Service to handle Ollama Cloud API interactions.
 */
export class OllamaService {
  
  /**
   * Tests connection to Ollama Cloud by fetching tags (models).
   */
  public async testConnection(apiKey: string, baseUrl: string): Promise<boolean> {
    try {
      const models = await this.listModels(apiKey, baseUrl);
      return Array.isArray(models);
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetches available models from Ollama Cloud.
   * Endpoint: /api/tags
   */
  public async listModels(apiKey: string, baseUrl: string): Promise<ModelInfo[]> {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    try {
      const response = await fetch(`${cleanUrl}/api/tags`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ollama Cloud Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        return data.models.map((m: any) => ({
            name: m.name || m.model,
            displayName: m.name || m.model,
            inputTokenLimit: 128000, // Estimate/Default
            outputTokenLimit: 4096
        })).sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
      }
      return [];
    } catch (error: any) {
      if (error instanceof TypeError) { 
          throw new Error(t('error.fetch_failed', 'en')); 
      }
      throw error; 
    }
  }

  /**
   * Streams chat completion from Ollama Cloud.
   * Endpoint: /api/chat
   */
  public async streamChat(
    apiKey: string,
    baseUrl: string,
    modelId: string,
    history: Message[],
    newMessage: string,
    systemInstruction: string | undefined,
    config: GenerationConfig,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    // Convert history to Ollama format
    const ollamaMessages = history.map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content: msg.text
    }));

    // Prepend system instruction if available
    if (systemInstruction) {
      ollamaMessages.unshift({ role: 'system' as any, content: systemInstruction });
    }

    // Append current user message
    ollamaMessages.push({ role: 'user', content: newMessage });

    const requestBody = {
      model: modelId,
      messages: ollamaMessages,
      stream: true, // Always stream for this method
      options: {
        temperature: config.temperature,
        top_p: config.topP,
        top_k: config.topK,
        num_predict: config.maxOutputTokens
      }
    };

    try {
        const response = await fetch(`${cleanUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: abortSignal
        });

        if (!response.ok) {
            const errText = await response.text();
            const error = new Error(`Ollama Error ${response.status}: ${errText}`);
            (error as any).status = response.status;
            throw error;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";
        let buffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (abortSignal?.aborted) {
              reader.cancel();
              break;
            }

            // Append new chunk to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Split by newlines to handle NDJSON
            const lines = buffer.split("\n");
            
            // Keep the last segment in buffer if it's incomplete
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim() !== "") {
                try {
                  const json = JSON.parse(line);
                  
                  if (json.done) break;

                  if (json.message && json.message.content) {
                    fullText += json.message.content;
                    if (onChunk) onChunk(fullText);
                  }
                } catch (e) {
                  // Ignore parse errors for corrupt lines
                  console.warn("Ollama JSON parse error", e);
                }
              }
            }
          }
        }
        return fullText;

    } catch (error: any) {
        if (error instanceof TypeError) { 
            throw new Error(t('error.fetch_failed', 'en')); 
        }
        throw error;
    }
  }
}
