/**
 * Express 应用配置
 *
 * 创建和配置 Express 应用实例。
 * 所有中间件和路由在此注册。
 * 入口文件（index.ts）负责启动 HTTP 服务器监听。
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { createAuthRouter } from './routes/auth.routes';

// ============================================================
// 日志配置
// ============================================================

/**
 * Pino 日志实例
 *
 * 开发环境使用 pino-pretty 进行美化输出。
 * 生产环境使用标准 JSON 格式，方便日志采集系统解析。
 */
export const logger = pino({
  level: config.isDev ? 'debug' : 'info',
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * HTTP 请求日志中间件
 * 使用 pino-http 自动记录每个请求的日志
 */
const httpLogger = pinoHttp({ logger });

// ============================================================
// Express 应用
// ============================================================

/**
 * 创建 Express 应用
 *
 * 中间件注册顺序（从外到内）：
 * 1. helmet — 安全头
 * 2. cors — 跨域
 * 3. express.json — JSON 请求体解析
 * 4. rateLimit — 请求频率限制
 * 5. httpLogger — 请求日志
 * 6. 路由 — 业务路由
 * 7. errorHandler — 全局错误处理（必须在最后）
 */
export const app = express();

// 1. 安全头中间件
// helmet 默认配置已覆盖大多数安全最佳实践
app.use(helmet());

// 2. CORS 跨域配置
// 开发环境允许所有来源，生产环境通过 config 中的 allowedOrigins 白名单控制
app.use(cors({
  origin: config.isDev ? true : config.allowedOrigins,
  credentials: true,
}));

// 3. JSON 请求体解析
// 限制请求体大小为 10MB（图片上传需要更大的 body）
app.use(express.json({ limit: '10mb' }));

// 4. 请求频率限制
// 全局限制：每个 IP 每 15 分钟最多 100 次请求
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求频率超限，请稍后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 5. HTTP 请求日志
app.use(httpLogger);

// 6. 健康检查端点（不需要认证）
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 7. 业务路由
app.use('/api/v1/auth', createAuthRouter());

// 8. 404 处理（未匹配到任何路由）
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: '请求的资源不存在',
    },
  });
});

// 9. 全局错误处理中间件（必须在所有路由之后）
app.use(errorHandler);
