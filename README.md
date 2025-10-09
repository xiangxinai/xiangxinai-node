# Xiangxin AI Guardrails Node.js SDK

[![npm version](https://badge.fury.io/js/xiangxinai.svg)](https://badge.fury.io/js/xiangxinai)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Xiangxin AI Guardrails Node.js Client - An LLM-based context-aware AI safety guardrail capable of understanding conversation context for security detection.

## Features

- 🧠 **Context-Aware** - LLM-based conversation understanding, not just simple batch detection
- 🔍 **Prompt Attack Detection** - Identifies malicious prompt injection and jailbreak attacks
- 📋 **Content Compliance Detection** - Meets basic security requirements for generative AI services
- 🔐 **Sensitive Data Leakage Prevention** - Detects and prevents leakage of personal/corporate sensitive data
- 🧩 **User-Level Ban Policies** - Supports risk identification and ban policies at user granularity
- 🖼️ **Multimodal Detection** - Supports image content safety detection
- 🛠️ **Easy Integration** - Compatible with OpenAI API format, one-line code integration
- ⚡ **OpenAI-Style API** - Familiar interface design, quick to get started
- 🚀 **Sync/Async Support** - Supports both synchronous and asynchronous calls to meet different scenario needs

## Installation

```bash
npm install xiangxinai
# or
yarn add xiangxinai
```

## Quick Start

### Basic Usage

```typescript
import { XiangxinAI } from 'xiangxinai';

// Initialize client
const client = new XiangxinAI({
  apiKey: 'your-api-key'
});

// Detect user input
const result = await client.checkPrompt('User input question');
console.log(result.overall_risk_level); // no_risk/low_risk/medium_risk/high_risk
console.log(result.suggest_action);     // pass/reject/replace

// Detect user input with optional user ID
const result2 = await client.checkPrompt('User input question', 'user-123');

// Detect output content (context-based)
const ctxResult = await client.checkResponseCtx(
  'Teach me how to cook',
  'I can teach you some simple home-style dishes'
);
console.log(ctxResult.overall_risk_level); // No Risk
console.log(ctxResult.suggest_action);     // Pass

// Detect output content with optional user ID
const ctxResult2 = await client.checkResponseCtx(
  'Teach me how to cook',
  'I can teach you some simple home-style dishes',
  'user-123'
);
```

### Conversation Context Detection (Recommended)

```typescript
// Detect complete conversation context - Core functionality
const messages = [
  { role: 'user', content: 'User question' },
  { role: 'assistant', content: 'AI assistant response' },
  { role: 'user', content: 'User follow-up question' }
];

const result = await client.checkConversation(messages);

// Check detection results
if (result.suggest_action === 'pass') {
  console.log('Conversation safe, can continue');
} else if (result.suggest_action === 'reject') {
  console.log('Conversation has risks, recommend reject');
} else if (result.suggest_action === 'replace') {
  console.log('Recommend using safe answer:', result.suggest_answer);
}

// Pass user ID for tracking (optional)
const result2 = await client.checkConversation(messages, 'Xiangxin-Guardrails-Text', 'user-123');
```

### Multimodal Image Detection (New in 2.3.0)

Xiangxin AI Safety Guardrails version 2.3.0 adds multimodal detection functionality, supporting image content safety detection, combining prompt text semantics and image content semantics analysis to determine safety.

```typescript
import { XiangxinAI } from 'xiangxinai';

const client = new XiangxinAI({ apiKey: 'your-api-key' });

// Detect single image (local file)
const result = await client.checkPromptImage(
  'Is this image safe?',
  '/path/to/image.jpg'
);
console.log(result.overall_risk_level);
console.log(result.suggest_action);

// Detect single image (network URL)
const result2 = await client.checkPromptImage(
  '',  // prompt can be empty
  'https://example.com/image.jpg'
);

// Detect multiple images
const images = [
  '/path/to/image1.jpg',
  'https://example.com/image2.jpg',
  '/path/to/image3.png'
];
const result3 = await client.checkPromptImages(
  'Are all these images safe?',
  images
);
console.log(result3.overall_risk_level);

// Pass user ID for tracking (optional)
const result4 = await client.checkPromptImage(
  'Is this image safe?',
  '/path/to/image.jpg',
  'Xiangxin-Guardrails-VL',
  'user-123'
);

const result5 = await client.checkPromptImages(
  'Are all these images safe?',
  images,
  'Xiangxin-Guardrails-VL',
  'user-123'
);
```

## API Reference

### XiangxinAI

#### Constructor

```typescript
new XiangxinAI(config: XiangxinAIConfig)
```

**Parameters:**
- `config.apiKey` (string): API key
- `config.baseUrl` (string, optional): API base URL, defaults to cloud service
- `config.timeout` (number, optional): Request timeout (milliseconds), default 30000
- `config.maxRetries` (number, optional): Maximum retry attempts, default 3

#### Methods

##### checkPrompt(content, userId?)

Detect safety of a single prompt.

```typescript
await client.checkPrompt(
  content: string,          // Content to detect
  userId?: string          // Optional, tenant AI application user ID for user-level risk control and audit tracking
): Promise<GuardrailResponse>
```

##### checkConversation(messages, model?, userId?)

Detect safety of conversation context (recommended).

```typescript
await client.checkConversation(
  messages: Array<{role: string, content: string}>,  // Conversation message list
  model?: string,                                    // Model name
  userId?: string                                    // Optional, tenant AI application user ID
): Promise<GuardrailResponse>
```

##### checkResponseCtx(prompt, response, userId?)

Detect safety of user input and model output - context-aware detection.

```typescript
await client.checkResponseCtx(
  prompt: string,           // User input text content
  response: string,         // Model output text content
  userId?: string          // Optional, tenant AI application user ID
): Promise<GuardrailResponse>
```

##### checkPromptImage(prompt, image, model?, userId?)

Detect safety of text prompt and image - multimodal detection.

```typescript
await client.checkPromptImage(
  prompt: string,           // Text prompt (can be empty)
  image: string,           // Local file path or HTTP(S) link of image
  model?: string,          // Model name, default 'Xiangxin-Guardrails-VL'
  userId?: string          // Optional, tenant AI application user ID
): Promise<GuardrailResponse>
```

##### checkPromptImages(prompt, images, model?, userId?)

Detect safety of text prompt and multiple images - multimodal detection.

```typescript
await client.checkPromptImages(
  prompt: string,           // Text prompt (can be empty)
  images: string[],        // List of local file paths or HTTP(S) links of images
  model?: string,          // Model name, default 'Xiangxin-Guardrails-VL'
  userId?: string          // Optional, tenant AI application user ID
): Promise<GuardrailResponse>
```

##### healthCheck()

Check API service health status.

```typescript
await client.healthCheck(): Promise<Record<string, any>>
```

##### getModels()

Get available model list.

```typescript
await client.getModels(): Promise<Record<string, any>>
```

### Response Format

```typescript
interface GuardrailResponse {
  id: string;                    // Request unique identifier
  result: {
    compliance: {                // Compliance detection results
      risk_level: string;        // no_risk/low_risk/medium_risk/high_risk
      categories: string[];      // Risk categories
    };
    security: {                  // Security detection results
      risk_level: string;        // no_risk/low_risk/medium_risk/high_risk
      categories: string[];      // Risk categories
    };
    data: {                      // Data leakage prevention detection results (new in v2.4.0)
      risk_level: string;        // no_risk/low_risk/medium_risk/high_risk
      categories: string[];      // Detected sensitive data types
    };
  };
  overall_risk_level: string;    // Comprehensive risk level
  suggest_action: string;        // pass/reject/replace
  suggest_answer?: string;       // Suggested answer (includes desensitized content during data leakage prevention)
  score?: number;                // Detection confidence score (new in v2.4.1)
}
```

### Helper Methods

```typescript
import { GuardrailResponseHelper } from 'xiangxinai';

// Check if safe
GuardrailResponseHelper.isSafe(response);        // boolean

// Check if blocked
GuardrailResponseHelper.isBlocked(response);     // boolean

// Check if has replace answer
GuardrailResponseHelper.hasSubstitute(response); // boolean

// Get all risk categories
GuardrailResponseHelper.getAllCategories(response); // string[]
```

## Error Handling

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
    console.error('Authentication failed, please check API key');
  } else if (error instanceof RateLimitError) {
    console.error('Request rate too high, please try again later');
  } else if (error instanceof ValidationError) {
    console.error('Invalid input parameters:', error.message);
  } else if (error instanceof XiangxinAIError) {
    console.error('API error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Use Cases

### 1. Content Moderation

```typescript
// User-generated content detection
const userContent = "User posted content...";
const result = await client.checkPrompt(userContent);

if (!GuardrailResponseHelper.isSafe(result)) {
  // Content unsafe, perform appropriate handling
  console.log('Content contains risks:', GuardrailResponseHelper.getAllCategories(result));
}
```

### 2. Dialogue System Protection

```typescript
// Safety detection in AI dialogue systems
const conversation = [
  { role: 'user', content: 'User question' },
  { role: 'assistant', content: 'Response prepared to send to user' }
];

const result = await client.checkConversation(conversation);

if (result.suggest_action === 'replace' && result.suggest_answer) {
  // Use safe replace answer
  return result.suggest_answer;
} else if (result.suggest_action === 'reject') {
  // Block unsafe conversation
  return 'Sorry, I cannot answer this question';
}
```

### 3. Real-time Streaming Detection

```typescript
// Real-time detection in streaming conversations
async function streamConversationCheck(messages) {
  try {
    const result = await client.checkConversation(messages);
    
    return {
      canContinue: GuardrailResponseHelper.isSafe(result),
      suggestedResponse: result.suggest_answer,
      riskCategories: GuardrailResponseHelper.getAllCategories(result)
    };
  } catch (error) {
    console.error('Safety detection failed:', error);
    return { canContinue: false };
  }
}
```

## Best Practices

1. **Use Conversation Context Detection**: Recommend using `checkConversation` instead of `checkPrompt`, as context awareness provides more accurate detection results.

2. **Proper Error Handling**: Implement appropriate error handling and retry mechanisms.

3. **Caching Strategy**: Consider caching detection results for identical inputs.

4. **Monitoring and Logging**: Record detection results for analysis and optimization.

## License

Apache 2.0

## Technical Support

- Official Website: https://xiangxinai.cn
- Documentation: https://docs.xiangxinai.cn  
- Issue Reporting: https://github.com/xiangxinai/xiangxin-guardrails/issues
- Email: wanglei@xiangxinai.cn