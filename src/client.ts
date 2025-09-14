/**
 * 象信AI安全护栏客户端
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  XiangxinAIConfig,
  Message,
  GuardrailRequest,
  GuardrailResponse,
  ComplianceResult,
  SecurityResult,
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
 * 象信AI安全护栏客户端 - 基于LLM的上下文感知AI安全护栏
 * 
 * 这个客户端提供了与象信AI安全护栏API交互的简单接口。
 * 护栏采用上下文感知技术，能够理解对话上下文进行安全检测。
 * 
 * @example
 * ```typescript
 * const client = new XiangxinAI({ apiKey: "your-api-key" });
 * 
 * // 检测用户输入
 * const result = await client.checkPrompt("用户问题");
 *
 * // 检测输出内容（基于上下文）
 * const result = await client.checkResponseCtx("用户问题", "助手回答");
 *
 * // 检测对话上下文
 * const messages = [
 *   { role: "user", content: "问题" },
 *   { role: "assistant", content: "回答" }
 * ];
 * const result = await client.checkConversation(messages);
 * console.log(result.overall_risk_level); // "高风险/中风险/低风险/无风险"
 * console.log(result.suggest_action); // "通过/阻断/代答"
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
        'User-Agent': 'xiangxinai-nodejs/2.0.0'
      }
    });
  }

  /**
   * 创建无风险的默认响应
   */
  private createSafeResponse(): GuardrailResponse {
    return {
      id: 'guardrails-safe-default',
      result: {
        compliance: {
          risk_level: '无风险',
          categories: []
        },
        security: {
          risk_level: '无风险',
          categories: []
        }
      },
      overall_risk_level: '无风险',
      suggest_action: '通过',
      suggest_answer: undefined
    };
  }

  /**
   * 检测用户输入的安全性
   *
   * @param content 要检测的用户输入内容
   * @returns 检测结果，格式为：
   * ```
   * {
   *   "id": "guardrails-xxx",
   *   "result": {
   *     "compliance": {
   *       "risk_level": "高风险/中风险/低风险/无风险",
   *       "categories": ["暴力犯罪", "敏感政治话题"]
   *     },
   *     "security": {
   *       "risk_level": "高风险/中风险/低风险/无风险",
   *       "categories": ["提示词攻击"]
   *     }
   *   },
   *   "overall_risk_level": "高风险/中风险/低风险/无风险",
   *   "suggest_action": "通过/阻断/代答",
   *   "suggest_answer": "建议回答内容"
   * }
   * ```
   *
   * @throws {ValidationError} 输入参数无效
   * @throws {AuthenticationError} 认证失败
   * @throws {RateLimitError} 超出速率限制
   * @throws {XiangxinAIError} 其他API错误
   *
   * @example
   * ```typescript
   * const result = await client.checkPrompt("我想学习编程");
   * console.log(result.overall_risk_level); // "无风险"
   * console.log(result.suggest_action); // "通过"
   * console.log(result.result.compliance.risk_level); // "无风险"
   * ```
   */
  async checkPrompt(
    content: string
  ): Promise<GuardrailResponse> {
    // 如果content是空字符串，直接返回无风险
    if (!content || !content.trim()) {
      return this.createSafeResponse();
    }

    const requestData = {
      input: content.trim()
    };

    return this.makeRequest('POST', '/guardrails/input', requestData);
  }

  /**
   * 检测对话上下文的安全性 - 上下文感知检测
   * 
   * 这是护栏的核心功能，能够理解完整的对话上下文进行安全检测。
   * 不是分别检测每条消息，而是分析整个对话的安全性。
   * 
   * @param messages 对话消息列表，包含用户和助手的完整对话，每个消息包含role('user'或'assistant')和content
   * @param model 使用的模型名称
   * @returns 基于对话上下文的检测结果，格式与checkPrompt相同
   * 
   * @example
   * ```typescript
   * // 检测用户问题和助手回答的对话安全性
   * const messages = [
   *   { role: "user", content: "用户问题" },
   *   { role: "assistant", content: "助手回答" }
   * ];
   * const result = await client.checkConversation(messages);
   * console.log(result.overall_risk_level); // "无风险"
   * console.log(result.suggest_action); // 基于对话上下文的建议
   * ```
   */
  async checkConversation(
    messages: Array<{ role: string; content: string }>,
    model: string = 'Xiangxin-Guardrails-Text'
  ): Promise<GuardrailResponse> {
    if (!messages || messages.length === 0) {
      throw new ValidationError('Messages cannot be empty');
    }

    // 验证消息格式
    const validatedMessages: Message[] = [];
    let allEmpty = true; // 标记是否所有content都为空

    for (const msg of messages) {
      if (typeof msg !== 'object' || !msg.role || typeof msg.content !== 'string') {
        throw new ValidationError("Each message must have 'role' and 'content' fields");
      }

      if (!['user', 'system', 'assistant'].includes(msg.role)) {
        throw new ValidationError('role must be one of: user, system, assistant');
      }

      const content = msg.content;
      // 检查是否有非空content
      if (content && content.trim()) {
        allEmpty = false;
        // 只添加非空消息到validatedMessages
        validatedMessages.push({ role: msg.role as 'user' | 'system' | 'assistant', content });
      }
    }

    // 如果所有messages的content都是空的，直接返回无风险
    if (allEmpty) {
      return this.createSafeResponse();
    }

    // 确保至少有一条消息
    if (validatedMessages.length === 0) {
      return this.createSafeResponse();
    }

    const requestData: GuardrailRequest = {
      model,
      messages: validatedMessages
    };

    return this.makeRequest('POST', '/guardrails', requestData);
  }

  /**
   * 检测用户输入和模型输出的安全性 - 上下文感知检测
   *
   * 这是护栏的核心功能，能够理解用户输入和模型输出的上下文进行安全检测。
   * 护栏会基于用户问题的上下文来检测模型输出是否安全合规。
   *
   * @param prompt 用户输入的文本内容，用于让护栏理解上下文语意
   * @param response 模型输出的文本内容，实际检测对象
   * @returns 基于上下文的检测结果，格式与checkPrompt相同
   *
   * @throws {ValidationError} 输入参数无效
   * @throws {AuthenticationError} 认证失败
   * @throws {RateLimitError} 超出速率限制
   * @throws {XiangxinAIError} 其他API错误
   *
   * @example
   * ```typescript
   * const result = await client.checkResponseCtx(
   *   "教我做饭",
   *   "我可以教你做一些简单的家常菜"
   * );
   * console.log(result.overall_risk_level); // "无风险"
   * console.log(result.suggest_action); // "通过"
   * ```
   */
  async checkResponseCtx(
    prompt: string,
    response: string
  ): Promise<GuardrailResponse> {
    // 如果prompt或response是空字符串，直接返回无风险
    if ((!prompt || !prompt.trim()) && (!response || !response.trim())) {
      return this.createSafeResponse();
    }

    const requestData = {
      input: prompt ? prompt.trim() : '',
      output: response ? response.trim() : ''
    };

    return this.makeRequest('POST', '/guardrails/output', requestData);
  }

  /**
   * 检查API服务健康状态
   */
  async healthCheck(): Promise<Record<string, any>> {
    return this.makeRequest('GET', '/guardrails/health');
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<Record<string, any>> {
    return this.makeRequest('GET', '/guardrails/models');
  }

  /**
   * 发送HTTP请求
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

        // 如果是护栏检测请求，返回结构化响应
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
                // 指数退避重试
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
          // 这些错误不需要重试
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
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * GuardrailResponse 的扩展方法
 */
export class GuardrailResponseHelper {
  /**
   * 判断内容是否安全
   */
  static isSafe(response: GuardrailResponse): boolean {
    return response.suggest_action === '通过';
  }

  /**
   * 判断内容是否被阻断
   */
  static isBlocked(response: GuardrailResponse): boolean {
    return response.suggest_action === '阻断';
  }

  /**
   * 判断是否有代答
   */
  static hasSubstitute(response: GuardrailResponse): boolean {
    return response.suggest_action === '代答' || response.suggest_action === '阻断';
  }

  /**
   * 获取所有风险类别
   */
  static getAllCategories(response: GuardrailResponse): string[] {
    const categories = [];
    categories.push(...response.result.compliance.categories);
    categories.push(...response.result.security.categories);
    return Array.from(new Set(categories)); // 去重
  }
}