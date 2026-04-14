/* ===================================================
 * Axios 实例 + 请求/响应拦截器
 *
 * 规范：
 * - baseURL: '/api/v1'
 * - 请求拦截：自动注入 Bearer token
 * - 响应拦截：401 时清除认证信息并跳转登录
 * - timeout: 15000ms
 * =================================================== */

import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

/** Axios 实例 */
const api = axios.create({
  // 基础路径（开发时通过 Vite proxy 转发到 localhost:3000）
  baseURL: '/api/v1',
  // 请求超时 15 秒
  timeout: 15000,
  // 请求头
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器
 * - 在请求头中自动注入 Authorization: Bearer <token>
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  },
)

/**
 * 响应拦截器
 * - 401 未授权时：清除本地 token 并跳转到登录页
 * - 其他错误统一处理
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 清除本地认证信息
      localStorage.removeItem('auth_token')
      // 避免在登录页循环跳转
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
