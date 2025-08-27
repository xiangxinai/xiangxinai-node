/**
 * 象信AI安全护栏 Node.js 客户端
 * 
 * 基于LLM的上下文感知AI安全护栏，能够理解对话上下文进行安全检测。
 * 
 * 这个包提供了与象信AI安全护栏API交互的Node.js客户端库。
 * 
 * @example
 * 基本用法:
 * 
 * ```typescript
 * import { XiangxinAI } from 'xiangxinai';
 * 
 * // 使用云端API
 * const client = new XiangxinAI({ apiKey: "your-api-key" });
 * 
 * // 检测提示词
 * const result = await client.checkPrompt("用户的问题");
 * 
 * // 检测对话上下文（用户+助手回答）
 * const messages = [
 *   { role: "user", content: "用户问题" },
 *   { role: "assistant", content: "助手回答" }
 * ];
 * const result = await client.checkConversation(messages);
 * console.log(result.overall_risk_level);  // 输出: 无风险/高风险/中风险/低风险
 * console.log(result.suggest_action);  // 输出: 通过/代答/阻断
 * ```
 */

export { XiangxinAI, GuardrailResponseHelper } from './client';
export {
  XiangxinAIConfig,
  Message,
  GuardrailRequest,
  GuardrailResponse,
  GuardrailResult,
  ComplianceResult,
  SecurityResult
} from './types';
export {
  XiangxinAIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NetworkError,
  ServerError
} from './exceptions';

import { XiangxinAI } from './client';
export default XiangxinAI;