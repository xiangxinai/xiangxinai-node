# 象信AI安全护栏 Node.js SDK

[![npm version](https://badge.fury.io/js/xiangxinai.svg)](https://badge.fury.io/js/xiangxinai)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

象信AI安全护栏 Node.js 客户端 - 基于LLM的上下文感知AI安全护栏，能够理解对话上下文进行安全检测。

## 特性

- 🧠 **上下文感知** - 基于LLM的对话理解，而不是简单的批量检测
- 🔍 **提示词攻击检测** - 识别恶意提示词注入和越狱攻击
- 📋 **内容合规检测** - 满足生成式人工智能服务安全基本要求
- 🔐 **敏感数据防泄漏** - 检测和防止个人/企业敏感数据泄露
- 🧩 **用户级封禁策略** - 支持基于用户颗粒度的风险识别与封禁策略
- 🖼️ **多模态检测** - 支持图片内容安全检测
- 🛠️ **易于集成** - 兼容OpenAI API格式，一行代码接入
- ⚡ **OpenAI风格API** - 熟悉的接口设计，快速上手
- 🚀 **同步/异步支持** - 支持同步和异步两种调用方式，满足不同场景需求

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

// 检测用户输入并传递用户ID（可选）
const result2 = await client.checkPrompt('用户输入的问题', 'user-123');

// 检测输出内容（基于上下文）
const ctxResult = await client.checkResponseCtx(
  '教我做饭',
  '我可以教你做一些简单的家常菜'
);
console.log(ctxResult.overall_risk_level); // 无风险
console.log(ctxResult.suggest_action);     // 通过

// 检测输出内容并传递用户ID（可选）
const ctxResult2 = await client.checkResponseCtx(
  '教我做饭',
  '我可以教你做一些简单的家常菜',
  'user-123'
);
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

// 传递用户ID用于追踪（可选）
const result2 = await client.checkConversation(messages, 'Xiangxin-Guardrails-Text', 'user-123');
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

// 传递用户ID用于追踪（可选）
const result4 = await client.checkPromptImage(
  '这个图片安全吗？',
  '/path/to/image.jpg',
  'Xiangxin-Guardrails-VL',
  'user-123'
);

const result5 = await client.checkPromptImages(
  '这些图片都安全吗？',
  images,
  'Xiangxin-Guardrails-VL',
  'user-123'
);
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

##### checkPrompt(content, userId?)

检测单个提示词的安全性。

```typescript
await client.checkPrompt(
  content: string,          // 要检测的内容
  userId?: string          // 可选，租户AI应用的用户ID，用于用户级别的风险控制和审计追踪
): Promise<GuardrailResponse>
```

##### checkConversation(messages, model?, userId?)

检测对话上下文的安全性（推荐使用）。

```typescript
await client.checkConversation(
  messages: Array<{role: string, content: string}>,  // 对话消息列表
  model?: string,                                    // 模型名称
  userId?: string                                    // 可选，租户AI应用的用户ID
): Promise<GuardrailResponse>
```

##### checkResponseCtx(prompt, response, userId?)

检测用户输入和模型输出的安全性 - 上下文感知检测。

```typescript
await client.checkResponseCtx(
  prompt: string,           // 用户输入的文本内容
  response: string,         // 模型输出的文本内容
  userId?: string          // 可选，租户AI应用的用户ID
): Promise<GuardrailResponse>
```

##### checkPromptImage(prompt, image, model?, userId?)

检测文本提示词和图片的安全性 - 多模态检测。

```typescript
await client.checkPromptImage(
  prompt: string,           // 文本提示词（可以为空）
  image: string,           // 图片文件的本地路径或HTTP(S)链接
  model?: string,          // 模型名称，默认 'Xiangxin-Guardrails-VL'
  userId?: string          // 可选，租户AI应用的用户ID
): Promise<GuardrailResponse>
```

##### checkPromptImages(prompt, images, model?, userId?)

检测文本提示词和多张图片的安全性 - 多模态检测。

```typescript
await client.checkPromptImages(
  prompt: string,           // 文本提示词（可以为空）
  images: string[],        // 图片文件的本地路径或HTTP(S)链接列表
  model?: string,          // 模型名称，默认 'Xiangxin-Guardrails-VL'
  userId?: string          // 可选，租户AI应用的用户ID
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
  score?: number;                // 检测置信度分数 (v2.4.1新增)
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