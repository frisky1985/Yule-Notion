/**
 * TypeScript 类型定义
 *
 * 定义项目中使用的通用类型、接口和枚举。
 * 所有模块共享的类型统一在此文件中定义。
 */

// ============================================================
// 用户相关类型
// ============================================================

/**
 * 用户实体（数据库中的完整记录）
 * 包含所有字段，包括敏感的 password_hash
 */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 用户安全输出（API 响应中返回的用户信息）
 * 不包含 password_hash 等敏感字段
 */
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * 认证响应中的用户数据（含 token）
 */
export interface AuthResponse {
  token: string;
  user: SafeUser;
}

// ============================================================
// 请求体类型
// ============================================================

/**
 * 注册请求体
 */
export interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

/**
 * 登录请求体
 */
export interface LoginBody {
  email: string;
  password: string;
}

// ============================================================
// JWT Payload 类型
// ============================================================

/**
 * JWT Token 中携带的用户信息
 */
export interface JwtPayload {
  userId: string;
  email: string;
}

// ============================================================
// 错误码枚举
// ============================================================

/**
 * 统一错误码定义
 *
 * 与 API-SPEC.md 中 1.4 错误码枚举保持一致。
 * 前缀为 HTTP 状态码暗示，但错误码本身是字符串标识。
 */
export enum ErrorCode {
  /** 请求参数校验失败 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 未提供 Token 或 Token 无效 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** Token 已过期 */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** 无权访问此资源 */
  FORBIDDEN = 'FORBIDDEN',
  /** 资源不存在 */
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  /** 邮箱已被注册 */
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  /** 邮箱或密码错误 */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** 文件超过 5MB */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  /** 不支持的文件类型 */
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  /** 同步冲突 */
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  /** 请求频率超限 */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  /** 服务端内部错误 */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * 错误码到 HTTP 状态码的映射
 */
export const errorStatusMap: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.UNSUPPORTED_FILE_TYPE]: 422,
  [ErrorCode.SYNC_CONFLICT]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

// ============================================================
// 统一错误格式
// ============================================================

/**
 * API 错误响应格式
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * 自定义应用错误类
 *
 * 所有业务层抛出的错误都应使用此类型，
 * 以便全局错误处理中间件统一处理。
 */
export class AppError extends Error {
  /** 错误码 */
  public readonly code: ErrorCode;
  /** HTTP 状态码 */
  public readonly statusCode: number;
  /** 可选的附加错误详情 */
  public readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = errorStatusMap[code];
    this.details = details;
  }
}

// ============================================================
// AI 相关类型
// ============================================================

/**
 * AI 操作类型
 */
export type AIOperationType = 
  | 'summarize'
  | 'rewrite'
  | 'expand'
  | 'translate'
  | 'improveWriting'
  | 'fixGrammar'
  | 'continueWriting';

/**
 * AI 请求接口
 */
export interface AIRequest {
  operation: AIOperationType;
  text: string;
  pageId?: string;
  language?: string; // for translate
  maxTokens?: number;
}

/**
 * AI 响应接口
 */
export interface AIResponse {
  text: string;
  tokensUsed: number;
  cost: number;
  provider: string;
  model: string;
}

/**
 * AI 错误响应接口
 */
export interface AIErrorResponse {
  error: {
    code: 'RATE_LIMIT_EXCEEDED' | 'COST_LIMIT_REACHED' | 'AI_TIMEOUT' | 'INVALID_REQUEST' | 'API_KEY_MISSING';
    message: string;
    retryAfter?: number;
  };
}

/**
 * AI 操作记录接口
 */
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

// ============================================================
// Express 扩展类型
// ============================================================

import type { Request } from 'express';

/**
 * 扩展 Express Request 类型，在 auth 中间件中注入当前用户信息
 */
declare global {
  namespace Express {
    interface Request {
      /** 当前已认证的用户信息（由 auth 中间件注入） */
      user?: JwtPayload;
    }
  }
}
