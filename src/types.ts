/**
 * Data model definition
 */

export interface Message {
  /** Message role: user, system, assistant */
  role: 'user' | 'system' | 'assistant';
  /** Message content, can be string or any[] (multi-modal) */
  content: string | any[];
}

export interface GuardrailRequest {
  /** Model name */
  model: string;
  /** Message list */
  messages: Message[];
}

export interface ComplianceResult {
  /** Risk level: no_risk, low_risk, medium_risk, high_risk */
  risk_level: string;
  /** Risk category list */
  categories: string[];
}

export interface SecurityResult {
  /** Risk level: no_risk, low_risk, medium_risk, high_risk */
  risk_level: string;
  /** Risk category list */
  categories: string[];
}

export interface DataSecurityResult {
  /** Risk level: no_risk, low_risk, medium_risk, high_risk */
  risk_level: string;
  /** Sensitive data category list */
  categories: string[];
}

export interface GuardrailResult {
  /** Compliance detection result */
  compliance: ComplianceResult;
  /** Security detection result */
  security: SecurityResult;
  /** Data security detection result */
  data?: DataSecurityResult;
}

export interface GuardrailResponse {
  /** Request unique identifier */
  id: string;
  /** Detection result */
  result: GuardrailResult;
  /** Comprehensive risk level: no_risk, low_risk, medium_risk, high_risk */
  overall_risk_level: string;
  /** Suggest action: pass, reject, replace */
  suggest_action: string;
  /** Suggest answer content */
  suggest_answer?: string;
  /** Detection confidence score */
  score?: number;
}

export interface XiangxinAIConfig {
  /** API key */
  apiKey: string;
  /** API base URL */
  baseUrl?: string;
  /** Request timeout (milliseconds) */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
}