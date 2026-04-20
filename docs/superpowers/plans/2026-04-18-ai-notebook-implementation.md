# AI Notebook Phase 1: AI Writing Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an embedded AI writing assistant that provides context-aware text operations (summarize, rewrite, expand, translate, improve writing, fix grammar, continue writing) with streaming responses.

**Architecture:** Frontend Vue 3 components (AIPanel, AICommandPalette, TipTap AI extension) communicate with backend Node.js AI service via REST API + Server-Sent Events. AI service integrates with OpenAI API, gathers page context, and tracks usage/costs. PostgreSQL stores operation history.

**Tech Stack:** Vue 3, TypeScript, TipTap, Node.js, Express, OpenAI API, PostgreSQL, Knex.js, Server-Sent Events

---

## File Structure Overview

### Backend Files (New)
- `code/server/src/controllers/ai.controller.ts` - AI API endpoints
- `code/server/src/services/ai.service.ts` - AI business logic
- `code/server/src/services/ai.providers.ts` - AI provider abstraction
- `code/server/src/db/migrations/20260418_ai_operations.ts` - Database migration

### Backend Files (Modify)
- `code/server/src/routes/auth.routes.ts` - Add AI routes (rename to api.routes.ts or add to app.ts)
- `code/server/src/config/index.ts` - Add AI configuration
- `code/server/src/types/index.ts` - Add AI types

### Frontend Files (New)
- `code/client/src/components/ai/AIPanel.vue` - AI assistant panel
- `code/client/src/components/ai/AICommandPalette.vue` - Command selection modal
- `code/client/src/components/ai/AIHistoryPanel.vue` - Operation history
- `code/client/src/components/editor/extensions/TipTapAIExtension.ts` - TipTap AI integration
- `code/client/src/services/ai.service.ts` - Frontend AI API client
- `code/client/src/stores/ai.ts` - AI state management (Pinia)

### Frontend Files (Modify)
- `code/client/src/components/editor/TipTapEditor.vue` - Integrate AI extension
- `code/client/src/types/index.ts` - Add AI types
- `code/client/src/router/index.ts` - Add AI routes if needed

---

## Task 1: Database Migration for AI Operations

**Files:**
- Create: `code/server/src/db/migrations/20260418_ai_operations.ts`

- [ ] **Step 1: Create migration file**

```typescript
// code/server/src/db/migrations/20260418_ai_operations.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // AI operations history table
  await knex.schema.createTable('ai_operations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('operation_type', 50).notNullable(); // summarize, rewrite, expand, etc.
    table.text('input_text').notNullable();
    table.text('output_text').notNullable();
    table.integer('tokens_used').notNullable();
    table.decimal('cost', 10, 6).notNullable();
    table.string('provider', 50).notNullable().defaultTo('openai');
    table.string('model', 100).notNullable();
    table.uuid('page_id').references('id').inTable('pages').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for performance
  await knex.raw(`CREATE INDEX idx_ai_operations_user_id ON ai_operations(user_id)`);
  await knex.raw(`CREATE INDEX idx_ai_operations_created_at ON ai_operations(created_at)`);
  await knex.raw(`CREATE INDEX idx_ai_operations_page_id ON ai_operations(page_id)`);

  // AI usage limits table
  await knex.schema.createTable('ai_usage_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('monthly_limit', 10, 2).defaultTo(10.00); // $10/month default
    table.decimal('current_month_usage', 10, 6).defaultTo(0);
    table.integer('month').notNullable();
    table.integer('year').notNullable();
    table.unique(['user_id', 'month', 'year']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_usage_limits');
  await knex.raw(`DROP INDEX IF EXISTS idx_ai_operations_page_id`);
  await knex.raw(`DROP INDEX IF EXISTS idx_ai_operations_created_at`);
  await knex.raw(`DROP INDEX IF EXISTS idx_ai_operations_user_id`);
  await knex.schema.dropTableIfExists('ai_operations');
}
```

- [ ] **Step 2: Test migration**

Run: `cd code/server && npm run migrate:latest`
Expected: Tables created successfully

Run: `psql -d yule_notion -c "\dt ai_*"`
Expected: See ai_operations and ai_usage_limits tables

- [ ] **Step 3: Commit**

```bash
cd d:\workspaces\ai-workspaces\qoderwork\Yule-Notion
git add code/server/src/db/migrations/20260418_ai_operations.ts
git commit -m "feat: add AI operations database migration"
```

---

## Task 2: AI Configuration and Types

**Files:**
- Modify: `code/server/src/config/index.ts`
- Modify: `code/server/src/types/index.ts`

- [ ] **Step 1: Add AI configuration**

```typescript
// code/server/src/config/index.ts - ADD THESE LINES

export const aiConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  defaultModel: 'gpt-4o-mini',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  rateLimit: {
    maxRequestsPerMinute: 10,
    windowMs: 60 * 1000 // 1 minute
  },
  costLimit: {
    defaultMonthlyLimit: 10.00, // $10
    alertThresholds: [0.5, 0.8, 1.0] // 50%, 80%, 100%
  },
  timeout: 30000 // 30 seconds
};
```

- [ ] **Step 2: Add AI types**

```typescript
// code/server/src/types/index.ts - ADD THESE INTERFACES

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
  language?: string; // for translate
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  tokensUsed: number;
  cost: number;
  provider: string;
  model: string;
}

export interface AIErrorResponse {
  error: {
    code: 'RATE_LIMIT_EXCEEDED' | 'COST_LIMIT_REACHED' | 'AI_TIMEOUT' | 'INVALID_REQUEST' | 'API_KEY_MISSING';
    message: string;
    retryAfter?: number;
  };
}

export interface AIOperationRecord {
  id: string;
  userId: string;
  operationType: AIOperationType;
  inputText: string;
  outputText: string;
  tokensUsed: number;
  cost: number;
  provider: string;
  model: string;
  pageId?: string;
  createdAt: Date;
}
```

- [ ] **Step 3: Add environment variables to .env.example**

```bash
# code/server/.env.example - ADD THESE LINES

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
```

- [ ] **Step 4: Commit**

```bash
git add code/server/src/config/index.ts code/server/src/types/index.ts code/server/.env.example
git commit -m "feat: add AI configuration and type definitions"
```

---

## Task 3: AI Provider Abstraction Layer

**Files:**
- Create: `code/server/src/services/ai.providers.ts`

- [ ] **Step 1: Create provider interface and OpenAI implementation**

```typescript
// code/server/src/services/ai.providers.ts

import OpenAI from 'openai';
import { aiConfig } from '../config';

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
  stream(prompt: string, options?: AIProviderOptions): Promise<AsyncIterable<string>>;
  estimateCost(tokens: number): number;
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  model = aiConfig.openaiModel;
  
  private client: OpenAI;
  
  constructor() {
    if (!aiConfig.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey: aiConfig.openaiApiKey });
  }
  
  async complete(prompt: string, options?: AIProviderOptions): Promise<AIProviderResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || aiConfig.maxTokens,
      temperature: options?.temperature ?? aiConfig.temperature,
    });
    
    const text = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    
    return { text, tokensUsed };
  }
  
  async *stream(prompt: string, options?: AIProviderOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || aiConfig.maxTokens,
      temperature: options?.temperature ?? aiConfig.temperature,
      stream: true,
    });
    
    let tokensUsed = 0;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      tokensUsed++;
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
```

- [ ] **Step 2: Install OpenAI SDK**

```bash
cd code/server
npm install openai
```

- [ ] **Step 3: Commit**

```bash
git add code/server/src/services/ai.providers.ts code/server/package.json
git commit -m "feat: add AI provider abstraction with OpenAI implementation"
```

---

## Task 4: AI Service Layer

**Files:**
- Create: `code/server/src/services/ai.service.ts`

- [ ] **Step 1: Create AI service with context gathering and prompt engineering**

```typescript
// code/server/src/services/ai.service.ts

import knex from '../db/connection';
import { aiConfig } from '../config';
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
      const page = await knex('pages')
        .where({ id: pageId, is_deleted: false })
        .first();
      
      if (!page) return '';
      
      // Get related pages (same tags or parent/children)
      const relatedPages = await knex('pages')
        .leftJoin('page_tags', 'pages.id', 'page_tags.page_id')
        .whereIn('page_tags.tag_id', function() {
          this.select('tag_id')
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
  
  async *stream(request: AIRequest, userId: string): AsyncIterable<{ token?: string; done?: boolean; tokensUsed?: number; cost?: number }> {
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
    const requestCount = await knex('ai_operations')
      .where('user_id', userId)
      .where('created_at', '>=', oneMinuteAgo)
      .count();
    
    if (parseInt(requestCount as any) >= aiConfig.rateLimit.maxRequestsPerMinute) {
      const error: AIErrorResponse = {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${aiConfig.rateLimit.maxRequestsPerMinute} requests per minute.`,
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
    
    const usageLimit = await knex('ai_usage_limits')
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
    await knex('ai_operations').insert({
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
    
    await knex('ai_usage_limits')
      .where('user_id', userId)
      .where('month', currentMonth)
      .where('year', currentYear)
      .increment('current_month_usage', cost)
      .onConflict(['user_id', 'month', 'year'])
      .merge({
        current_month_usage: knex.raw('current_month_usage + ?', [cost])
      });
  }
  
  async getHistory(userId: string, limit = 50, offset = 0): Promise<any[]> {
    return await knex('ai_operations')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }
  
  async getMonthlyCost(userId: string): Promise<number> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const result = await knex('ai_usage_limits')
      .where('user_id', userId)
      .where('month', currentMonth)
      .where('year', currentYear)
      .first('current_month_usage');
    
    return result ? parseFloat(result.current_month_usage) : 0;
  }
}

export const aiService = new AIService();
```

- [ ] **Step 2: Commit**

```bash
git add code/server/src/services/ai.service.ts
git commit -m "feat: implement AI service layer with context gathering and rate limiting"
```

---

## Task 5: AI Controller and Routes

**Files:**
- Create: `code/server/src/controllers/ai.controller.ts`
- Modify: `code/server/src/app.ts` (add AI routes)

- [ ] **Step 1: Create AI controller**

```typescript
// code/server/src/controllers/ai.controller.ts

import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { AIRequest } from '../types';

export class AIController {
  async complete(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const request: AIRequest = req.body;
      
      // Validate request
      if (!request.operation || !request.text) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'operation and text are required'
          }
        });
      }
      
      const response = await aiService.complete(request, userId);
      res.json(response);
    } catch (error: any) {
      if (error.message.includes('RATE_LIMIT_EXCEEDED') || 
          error.message.includes('COST_LIMIT_REACHED')) {
        const parsed = JSON.parse(error.message);
        return res.status(429).json(parsed);
      }
      
      console.error('AI complete error:', error);
      res.status(500).json({
        error: {
          code: 'AI_TIMEOUT',
          message: 'AI request failed. Please try again.'
        }
      });
    }
  }
  
  async stream(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const request: AIRequest = req.body;
      
      // Validate request
      if (!request.operation || !request.text) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'operation and text are required'
          }
        });
      }
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream response
      for await (const chunk of aiService.stream(request, userId)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      
      res.end();
    } catch (error: any) {
      if (error.message.includes('RATE_LIMIT_EXCEEDED') || 
          error.message.includes('COST_LIMIT_REACHED')) {
        const parsed = JSON.parse(error.message);
        return res.status(429).json(parsed);
      }
      
      console.error('AI stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
  
  async getHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const history = await aiService.getHistory(userId, limit, offset);
      res.json({ history, limit, offset });
    } catch (error) {
      console.error('Get AI history error:', error);
      res.status(500).json({
        error: { code: 'SERVER_ERROR', message: 'Failed to get AI history' }
      });
    }
  }
  
  async getMonthlyCost(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const cost = await aiService.getMonthlyCost(userId);
      res.json({ monthlyCost: cost });
    } catch (error) {
      console.error('Get monthly cost error:', error);
      res.status(500).json({
        error: { code: 'SERVER_ERROR', message: 'Failed to get monthly cost' }
      });
    }
  }
}

export const aiController = new AIController();
```

- [ ] **Step 2: Add AI routes to app.ts**

```typescript
// code/server/src/app.ts - FIND the routes section and ADD:

import { aiController } from './controllers/ai.controller';
import { authMiddleware } from './middleware/auth';

// ADD these lines after other route registrations:
app.post('/api/v1/ai/complete', authMiddleware, aiController.complete.bind(aiController));
app.post('/api/v1/ai/stream', authMiddleware, aiController.stream.bind(aiController));
app.get('/api/v1/ai/history', authMiddleware, aiController.getHistory.bind(aiController));
app.get('/api/v1/ai/cost', authMiddleware, aiController.getMonthlyCost.bind(aiController));
```

- [ ] **Step 3: Test routes**

Start server: `cd code/server && npm run dev`

Test with curl:
```bash
curl -X POST http://localhost:3000/api/v1/ai/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"summarize","text":"Test text to summarize"}'
```

Expected: JSON response with summarized text or error if API key not configured

- [ ] **Step 4: Commit**

```bash
git add code/server/src/controllers/ai.controller.ts code/server/src/app.ts
git commit -m "feat: add AI controller and API routes with SSE streaming"
```

---

## Task 6: Frontend AI Service and Types

**Files:**
- Create: `code/client/src/services/ai.service.ts`
- Create: `code/client/src/types/ai.ts`

- [ ] **Step 1: Create AI types**

```typescript
// code/client/src/types/ai.ts

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
```

- [ ] **Step 2: Create frontend AI service**

```typescript
// code/client/src/services/ai.service.ts

import api from './api';
import { AIRequest, AIResponse, AIStreamChunk, AIOperationRecord } from '@/types/ai';

export class AIFrontendService {
  async complete(request: AIRequest): Promise<AIResponse> {
    const response = await api.post('/ai/complete', request);
    return response.data;
  }
  
  stream(request: AIRequest, onChunk: (chunk: AIStreamChunk) => void): AbortController {
    const controller = new AbortController();
    
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request),
      signal: controller.signal
    }).then(async (response) => {
      const reader = response.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: AIStreamChunk = JSON.parse(line.slice(6));
              onChunk(chunk);
            } catch (e) {
              console.error('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('AI stream error:', error);
        onChunk({ error: error.message });
      }
    });
    
    return controller;
  }
  
  async getHistory(limit = 50, offset = 0): Promise<{ history: AIOperationRecord[] }> {
    const response = await api.get('/ai/history', {
      params: { limit, offset }
    });
    return response.data;
  }
  
  async getMonthlyCost(): Promise<{ monthlyCost: number }> {
    const response = await api.get('/ai/cost');
    return response.data;
  }
}

export const aiFrontendService = new AIFrontendService();
```

- [ ] **Step 3: Commit**

```bash
git add code/client/src/services/ai.service.ts code/client/src/types/ai.ts
git commit -m "feat: add frontend AI service with SSE streaming support"
```

---

## Task 7: AI Store (Pinia)

**Files:**
- Create: `code/client/src/stores/ai.ts`

- [ ] **Step 1: Create AI state store**

```typescript
// code/client/src/stores/ai.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AIOperationType, AIStreamChunk, AIOperationRecord } from '@/types/ai';
import { aiFrontendService } from '@/services/ai.service';

export const useAIStore = defineStore('ai', () => {
  const isPanelOpen = ref(false);
  const currentOperation = ref<AIOperationType | null>(null);
  const inputText = ref('');
  const aiResponse = ref('');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const streaming = ref(false);
  const history = ref<AIOperationRecord[]>([]);
  const monthlyCost = ref(0);
  
  let streamController: AbortController | null = null;
  
  function openPanel(operation?: AIOperationType, text?: string) {
    isPanelOpen.value = true;
    if (operation) currentOperation.value = operation;
    if (text) inputText.value = text;
    aiResponse.value = '';
    error.value = null;
  }
  
  function closePanel() {
    isPanelOpen.value = false;
    cancelStream();
  }
  
  function setInputText(text: string) {
    inputText.value = text;
  }
  
  function setOperation(operation: AIOperationType) {
    currentOperation.value = operation;
  }
  
  async function generateResponse(pageId?: string) {
    if (!currentOperation.value || !inputText.value) return;
    
    isLoading.value = true;
    streaming.value = true;
    error.value = null;
    aiResponse.value = '';
    
    try {
      streamController = aiFrontendService.stream(
        {
          operation: currentOperation.value,
          text: inputText.value,
          pageId
        },
        (chunk: AIStreamChunk) => {
          if (chunk.token) {
            aiResponse.value += chunk.token;
          }
          if (chunk.done) {
            isLoading.value = false;
            streaming.value = false;
            loadHistory();
            loadMonthlyCost();
          }
          if (chunk.error) {
            error.value = chunk.error;
            isLoading.value = false;
            streaming.value = false;
          }
        }
      );
    } catch (err: any) {
      error.value = err.message || 'Failed to generate response';
      isLoading.value = false;
      streaming.value = false;
    }
  }
  
  function cancelStream() {
    if (streamController) {
      streamController.abort();
      streamController = null;
    }
    isLoading.value = false;
    streaming.value = false;
  }
  
  function clearResponse() {
    aiResponse.value = '';
    error.value = null;
  }
  
  async function loadHistory() {
    try {
      const result = await aiFrontendService.getHistory();
      history.value = result.history;
    } catch (err) {
      console.error('Failed to load AI history:', err);
    }
  }
  
  async function loadMonthlyCost() {
    try {
      const result = await aiFrontendService.getMonthlyCost();
      monthlyCost.value = result.monthlyCost;
    } catch (err) {
      console.error('Failed to load monthly cost:', err);
    }
  }
  
  return {
    isPanelOpen,
    currentOperation,
    inputText,
    aiResponse,
    isLoading,
    error,
    streaming,
    history,
    monthlyCost,
    openPanel,
    closePanel,
    setInputText,
    setOperation,
    generateResponse,
    cancelStream,
    clearResponse,
    loadHistory,
    loadMonthlyCost
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add code/client/src/stores/ai.ts
git commit -m "feat: add AI Pinia store for state management"
```

---

## Task 8: AIPanel Component

**Files:**
- Create: `code/client/src/components/ai/AIPanel.vue`

- [ ] **Step 1: Create AI panel component**

```vue
<!-- code/client/src/components/ai/AIPanel.vue -->

<template>
  <Teleport to="body">
    <Transition name="slide-fade">
      <div v-if="aiStore.isPanelOpen" class="ai-panel-overlay" @click.self="aiStore.closePanel()">
        <div class="ai-panel">
          <!-- Header -->
          <div class="ai-panel-header">
            <h3>✨ AI Assistant</h3>
            <button class="close-btn" @click="aiStore.closePanel()">✕</button>
          </div>
          
          <!-- Operation Selector -->
          <div class="ai-panel-section">
            <label>Operation:</label>
            <select v-model="currentOperation" @change="onOperationChange">
              <option value="summarize">📝 Summarize</option>
              <option value="rewrite">✍️ Rewrite</option>
              <option value="expand">📖 Expand</option>
              <option value="translate">🌐 Translate</option>
              <option value="improveWriting">✨ Improve Writing</option>
              <option value="fixGrammar">✓ Fix Grammar</option>
              <option value="continueWriting">➡️ Continue Writing</option>
            </select>
          </div>
          
          <!-- Input -->
          <div class="ai-panel-section">
            <label>Input:</label>
            <textarea
              v-model="aiStore.inputText"
              placeholder="Selected text appears here..."
              rows="4"
            ></textarea>
          </div>
          
          <!-- Generate Button -->
          <button
            class="generate-btn"
            :disabled="!aiStore.inputText || aiStore.isLoading"
            @click="handleGenerate"
          >
            <span v-if="aiStore.isLoading">Generating...</span>
            <span v-else>Generate Response</span>
          </button>
          
          <!-- Output -->
          <div v-if="aiStore.aiResponse || aiStore.error" class="ai-panel-section">
            <label>Output:</label>
            <div class="ai-output" :class="{ streaming: aiStore.streaming }">
              <div v-if="aiStore.error" class="error-message">
                {{ aiStore.error }}
              </div>
              <div v-else class="response-content" v-html="formatResponse(aiStore.aiResponse)"></div>
              <div v-if="aiStore.streaming" class="streaming-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div v-if="aiStore.aiResponse && !aiStore.isLoading" class="ai-panel-actions">
            <button class="action-btn" @click="handleInsert">Insert</button>
            <button class="action-btn" @click="handleReplace">Replace</button>
            <button class="action-btn" @click="handleCopy">Copy</button>
            <button class="action-btn secondary" @click="aiStore.clearResponse()">Clear</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAIStore } from '@/stores/ai';
import { AIOperationType } from '@/types/ai';

const aiStore = useAIStore();
const emit = defineEmits<{
  insert: [text: string];
  replace: [text: string];
}>();

const currentOperation = ref<AIOperationType>('summarize');

watch(() => aiStore.isPanelOpen, (isOpen) => {
  if (isOpen && aiStore.currentOperation) {
    currentOperation.value = aiStore.currentOperation;
  }
});

function onOperationChange() {
  aiStore.setOperation(currentOperation.value);
}

function handleGenerate() {
  const pageId = new URLSearchParams(window.location.search).get('pageId') || undefined;
  aiStore.generateResponse(pageId);
}

function handleInsert() {
  emit('insert', aiStore.aiResponse);
  aiStore.closePanel();
}

function handleReplace() {
  emit('replace', aiStore.aiResponse);
  aiStore.closePanel();
}

function handleCopy() {
  navigator.clipboard.writeText(aiStore.aiResponse);
}

function formatResponse(text: string): string {
  // Simple markdown-like formatting
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
</script>

<style scoped>
.ai-panel-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.ai-panel {
  width: 400px;
  background: var(--bg-editor, #ffffff);
  border-left: 1px solid var(--border-light, #e0e0e0);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.ai-panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px 8px;
}

.close-btn:hover {
  color: var(--text-primary, #333);
}

.ai-panel-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-panel-section label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.ai-panel-section select,
.ai-panel-section textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-default, #ccc);
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  background: var(--bg-input, #fafafa);
}

.ai-panel-section textarea {
  resize: vertical;
  min-height: 80px;
}

.generate-btn {
  padding: 12px;
  background: var(--color-active, #4a9eff);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: var(--color-active-hover, #357abd);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-output {
  min-height: 100px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-light, #e0e0e0);
  position: relative;
}

.ai-output.streaming {
  border-color: var(--color-active, #4a9eff);
}

.error-message {
  color: #e53e3e;
  font-size: 14px;
}

.response-content {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.streaming-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0 0;
}

.dot {
  width: 6px;
  height: 6px;
  background: var(--color-active, #4a9eff);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.ai-panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  background: var(--color-active, #4a9eff);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--color-active-hover, #357abd);
}

.action-btn.secondary {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  border: 1px solid var(--border-default, #ccc);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add code/client/src/components/ai/AIPanel.vue
git commit -m "feat: create AI panel component with streaming response UI"
```

---

## Task 9: AI Command Palette

**Files:**
- Create: `code/client/src/components/ai/AICommandPalette.vue`

- [ ] **Step 1: Create command palette component**

```vue
<!-- code/client/src/components/ai/AICommandPalette.vue -->

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="ai-command-palette-overlay" @click.self="close()">
        <div class="ai-command-palette">
          <!-- Search -->
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Type an AI command..."
            class="palette-search"
            @keydown.escape="close()"
            @keydown.enter="executeSelected"
            @keydown.arrow-down="navigate(1)"
            @keydown.arrow-up="navigate(-1)"
          />
          
          <!-- Operations List -->
          <div class="palette-operations">
            <div
              v-for="(op, index) in filteredOperations"
              :key="op.value"
              class="palette-operation"
              :class="{ active: index === selectedIndex }"
              @click="execute(op.value)"
            >
              <span class="op-icon">{{ op.icon }}</span>
              <div class="op-info">
                <div class="op-name">{{ op.label }}</div>
                <div class="op-desc">{{ op.description }}</div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="palette-footer">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { AIOperationType } from '@/types/ai';
import { useAIStore } from '@/stores/ai';

const aiStore = useAIStore();
const emit = defineEmits<{ execute: [operation: AIOperationType, text: string] }>();

const isOpen = ref(false);
const searchQuery = ref('');
const selectedIndex = ref(0);
const searchInput = ref<HTMLInputElement | null>(null);

interface Operation {
  value: AIOperationType;
  label: string;
  description: string;
  icon: string;
}

const operations: Operation[] = [
  { value: 'summarize', label: 'Summarize', description: 'Create concise summary', icon: '📝' },
  { value: 'rewrite', label: 'Rewrite', description: 'Rewrite with different wording', icon: '✍️' },
  { value: 'expand', label: 'Expand', description: 'Add more details', icon: '📖' },
  { value: 'translate', label: 'Translate', description: 'Translate to another language', icon: '🌐' },
  { value: 'improveWriting', label: 'Improve Writing', description: 'Enhance clarity and style', icon: '✨' },
  { value: 'fixGrammar', label: 'Fix Grammar', description: 'Correct errors', icon: '✓' },
  { value: 'continueWriting', label: 'Continue Writing', description: 'Generate continuation', icon: '➡️' }
];

const filteredOperations = computed(() => {
  if (!searchQuery.value) return operations;
  const query = searchQuery.value.toLowerCase();
  return operations.filter(op => 
    op.label.toLowerCase().includes(query) ||
    op.description.toLowerCase().includes(query)
  );
});

watch(() => isOpen.value, async (open) => {
  if (open) {
    await nextTick();
    searchInput.value?.focus();
  }
});

function open() {
  isOpen.value = true;
  searchQuery.value = '';
  selectedIndex.value = 0;
}

function close() {
  isOpen.value = false;
}

function navigate(direction: number) {
  const max = filteredOperations.value.length - 1;
  selectedIndex.value = Math.max(0, Math.min(max, selectedIndex.value + direction));
}

function executeSelected() {
  if (filteredOperations.value[selectedIndex.value]) {
    execute(filteredOperations.value[selectedIndex.value].value);
  }
}

function execute(operation: AIOperationType) {
  const selectedText = window.getSelection()?.toString() || '';
  emit('execute', operation, selectedText);
  close();
}

defineExpose({ open, close });
</script>

<style scoped>
.ai-command-palette-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
}

.ai-command-palette {
  width: 600px;
  max-height: 60vh;
  background: var(--bg-editor, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.palette-search {
  width: 100%;
  padding: 16px 20px;
  border: none;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
  font-size: 16px;
  outline: none;
  background: transparent;
}

.palette-operations {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.palette-operation {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s;
}

.palette-operation:hover,
.palette-operation.active {
  background: var(--bg-hover, #f0f0f0);
}

.op-icon {
  font-size: 24px;
}

.op-info {
  flex: 1;
}

.op-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.op-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-top: 2px;
}

.palette-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-light, #e0e0e0);
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add code/client/src/components/ai/AICommandPalette.vue
git commit -m "feat: create AI command palette with keyboard navigation"
```

---

## Task 10: TipTap AI Extension

**Files:**
- Create: `code/client/src/components/editor/extensions/TipTapAIExtension.ts`

- [ ] **Step 1: Create TipTap AI extension**

```typescript
// code/client/src/components/editor/extensions/TipTapAIExtension.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface TipTapAIExtensionOptions {
  onOpenAI: (operation: string, text: string) => void;
}

export const TipTapAIExtension = Extension.create<TipTapAIExtensionOptions>({
  name: 'aiExtension',
  
  addOptions() {
    return {
      onOpenAI: () => {}
    };
  },
  
  addProseMirrorPlugins() {
    const { onOpenAI } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('ai-extension'),
        props: {
          handleKeyDown(view, event) {
            // Ctrl+Shift+A opens AI panel
            if (event.ctrlKey && event.shiftKey && event.key === 'A') {
              event.preventDefault();
              const { state } = view;
              const { from, to } = state.selection;
              const selectedText = state.doc.textBetween(from, to, ' ');
              onOpenAI('', selectedText);
              return true;
            }
            return false;
          }
        }
      })
    ];
  },
  
  addCommands() {
    return {
      openAIPanel: (operation: string) => ({ state, tr }) => {
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');
        this.options.onOpenAI(operation, selectedText);
        return true;
      },
      
      insertAIResponse: (text: string) => ({ tr, state }) => {
        const { $from } = state.selection;
        tr.insertText(text, $from.pos);
        return true;
      },
      
      replaceSelectionWithAI: (text: string) => ({ tr, state }) => {
        const { from, to } = state.selection;
        tr.replaceWith(from, to, state.schema.text(text));
        return true;
      }
    };
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add code/client/src/components/editor/extensions/TipTapAIExtension.ts
git commit -m "feat: create TipTap AI extension with keyboard shortcuts"
```

---

## Task 11: Integrate AI into TipTapEditor

**Files:**
- Modify: `code/client/src/components/editor/TipTapEditor.vue`

- [ ] **Step 1: Add AI extension and components to TipTapEditor**

```typescript
// code/client/src/components/editor/TipTapEditor.vue - IN <script setup> ADD:

import { TipTapAIExtension } from './extensions/TipTapAIExtension';
import { useAIStore } from '@/stores/ai';
import AIPanel from '@/components/ai/AIPanel.vue';
import AICommandPalette from '@/components/ai/AICommandPalette.vue';

const aiStore = useAIStore();
const commandPaletteRef = ref<InstanceType<typeof AICommandPalette> | null>(null);

// IN useEditor config, ADD to extensions array:
TipTapAIExtension.configure({
  onOpenAI: (operation: string, text: string) => {
    if (text) {
      aiStore.openPanel(operation as any || undefined, text);
    } else {
      commandPaletteRef.value?.open();
    }
  }
}),
```

- [ ] **Step 2: Add AI components to template**

```vue
<!-- code/client/src/components/editor/TipTapEditor.vue - IN <template> ADD BEFORE CLOSING </div> -->

<!-- AI Panel -->
<AIPanel 
  @insert="handleAIInsert"
  @replace="handleAIReplace"
/>

<!-- AI Command Palette -->
<AICommandPalette 
  ref="commandPaletteRef"
  @execute="handleAICommand"
/>
```

- [ ] **Step 3: Add AI event handlers**

```typescript
// code/client/src/components/editor/TipTapEditor.vue - IN <script setup> ADD:

function handleAIInsert(text: string) {
  editor.value?.chain().focus().insertAIResponse(text).run();
}

function handleAIReplace(text: string) {
  editor.value?.chain().focus().replaceSelectionWithAI(text).run();
}

function handleAICommand(operation: string, text: string) {
  if (text) {
    aiStore.openPanel(operation as any, text);
  } else {
    aiStore.openPanel(operation as any);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add code/client/src/components/editor/TipTapEditor.vue
git commit -m "feat: integrate AI extension and components into TipTapEditor"
```

---

## Task 12: Testing and Final Integration

**Files:**
- Manual testing across all components

- [ ] **Step 1: Test database migration**

```bash
cd code/server
npm run migrate:latest
psql -d yule_notion -c "SELECT count(*) FROM ai_operations;"
```

Expected: 0 (empty table)

- [ ] **Step 2: Test backend AI service**

Start server: `cd code/server && npm run dev`

Test with valid API key in .env:
```bash
curl -X POST http://localhost:3000/api/v1/ai/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"summarize","text":"This is a test paragraph that should be summarized by the AI service."}'
```

Expected: JSON response with summarized text

- [ ] **Step 3: Test frontend AI panel**

Start client: `cd code/client && npm run dev`

1. Open browser to http://localhost:5173
2. Login or use demo mode
3. Open a note
4. Select some text
5. Press Ctrl+Shift+A
6. Verify AI panel opens with selected text
7. Choose "Summarize" operation
8. Click "Generate Response"
9. Verify streaming response appears
10. Click "Insert" - verify text inserted at cursor

- [ ] **Step 4: Test AI command palette**

1. With no text selected, press Ctrl+Shift+A
2. Verify command palette opens
3. Type "summarize" in search
4. Press Enter
5. Verify AI panel opens with summarize operation

- [ ] **Step 5: Test error handling**

1. Remove OPENAI_API_KEY from .env
2. Restart server
3. Try to generate AI response
4. Verify error message: "API key missing"

- [ ] **Step 6: Test rate limiting**

Generate 11 AI requests within 1 minute
Expected: 11th request fails with rate limit error

- [ ] **Step 7: Commit all changes**

```bash
cd d:\workspaces\ai-workspaces\qoderwork\Yule-Notion
git add -A
git commit -m "feat: complete AI notebook Phase 1 implementation with testing"
```

---

## Task 13: Documentation Update

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update README with AI features**

```markdown
# README.md - ADD to Features section:

- **AI Writing Assistant** - Powered by OpenAI with streaming responses
  - Summarize, rewrite, expand, translate text
  - Improve writing and fix grammar
  - Continue writing with context awareness
  - Keyboard shortcut: Ctrl+Shift+A
```

- [ ] **Step 2: Update CHANGELOG**

```markdown
# CHANGELOG.md - ADD at top:

## v0.6.0 (2026-04-18)

### New Features
- AI Writing Assistant with OpenAI integration
- AI Panel for text operations (summarize, rewrite, expand, translate, etc.)
- AI Command Palette with keyboard navigation (Ctrl+Shift+A)
- Streaming AI responses via Server-Sent Events
- AI operation history and cost tracking
- Rate limiting and cost controls
```

- [ ] **Step 3: Final commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: update README and CHANGELOG with AI features"
```

---

## Summary

This plan implements a complete AI writing assistant for Yule Notion with:
- ✅ Backend AI service with OpenAI integration
- ✅ Database migrations for operation history
- ✅ Frontend AI panel with streaming responses
- ✅ Command palette with keyboard shortcuts
- ✅ TipTap integration
- ✅ Rate limiting and cost controls
- ✅ Comprehensive testing

**Total Tasks:** 13  
**Estimated Time:** 8-12 hours  
**Commits:** 13 (one per task)

All tasks are independent and can be executed sequentially. Each task produces working, testable code.
