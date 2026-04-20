# Architecture Optimization Design Specification

> **Version:** v1.0  
> **Date:** 2026-04-18  
> **Status:** Approved for Implementation  
> **Scope:** Foundation-First Architecture Refactoring (Approach A)  
> **Target:** Yule Notion v0.7.0

---

## 1. Executive Summary

This specification defines the architecture optimization plan for Yule Notion v0.6.0, transitioning from a monolithic service layer to a clean, testable, repository-pattern-based architecture. The refactoring addresses critical technical debt while maintaining backward compatibility with all existing features.

**Key Improvements:**
- Repository pattern for all database operations
- Service layer decomposition (SOLID principles)
- Centralized error handling with typed error codes
- Testing infrastructure (Vitest + 50 tests)
- API validation layer with Zod schemas

**Timeline:** 3 weeks  
**Risk Level:** Low (incremental, non-breaking changes)  
**Expected Impact:** 60% reduction in bugs, 80% test coverage on critical paths

---

## 2. Current State Analysis

### 2.1 Architecture Issues Identified

| Issue | Severity | Impact | Files Affected |
|-------|----------|--------|----------------|
| No repository pattern | High | Tight coupling, untestable | All service files |
| Monolithic AI service | Medium | 308 lines, 5 responsibilities | `ai.service.ts` |
| No testing infrastructure | High | No regression protection | Entire codebase |
| Inconsistent error handling | Medium | Debugging difficulty | Controllers, services |
| No request validation | Medium | Invalid data reaches business logic | All API endpoints |

### 2.2 Current File Structure

```
code/server/src/
├── controllers/
│   ├── auth.controller.ts        # Direct db() calls
│   └── ai.controller.ts          # Direct db() calls
├── services/
│   ├── auth.service.ts           # Mixes business logic + DB queries
│   └── ai/
│       └── ai.service.ts         # 308 lines, handles 5 responsibilities
├── db/
│   └── connection.ts             # Exports { db } knex instance
└── types/
    └── index.ts                  # Type definitions
```

**Problems:**
- Controllers directly call `db('table')` queries
- No separation between business logic and data access
- Impossible to mock database operations in tests
- Error responses use mixed patterns (AppError, JSON strings, raw exceptions)

---

## 3. Target Architecture

### 3.1 New File Structure

```
code/server/src/
├── controllers/
│   ├── auth.controller.ts        # Only handles HTTP request/response
│   └── ai.controller.ts          # Only handles HTTP request/response
├── services/
│   ├── auth.service.ts           # Business logic only
│   └── ai/
│       ├── ai-context.service.ts      # Context gathering (~80 lines)
│       ├── ai-prompt.service.ts       # Prompt engineering (~60 lines)
│       ├── ai-cost.service.ts         # Cost tracking (~70 lines)
│       ├── ai-rate-limiter.ts         # Rate limiting (~50 lines)
│       └── ai-history.service.ts      # Operation history (~48 lines)
├── repositories/                    # NEW: Data access layer
│   ├── base.repository.ts           # Generic CRUD operations
│   ├── user.repository.ts           # User-specific queries
│   ├── page.repository.ts           # Page + tree operations
│   ├── tag.repository.ts            # Tag management
│   ├── ai-operation.repository.ts   # AI history & cost tracking
│   └── sync-log.repository.ts       # Sync conflict resolution
├── schemas/                         # NEW: Request/response validation
│   ├── auth.schemas.ts              # Auth endpoint schemas
│   ├── ai.schemas.ts                # AI endpoint schemas
│   └── page.schemas.ts              # Page endpoint schemas
├── middleware/
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── validate.ts                  # NEW: Zod validation middleware
│   └── rateLimit.ts
├── types/
│   ├── index.ts                     # Existing types
│   └── error-codes.ts               # NEW: Centralized error codes
└── utils/
    └── error.ts                     # NEW: Error helper functions
```

### 3.2 Layer Responsibilities

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Controllers** | HTTP request/response, status codes, validation | Parse request, call service, return response |
| **Services** | Business logic, orchestration, rules | Validate business rules, coordinate repositories |
| **Repositories** | Data access, queries, transactions | CRUD operations, complex queries, caching |
| **Schemas** | Request/response validation | Zod schemas for input/output validation |

---

## 4. Repository Pattern Design

### 4.1 Base Repository

Provides generic CRUD operations for all entities:

```typescript
// src/repositories/base.repository.ts
import { db } from '../db/connection';
import type { Knex } from 'knex';

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected db: Knex;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = db;
  }

  async findById(id: string): Promise<T | undefined> {
    return await this.db(this.tableName)
      .where({ id, is_deleted: false })
      .first();
  }

  async findAll(where?: Record<string, any>): Promise<T[]> {
    const query = this.db(this.tableName).where({ is_deleted: false });
    if (where) {
      query.where(where);
    }
    return await query;
  }

  async create(data: Partial<T>): Promise<T> {
    const [record] = await this.db(this.tableName)
      .insert(data)
      .returning('*');
    return record;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const [record] = await this.db(this.tableName)
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return record;
  }

  async softDelete(id: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({ is_deleted: true, updated_at: new Date() });
  }
}
```

### 4.2 UserRepository Example

```typescript
// src/repositories/user.repository.ts
import { BaseRepository } from './base.repository';
import bcrypt from 'bcryptjs';
import type { User } from '../types';

export interface CreateUserDTO {
  email: string;
  username: string;
  password: string;
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return await this.db('users')
      .where({ email, is_deleted: false })
      .first();
  }

  async createWithHash(dto: CreateUserDTO): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db('users')
      .insert({
        email: dto.email,
        username: dto.username,
        password: hashedPassword
      })
      .returning('*');
    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }
}
```

### 4.3 AIOperationRepository Example

```typescript
// src/repositories/ai-operation.repository.ts
import { BaseRepository } from './base.repository';
import type { AIOperationHistory } from '../types';

export class AIOperationRepository extends BaseRepository<AIOperationHistory> {
  constructor() {
    super('ai_operations');
  }

  async getByUserId(userId: string, limit: number = 50): Promise<AIOperationHistory[]> {
    return await this.db('ai_operations')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async getMonthlyCost(userId: string, month: number, year: number): Promise<number> {
    const result = await this.db('ai_operations')
      .where('user_id', userId)
      .whereRaw('EXTRACT(MONTH FROM created_at) = ?', [month])
      .whereRaw('EXTRACT(YEAR FROM created_at) = ?', [year])
      .sum('cost as total');
    
    return parseFloat(result[0]?.total || '0');
  }

  async countInLastMinute(userId: string): Promise<number> {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const result = await this.db('ai_operations')
      .where('user_id', userId)
      .where('created_at', '>=', oneMinuteAgo)
      .count('* as count');
    
    return parseInt(result[0]?.count || '0');
  }
}
```

---

## 5. Service Layer Decomposition

### 5.1 AI Service Split

**Current:** `ai.service.ts` (308 lines)  
**Target:** 5 focused services

#### 5.1.1 AIContextService (~80 lines)

**Responsibility:** Gather related page content for context-aware AI operations.

```typescript
// src/services/ai/ai-context.service.ts
import { PageRepository } from '../../repositories/page.repository';

export class AIContextService {
  private pageRepo: PageRepository;

  constructor() {
    this.pageRepo = new PageRepository();
  }

  async gatherContext(pageId?: string, userId?: string): Promise<string> {
    if (!pageId) return '';

    const page = await this.pageRepo.findById(pageId);
    if (!page || page.user_id !== userId) return '';

    // Get parent page content
    const parentContext = page.parent_id 
      ? await this.getPageSnippet(page.parent_id)
      : '';

    // Get sibling pages (max 3)
    const siblings = await this.pageRepo.getSiblings(pageId, 3);
    const siblingContext = siblings.map(s => s.title).join(', ');

    return this.buildContext(page, parentContext, siblingContext);
  }

  private async getPageSnippet(pageId: string): Promise<string> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) return '';
    return `Parent: ${page.title} - ${page.content?.substring(0, 200)}...`;
  }

  private buildContext(page: any, parent: string, siblings: string): string {
    return `
      Current Page: ${page.title}
      ${parent ? parent : ''}
      Related Pages: ${siblings || 'None'}
      Content: ${page.content?.substring(0, 500)}...
    `.trim();
  }
}
```

#### 5.1.2 AICostService (~70 lines)

**Responsibility:** Track and enforce AI usage costs.

```typescript
// src/services/ai/ai-cost.service.ts
import { AIOperationRepository } from '../../repositories/ai-operation.repository';
import { config } from '../../config';
import { AppError } from '../../types';
import { ERROR_CODES } from '../../types/error-codes';

export class AICostService {
  private aiOpRepo: AIOperationRepository;

  constructor() {
    this.aiOpRepo = new AIOperationRepository();
  }

  async checkMonthlyLimit(userId: string): Promise<void> {
    const now = new Date();
    const monthlyCost = await this.aiOpRepo.getMonthlyCost(
      userId,
      now.getMonth() + 1,
      now.getFullYear()
    );

    const limit = config.ai.costLimit.defaultMonthlyLimit;
    const percentage = monthlyCost / limit;

    if (percentage >= 1.0) {
      throw new AppError(
        ERROR_CODES.AI_COST_LIMIT_REACHED,
        `Monthly AI cost limit reached ($${monthlyCost.toFixed(2)} / $${limit})`
      );
    }

    // Alert at thresholds
    if ([0.5, 0.8, 1.0].includes(Math.floor(percentage * 10) / 10)) {
      console.warn(`User ${userId} AI cost alert: ${Math.round(percentage * 100)}%`);
    }
  }

  async recordUsage(
    userId: string,
    operation: string,
    tokensUsed: number,
    cost: number,
    provider: string,
    model: string
  ): Promise<void> {
    await this.aiOpRepo.create({
      user_id: userId,
      operation,
      tokens_used: tokensUsed,
      cost,
      provider,
      model,
      created_at: new Date()
    });
  }
}
```

#### 5.1.3 AIRateLimiter (~50 lines)

**Responsibility:** Enforce per-user rate limiting.

```typescript
// src/services/ai/ai-rate-limiter.ts
import { AIOperationRepository } from '../../repositories/ai-operation.repository';
import { config } from '../../config';
import { AppError } from '../../types';
import { ERROR_CODES } from '../../types/error-codes';

export class AIRateLimiter {
  private aiOpRepo: AIOperationRepository;

  constructor() {
    this.aiOpRepo = new AIOperationRepository();
  }

  async check(userId: string): Promise<void> {
    const requestCount = await this.aiOpRepo.countInLastMinute(userId);
    const maxRequests = config.ai.rateLimit.maxRequestsPerMinute;

    if (requestCount >= maxRequests) {
      throw new AppError(
        ERROR_CODES.AI_RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded. Maximum ${maxRequests} requests per minute.`,
        { retryAfter: 60 }
      );
    }
  }
}
```

#### 5.1.4 AIPromptService (~60 lines)

**Responsibility:** Build operation-specific prompts.

```typescript
// src/services/ai/ai-prompt.service.ts
import type { AIOperationType, AIRequest } from '../../types';

export class AIPromptService {
  buildPrompt(request: AIRequest, context: string): string {
    const basePrompt = this.getOperationPrompt(request.operation);
    
    return `
      ${basePrompt}
      
      ${context ? `Context from related pages:\n${context}\n\n` : ''}
      
      Input text:
      ${request.text}
      
      ${request.operation === 'translate' ? `Target language: ${request.language || 'en'}` : ''}
    `.trim();
  }

  private getOperationPrompt(operation: AIOperationType): string {
    const prompts: Record<AIOperationType, string> = {
      summarize: 'Summarize the following text concisely:',
      rewrite: 'Rewrite the following text to improve clarity and readability:',
      expand: 'Expand the following text with more details and examples:',
      translate: 'Translate the following text to the target language:',
      improveWriting: 'Improve the following text for better writing quality:',
      fixGrammar: 'Fix all grammar, spelling, and punctuation errors in the following text:',
      continueWriting: 'Continue writing from the following text, maintaining the same style and tone:'
    };
    return prompts[operation];
  }
}
```

#### 5.1.5 AIHistoryService (~48 lines)

**Responsibility:** Query and manage AI operation history.

```typescript
// src/services/ai/ai-history.service.ts
import { AIOperationRepository } from '../../repositories/ai-operation.repository';
import type { AIOperationHistory } from '../../types';

export class AIHistoryService {
  private aiOpRepo: AIOperationRepository;

  constructor() {
    this.aiOpRepo = new AIOperationRepository();
  }

  async getUserHistory(userId: string, limit: number = 50): Promise<AIOperationHistory[]> {
    return await this.aiOpRepo.getByUserId(userId, limit);
  }

  async getOperationStats(userId: string): Promise<{
    totalOperations: number;
    totalTokens: number;
    totalCost: number;
  }> {
    const history = await this.aiOpRepo.getByUserId(userId, 1000);
    return {
      totalOperations: history.length,
      totalTokens: history.reduce((sum, op) => sum + op.tokens_used, 0),
      totalCost: history.reduce((sum, op) => sum + op.cost, 0)
    };
  }
}
```

### 5.2 New AI Controller Flow

```typescript
// BEFORE (monolithic):
async stream(req, res) {
  const result = await aiService.process(request, userId);
  // ...
}

// AFTER (composable):
async stream(req, res) {
  // 1. Rate limit check
  await rateLimiter.check(userId);
  
  // 2. Cost limit check
  await costService.checkMonthlyLimit(userId);
  
  // 3. Gather context
  const context = await contextService.gatherContext(request.pageId, userId);
  
  // 4. Build prompt
  const prompt = promptService.buildPrompt(request, context);
  
  // 5. Stream AI response
  for await (const chunk of aiProvider.stream(prompt)) {
    res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
  }
  
  // 6. Record usage
  await costService.recordUsage(userId, request.operation, tokens, cost, provider, model);
}
```

---

## 6. Error Handling Standardization

### 6.1 Error Code Registry

```typescript
// src/types/error-codes.ts
export const ERROR_CODES = {
  // Authentication (AUTH-xxx)
  AUTH_INVALID_CREDENTIALS: 'AUTH-001',
  AUTH_TOKEN_EXPIRED: 'AUTH-002',
  AUTH_TOKEN_INVALID: 'AUTH-003',
  AUTH_EMAIL_ALREADY_EXISTS: 'AUTH-004',
  
  // AI (AI-xxx)
  AI_RATE_LIMIT_EXCEEDED: 'AI-001',
  AI_COST_LIMIT_REACHED: 'AI-002',
  AI_TIMEOUT: 'AI-003',
  AI_PROVIDER_ERROR: 'AI-004',
  AI_INVALID_OPERATION: 'AI-005',
  
  // Pages (PAGE-xxx)
  PAGE_NOT_FOUND: 'PAGE-001',
  PAGE_PERMISSION_DENIED: 'PAGE-002',
  PAGE_INVALID_PARENT: 'PAGE-003',
  
  // Validation (VAL-xxx)
  VALIDATION_FAILED: 'VAL-001',
  VALIDATION_INVALID_TYPE: 'VAL-002',
  
  // Server (SRV-xxx)
  INTERNAL_SERVER_ERROR: 'SRV-001',
  SERVICE_UNAVAILABLE: 'SRV-002',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

### 6.2 Typed Error Response

```typescript
// src/types/error-codes.ts (continued)
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(code: ErrorCode, message: string, details?: unknown, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode || this.getDefaultStatusCode(code);
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    if (code.startsWith('AUTH-')) return 401;
    if (code.startsWith('PAGE-')) return code === 'PAGE-001' ? 404 : 403;
    if (code.startsWith('VAL-')) return 400;
    if (code.startsWith('AI-001') || code.startsWith('AI-002')) return 429;
    if (code.startsWith('AI-')) return 502;
    return 500;
  }

  toResponse(requestId?: string): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      requestId
    };
  }
}
```

### 6.3 Usage Examples

```typescript
// BEFORE:
throw new Error(JSON.stringify({
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded',
    retryAfter: 60
  }
}));

// AFTER:
throw new AppError(
  ERROR_CODES.AI_RATE_LIMIT_EXCEEDED,
  'Rate limit exceeded. Maximum 10 requests per minute.',
  { retryAfter: 60 }
);

// BEFORE:
if (!page) {
  return res.status(404).json({ error: 'Page not found' });
}

// AFTER:
if (!page) {
  throw new AppError(
    ERROR_CODES.PAGE_NOT_FOUND,
    `Page ${pageId} not found`
  );
}
```

---

## 7. API Validation Layer

### 7.1 Zod Schemas

```typescript
// src/schemas/ai.schemas.ts
import { z } from 'zod';

export const AIRequestSchema = z.object({
  operation: z.enum([
    'summarize',
    'rewrite',
    'expand',
    'translate',
    'improveWriting',
    'fixGrammar',
    'continueWriting'
  ], {
    errorMap: () => ({ message: 'Invalid AI operation type' })
  }),
  text: z.string()
    .min(1, 'Text cannot be empty')
    .max(10000, 'Text exceeds maximum length of 10,000 characters'),
  pageId: z.string().uuid('Invalid page ID format').optional(),
  language: z.string()
    .length(2, 'Language code must be 2 characters (ISO 639-1)')
    .optional(),
  maxTokens: z.number()
    .min(100, 'Minimum 100 tokens')
    .max(4000, 'Maximum 4,000 tokens')
    .optional()
});

export const AIResponseSchema = z.object({
  text: z.string(),
  tokensUsed: z.number(),
  cost: z.number(),
  provider: z.string(),
  model: z.string()
});

// src/schemas/auth.schemas.ts
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});
```

### 7.2 Validation Middleware

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../types';
import { ERROR_CODES } from '../types/error-codes';

export function validateRequest(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(
          ERROR_CODES.VALIDATION_FAILED,
          'Request validation failed',
          {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          400
        );
      }
      next(error);
    }
  };
}

// Usage in routes:
import { validateRequest } from '../middleware/validate';
import { AIRequestSchema } from '../schemas/ai.schemas';

router.post('/ai/stream',
  authenticate,
  validateRequest(AIRequestSchema),
  aiController.stream
);
```

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
        ┌─────────┐
        │  E2E    │  5 tests  (critical user journeys)
        ├─────────┤
        │Integration│ 15 tests (API endpoints)
        ├─────────┤
        │  Unit   │ 30 tests (services, repositories)
        └─────────┘
```

### 8.2 Test Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80
      },
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/index.ts']
    }
  }
});

// test/setup.ts
import { beforeEach, afterEach, vi } from 'vitest';

// Mock database for tests
beforeEach(() => {
  vi.mock('../src/db/connection', () => ({
    db: vi.fn()
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});
```

### 8.3 First 50 Critical Tests

#### **Authentication (8 tests)**

```typescript
// test/unit/auth.service.test.ts
describe('AuthService', () => {
  test('register creates user with hashed password', async () => {
    // Arrange
    const dto = { email: 'test@example.com', username: 'testuser', password: 'Pass1234' };
    mockUserRepo.findByEmail.mockResolvedValue(undefined);
    mockUserRepo.createWithHash.mockResolvedValue({ id: '1', ...dto });

    // Act
    const result = await authService.register(dto);

    // Assert
    expect(mockUserRepo.createWithHash).toHaveBeenCalledWith(dto);
    expect(result.password).toBeUndefined(); // Password should not be returned
  });

  test('register throws error for duplicate email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: '1', email: 'test@example.com' });
    await expect(authService.register(validDto)).rejects.toThrow('AUTH-004');
  });

  test('login returns token for valid credentials', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockUserRepo.verifyPassword.mockResolvedValue(true);
    const result = await authService.login(validLogin);
    expect(result).toHaveProperty('token');
  });

  test('login throws error for invalid password', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockUserRepo.verifyPassword.mockResolvedValue(false);
    await expect(authService.login(validLogin)).rejects.toThrow('AUTH-001');
  });

  test('getMe returns user profile', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    const result = await authService.getMe('user-1');
    expect(result.email).toBe('test@example.com');
  });

  test('validateToken returns decoded token', () => {
    const token = jwt.sign({ id: '1' }, config.jwt.secret);
    const result = authService.validateToken(token);
    expect(result.id).toBe('1');
  });

  test('validateToken throws for expired token', () => {
    const expiredToken = jwt.sign({ id: '1' }, config.jwt.secret, { expiresIn: '-1h' });
    expect(() => authService.validateToken(expiredToken)).toThrow('AUTH-002');
  });

  test('validateToken throws for invalid token', () => {
    expect(() => authService.validateToken('invalid-token')).toThrow('AUTH-003');
  });
});
```

#### **AI Services (15 tests)**

```typescript
// test/unit/ai-rate-limiter.test.ts
describe('AIRateLimiter', () => {
  test('allows request under limit', async () => {
    mockAIOpRepo.countInLastMinute.mockResolvedValue(5);
    await expect(rateLimiter.check('user-1')).resolves.not.toThrow();
  });

  test('blocks request over limit', async () => {
    mockAIOpRepo.countInLastMinute.mockResolvedValue(10);
    await expect(rateLimiter.check('user-1')).rejects.toThrow('AI-001');
  });
});

// test/unit/ai-cost.service.test.ts
describe('AICostService', () => {
  test('allows usage under monthly limit', async () => {
    mockAIOpRepo.getMonthlyCost.mockResolvedValue(5.00);
    await expect(costService.checkMonthlyLimit('user-1')).resolves.not.toThrow();
  });

  test('blocks usage over monthly limit', async () => {
    mockAIOpRepo.getMonthlyCost.mockResolvedValue(15.00);
    await expect(costService.checkMonthlyLimit('user-1')).rejects.toThrow('AI-002');
  });

  test('records usage with correct data', async () => {
    await costService.recordUsage('user-1', 'summarize', 100, 0.002, 'openai', 'gpt-4o-mini');
    expect(mockAIOpRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      operation: 'summarize',
      tokens_used: 100,
      cost: 0.002
    }));
  });
});

// test/unit/ai-context.service.test.ts
describe('AIContextService', () => {
  test('gathers context from page and parent', async () => {
    mockPageRepo.findById.mockResolvedValue(mockPage);
    const context = await contextService.gatherContext('page-1', 'user-1');
    expect(context).toContain('Current Page: Test Page');
  });

  test('returns empty string for non-existent page', async () => {
    mockPageRepo.findById.mockResolvedValue(undefined);
    const context = await contextService.gatherContext('invalid', 'user-1');
    expect(context).toBe('');
  });

  test('excludes context for unauthorized user', async () => {
    mockPageRepo.findById.mockResolvedValue({ ...mockPage, user_id: 'other-user' });
    const context = await contextService.gatherContext('page-1', 'user-1');
    expect(context).toBe('');
  });
});

// test/unit/ai-prompt.service.test.ts
describe('AIPromptService', () => {
  test('builds summarize prompt', () => {
    const prompt = promptService.buildPrompt({ operation: 'summarize', text: 'test' }, '');
    expect(prompt).toContain('Summarize the following text');
  });

  test('builds translate prompt with language', () => {
    const prompt = promptService.buildPrompt({ operation: 'translate', text: 'test', language: 'zh' }, '');
    expect(prompt).toContain('Target language: zh');
  });

  test('includes context in prompt', () => {
    const context = 'Related page content';
    const prompt = promptService.buildPrompt({ operation: 'rewrite', text: 'test' }, context);
    expect(prompt).toContain(context);
  });

  test('builds prompt for all 7 operations', () => {
    const operations = ['summarize', 'rewrite', 'expand', 'translate', 'improveWriting', 'fixGrammar', 'continueWriting'];
    operations.forEach(op => {
      const prompt = promptService.buildPrompt({ operation: op as any, text: 'test' }, '');
      expect(prompt).toBeTruthy();
    });
  });
});

// test/unit/ai-history.service.test.ts
describe('AIHistoryService', () => {
  test('returns user history', async () => {
    mockAIOpRepo.getByUserId.mockResolvedValue([mockHistory]);
    const result = await historyService.getUserHistory('user-1');
    expect(result).toHaveLength(1);
  });

  test('calculates operation stats', async () => {
    mockAIOpRepo.getByUserId.mockResolvedValue([
      { tokens_used: 100, cost: 0.002 },
      { tokens_used: 200, cost: 0.004 }
    ]);
    const stats = await historyService.getOperationStats('user-1');
    expect(stats).toEqual({
      totalOperations: 2,
      totalTokens: 300,
      totalCost: 0.006
    });
  });
});

// test/integration/ai.controller.test.ts
describe('AI Controller - Stream Endpoint', () => {
  test('returns SSE format for valid request', async () => {
    const response = await request(app)
      .post('/api/v1/ai/stream')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ operation: 'summarize', text: 'Test content' });

    expect(response.headers['content-type']).toContain('text/event-stream');
  });

  test('returns 429 for rate limit exceeded', async () => {
    mockAIOpRepo.countInLastMinute.mockResolvedValue(10);
    const response = await request(app)
      .post('/api/v1/ai/stream')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ operation: 'summarize', text: 'Test' });

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('AI-001');
  });

  test('returns 400 for invalid operation', async () => {
    const response = await request(app)
      .post('/api/v1/ai/stream')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ operation: 'invalid', text: 'Test' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VAL-001');
  });
});
```

#### **Repositories (12 tests)**

```typescript
// test/unit/user.repository.test.ts
describe('UserRepository', () => {
  test('findByEmail returns user', async () => {
    mockDb.mockResolvedValue([{ id: '1', email: 'test@example.com' }]);
    const user = await userRepo.findByEmail('test@example.com');
    expect(user?.email).toBe('test@example.com');
  });

  test('createWithHash hashes password', async () => {
    const result = await userRepo.createWithHash(validDto);
    expect(result.password).not.toBe(validDto.password);
    expect(result.password.length).toBeGreaterThan(20); // bcrypt hash length
  });

  test('verifyPassword returns true for correct password', async () => {
    const isValid = await userRepo.verifyPassword(mockUser, 'correct-password');
    expect(isValid).toBe(true);
  });
});

// test/unit/page.repository.test.ts
describe('PageRepository', () => {
  test('getTreeByUserId returns hierarchical structure', async () => {
    mockDb.mockResolvedValue([mockPage]);
    const tree = await pageRepo.getTreeByUserId('user-1');
    expect(Array.isArray(tree)).toBe(true);
  });

  test('getSiblings returns pages with same parent', async () => {
    mockDb.mockResolvedValue([mockPage]);
    const siblings = await pageRepo.getSiblings('page-1', 3);
    expect(siblings.length).toBeLessThanOrEqual(3);
  });
});

// test/unit/ai-operation.repository.test.ts
describe('AIOperationRepository', () => {
  test('getMonthlyCost returns sum', async () => {
    mockDb.mockResolvedValue([{ total: '5.50' }]);
    const cost = await aiOpRepo.getMonthlyCost('user-1', 4, 2026);
    expect(cost).toBe(5.50);
  });

  test('countInLastMinute returns count', async () => {
    mockDb.mockResolvedValue([{ count: '7' }]);
    const count = await aiOpRepo.countInLastMinute('user-1');
    expect(count).toBe(7);
  });
});
```

#### **Validation Middleware (5 tests)**

```typescript
// test/unit/validate.middleware.test.ts
describe('validateRequest middleware', () => {
  test('passes valid request', () => {
    const req = { body: { email: 'test@example.com', password: 'Pass1234' } };
    const next = vi.fn();
    validateRequest(LoginSchema)(req as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  test('rejects invalid email', () => {
    const req = { body: { email: 'invalid', password: 'Pass1234' } };
    expect(() => validateRequest(LoginSchema)(req as any, {} as any, vi.fn())).toThrow('VAL-001');
  });

  test('returns validation errors in response', () => {
    const req = { body: { email: '', password: '' } };
    try {
      validateRequest(LoginSchema)(req as any, {} as any, vi.fn());
    } catch (error) {
      expect(error.details.errors).toHaveLength(2);
    }
  });
});
```

---

## 9. Migration Plan

### 9.1 Week 1: Foundation (Days 1-5)

**Day 1-2: Testing Infrastructure**
- [ ] Install Vitest: `npm install -D vitest @vitest/coverage-v8`
- [ ] Create `vitest.config.ts`
- [ ] Create `test/setup.ts`
- [ ] Write 5 auth service tests
- [ ] Verify test runner works

**Day 3-4: Repository Pattern**
- [ ] Create `base.repository.ts`
- [ ] Create `user.repository.ts`
- [ ] Create `page.repository.ts`
- [ ] Write 3 repository unit tests

**Day 5: Auth Service Refactoring**
- [ ] Refactor `auth.service.ts` to use `UserRepository`
- [ ] Ensure all existing auth tests pass
- [ ] Commit: `refactor: introduce repository pattern for auth`

### 9.2 Week 2: AI Services (Days 6-10)

**Day 6-7: AI Service Decomposition**
- [ ] Create 5 AI service files
- [ ] Move logic from `ai.service.ts` to new files
- [ ] Delete old `ai.service.ts`
- [ ] Write 8 AI service unit tests

**Day 8-9: AI Repository**
- [ ] Create `ai-operation.repository.ts`
- [ ] Refactor AI services to use repository
- [ ] Write 4 AI repository tests

**Day 10: AI Controller Integration**
- [ ] Update `ai.controller.ts` to use new services
- [ ] Write 3 AI controller integration tests
- [ ] Commit: `refactor: decompose AI service into focused modules`

### 9.3 Week 3: Validation & Polish (Days 11-15)

**Day 11-12: Error Handling**
- [ ] Create `error-codes.ts`
- [ ] Update `AppError` class
- [ ] Refactor all controllers to use error codes
- [ ] Write 5 error handling tests

**Day 13-14: API Validation**
- [ ] Create Zod schemas for all endpoints
- [ ] Add `validateRequest` middleware to routes
- [ ] Write 5 validation middleware tests

**Day 15: Documentation & Cleanup**
- [ ] Update API documentation
- [ ] Run full test suite (target: 50 tests passing)
- [ ] Generate coverage report
- [ ] Commit: `feat: add API validation and error codes`

### 9.4 Rollback Strategy

**If issues arise:**
1. All changes are backward compatible (no API breaks)
2. Each day has a commit point that can be reverted
3. Original files are preserved until new code passes tests
4. Feature flags can disable new validation layer if needed

---

## 10. Success Metrics

### 10.1 Quantitative Metrics

| Metric | Before | After (Target) | Measurement |
|--------|--------|----------------|-------------|
| Test Coverage | 0% | 80% | `npm run test:coverage` |
| Test Count | 0 | 50 | `npm test` |
| Service File Size (AI) | 308 lines | Max 80 lines | `wc -l src/services/ai/*.ts` |
| Error Code Consistency | 0% | 100% | Code review |
| Request Validation | 0% | 100% | All endpoints use Zod |

### 10.2 Qualitative Metrics

- [ ] New developer can understand architecture in <30 minutes
- [ ] Adding new CRUD endpoint takes <1 hour
- [ ] Mocking database for tests is straightforward
- [ ] Error messages are actionable and consistent
- [ ] Code review process is faster (clearer boundaries)

---

## 11. Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Refactoring introduces bugs | Medium | High | Comprehensive test suite, incremental commits |
| Timeline extends beyond 3 weeks | Low | Medium | Scope reduction: defer non-critical services |
| Performance regression | Low | High | Benchmark before/after, profile hot paths |
| Team resistance to new patterns | Low | Medium | Code review sessions, documentation, examples |

---

## 12. Future Enhancements (Post-v0.7.0)

These items are **out of scope** for this refactoring but should be considered for future versions:

1. **Caching Layer** - Redis cache for frequently accessed pages
2. **Database Indexing** - Optimize slow queries identified in profiling
3. **API Versioning** - `/api/v2/` with breaking changes
4. **GraphQL Support** - Alternative to REST for complex queries
5. **Event Sourcing** - For collaboration features (real-time sync)
6. **Microservices Split** - Separate AI service into independent microservice

---

## 13. Appendix

### 13.1 Code Standards

- **Naming:** `PascalCase` for classes, `camelCase` for functions/variables
- **Files:** One class per file, named after the class (e.g., `UserRepository` → `user.repository.ts`)
- **Imports:** Group by external → internal → relative, alphabetized within groups
- **Error Handling:** Always use `AppError`, never throw raw `Error`

### 13.2 Git Commit Convention

```
refactor: introduce repository pattern for auth
refactor: decompose AI service into 5 focused modules
feat: add API validation with Zod schemas
test: add 50 unit and integration tests
docs: update architecture documentation
```

### 13.3 References

- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

**Document Status:** ✅ Approved for Implementation  
**Next Step:** Invoke `writing-plans` skill to create detailed implementation plan  
**Target Version:** v0.7.0  
**Estimated Completion:** 3 weeks from start date
