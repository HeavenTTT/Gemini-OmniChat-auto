

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role, GenerationConfig, ModelInfo } from "../types";

export class GoogleService {
  /**
   * Lists available models from the Google Gemini API.
   */
  public async listModels(apiKey: string): Promise<ModelInfo[]> {
    try {
        const ai = new GoogleGenAI({ apiKey });
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
        // Filter for relevant models (Gemini, Flash, Pro, Thinking, Imagen)
        return models.filter(m => 
            m.name.includes('gemini') || m.name.includes('flash') || m.name.includes('pro') || m.name.includes('thinking') || m.name.includes('imagen')
        );
    } catch (e: any) {
        // Attach status if available in error message or object
        if (e.status === 403 || (e.message && e.message.includes("403"))) {
            const err = new Error("Permission Denied");
            (err as any).status = 403;
            throw err;
        }
        throw e;
    }
  }

  /**
   * Tests connection to Google Gemini API with a minimal generation request.
   */
  public async testConnection(apiKey: string, modelId: string = 'gemini-2.5-flash'): Promise<boolean> {
      try {
          const ai = new GoogleGenAI({ apiKey });
          // If checking Imagen model, use generateImages to test
          if (modelId.includes('imagen')) {
             await ai.models.generateImages({
                 model: modelId,
                 prompt: 'Test',
                 config: { numberOfImages: 1 }
             });
          } else {
             await ai.models.generateContent({
                 model: modelId,
                 contents: 'Test',
             });
          }
          // If we get here without error, the key is valid.
          return true;
      } catch (e) {
          return false;
      }
  }

  /**
   * Counts tokens for a chat history using Google Gemini API.
   */
  public async countTokens(
      apiKey: string,
      modelId: string,
      history: Message[],
      newMessage: string
  ): Promise<number> {
      try {
          const ai = new GoogleGenAI({ apiKey });
          
          // Filter out invalid messages (error or empty) to match generation logic
          // Note: Token counting might not fully support images yet in the SDK exactly same way, ignoring images for now for simplicity in count
          const validHistory = history.filter(msg => (msg.text && msg.text.trim().length > 0) && !msg.isError);

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

          const response = await ai.models.countTokens({
              model: modelId,
              contents: contents,
          });
          return response.totalTokens || 0;
      } catch (error) {
          return -1;
      }
  }

  /**
   * Generates images using Imagen models.
   */
  public async generateImage(apiKey: string, model: string, prompt: string): Promise<string> {
      try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateImages({
              model: model,
              prompt: prompt,
              config: {
                  numberOfImages: 1,
                  // outputMimeType: 'image/jpeg', // Optional
              }
          });
          
          // The SDK returns base64 image bytes
          // @ts-ignore - SDK typing might vary slightly
          const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
          
          if (imageBytes) {
              // Return as Markdown image
              return `![Generated Image](data:image/png;base64,${imageBytes})`;
          } else {
              throw new Error("No image generated.");
          }
      } catch (e: any) {
         if (e.message && e.message.includes('403')) (e as any).status = 403;
         throw e;
      }
  }

  /**
   * Streams chat response from Google Gemini API.
   */
  public async streamChat(
      apiKey: string, 
      modelId: string, 
      history: Message[], 
      newMessage: string, 
      images: string[] | undefined,
      systemInstruction: string | undefined, 
      config: GenerationConfig,
      onChunk?: (text: string) => void,
      abortSignal?: AbortSignal
  ): Promise<string> {
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Prepare history
        const googleHistory = history.map(msg => {
            const parts: any[] = [];
            
            // Add images from history if present
            if (msg.images && msg.images.length > 0) {
                 msg.images.forEach(img => {
                     // Convert data URI to inline data
                     // Format: data:image/png;base64,.....
                     const match = img.match(/^data:(.*?);base64,(.*)$/);
                     if (match) {
                         parts.push({
                             inlineData: {
                                 mimeType: match[1],
                                 data: match[2]
                             }
                         });
                     }
                 });
            }

            // Add text part
            if (msg.text) {
                parts.push({ text: msg.text });
            }

            return {
                role: msg.role === Role.USER ? 'user' : 'model',
                parts: parts
            };
        });

        const commonConfig: any = {
            systemInstruction: systemInstruction,
            temperature: config.temperature,
            topP: config.topP,
            topK: config.topK,
            maxOutputTokens: config.maxOutputTokens,
            frequencyPenalty: config.frequencyPenalty,
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

        // Prepare new message contents
        const newParts: any[] = [];
        if (images && images.length > 0) {
            images.forEach(img => {
                const match = img.match(/^data:(.*?);base64,(.*)$/);
                if (match) {
                    newParts.push({
                        inlineData: {
                            mimeType: match[1],
                            data: match[2]
                        }
                    });
                }
            });
        }
        if (newMessage) {
            newParts.push({ text: newMessage });
        }

        if (config.stream) {
            // sendMessageStream accepts 'message' which can be string or Part[]
            const resultStream = await client.sendMessageStream({ message: newParts });
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
                const error = new Error(`Safety Block: ${stopReason}`);
                (error as any).status = 400; // Treat as bad request/block
                (error as any).isSafety = true;
                throw error;
            }

            return fullText;
        } else {
            const result = await client.sendMessage({ message: newParts });
            // Handling non-streaming empty response
            if (!result.text && result.candidates?.[0]?.finishReason) {
                 const reason = result.candidates[0].finishReason;
                 const error = new Error(`Safety Block: ${reason}`);
                 (error as any).status = 400;
                 (error as any).isSafety = true;
                 throw error;
            }
            return result.text || '';
        }
      } catch (e: any) {
         // Enhance error object with status code if buried in message
         if (e.message) {
             if (e.message.includes('403')) (e as any).status = 403;
             if (e.message.includes('429')) (e as any).status = 429;
             if (e.message.includes('400')) (e as any).status = 400;
             if (e.message.includes('402')) (e as any).status = 402;
             if (e.message.includes('404')) (e as any).status = 404;
             if (e.message.includes('500')) (e as any).status = 500;
             if (e.message.includes('503')) (e as any).status = 503;
         }
         throw e;
      }
  }
}