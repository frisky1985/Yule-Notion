/**
 * 认证服务（业务逻辑层）
 *
 * 处理用户注册、登录、获取当前用户等核心业务逻辑。
 * 该层负责：
 * - 数据库操作
 * - 密码加密/验证
 * - JWT Token 生成
 * - 数据格式转换（数据库行 → API 响应格式）
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection';
import { config } from '../config';
import { AppError, ErrorCode } from '../types';
import type { UserRow, SafeUser, AuthResponse, JwtPayload } from '../types';

/** bcrypt 加密轮数 */
const SALT_ROUNDS = 10;

/**
 * 将数据库行转换为安全的 API 输出格式
 * 去除 password_hash 等敏感字段，并将 snake_case 转为 camelCase
 *
 * @param row - 数据库用户行
 * @returns 安全的用户输出对象
 */
function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  };
}

/**
 * 生成 JWT Token
 *
 * @param payload - 要编码到 token 中的用户信息
 * @returns JWT Token 字符串
 */
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * 用户注册
 *
 * 处理流程：
 * 1. 检查邮箱是否已注册
 * 2. 使用 bcrypt 加密密码
 * 3. 插入用户记录到数据库
 * 4. 生成 JWT Token
 * 5. 返回 token 和用户信息
 *
 * @param email - 用户邮箱
 * @param password - 用户密码（明文）
 * @param name - 用户显示名
 * @returns 认证响应（token + user）
 * @throws AppError EMAIL_ALREADY_EXISTS — 邮箱已被注册
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  // 1. 检查邮箱是否已存在
  const existingUser = await db('users').where({ email }).first();
  if (existingUser) {
    throw new AppError(ErrorCode.EMAIL_ALREADY_EXISTS, '该邮箱已被注册');
  }

  // 2. 加密密码
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. 插入用户记录
  const newUser: UserRow = await db('users')
    .insert({
      email,
      password_hash: passwordHash,
      name,
    })
    .returning('*')
    .then((rows: UserRow[]) => rows[0]!);

  // 4. 生成 JWT
  const payload: JwtPayload = { userId: newUser.id, email: newUser.email };
  const token = generateToken(payload);

  // 5. 返回响应
  return {
    token,
    user: toSafeUser(newUser),
  };
}

/**
 * 用户登录
 *
 * 处理流程：
 * 1. 根据邮箱查找用户
 * 2. 使用 bcrypt 验证密码
 * 3. 生成 JWT Token
 * 4. 返回 token 和用户信息
 *
 * @param email - 用户邮箱
 * @param password - 用户密码（明文）
 * @returns 认证响应（token + user）
 * @throws AppError INVALID_CREDENTIALS — 邮箱或密码错误
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  // 1. 查找用户（包含 password_hash）
  const user: UserRow | undefined = await db('users')
    .where({ email })
    .first();

  // 注意：即使邮箱不存在也返回相同的错误信息，防止用户枚举攻击
  if (!user) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS, '邮箱或密码错误');
  }

  // 2. 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS, '邮箱或密码错误');
  }

  // 3. 生成 JWT
  const payload: JwtPayload = { userId: user.id, email: user.email };
  const token = generateToken(payload);

  // 4. 返回响应
  return {
    token,
    user: toSafeUser(user),
  };
}

/**
 * 获取当前用户信息
 *
 * 通过 JWT 中解析的 userId 查询用户完整信息。
 * 只返回安全字段，不包含密码等敏感信息。
 *
 * @param userId - 用户 UUID
 * @returns 安全的用户信息
 * @throws AppError RESOURCE_NOT_FOUND — 用户不存在
 */
export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user: UserRow | undefined = await db('users')
    .where({ id: userId })
    .first();

  if (!user) {
    throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, '用户不存在');
  }

  return toSafeUser(user);
}
