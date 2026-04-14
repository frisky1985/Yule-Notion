/**
 * 认证控制器
 *
 * 控制器层负责处理 HTTP 请求和响应。
 * 业务逻辑委托给 auth.service.ts，控制器只做：
 * - 从请求中提取参数
 * - 调用对应的 Service 方法
 * - 格式化 HTTP 响应
 *
 * 错误处理由全局 errorHandler 中间件统一处理。
 */

import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import type { RegisterBody, LoginBody } from '../types';

/**
 * 用户注册
 *
 * POST /api/v1/auth/register
 *
 * @param req - Express 请求对象（body: RegisterBody）
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件（错误传递）
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body as RegisterBody;

    const result = await authService.register(email, password, name);

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * 用户登录
 *
 * POST /api/v1/auth/login
 *
 * @param req - Express 请求对象（body: LoginBody）
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件（错误传递）
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginBody;

    const result = await authService.login(email, password);

    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取当前用户信息
 *
 * GET /api/v1/auth/me
 *
 * 需要认证（Bearer Token），req.user 由 auth 中间件注入。
 *
 * @param req - Express 请求对象（user 由 auth 中间件注入）
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件（错误传递）
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.user 由 authMiddleware 注入，确保已认证
    const userId = req.user!.userId;

    const user = await authService.getCurrentUser(userId);

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}
