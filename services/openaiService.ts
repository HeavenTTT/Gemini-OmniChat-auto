
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
      return Array.isArray(models) && models.length >= 0;
    } catch (e) {
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
        let errorMsg = response.statusText;
        try {
            const text = await response.text();
            if (text) {
                try {
                    const errorBody = JSON.parse(text);
                    if (errorBody.error?.message) errorMsg = errorBody.error.message;
                } catch {
                    errorMsg = text;
                }
            }
        } catch {
            // fallback
        }

        const error = new Error(`OpenAI API Error: ${response.status} - ${errorMsg}`);
        (error as any).status = response.status; 
        throw error;
      }
      
      const text = await response.text();
      if (!text) return [];
      
      const data = JSON.parse(text);
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
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) { 
          const netErr = new Error("Network Error"); 
          (netErr as any).status = 0;
          throw netErr;
      }
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
    images: string[] | undefined,
    systemInstruction: string | undefined,
    config: GenerationConfig,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal
  ): Promise<{ text: string, groundingMetadata?: any }> {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    // Construct history with images support
    const openAIHistory = history.map(msg => {
      let content: any = msg.text;

      // Check if message has images
      if (msg.images && msg.images.length > 0) {
         content = [];
         if (msg.text) {
             content.push({ type: "text", text: msg.text });
         }
         msg.images.forEach(img => {
             content.push({
                 type: "image_url",
                 image_url: { url: img }
             });
         });
      }

      return {
        role: msg.role === Role.USER ? 'user' : 'assistant',
        content: content
      };
    });

    // Prepend system instruction
    if (systemInstruction) {
      openAIHistory.unshift({ role: 'system' as any, content: systemInstruction });
    }

    // Append current user message
    let newContent: any = newMessage;
    if (images && images.length > 0) {
        newContent = [];
        if (newMessage) {
            newContent.push({ type: "text", text: newMessage });
        }
        images.forEach(img => {
            newContent.push({
                type: "image_url",
                image_url: { url: img }
            });
        });
    }

    openAIHistory.push({ role: 'user', content: newContent });

    const requestBody = {
      model: modelId,
      messages: openAIHistory,
      temperature: config.temperature,
      top_p: config.topP,
      max_tokens: config.maxOutputTokens,
      stream: config.stream,
      frequency_penalty: config.frequencyPenalty,
    };

    try {
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
            let errorMsg = response.statusText;
            try {
                const text = await response.text();
                if (text) {
                    try {
                        const errorBody = JSON.parse(text);
                        if (errorBody.error?.message) errorMsg = errorBody.error.message;
                    } catch {
                        errorMsg = text;
                    }
                }
            } catch {
                // fallback
            }

            const error = new Error(errorMsg);
            (error as any).status = response.status; 
            throw error;
        }

        if (config.stream) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");
          let fullText = "";
          let buffer = ""; // Buffer for partial SSE lines

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (abortSignal?.aborted) {
                reader.cancel();
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const lines = buffer.split("\n");
              // Keep the last partial line in the buffer
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;
                
                const dataStr = trimmedLine.replace("data: ", "").trim();
                if (dataStr === "[DONE]") break;
                
                try {
                  const json = JSON.parse(dataStr);
                  const content = json.choices?.[0]?.delta?.content || "";
                  if (content) {
                    fullText += content;
                    if (onChunk) onChunk(fullText);
                  }
                } catch (e) {
                  // If JSON is incomplete, wait for next chunk
                  // In some implementations, buffer might need to be restored
                }
              }
            }
          }
          return { text: fullText };
        } else {
          const text = await response.text();
          if (!text) return { text: "" };
          const data = JSON.parse(text);
          return { text: data.choices?.[0]?.message?.content || "" };
        }
    } catch (error: any) {
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            const netErr = new Error("Network Error"); 
            (netErr as any).status = 0;
            throw netErr;
        }
        throw error; 
    }
  }
}