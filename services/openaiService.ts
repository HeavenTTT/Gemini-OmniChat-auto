
import { Message, Role, GenerationConfig } from "../types";

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
   * Fetches available models from the OpenAI-compatible endpoint.
   */
  public async listModels(apiKey: string, baseUrl: string): Promise<string[]> {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    try {
      const response = await fetch(`${cleanUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id).sort();
      }
      return [];
    } catch (error) {
      console.error("Failed to list OpenAI models", error);
      throw error;
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
      throw new Error(`OpenAI Error ${response.status}: ${errText}`);
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
  }
}
