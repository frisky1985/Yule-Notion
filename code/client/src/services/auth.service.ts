/* ===================================================
 * 认证相关 API 服务
 *
 * 封装所有与认证相关的 HTTP 请求：
 * - 登录
 * - 注册
 * - 获取当前用户信息
 * =================================================== */

import api from './api'
import type {
  LoginParams,
  RegisterParams,
  AuthResponse,
  User,
} from '@/types'

/**
 * 用户登录
 * @param params - 登录参数（邮箱 + 密码）
 * @returns 认证响应（token + user）
 */
export async function loginApi(params: LoginParams): Promise<AuthResponse> {
  const { data } = await api.post<{ data: AuthResponse }>('/auth/login', params)
  return data.data  // 解构后端 { data: { token, user } } 包装层
}

/**
 * 用户注册
 * @param params - 注册参数（邮箱 + 密码 + 用户名）
 * @returns 认证响应（注册成功后自动登录，返回 token + user）
 */
export async function registerApi(params: RegisterParams): Promise<AuthResponse> {
  const { data } = await api.post<{ data: AuthResponse }>('/auth/register', params)
  return data.data  // 解构后端 { data: { token, user } } 包装层
}

/**
 * 获取当前用户信息
 * @returns 用户信息
 */
export async function fetchMeApi(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/auth/me')
  return data.data  // 解构后端 { data: { id, email, ... } } 包装层
}
