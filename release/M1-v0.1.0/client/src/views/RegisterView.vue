<!-- ===================================================
     RegisterView — 注册页面

     功能：
     - 邮箱 + 密码 + 确认密码 + 用户名 注册表单
     - 表单验证（邮箱格式、密码强度、两次密码一致、用户名长度）
     - 注册成功后自动登录并跳转 /dashboard
     - 错误提示（AppAlert 组件）
     - "已有账号？去登录" 链接
     =================================================== -->

<script setup lang="ts">
/**
 * 注册页面
 * 使用 Composition API + TypeScript
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppAlert from '@/components/common/AppAlert.vue'
import type { AlertMessage } from '@/types'

/** 路由实例 */
const router = useRouter()

/** 认证状态 */
const authStore = useAuthStore()

/** 是否正在提交 */
const loading = ref(false)

/** 提示消息列表 */
const alerts = ref<AlertMessage[]>([])

/** 自增消息 ID */
let alertIdCounter = 0

/** 表单数据 */
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

/** 表单验证错误 */
const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

/**
 * 添加提示消息
 * @param type - 消息类型
 * @param text - 消息内容
 */
function addAlert(type: AlertMessage['type'], text: string) {
  const id = ++alertIdCounter
  alerts.value.push({ type, text, id })
}

/**
 * 移除指定提示消息
 * @param id - 消息唯一标识
 */
function dismissAlert(id: number) {
  alerts.value = alerts.value.filter((a) => a.id !== id)
}

/**
 * 验证邮箱格式
 * @param email - 邮箱地址
 * @returns 是否有效
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 验证密码强度
 * 至少 8 字符，包含大小写字母和数字
 * @param password - 密码
 * @returns 是否满足强度要求
 */
function isValidPassword(password: string): boolean {
  // 至少 8 字符
  if (password.length < 8) return false
  // 包含大写字母
  if (!/[A-Z]/.test(password)) return false
  // 包含小写字母
  if (!/[a-z]/.test(password)) return false
  // 包含数字
  if (!/[0-9]/.test(password)) return false
  return true
}

/**
 * 表单验证
 * @returns 是否通过验证
 */
function validate(): boolean {
  let valid = true

  // 清除之前的错误
  errors.name = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''

  // 验证用户名
  if (!form.name.trim()) {
    errors.name = '请输入用户名'
    valid = false
  } else if (form.name.trim().length < 1 || form.name.trim().length > 50) {
    errors.name = '用户名长度应为 1-50 个字符'
    valid = false
  }

  // 验证邮箱
  if (!form.email.trim()) {
    errors.email = '请输入邮箱地址'
    valid = false
  } else if (!isValidEmail(form.email)) {
    errors.email = '请输入有效的邮箱地址'
    valid = false
  }

  // 验证密码
  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (!isValidPassword(form.password)) {
    errors.password = '密码至少 8 字符，需包含大小写字母和数字'
    valid = false
  }

  // 验证确认密码
  if (!form.confirmPassword) {
    errors.confirmPassword = '请再次输入密码'
    valid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    valid = false
  }

  return valid
}

/**
 * 提交注册表单
 */
async function handleSubmit() {
  // 表单验证
  if (!validate()) return

  loading.value = true

  try {
    // 调用注册 API（注册成功后自动登录）
    await authStore.register(form.email.trim(), form.password, form.name.trim())

    // 注册成功，显示提示
    addAlert('success', '注册成功！欢迎加入予乐 Notion')

    // 跳转到仪表盘
    router.push('/dashboard')
  } catch (err: any) {
    // 注册失败，显示错误信息
    const message =
      err.response?.data?.error?.message || err.message || '注册失败，请稍后重试'
    addAlert('error', message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <!-- 提示消息 -->
    <AppAlert :alerts="alerts" @dismiss="dismissAlert" />

    <!-- 注册卡片 -->
    <div class="auth-card">
      <!-- Logo / 标题 -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">
          予乐 Yule Notion
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          创建你的笔记本账号
        </p>
      </div>

      <!-- 注册表单 -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 用户名输入框 -->
        <div>
          <label
            for="name"
            class="block text-sm font-medium text-gray-700 mb-1.5"
          >
            用户名
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="你的名字"
            autocomplete="name"
            maxlength="50"
            class="input-base"
            :class="{
              'border-red-400 focus:border-red-400 focus:ring-red-400/20': errors.name,
            }"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-red-500">
            {{ errors.name }}
          </p>
        </div>

        <!-- 邮箱输入框 -->
        <div>
          <label
            for="email"
            class="block text-sm font-medium text-gray-700 mb-1.5"
          >
            邮箱地址
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="your@email.com"
            autocomplete="email"
            class="input-base"
            :class="{
              'border-red-400 focus:border-red-400 focus:ring-red-400/20': errors.email,
            }"
          />
          <p v-if="errors.email" class="mt-1 text-xs text-red-500">
            {{ errors.email }}
          </p>
        </div>

        <!-- 密码输入框 -->
        <div>
          <label
            for="password"
            class="block text-sm font-medium text-gray-700 mb-1.5"
          >
            密码
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="至少 8 字符，含大小写字母和数字"
            autocomplete="new-password"
            class="input-base"
            :class="{
              'border-red-400 focus:border-red-400 focus:ring-red-400/20': errors.password,
            }"
          />
          <p v-if="errors.password" class="mt-1 text-xs text-red-500">
            {{ errors.password }}
          </p>
        </div>

        <!-- 确认密码输入框 -->
        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-gray-700 mb-1.5"
          >
            确认密码
          </label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次输入密码"
            autocomplete="new-password"
            class="input-base"
            :class="{
              'border-red-400 focus:border-red-400 focus:ring-red-400/20': errors.confirmPassword,
            }"
          />
          <p v-if="errors.confirmPassword" class="mt-1 text-xs text-red-500">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <!-- 注册按钮 -->
        <button
          type="submit"
          class="btn-primary w-full py-2.5"
          :disabled="loading"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <!-- 加载动画 -->
            <svg
              class="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            注册中...
          </span>
          <span v-else>注册</span>
        </button>
      </form>

      <!-- 分隔线 -->
      <div class="mt-6 flex items-center gap-3">
        <div class="flex-1 h-px bg-gray-200" />
        <span class="text-xs text-gray-400">或者</span>
        <div class="flex-1 h-px bg-gray-200" />
      </div>

      <!-- 登录链接 -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-500">
          已有账号？
          <router-link
            to="/login"
            class="text-primary hover:text-primary-600 font-medium transition-colors"
          >
            去登录
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
