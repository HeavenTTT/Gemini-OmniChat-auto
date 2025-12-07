
import { Message, Role, GenerationConfig, ModelInfo } from "../types";
import { t } from "../utils/i18n"; // Import t for translations

/**
 * Service to handle OpenAI-compatible API interactions.
 */
export class OpenAIService {
  
  /**
   * Tests the connection by attempting to list models or perform a minimal check.
   */
  public async testConnection(apiKey: string, baseUrl: string): Promise<boolean> {
    try {
      const models = await this.listModels(apiKey, baseUrl);
      return Array.isArray(models);
    } catch (e) {
      console.error("Connection test failed", e);
      return false;
    }
  }

  /**
   * Tests if the key can perform a chat completion.
   */
  public async testChat(apiKey: string, baseUrl: string, modelId: string): Promise<boolean> {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    try {
      const response = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      });
      return response.ok;
    } catch (e) {
      console.error("Chat test failed (network/CORS)", e);
      return false;
    }
  }

  /**
   * Fetches available models from the OpenAI-compatible endpoint.
   */
  public async listModels(apiKey: string, baseUrl: string): Promise<ModelInfo[]> {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    try {
      const response = await fetch(`${cleanUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text(); // Get detailed error from API
        const error = new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        (error as any).status = response.status; // Attach status for GeminiService to extract
        throw error;
      }
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => ({
            name: m.id,
            displayName: m.id,
            // OpenAI doesn't standardly expose limits in list models
            inputTokenLimit: 128000, 
            outputTokenLimit: 4096
        })).sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
      }
      return [];
    } catch (error: any) {
      console.error("Failed to list OpenAI models", error);
      if (error instanceof TypeError) { // Network error, CORS, etc.
          throw new Error(t('error.fetch_failed', 'en')); // Re-throw with translated generic error
      }
      throw error; // Re-throw other specific API errors
    }
  }

  /**
   * Streams chat completion from an OpenAI-compatible API.
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
    
    const openAIHistory = history.map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content: msg.text
    }));

    // Prepend system instruction
    if (systemInstruction) {
      openAIHistory.unshift({ role: 'system' as any, content: systemInstruction });
    }

    // Append current user message
    openAIHistory.push({ role: 'user', content: newMessage });

    const requestBody = {
      model: modelId,
      messages: openAIHistory,
      temperature: config.temperature,
      top_p: config.topP,
      max_tokens: config.maxOutputTokens,
      stream: config.stream
    };

    try { // Outer try-catch for fetch errors
        const response = await fetch(`${cleanUrl}/chat/completions`, {
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
            // Pass status code along to GeminiService for better error code extraction
            const error = new Error(`OpenAI Error ${response.status}: ${errText}`);
            (error as any).status = response.status; // Attach status for GeminiService to extract
            throw error;
        }

        if (config.stream) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");
          let fullText = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (abortSignal?.aborted) {
                reader.cancel();
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter(line => line.trim() !== "");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.replace("data: ", "").trim();
                  if (dataStr === "[DONE]") break;
                  
                  try {
                    const json = JSON.parse(dataStr);
                    const content = json.choices?.[0]?.delta?.content || "";
                    if (content) {
                      fullText += content;
                      if (onChunk) onChunk(fullText);
                    }
                  } catch (e) {
                    // Ignore parse errors for partial chunks
                  }
                }
              }
            }
          }
          return fullText;
        } else {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        }
    } catch (error: any) {
        console.error("OpenAI API Call failed (network/CORS)", error);
        if (error instanceof TypeError) { // Network error, CORS, etc.
            throw new Error(t('error.fetch_failed', 'en')); // Re-throw with translated generic error
        }
        throw error; // Re-throw other specific API errors
    }
  }
}
