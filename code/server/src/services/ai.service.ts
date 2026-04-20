/**
 * AI 服务层
 *
 * 处理 AI 操作的业务逻辑，包括：
 * - 上下文收集（相关页面内容）
 * - 提示词工程
 * - 速率限制和成本检查
 * - 使用量追踪
 */

import { db } from '../db/connection';
import { config } from '../config';
import { aiProviders, OpenAIProvider } from './ai.providers';
import { 
  AIRequest, 
  AIResponse, 
  AIOperationType,
  AIErrorResponse 
} from '../types';

const PROMPT_TEMPLATES: Record<AIOperationType, (text: string, context?: string, language?: string) => string> = {
  summarize: (text, context) => `
    ${context ? `Context from related pages:\n${context}\n\n` : ''}
    Please summarize the following text concisely while preserving key information:
    
    ${text}
    
    Summary:
  `,
  
  rewrite: (text, context) => `
    ${context ? `Context from related pages:\n${context}\n\n` : ''}
    Please rewrite the following text with different wording while maintaining the same meaning:
    
    ${text}
    
    Rewritten:
  `,
  
  expand: (text, context) => `
    ${context ? `Context from related pages:\n${context}\n\n` : ''}
    Please expand the following text with more details and examples:
    
    ${text}
    
    Expanded:
  `,
  
  translate: (text, _, language = 'English') => `
    Please translate the following text to ${language}:
    
    ${text}
    
    Translation:
  `,
  
  improveWriting: (text, context) => `
    ${context ? `Context from related pages:\n${context}\n\n` : ''}
    Please improve the following text for clarity, style, and readability:
    
    ${text}
    
    Improved:
  `,
  
  fixGrammar: (text) => `
    Please correct any grammar and spelling errors in the following text:
    
    ${text}
    
    Corrected:
  `,
  
  continueWriting: (text, context) => `
    ${context ? `Context from related pages:\n${context}\n\n` : ''}
    Please continue writing from the following text, maintaining the same style and tone:
    
    ${text}
    
    Continuation:
  `
};

export class AIService {
  private provider: OpenAIProvider;
  
  constructor() {
    this.provider = aiProviders.openai as OpenAIProvider;
  }
  
  async gatherContext(pageId?: string): Promise<string> {
    if (!pageId) return '';
    
    try {
      // Get current page
      const page = await db('pages')
        .where({ id: pageId, is_deleted: false })
        .first();
      
      if (!page) return '';
      
      // Get related pages (same tags or parent/children)
      const relatedPages = await db('pages')
        .leftJoin('page_tags', 'pages.id', 'page_tags.page_id')
        .whereIn('page_tags.tag_id', (qb: any) => {
          qb.select('tag_id')
            .from('page_tags')
            .where('page_id', pageId);
        })
        .where('pages.is_deleted', false)
        .where('pages.id', '!=', pageId)
        .select('pages.title', 'pages.content')
        .limit(3);
      
      let context = `Current page: ${page.title}\n`;
      if (relatedPages.length > 0) {
        context += '\nRelated pages:\n';
        relatedPages.forEach((p: any) => {
          const contentPreview = JSON.stringify(p.content).substring(0, 500);
          context += `- ${p.title}: ${contentPreview}...\n`;
        });
      }
      
      return context;
    } catch (error) {
      console.error('Error gathering AI context:', error);
      return '';
    }
  }
  
  async complete(request: AIRequest, userId: string): Promise<AIResponse> {
    // Check rate limit
    await this.checkRateLimit(userId);
    
    // Check cost limit
    await this.checkCostLimit(userId);
    
    // Build prompt
    const context = await this.gatherContext(request.pageId);
    const prompt = PROMPT_TEMPLATES[request.operation](
      request.text,
      context,
      request.language
    );
    
    // Call AI provider
    const response = await this.provider.complete(prompt, {
      maxTokens: request.maxTokens
    });
    
    // Calculate cost
    const cost = this.provider.estimateCost(response.tokensUsed);
    
    // Track usage
    await this.trackUsage(userId, request, response, cost);
    
    return {
      text: response.text,
      tokensUsed: response.tokensUsed,
      cost,
      provider: this.provider.name,
      model: this.provider.model
    };
  }
  
  async *stream(request: AIRequest, userId: string): AsyncGenerator<{ token?: string; done?: boolean; tokensUsed?: number; cost?: number }> {
    // Check rate limit
    await this.checkRateLimit(userId);
    
    // Check cost limit
    await this.checkCostLimit(userId);
    
    // Build prompt
    const context = await this.gatherContext(request.pageId);
    const prompt = PROMPT_TEMPLATES[request.operation](
      request.text,
      context,
      request.language
    );
    
    // Stream from AI provider
    let fullText = '';
    let tokenCount = 0;
    
    for await (const token of this.provider.stream(prompt, {
      maxTokens: request.maxTokens
    })) {
      fullText += token;
      tokenCount++;
      yield { token };
    }
    
    // Calculate cost
    const cost = this.provider.estimateCost(tokenCount);
    
    // Track usage
    await this.trackUsage(userId, {
      ...request,
      text: request.text
    }, {
      text: fullText,
      tokensUsed: tokenCount
    }, cost);
    
    yield { done: true, tokensUsed: tokenCount, cost };
  }
  
  private async checkRateLimit(userId: string): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const requestCount = await db('ai_operations')
      .where('user_id', userId)
      .where('created_at', '>=', oneMinuteAgo)
      .count();
    
    if (parseInt(requestCount as any) >= config.ai.rateLimit.maxRequestsPerMinute) {
      const error: AIErrorResponse = {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${config.ai.rateLimit.maxRequestsPerMinute} requests per minute.`,
          retryAfter: 60
        }
      };
      throw new Error(JSON.stringify(error));
    }
  }
  
  private async checkCostLimit(userId: string): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const usageLimit = await db('ai_usage_limits')
      .where('user_id', userId)
      .where('month', currentMonth)
      .where('year', currentYear)
      .first();
    
    if (usageLimit && parseFloat(usageLimit.current_month_usage) >= parseFloat(usageLimit.monthly_limit)) {
      const error: AIErrorResponse = {
        error: {
          code: 'COST_LIMIT_REACHED',
          message: `Monthly AI cost limit reached ($${usageLimit.monthly_limit}). Please increase your limit in settings.`
        }
      };
      throw new Error(JSON.stringify(error));
    }
  }
  
  private async trackUsage(
    userId: string,
    request: AIRequest,
    response: { text: string; tokensUsed: number },
    cost: number
  ): Promise<void> {
    // Log operation
    await db('ai_operations').insert({
      user_id: userId,
      operation_type: request.operation,
      input_text: request.text,
      output_text: response.text,
      tokens_used: response.tokensUsed,
      cost,
      provider: this.provider.name,
      model: this.provider.model,
      page_id: request.pageId || null
    });
    
    // Update monthly usage
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    await db('ai_usage_limits')
      .where('user_id', userId)
      .where('month', currentMonth)
      .where('year', currentYear)
      .increment('current_month_usage', cost)
      .onConflict(['user_id', 'month', 'year'])
      .merge({
        current_month_usage: db.raw('current_month_usage + ?', [cost])
      });
  }
  
  async getHistory(userId: string, limit = 50, offset = 0): Promise<any[]> {
    return await db('ai_operations')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }
  
  async getMonthlyCost(userId: string): Promise<number> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const result = await db('ai_usage_limits')
      .where('user_id', userId)
      .where('month', currentMonth)
      .where('year', currentYear)
      .first('current_month_usage');
    
    return result ? parseFloat(result.current_month_usage) : 0;
  }
}

export const aiService = new AIService();
