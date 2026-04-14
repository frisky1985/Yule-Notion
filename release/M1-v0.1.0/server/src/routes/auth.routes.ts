/**
 * 认证路由
 *
 * 定义 /api/v1/auth 下的所有路由。
 * 包含注册、登录、获取当前用户三个接口。
 *
 * 路由 → 验证中间件 → 控制器 → 服务层 → 数据库
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';

/**
 * 创建认证路由
 * @returns Express Router 实例
 */
export function createAuthRouter(): Router {
  const router = Router();

  // ============================================================
  // Zod 验证 Schema
  // ============================================================

  /**
   * 注册请求体验证 Schema
   *
   * 规则（与 API-SPEC.md 保持一致）：
   * - email: 合法邮箱格式，最长 254 字符
   * - password: 至少 8 字符，含大小写字母和数字
   * - name: 1-50 字符
   */
  const registerSchema = z.object({
    email: z
      .string()
      .email('请输入有效的邮箱地址')
      .max(254, '邮箱长度不能超过 254 个字符'),
    password: z
      .string()
      .min(8, '密码长度不能少于 8 个字符')
      .regex(/[a-z]/, '密码必须包含小写字母')
      .regex(/[A-Z]/, '密码必须包含大写字母')
      .regex(/[0-9]/, '密码必须包含数字'),
    name: z
      .string()
      .min(1, '用户名不能为空')
      .max(50, '用户名长度不能超过 50 个字符'),
  });

  /**
   * 登录请求体验证 Schema
   *
   * 规则：
   * - email: 合法邮箱格式
   * - password: 非空
   */
  const loginSchema = z.object({
    email: z
      .string()
      .email('请输入有效的邮箱地址'),
    password: z
      .string()
      .min(1, '密码不能为空'),
  });

  // ============================================================
  // 路由定义
  // ============================================================

  /**
   * POST /api/v1/auth/register — 用户注册
   * 无需认证
   * 请求体经过 registerSchema 验证
   */
  router.post(
    '/register',
    validate(registerSchema),
    authController.register
  );

  /**
   * POST /api/v1/auth/login — 用户登录
   * 无需认证
   * 请求体经过 loginSchema 验证
   */
  router.post(
    '/login',
    validate(loginSchema),
    authController.login
  );

  /**
   * GET /api/v1/auth/me — 获取当前用户信息
   * 需要 Bearer Token 认证
   */
  router.get(
    '/me',
    authMiddleware,
    authController.me
  );

  return router;
}
