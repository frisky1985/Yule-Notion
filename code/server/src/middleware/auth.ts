/**
 * JWT 鉴权中间件
 *
 * 从请求头 Authorization: Bearer <token> 中提取 JWT，
 * 验证并解码后将用户信息挂载到 req.user 上。
 *
 * 如果 token 缺失或无效，返回 401 错误。
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError, ErrorCode } from '../types';
import type { JwtPayload } from '../types';

/**
 * JWT 鉴权中间件
 *
 * 处理流程：
 * 1. 从 Authorization 请求头提取 Bearer Token
 * 2. 使用 JWT_SECRET 验证 token 有效性
 * 3. 将解码后的用户信息（userId, email）挂载到 req.user
 * 4. 如果验证失败，返回 401 UNAUTHORIZED
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. 获取 Authorization 请求头
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next(new AppError(ErrorCode.UNAUTHORIZED, '未提供认证令牌'));
    return;
  }

  // 2. 解析 Bearer Token 格式
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next(new AppError(ErrorCode.UNAUTHORIZED, '认证令牌格式错误，请使用 Bearer Token'));
    return;
  }

  const token = parts[1];

  // 3. 验证并解码 JWT
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(ErrorCode.TOKEN_EXPIRED, '认证令牌已过期'));
      return;
    }
    next(new AppError(ErrorCode.UNAUTHORIZED, '认证令牌无效'));
  }
}
