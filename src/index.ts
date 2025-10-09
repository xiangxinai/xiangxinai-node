/**
 * Xiangxin AI Guardrails Node.js Client
 * 
 * Context-aware AI Guardrails based on LLM, which can understand the conversation context for security detection.
 * 
 * This package provides a Node.js client library for interacting with the Xiangxin AI Guardrails API.
 * 
 * @example
 * Basic usage:
 * 
 * ```typescript
 * import { XiangxinAI } from 'xiangxinai';
 * 
 * // Use the cloud API
 * const client = new XiangxinAI({ apiKey: "your-api-key" });
 * 
 * // Detect the prompt
 * const result = await client.checkPrompt("User question");
 * 
 * // Detect the conversation context (user + assistant answer)
 * const messages = [
 *   { role: "user", content: "User question" },
 *   { role: "assistant", content: "Assistant answer" }
 * ];
 * const result = await client.checkConversation(messages);
 * console.log(result.overall_risk_level);  // Output: no_risk/high_risk/medium_risk/low_risk
 * console.log(result.suggest_action);  // Output: pass/replace/reject
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
  SecurityResult,
  DataSecurityResult
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