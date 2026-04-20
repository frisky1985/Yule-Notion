/**
 * AI 相关类型定义（前端）
 */

export type AIOperationType = 
  | 'summarize'
  | 'rewrite'
  | 'expand'
  | 'translate'
  | 'improveWriting'
  | 'fixGrammar'
  | 'continueWriting';

export interface AIRequest {
  operation: AIOperationType;
  text: string;
  pageId?: string;
  language?: string;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  tokensUsed: number;
  cost: number;
  provider: string;
  model: string;
}

export interface AIStreamChunk {
  token?: string;
  done?: boolean;
  tokensUsed?: number;
  cost?: number;
  error?: string;
}

export interface AIOperationRecord {
  id: string;
  operationType: AIOperationType;
  inputText: string;
  outputText: string;
  tokensUsed: number;
  cost: number;
  provider: string;
  createdAt: string;
}

export interface AIError {
  code: string;
  message: string;
  retryAfter?: number;
}
