import { Message, KeyConfig, GenerationConfig, ModelProvider, ModelInfo, Language, KeyGroup } from "../types";
import { OpenAIService } from "./openaiService";
import { GoogleService } from "./googleService";
import { OllamaService } from "./ollamaService";
import { t } from "../utils/i18n";

/**
 * 队列任务接口定义
 */
interface RequestTask {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  abortSignal?: AbortSignal;
}

interface LLMServiceCallbacks {
    onKeyError?: (id: string, errorCode?: string, isFatal?: boolean) => void;
    onStatusMessage?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
}

/**
 * LLM 核心服务类：处理多提供商交互。
 * 包含：API 密钥轮询、负载均衡、请求队列处理。
 */
export class LLMService {
  private keys: KeyConfig[] = [];
  private keyGroups: KeyGroup[] = [];
  private keyIndex: number = 0; // 当前轮询到的 Key 索引
  private keyUsageCount: number = 0; // 当前 Key 已使用的次数
  
  // 队列管理状态：确保 API 请求按顺序处理，避免高并发冲突
  private requestQueue: RequestTask[] = [];
  private isProcessingQueue: boolean = false;
  
  private openAIService: OpenAIService;
  private googleService: GoogleService;
  private ollamaService: OllamaService;
  
  private onKeyError?: (id: string, errorCode?: string, isFatal?: boolean) => void;
  private onStatusMessage?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;

  constructor(
      initialKeys: KeyConfig[], 
      callbacksOrOnError?: LLMServiceCallbacks | ((id: string, errorCode?: string, isFatal?: boolean) => void)
  ) {
    this.updateKeys(initialKeys);
    this.openAIService = new OpenAIService();
    this.googleService = new GoogleService();
    this.ollamaService = new OllamaService();
    
    if (typeof callbacksOrOnError === 'function') {
        this.onKeyError = callbacksOrOnError;
    } else if (callbacksOrOnError) {
        this.onKeyError = callbacksOrOnError.onKeyError;
        this.onStatusMessage = callbacksOrOnError.onStatusMessage;
    }
  }

  /**
   * 更新 API 密钥池
   */
  public updateKeys(newKeys: KeyConfig[], keyGroups: KeyGroup[] = []) {
    this.keys = newKeys;
    this.keyGroups = keyGroups;
    // 索引越界安全检查
    if (this.keyIndex >= this.keys.length) {
        this.keyIndex = 0;
        this.keyUsageCount = 0;
    }
  }

  private getGroupName(groupId?: string): string | undefined {
    if (!groupId) return undefined;
    return this.keyGroups.find(g => g.id === groupId)?.name;
  }

  /**
   * 将任务推入队列并触发处理逻辑
   */
  private async enqueueTask<T>(execute: () => Promise<T>, abortSignal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        return reject(new Error("Aborted by user"));
      }

      this.requestQueue.push({
        execute,
        resolve,
        reject,
        abortSignal
      });

      this.processQueue();
    });
  }

  /**
   * 顺序处理队列中的任务 (FIFO)
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const task = this.requestQueue.shift();
      if (!task) continue;

      if (task.abortSignal?.aborted) {
        task.reject(new Error("Aborted by user"));
        continue;
      }

      try {
        const result = await task.execute();
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * 获取模型列表
   */
  public async listModels(keyConfig: KeyConfig): Promise<ModelInfo[]> {
    return this.enqueueTask(async () => {
      if (keyConfig.provider === 'openai') {
          if (!keyConfig.baseUrl) throw new Error("Base URL is required for OpenAI provider");
          return await this.openAIService.listModels(keyConfig.key, keyConfig.baseUrl);
      } else if (keyConfig.provider === 'ollama') {
          return await this.ollamaService.listModels(keyConfig.baseUrl || '', keyConfig.key);
      } else {
          return await this.googleService.listModels(keyConfig.key);
      }
    });
  }

  /**
   * 测试连接
   */
  public async testConnection(keyConfig: KeyConfig): Promise<boolean> {
    return this.enqueueTask(async () => {
      const modelToUse = keyConfig.model || (keyConfig.provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-2.5-flash');
      try {
          if (keyConfig.provider === 'openai') {
              if (!keyConfig.baseUrl) return false;
              return await this.openAIService.testChat(keyConfig.key, keyConfig.baseUrl, modelToUse);
          } else if (keyConfig.provider === 'ollama') {
              return await this.ollamaService.testConnection(keyConfig.baseUrl || '', keyConfig.key);
          } else {
              return await this.googleService.testConnection(keyConfig.key, modelToUse);
          }
      } catch (e) {
          return false;
      }
    });
  }

  /**
   * 核心算法：轮询策略
   * 寻找下一个可用的 API 密钥，考虑：活跃状态、速率限制冷却时间、单个 Key 的轮询配额。
   */
  private getNextAvailableKey(lang: Language): KeyConfig {
    const activeKeys = this.keys.filter(k => k.isActive);
    
    if (activeKeys.length === 0) {
      throw new Error(t('error.no_active_keys', lang));
    }

    const attempts = activeKeys.length;
    let selectedKey: KeyConfig | null = null;
    let selectedIndex = -1;
    
    for (let i = 0; i < attempts; i++) {
        const idx = (this.keyIndex + i) % activeKeys.length;
        const candidate = activeKeys[idx];

        // 检查冷却时间：如果被 429 限制，进入 1 分钟冷却期
        if (candidate.isRateLimited && Date.now() - candidate.lastUsed < 60000) {
            continue; 
        }

        // 检查轮询配额：如果当前 Key 还没用够设定的次数，继续用它
        if (i === 0 && this.keyUsageCount < (candidate.usageLimit || 1)) {
             selectedKey = candidate;
             selectedIndex = idx;
             break;
        }

        // 切换到下一个 Key
        if (i > 0) {
            selectedKey = candidate;
            selectedIndex = idx;
            break;
        }
    }

    // 如果所有 Key 都因为某种原因被跳过，强制选择当前索引的下一个
    if (!selectedKey) {
        selectedIndex = (this.keyIndex + 1) % activeKeys.length;
        selectedKey = activeKeys[selectedIndex];
    }
    
    // 如果发生了索引切换，重置单密钥使用计数
    if (this.keyIndex !== selectedIndex) {
        this.keyIndex = selectedIndex;
        this.keyUsageCount = 0;
    }
    
    this.keyUsageCount++;
    return selectedKey;
  }

  private getKeyDisplayIndex(id: string): number {
      return this.keys.findIndex(k => k.id === id) + 1;
  }

  /**
   * 错误分级处理逻辑
   * 将 API 返回的原始错误转化为用户可读的本地化语言。
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
      
      return error.message || t('error.unexpected_error', lang);
  }

  /**
   * 节点 5: 核心重试与分发逻辑
   * 在发生非致命错误（如速率限制）时自动切换密钥并重试。
   */
  public async streamChatResponse(
    _ignoredGlobalModelId: string, 
    history: Message[],
    newMessage: string,
    images: string[] | undefined,
    systemInstruction: string | undefined,
    generationConfig: GenerationConfig,
    onChunk?: (text: string) => void,
    abortSignal?: AbortSignal,
    lang: Language = 'en'
  ): Promise<{ text: string, usedKeyIndex: number, provider: ModelProvider, usedModel: string, groundingMetadata?: any }> {

    return this.enqueueTask(async () => {
        const activeKeysCount = this.keys.filter(k => k.isActive).length;
        // 最大重试次数为活跃密钥数的 2 倍
        const maxRetries = Math.max(activeKeysCount * 2, 2); 
        let attempts = 0;
        const validHistory = history.filter(msg => (msg.text && msg.text.trim().length > 0) || (msg.images && msg.images.length > 0));
        
        let lastError: any = null;
        let lastGroupId: string | undefined = undefined;

        while (attempts < maxRetries) {
            let keyConfig: KeyConfig;
            try {
                keyConfig = this.getNextAvailableKey(lang);
            } catch (e: any) {
                throw e;
            }

            const currentKeyIndex = this.getKeyDisplayIndex(keyConfig.id);
            const currentGroupId = keyConfig.groupId;
            const groupName = this.getGroupName(currentGroupId);

            // Notify on switch (Retry or Rotation)
            // Skip notification for the very first attempt unless debugging, to be less noisy? 
            // The prompt asks for "Every key switch", so we include retries.
            if (attempts > 0) {
                let msg = t('msg.switching_key', lang).replace('{index}', currentKeyIndex.toString());
                // Detect Group Switch specifically
                if (currentGroupId && lastGroupId && currentGroupId !== lastGroupId && groupName) {
                     msg += ` (${t('msg.switching_group', lang).replace('{group}', groupName)})`;
                }
                this.onStatusMessage?.(msg, 'info');
            }
            
            lastGroupId = currentGroupId;

            const modelToUse = keyConfig.model || _ignoredGlobalModelId || 'gemini-3-flash-preview';

            try {
                let response: { text: string; groundingMetadata?: any } = { text: "", groundingMetadata: undefined };
                
                // 根据提供商分发请求
                if (keyConfig.provider === 'google' && modelToUse.toLowerCase().includes('imagen')) {
                     const imageMarkdown = await this.googleService.generateImage(keyConfig.key, modelToUse, newMessage);
                     response = { text: imageMarkdown, groundingMetadata: undefined };
                } 
                else if (keyConfig.provider === 'openai') {
                    if (!keyConfig.baseUrl) throw new Error(t('error.base_url_required', lang));
                    response = await this.openAIService.streamChat(
                        keyConfig.key, keyConfig.baseUrl, modelToUse, validHistory, 
                        newMessage, images, systemInstruction, generationConfig, onChunk, abortSignal
                    );
                } 
                else if (keyConfig.provider === 'ollama') {
                    response = await this.ollamaService.streamChat(
                        keyConfig.baseUrl || '', modelToUse, validHistory, 
                        newMessage, images, systemInstruction, generationConfig, keyConfig.key, onChunk, abortSignal
                    );
                } 
                else {
                    response = await this.googleService.streamChat(
                        keyConfig.key, modelToUse, validHistory, 
                        newMessage, images, systemInstruction, generationConfig, onChunk, abortSignal
                    );
                }

                return { 
                    text: response.text, 
                    usedKeyIndex: currentKeyIndex, 
                    provider: keyConfig.provider,
                    usedModel: modelToUse,
                    groundingMetadata: response.groundingMetadata
                };

            } catch (error: any) {
                if (abortSignal?.aborted) throw new Error("Aborted by user");
                
                lastError = error;
                let errorCode = 'Error';
                let statusCode = error.status || error.statusCode;

                if (!statusCode) {
                     const match = error.message?.match(/\b\d{3}\b/);
                     if (match) errorCode = match[0];
                     else if (error.message?.includes("Network")) errorCode = "Network";
                } else {
                    errorCode = statusCode.toString();
                }

                // Notify Error before switching
                const errorMessage = this.getErrorMessage(error, lang);
                this.onStatusMessage?.(
                    t('msg.key_error_verbose', lang)
                        .replace('{index}', currentKeyIndex.toString())
                        .replace('{error}', errorMessage), 
                    'error'
                );

                // 判断是否是致命错误：身份验证失败、计费问题、位置不支持等需要禁用密钥
                let isFatal = [401, 402, 403, 404].includes(statusCode);
                
                // 安全审核拦截不属于密钥问题，直接抛出给用户
                if (error.isSafety) {
                    throw new Error(this.getErrorMessage(error, lang));
                }

                if (this.onKeyError) {
                    this.onKeyError(keyConfig.id, errorCode, isFatal);
                }
                
                const localKey = this.keys.find(k => k.id === keyConfig.id);
                if (localKey) {
                    if (isFatal) localKey.isActive = false;
                    else {
                        // 速率限制错误：进入冷却
                        localKey.isRateLimited = true;
                        localKey.lastUsed = Date.now();
                        // 强制轮询配额用满，以便下次重试使用新 Key
                        this.keyUsageCount = 10000; 
                    }
                    localKey.lastErrorCode = errorCode;
                }

                if (this.keys.filter(k => k.isActive).length === 0) break; 

                attempts++;
                continue;
            }
        }
        
        if (lastError) throw new Error(this.getErrorMessage(lastError, lang));
        throw new Error(t('error.all_keys_failed', lang));
    }, abortSignal);
  }

  /**
   * Token 统计
   */
  public async countTokens(
      keyConfig: KeyConfig,
      history: Message[],
      newMessage: string,
      _ignoredSystemInstruction: string | undefined
  ): Promise<number> {
      return this.enqueueTask(async () => {
          if (keyConfig.provider !== 'google') return -1;
          return await this.googleService.countTokens(
              keyConfig.key, keyConfig.model || 'gemini-3-flash-preview', history, newMessage
          );
      });
  }
}