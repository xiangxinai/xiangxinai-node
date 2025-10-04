# 象信AI安全护栏 Node.js SDK

[![npm version](https://badge.fury.io/js/xiangxinai.svg)](https://badge.fury.io/js/xiangxinai)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

象信AI安全护栏 Node.js 客户端 - 基于LLM的上下文感知AI安全护栏。

## 概述

象信AI安全护栏是一个基于大语言模型的上下文感知AI安全护栏系统，能够理解对话上下文进行智能安全检测。不同于传统的关键词匹配，我们的护栏能够理解语言的深层含义和对话的上下文关系。

## 核心特性

- **上下文感知**: 理解完整对话上下文，而非简单的单句检测
- **智能检测**: 基于LLM的深度语义理解
- **三重防护**: 合规性检测 + 安全性检测 + 敏感数据防泄漏（2.4.0新增）
- **多模态检测**: 支持图片内容安全检测（2.3.0新增）
- **实时响应**: 毫秒级检测响应
- **简单集成**: 易于集成的SDK接口

## 安装

```bash
npm install xiangxinai
# 或
yarn add xiangxinai
```

## 快速开始

### 基本用法

```typescript
import { XiangxinAI } from 'xiangxinai';

// 初始化客户端
const client = new XiangxinAI({
  apiKey: 'your-api-key'
});

// 检测用户输入
const result = await client.checkPrompt('用户输入的问题');
console.log(result.overall_risk_level); // 无风险/低风险/中风险/高风险
console.log(result.suggest_action);     // 通过/阻断/代答

// 检测输出内容（基于上下文）
const ctxResult = await client.checkResponseCtx(
  '教我做饭',
  '我可以教你做一些简单的家常菜'
);
console.log(ctxResult.overall_risk_level); // 无风险
console.log(ctxResult.suggest_action);     // 通过
```

### 对话上下文检测（推荐）

```typescript
// 检测完整对话上下文 - 核心功能
const messages = [
  { role: 'user', content: '用户的问题' },
  { role: 'assistant', content: 'AI助手的回答' },
  { role: 'user', content: '用户的后续问题' }
];

const result = await client.checkConversation(messages);

// 检查检测结果
if (result.suggest_action === '通过') {
  console.log('对话安全，可以继续');
} else if (result.suggest_action === '阻断') {
  console.log('对话存在风险，建议阻断');
} else if (result.suggest_action === '代答') {
  console.log('建议使用安全回答:', result.suggest_answer);
}
```

### 多模态图片检测（2.3.0新增）

象信AI安全护栏2.3.0版本新增了多模态检测功能，支持图片内容安全检测，可以结合提示词文本的语义和图片内容语义分析得出是否安全。

```typescript
import { XiangxinAI } from 'xiangxinai';

const client = new XiangxinAI({ apiKey: 'your-api-key' });

// 检测单张图片（本地文件）
const result = await client.checkPromptImage(
  '这个图片安全吗？',
  '/path/to/image.jpg'
);
console.log(result.overall_risk_level);
console.log(result.suggest_action);

// 检测单张图片（网络URL）
const result2 = await client.checkPromptImage(
  '',  // prompt可以为空
  'https://example.com/image.jpg'
);

// 检测多张图片
const images = [
  '/path/to/image1.jpg',
  'https://example.com/image2.jpg',
  '/path/to/image3.png'
];
const result3 = await client.checkPromptImages(
  '这些图片都安全吗？',
  images
);
console.log(result3.overall_risk_level);
```

## API 参考

### XiangxinAI

#### 构造函数

```typescript
new XiangxinAI(config: XiangxinAIConfig)
```

**参数:**
- `config.apiKey` (string): API密钥
- `config.baseUrl` (string, 可选): API基础URL，默认为云端服务
- `config.timeout` (number, 可选): 请求超时时间（毫秒），默认30000
- `config.maxRetries` (number, 可选): 最大重试次数，默认3

#### 方法

##### checkPrompt(content, model?)

检测单个提示词的安全性。

```typescript
await client.checkPrompt(
  content: string,          // 要检测的内容
  model?: string           // 模型名称，默认 'Xiangxin-Guardrails-Text'
): Promise<GuardrailResponse>
```

##### checkConversation(messages, model?)

检测对话上下文的安全性（推荐使用）。

```typescript
await client.checkConversation(
  messages: Array<{role: string, content: string}>,  // 对话消息列表
  model?: string                                     // 模型名称
): Promise<GuardrailResponse>
```

##### healthCheck()

检查API服务健康状态。

```typescript
await client.healthCheck(): Promise<Record<string, any>>
```

##### getModels()

获取可用模型列表。

```typescript
await client.getModels(): Promise<Record<string, any>>
```

### 响应格式

```typescript
interface GuardrailResponse {
  id: string;                    // 请求唯一标识
  result: {
    compliance: {                // 合规检测结果
      risk_level: string;        // 无风险/低风险/中风险/高风险
      categories: string[];      // 风险类别
    };
    security: {                  // 安全检测结果
      risk_level: string;        // 无风险/低风险/中风险/高风险
      categories: string[];      // 风险类别
    };
    data: {                      // 数据防泄漏检测结果（v2.4.0新增）
      risk_level: string;        // 无风险/低风险/中风险/高风险
      categories: string[];      // 检测到的敏感数据类型
    };
  };
  overall_risk_level: string;    // 综合风险等级
  suggest_action: string;        // 通过/阻断/代答
  suggest_answer?: string;       // 建议回答（数据防泄漏时包含脱敏后内容）
}
```

### 辅助方法

```typescript
import { GuardrailResponseHelper } from 'xiangxinai';

// 判断是否安全
GuardrailResponseHelper.isSafe(response);        // boolean

// 判断是否被阻断
GuardrailResponseHelper.isBlocked(response);     // boolean

// 判断是否有代答
GuardrailResponseHelper.hasSubstitute(response); // boolean

// 获取所有风险类别
GuardrailResponseHelper.getAllCategories(response); // string[]
```

## 错误处理

```typescript
import { 
  XiangxinAIError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError 
} from 'xiangxinai';

try {
  const result = await client.checkPrompt('test content');
  console.log(result);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('认证失败，请检查API密钥');
  } else if (error instanceof RateLimitError) {
    console.error('请求频率过高，请稍后重试');
  } else if (error instanceof ValidationError) {
    console.error('输入参数无效:', error.message);
  } else if (error instanceof XiangxinAIError) {
    console.error('API错误:', error.message);
  } else {
    console.error('未知错误:', error);
  }
}
```

## 使用场景

### 1. 内容审核

```typescript
// 用户生成内容检测
const userContent = "用户发布的内容...";
const result = await client.checkPrompt(userContent);

if (!GuardrailResponseHelper.isSafe(result)) {
  // 内容不安全，执行相应处理
  console.log('内容包含风险:', GuardrailResponseHelper.getAllCategories(result));
}
```

### 2. 对话系统防护

```typescript
// AI对话系统中的安全检测
const conversation = [
  { role: 'user', content: '用户问题' },
  { role: 'assistant', content: '准备发送给用户的回答' }
];

const result = await client.checkConversation(conversation);

if (result.suggest_action === '代答' && result.suggest_answer) {
  // 使用安全的代答内容
  return result.suggest_answer;
} else if (result.suggest_action === '阻断') {
  // 阻断不安全的对话
  return '抱歉，我无法回答这个问题';
}
```

### 3. 实时流式检测

```typescript
// 在流式对话中进行实时检测
async function streamConversationCheck(messages) {
  try {
    const result = await client.checkConversation(messages);
    
    return {
      canContinue: GuardrailResponseHelper.isSafe(result),
      suggestedResponse: result.suggest_answer,
      riskCategories: GuardrailResponseHelper.getAllCategories(result)
    };
  } catch (error) {
    console.error('安全检测失败:', error);
    return { canContinue: false };
  }
}
```

## 最佳实践

1. **使用对话上下文检测**: 推荐使用 `checkConversation` 而不是 `checkPrompt`，因为上下文感知能提供更准确的检测结果。

2. **合理处理错误**: 实现适当的错误处理和重试机制。

3. **缓存策略**: 对于相同的输入，可以考虑缓存检测结果。

4. **监控和日志**: 记录检测结果用于分析和优化。

## 许可证

Apache 2.0

## 技术支持

- 官网: https://xiangxinai.cn
- 文档: https://docs.xiangxinai.cn  
- 问题反馈: https://github.com/xiangxinai/xiangxin-guardrails/issues
- 邮箱: wanglei@xiangxinai.cn