/* ===================================================
 * Pinia 认证状态管理
 *
 * 使用 Composition API 风格（setup 语法）的 defineStore
 *
 * 功能：
 * - 管理用户登录状态（token + user）
 * - login / register / logout / fetchMe
 * - token 持久化到 localStorage
 * - 自动恢复登录态
 * =================================================== */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import {
  loginApi,
  registerApi,
  fetchMeApi,
} from '@/services/auth.service'
import type { User } from '@/types'

/** localStorage 中存储 token 的 key */
const TOKEN_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  // ===== 依赖注入（延迟获取，避免循环依赖） =====
  let router: ReturnType<typeof useRouter> | null = null

  // ===== 响应式状态 =====

  /** JWT 访问令牌 */
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  /** 当前登录用户信息 */
  const user = ref<User | null>(null)

  // ===== 计算属性 =====

  /** 是否已登录（有 token 且有用户信息） */
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // ===== 内部辅助方法 =====

  /**
   * 确保 router 实例可用
   * 在 setup 函数之外调用 actions 时需要获取 router
   */
  function ensureRouter() {
    if (!router) {
      router = useRouter()
    }
    return router
  }

  /**
   * 持久化 token 到 localStorage
   */
  function saveToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  /**
   * 清除本地认证信息
   */
  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  // ===== Actions =====

  /**
   * 用户登录
   * @param email - 邮箱
   * @param password - 密码
   */
  async function login(email: string, password: string): Promise<void> {
    const res = await loginApi({ email, password })
    saveToken(res.token)
    user.value = res.user
  }

  /**
   * 用户注册
   * 注册成功后自动保存登录态
   * @param email - 邮箱
   * @param password - 密码
   * @param name - 用户名
   */
  async function register(email: string, password: string, name: string): Promise<void> {
    const res = await registerApi({ email, password, name })
    saveToken(res.token)
    user.value = res.user
  }

  /**
   * 退出登录
   * 清除认证信息并跳转到登录页
   */
  function logout(): void {
    clearAuth()
    const r = ensureRouter()
    r.push('/login')
  }

  /**
   * 获取当前用户信息
   * 用于应用启动时恢复登录态
   * 如果 token 无效（401），会自动清除认证信息
   */
  async function fetchMe(): Promise<void> {
    try {
      const currentUser = await fetchMeApi()
      user.value = currentUser
    } catch {
      // token 无效，清除认证信息
      clearAuth()
    }
  }

  // 返回所有需要暴露的状态和方法
  return {
    // 状态
    token,
    user,
    // 计算属性
    isLoggedIn,
    // 方法
    login,
    register,
    logout,
    fetchMe,
  }
})
