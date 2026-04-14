/**
 * Zod 请求验证中间件
 *
 * 通用的请求体验证中间件工厂函数。
 * 使用 Zod Schema 验证请求体，验证失败时自动返回 400 VALIDATION_ERROR。
 *
 * 用法：
 *   router.post('/register', validate(registerSchema), controller.register);
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../types';

/**
 * 创建请求体验证中间件
 *
 * @param schema - Zod 验证 Schema
 * @returns Express 中间件函数
 *
 * @example
 * ```typescript
 * const createUserSchema = z.object({
 *   email: z.string().email().max(254),
 *   name: z.string().min(1).max(50),
 * });
 *
 * router.post('/users', validate(createUserSchema), userController.create);
 * ```
 */
export function validate<T>(schema: { parse: (data: unknown) => T }): RequestHandler {
  /**
   * 验证中间件
   *
   * 处理流程：
   * 1. 调用 schema.parse() 验证 req.body
   * 2. 验证成功：将解析后的数据覆盖 req.body，继续处理
   * 3. 验证失败（ZodError）：提取字段级错误信息，返回 400
   *
   * @param req - Express 请求对象
   * @param _res - Express 响应对象
   * @param next - 下一个中间件
   */
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // 使用 schema.parse() 进行严格验证
      // 验证成功后，将经过 Zod 转换和验证的数据重新赋值给 req.body
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // 将 Zod 验证错误转换为用户友好的格式
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        next(
          new AppError(
            ErrorCode.VALIDATION_ERROR,
            '请求参数校验失败',
            details
          )
        );
        return;
      }
      // 非 Zod 错误，继续传递
      next(err);
    }
  };
}
