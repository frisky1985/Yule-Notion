/**
 * 环境变量配置
 *
 * 使用 Zod 对环境变量进行类型安全的解析和验证。
 * 缺失的环境变量将使用默认值，确保开发环境可以开箱即用。
 */

import { z } from 'zod';

/**
 * 环境变量 Schema 定义
 *
 * 使用 zod 进行解析，提供类型推断和运行时校验。
 * 所有字段都有默认值，方便本地开发。
 */
const envSchema = z.object({
  /** 服务监听端口 */
  PORT: z.coerce.number().default(3000),

  /** 运行环境：development | production | test */
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  /** PostgreSQL 数据库连接字符串 */
  DATABASE_URL: z.string().default('postgresql://yule:password@localhost:5432/yule'),

  /** JWT 签名密钥（生产环境必须通过环境变量设置，至少 32 字符） */
  JWT_SECRET: z.string().default('dev-secret-change-me'),

  /** JWT 过期时间 */
  JWT_EXPIRES_IN: z.string().default('7d'),

  /** CORS 允许的来源域名（逗号分隔，生产环境必填） */
  ALLOWED_ORIGINS: z.string().optional(),
});

/**
 * 解析并验证环境变量
 *
 * zod 的 parse 方法会在运行时校验所有值，确保类型安全。
 * process.env 中的值都是 string，需要先进行类型转换。
 */
const env = envSchema.parse(process.env);

/**
 * 生产环境安全校验
 * 强制要求：
 * 1. JWT_SECRET 必须由环境变量设置，且至少 32 字符
 * 2. ALLOWED_ORIGINS 必须配置，禁止使用宽松的 CORS 策略
 */
if (env.NODE_ENV === 'production') {
  if (
    env.JWT_SECRET === 'dev-secret-change-me' ||
    env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      '🚨 安全错误：生产环境必须设置 JWT_SECRET 环境变量且至少 32 个字符，不能使用默认值'
    );
  }

  if (!env.ALLOWED_ORIGINS) {
    throw new Error(
      '🚨 安全错误：生产环境必须设置 ALLOWED_ORIGINS 环境变量（逗号分隔的域名白名单）'
    );
  }
}

/**
 * 应用配置对象（类型安全的最终配置）
 */
export const config = {
  /** 服务端口 */
  port: env.PORT,

  /** 运行环境 */
  nodeEnv: env.NODE_ENV,

  /** 是否为开发环境 */
  isDev: env.NODE_ENV === 'development',

  /** 是否为测试环境 */
  isTest: env.NODE_ENV === 'test',

  /** 数据库连接字符串 */
  databaseUrl: env.DATABASE_URL,

  /** JWT 配置 */
  jwt: {
    /** 签名密钥 */
    secret: env.JWT_SECRET,
    /** 过期时间（如 '7d', '1h'） */
    expiresIn: env.JWT_EXPIRES_IN as string,
  },

  /** CORS 允许的来源域名（生产环境必填） */
  allowedOrigins: env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : undefined,
} as const;

export type AppConfig = typeof config;
