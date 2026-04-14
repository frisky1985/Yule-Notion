/**
 * 全局错误处理中间件
 *
 * Express 统一错误处理中间件，确保所有错误都以一致的格式返回给客户端。
 *
 * 处理两种错误类型：
 * 1. AppError — 业务层主动抛出的已知错误
 * 2. Error — 未预期的服务端异常
 *
 * 生产环境下不暴露内部错误详情，防止信息泄露。
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../types';
import type { ErrorResponse } from '../types';
import { logger } from '../app';

/**
 * 全局错误处理中间件
 *
 * 注意：Express 要求中间件函数签名为 4 个参数才能被识别为错误处理中间件。
 *
 * @param err - 捕获到的错误对象
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param _next - 下一个中间件（此处不调用，因为错误已被处理）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // 记录错误日志
  logger.error({
    err,
    path: req.path,
    method: req.method,
    message: err.message,
  }, '请求处理出错');

  if (err instanceof AppError) {
    // 已知的业务错误：使用错误码中定义的 HTTP 状态码
    const statusCode = err.statusCode;
    const body: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // 如果有附加详情，一并返回
    if (err.details !== undefined) {
      body.error.details = err.details;
    }

    res.status(statusCode).json(body);
    return;
  }

  // 未知错误：返回 500，生产环境隐藏具体错误信息
  const isDev = process.env.NODE_ENV === 'development';
  const body: ErrorResponse = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: isDev ? err.message : '服务端内部错误',
    },
  };

  res.status(500).json(body);
}
