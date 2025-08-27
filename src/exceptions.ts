/**
 * 异常定义
 */

export class XiangxinAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XiangxinAIError';
  }
}

export class AuthenticationError extends XiangxinAIError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends XiangxinAIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends XiangxinAIError {
  constructor(message: string = 'Validation error') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends XiangxinAIError {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends XiangxinAIError {
  constructor(message: string = 'Server error') {
    super(message);
    this.name = 'ServerError';
  }
}