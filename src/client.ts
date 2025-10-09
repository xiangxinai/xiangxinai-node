/**
 * Xiangxin AI Guardrails Client
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import {
  XiangxinAIConfig,
  Message,
  GuardrailRequest,
  GuardrailResponse,
  ComplianceResult,
  SecurityResult,
  DataSecurityResult,
  GuardrailResult
} from './types';
import {
  XiangxinAIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NetworkError
} from './exceptions';

/**
 * Xiangxin AI Guardrails Client - Context-aware AI Guardrails based on LLM
 * 
 * This client provides a simple interface for interacting with the Xiangxin AI Guardrails API.
 * The guardrails use context-aware technology to understand the conversation context and perform security checks.
 * 
 * @example
 * 
 * ```typescript
 * const client = new XiangxinAI({ apiKey: "your-api-key" });
 * 
 * // Detect user input
 * const result = await client.checkPrompt("User question");
 *
 * // Detect output content (based on context)
 * const result = await client.checkResponseCtx("User question", "Assistant answer");
 *
 * // Detect conversation context
 * const messages = [
 *   { role: "user", content: "Question" },
 *   { role: "assistant", content: "Answer" }
 * ];
 * const result = await client.checkConversation(messages);
 * console.log(result.overall_risk_level); // "high_risk/medium_risk/low_risk/no_risk"s
 * console.log(result.suggest_action); // "pass/reject/replace"
 * ```
 */
export class XiangxinAI {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: XiangxinAIConfig) {
    const {
      apiKey,
      baseUrl = 'https://api.xiangxinai.cn/v1',
      timeout = 30000,
      maxRetries = 3
    } = config;

    this.maxRetries = maxRetries;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'xiangxinai-nodejs/2.6.1'
      }
    });
  }

  /**
   * Create a default response with no risk
   */
  private createSafeResponse(): GuardrailResponse {
    return {
      id: 'guardrails-safe-default',
      result: {
        compliance: {
          risk_level: 'no_risk',
          categories: []
        },
        security: {
          risk_level: 'no_risk',
          categories: []
        }
      },
      overall_risk_level: 'no_risk',
      suggest_action: 'pass',
      suggest_answer: undefined
    };
  }

  /**
   * 检测用户输入的安全性
   *
   * @param content The user input content to be detected
   * @param userId 可选，租户AI应用的用户ID，用于用户级别的风险控制和审计追踪
   * @returns 检测结果，格式为：
   * ```
   * {
   *   "id": "guardrails-xxx",
   *   "result": {
   *     "compliance": {
   *       "risk_level": "high_risk/medium_risk/low_risk/no_risk",
   *       "categories": ["violent crime", "sensitive political topics"]
   *     },
   *     "security": {
   *       "risk_level": "high_risk/medium_risk/low_risk/no_risk",
   *       "categories": ["prompt injection"]
   *     }
   *   },
   *   "overall_risk_level": "high_risk/medium_risk/low_risk/no_risk",
   *   "suggest_action": "pass/reject/replace",
   *   "suggest_answer": "Suggested answer content"
   * }
   * ```
   *
   * @throws {ValidationError} Invalid input parameters
   * @throws {AuthenticationError} Authentication failed
   * @throws {RateLimitError} Exceeded rate limit
   * @throws {XiangxinAIError} Other API errors
   *
   * @example
   * ```typescript
   * const result = await client.checkPrompt("I want to learn programming");
   * console.log(result.overall_risk_level); // "no_risk"
   * console.log(result.suggest_action); // "pass"
   * console.log(result.result.compliance.risk_level); // "no_risk"
   *
   * // Pass user ID for tracking
   * const result = await client.checkPrompt("我想学习编程", "user-123");
   * ```
   */
  async checkPrompt(
    content: string,
    userId?: string
  ): Promise<GuardrailResponse> {
    // If content is an empty string, return a safe response
    if (!content || !content.trim()) {
      return this.createSafeResponse();
    }

    const requestData: any = {
      input: content.trim()
    };

    if (userId) {
      requestData.xxai_app_user_id = userId;
    }

    return this.makeRequest('POST', '/guardrails/input', requestData);
  }

  /**
   * Detect conversation context security - context-aware detection
   *
   * This is the core function of the guardrails, which can understand the complete conversation context for security detection.
   * Instead of detecting each message separately, it analyzes the security of the entire conversation.
   *
   * @param messages Conversation message list, containing the complete conversation between user and assistant, each message contains role('user' or 'assistant') and content
   * @param model The model name used
   * @param userId Optional, the user ID of the tenant AI application, used for user-level risk control and audit tracking
   * @returns The detection result based on the conversation context, the format is the same as checkPrompt
   *
   * @example
   * ```typescript
   * // Detect the security of the conversation between user and assistant
   * const messages = [
   *   { role: "user", content: "User question" },
   *   { role: "assistant", content: "Assistant answer" }
   * ];
   * const result = await client.checkConversation(messages);
   * console.log(result.overall_risk_level); // "no_risk"
   * console.log(result.suggest_action); // The suggestion based on the conversation context
   *
   * // Pass user ID for tracking
   * const result = await client.checkConversation(messages, 'Xiangxin-Guardrails-Text', "user-123");
   * ```
   */
  async checkConversation(
    messages: Array<{ role: string; content: string }>,
    model: string = 'Xiangxin-Guardrails-Text',
    userId?: string
  ): Promise<GuardrailResponse> {
    if (!messages || messages.length === 0) {
      throw new ValidationError('Messages cannot be empty');
    }

    // Validate message format
    const validatedMessages: Message[] = [];
    let allEmpty = true; // Mark whether all content is empty

    for (const msg of messages) {
      if (typeof msg !== 'object' || !msg.role || typeof msg.content !== 'string') {
        throw new ValidationError("Each message must have 'role' and 'content' fields");
      }

      if (!['user', 'system', 'assistant'].includes(msg.role)) {
        throw new ValidationError('role must be one of: user, system, assistant');
      }

      const content = msg.content;
      // Check if there is non-empty content
      if (content && content.trim()) {
        allEmpty = false;
        // Only add non-empty messages to validatedMessages
        validatedMessages.push({ role: msg.role as 'user' | 'system' | 'assistant', content });
      }
    }

    // If all messages' content are empty, return a safe response
    if (allEmpty) {
      return this.createSafeResponse();
    }

    // Ensure at least one message
    if (validatedMessages.length === 0) {
      return this.createSafeResponse();
    }

    const requestData: any = {
      model,
      messages: validatedMessages
    };

    if (userId) {
      if (!requestData.extra_body) {
        requestData.extra_body = {};
      }
      requestData.extra_body.xxai_app_user_id = userId;
    }

    return this.makeRequest('POST', '/guardrails', requestData);
  }

  /**
   * Detect the security of user input and model output - context-aware detection
   *
   * This is the core function of the guardrails, which can understand the complete conversation context for security detection.
   * The guardrails will detect whether the model output is safe and compliant based on the context of the user question.
   *
   * @param prompt The user input text content, used to make the guardrails understand the context semantic
   * @param response The model output text content, the actual detection object
   * @param userId Optional, the user ID of the tenant AI application, used for user-level risk control and audit tracking
   * @returns The detection result based on the context, the format is the same as checkPrompt
   *
   * @throws {ValidationError} Invalid input parameters
   * @throws {AuthenticationError} Authentication failed
   * @throws {RateLimitError} Exceeded rate limit
   * @throws {XiangxinAIError} Other API errors
   *
   * @example
   * ```typescript
   * const result = await client.checkResponseCtx(
   *   "Cooking",
   *   "I can teach you how to cook simple home-cooked meals"
   * );
   * console.log(result.overall_risk_level); // "no_risk"
   * console.log(result.suggest_action); // "pass"
   *
   * // 传递用户ID用于追踪
   * const result = await client.checkResponseCtx(
   *   "Cooking",
   *   "I can teach you how to cook simple home-cooked meals",
   *   "user-123"
   * );
   * ```
   */
  async checkResponseCtx(
    prompt: string,
    response: string,
    userId?: string
  ): Promise<GuardrailResponse> {
    // If prompt or response is an empty string, return a safe response
    if ((!prompt || !prompt.trim()) && (!response || !response.trim())) {
      return this.createSafeResponse();
    }

    const requestData: any = {
      input: prompt ? prompt.trim() : '',
      output: response ? response.trim() : ''
    };

    if (userId) {
      requestData.xxai_app_user_id = userId;
    }

    return this.makeRequest('POST', '/guardrails/output', requestData);
  }

  /**
   * Encode the image to base64 format
   */
  private async encodeBase64FromPath(imagePath: string): Promise<string> {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // Get the image from the URL
      const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
      return Buffer.from(response.data).toString('base64');
    } else {
      // Read the image from the local file
      const imageBuffer = await fs.promises.readFile(imagePath);
      return imageBuffer.toString('base64');
    }
  }

  /**
   * Detect the security of text prompt and image - multi-modal detection
   *
   * Combine the text semantic and image content for security detection.
   *
   * @param prompt Text prompt (can be empty)
   * @param image The local path or HTTP(S) link of the image file (cannot be empty)
   * @param model The model name used, default is the multi-modal model
   * @param userId Optional, the user ID of the tenant AI application, used for user-level risk control and audit tracking
   * @returns The detection result
   *
   * @throws {ValidationError} Invalid input parameters
   * @throws {AuthenticationError} Authentication failed
   * @throws {RateLimitError} Exceeded rate limit
   * @throws {XiangxinAIError} Other API errors
   *
   * @example
   * ```typescript
   * // Detect the local image
   * const result = await client.checkPromptImage("Is this image safe?", "/path/to/image.jpg");
   * // Detect the network image
   * const result = await client.checkPromptImage("", "https://example.com/image.jpg");
   * console.log(result.overall_risk_level);
   *
   * // Pass user ID for tracking
   * const result = await client.checkPromptImage("这个图片安全吗？", "/path/to/image.jpg", 'Xiangxin-Guardrails-VL', "user-123");
   * ```
   */
  async checkPromptImage(
    prompt: string,
    image: string,
    model: string = 'Xiangxin-Guardrails-VL',
    userId?: string
  ): Promise<GuardrailResponse> {
    if (!image) {
      throw new ValidationError('Image path cannot be empty');
    }

    // Encode the image
    let imageBase64: string;
    try {
      imageBase64 = await this.encodeBase64FromPath(image);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ValidationError(`Image file not found: ${image}`);
      }
      throw new XiangxinAIError(`Failed to encode image: ${error.message}`);
    }

    // Build the message content
    const content: any[] = [];
    if (prompt && prompt.trim()) {
      content.push({ type: 'text', text: prompt.trim() });
    }
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
    });

    const messages: Message[] = [
      {
        role: 'user',
        content: content
      }
    ];

    const requestData: any = {
      model,
      messages
    };

    if (userId) {
      if (!requestData.extra_body) {
        requestData.extra_body = {};
      }
      requestData.extra_body.xxai_app_user_id = userId;
    }

    return this.makeRequest('POST', '/guardrails', requestData);
  }

  /**
   * Detect the security of text prompt and multiple images - multi-modal detection
   *
   * Combine the text semantic and multiple image content for security detection.
   *
   * @param prompt Text prompt (can be empty)
   * @param images The local path or HTTP(S) link list of the image file (cannot be empty)
   * @param model The model name used, default is the multi-modal model
   * @param userId Optional, the user ID of the tenant AI application, used for user-level risk control and audit tracking
   * @returns The detection result
   *
   * @throws {ValidationError} Invalid input parameters
   * @throws {AuthenticationError} Authentication failed
   * @throws {RateLimitError} Exceeded rate limit
   * @throws {XiangxinAIError} Other API errors
   *
   * @example
   * ```typescript
   * const images = ["/path/to/image1.jpg", "https://example.com/image2.jpg"];
   * const result = await client.checkPromptImages("Are these images safe?", images);
   * console.log(result.overall_risk_level);
   *
   * // Pass user ID for tracking
   * const result = await client.checkPromptImages("这些图片安全吗？", images, 'Xiangxin-Guardrails-VL', "user-123");
   * ```
   */
  async checkPromptImages(
    prompt: string,
    images: string[],
    model: string = 'Xiangxin-Guardrails-VL',
    userId?: string
  ): Promise<GuardrailResponse> {
    if (!images || images.length === 0) {
      throw new ValidationError('Images list cannot be empty');
    }

    // Build the message content
    const content: any[] = [];
    if (prompt && prompt.trim()) {
      content.push({ type: 'text', text: prompt.trim() });
    }

    // Encode all images
    for (const imagePath of images) {
      try {
        const imageBase64 = await this.encodeBase64FromPath(imagePath);
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new ValidationError(`Image file not found: ${imagePath}`);
        }
        throw new XiangxinAIError(`Failed to encode image ${imagePath}: ${error.message}`);
      }
    }

    const messages: Message[] = [
      {
        role: 'user',
        content: content
      }
    ];

    const requestData: any = {
      model,
      messages
    };

    if (userId) {
      if (!requestData.extra_body) {
        requestData.extra_body = {};
      }
      requestData.extra_body.xxai_app_user_id = userId;
    }

    return this.makeRequest('POST', '/guardrails', requestData);
  }

  /**
   * Check the health status of the API service
   */
  async healthCheck(): Promise<Record<string, any>> {
    return this.makeRequest('GET', '/guardrails/health');
  }

  /**
   * Get the list of available models
   */
  async getModels(): Promise<Record<string, any>> {
    return this.makeRequest('GET', '/guardrails/models');
  }

  /**
   * Send HTTP request
   */
  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: GuardrailRequest | Record<string, any>
  ): Promise<any> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        let response;
        if (method === 'GET') {
          response = await this.client.get(endpoint);
        } else if (method === 'POST') {
          response = await this.client.post(endpoint, data);
        } else {
          throw new XiangxinAIError(`Unsupported HTTP method: ${method}`);
        }

        // If it is a guardrails detection request, return the structured response
        if (['/guardrails', '/guardrails/input', '/guardrails/output'].includes(endpoint) && typeof response.data === 'object') {
          return response.data as GuardrailResponse;
        }

        return response.data;

      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          if (axiosError.response) {
            const status = axiosError.response.status;
            
            if (status === 401) {
              throw new AuthenticationError('Invalid API key');
            } else if (status === 422) {
              const errorDetail = (axiosError.response.data as any)?.detail || 'Validation error';
              throw new ValidationError(`Validation error: ${errorDetail}`);
            } else if (status === 429) {
              if (attempt < this.maxRetries) {
                // Exponential backoff retry
                const waitTime = (2 ** attempt) * 1000 + 1000;
                await this.sleep(waitTime);
                continue;
              }
              throw new RateLimitError('Rate limit exceeded');
            } else {
              let errorMsg = axiosError.response.data as string;
              try {
                const errorData = axiosError.response.data as any;
                errorMsg = errorData?.detail || errorMsg;
              } catch {}
              
              throw new XiangxinAIError(
                `API request failed with status ${status}: ${errorMsg}`
              );
            }
          } else if (axiosError.code === 'ECONNABORTED') {
            if (attempt < this.maxRetries) {
              await this.sleep(1000);
              continue;
            }
            throw new XiangxinAIError('Request timeout');
          } else {
            if (attempt < this.maxRetries) {
              await this.sleep(1000);
              continue;
            }
            throw new NetworkError('Connection error');
          }
        } else {
          // These errors do not need to be retried
          if (error instanceof AuthenticationError || 
              error instanceof ValidationError || 
              error instanceof RateLimitError) {
            throw error;
          }
          
          if (attempt < this.maxRetries) {
            await this.sleep(1000);
            continue;
          }
          throw new XiangxinAIError(`Unexpected error: ${error}`);
        }
      }
    }
  }

  /**
   * Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Extended methods for GuardrailResponse
 */
export class GuardrailResponseHelper {
  /**
   * Check if the content is safe
   */
  static isSafe(response: GuardrailResponse): boolean {
    return response.suggest_action === 'pass';
  }

  /**
   * Check if the content is blocked
   */
  static isBlocked(response: GuardrailResponse): boolean {
    return response.suggest_action === 'reject';
  }

  /**
   * Check if there is a substitute
   */
  static hasSubstitute(response: GuardrailResponse): boolean {
    return response.suggest_action === 'replace' || response.suggest_action === 'reject';
  }

  /**
   * Get all risk categories
   */
  static getAllCategories(response: GuardrailResponse): string[] {
    const categories = [];
    categories.push(...response.result.compliance.categories);
    categories.push(...response.result.security.categories);
    if (response.result.data) {
      categories.push(...response.result.data.categories);
    }
    return Array.from(new Set(categories)); // Remove duplicates
  }
}