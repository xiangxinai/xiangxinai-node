/**
 * 数据模型定义
 */

export interface Message {
  /** 消息角色: user, system, assistant */
  role: 'user' | 'system' | 'assistant';
  /** 消息内容，可以是string或any[]（多模态） */
  content: string | any[];
}

export interface GuardrailRequest {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: Message[];
}

export interface ComplianceResult {
  /** 风险等级: 无风险, 低风险, 中风险, 高风险 */
  risk_level: string;
  /** 风险类别列表 */
  categories: string[];
}

export interface SecurityResult {
  /** 风险等级: 无风险, 低风险, 中风险, 高风险 */
  risk_level: string;
  /** 风险类别列表 */
  categories: string[];
}

export interface DataSecurityResult {
  /** 风险等级: 无风险, 低风险, 中风险, 高风险 */
  risk_level: string;
  /** 敏感数据类别列表 */
  categories: string[];
}

export interface GuardrailResult {
  /** 合规检测结果 */
  compliance: ComplianceResult;
  /** 安全检测结果 */
  security: SecurityResult;
  /** 数据安全检测结果 */
  data?: DataSecurityResult;
}

export interface GuardrailResponse {
  /** 请求唯一标识 */
  id: string;
  /** 检测结果 */
  result: GuardrailResult;
  /** 综合风险等级: 无风险, 低风险, 中风险, 高风险 */
  overall_risk_level: string;
  /** 建议动作: 通过, 阻断, 代答 */
  suggest_action: string;
  /** 建议回答内容 */
  suggest_answer?: string;
}

export interface XiangxinAIConfig {
  /** API密钥 */
  apiKey: string;
  /** API基础URL */
  baseUrl?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}