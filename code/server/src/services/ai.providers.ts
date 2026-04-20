/**
 * AI 提供商抽象层
 *
 * 定义 AI 提供商接口，支持多种 AI 服务（OpenAI, Anthropic, Azure 等）。
 * 当前实现 OpenAI 提供商。
 */

import OpenAI from 'openai';
import { config } from '../config';

export interface AIProviderOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIProviderResponse {
  text: string;
  tokensUsed: number;
}

export interface AIProvider {
  name: string;
  model: string;
  complete(prompt: string, options?: AIProviderOptions): Promise<AIProviderResponse>;
  stream(prompt: string, options?: AIProviderOptions): AsyncGenerator<string>;
  estimateCost(tokens: number): number;
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  model = config.ai.openaiModel;
  
  private client: OpenAI;
  
  constructor() {
    if (!config.ai.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey: config.ai.openaiApiKey });
  }
  
  async complete(prompt: string, options?: AIProviderOptions): Promise<AIProviderResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || config.ai.maxTokens,
      temperature: options?.temperature ?? config.ai.temperature,
    });
    
    const text = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    
    return { text, tokensUsed };
  }
  
  async *stream(prompt: string, options?: AIProviderOptions): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || config.ai.maxTokens,
      temperature: options?.temperature ?? config.ai.temperature,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      yield content;
    }
  }
  
  estimateCost(tokens: number): number {
    // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
    const inputCost = (tokens * 0.15) / 1000000;
    const outputCost = (tokens * 0.60) / 1000000;
    return (inputCost + outputCost) / 2; // Rough average
  }
}

export const aiProviders = {
  openai: new OpenAIProvider()
};

export type AIProviderName = keyof typeof aiProviders;
