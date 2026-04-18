<!-- ===================================================
     LoginView — 登录页面

     功能：
     - 邮箱 + 密码登录表单
     - 表单验证（邮箱格式、密码非空）
     - 登录成功跳转到 /dashboard
     - 错误提示（AppAlert 组件）
     - "没有账号？去注册" 链接
     =================================================== -->

<script setup lang="ts">
/**
 * 登录页面
 * 使用 Composition API + TypeScript
 */
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppAlert from '@/components/common/AppAlert.vue'
import type { AlertMessage } from '@/types'

/** 路由实例 */
const router = useRouter()
const route = useRoute()

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
  email: '',
  password: '',
})

/** 表单验证错误 */
const errors = reactive({
  email: '',
  password: '',
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
 * 表单验证
 * @returns 是否通过验证
 */
function validate(): boolean {
  let valid = true

  // 清除之前的错误
  errors.email = ''
  errors.password = ''

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
  }

  return valid
}

/**
 * 提交登录表单
 */
async function handleSubmit() {
  // 表单验证
  if (!validate()) return

  loading.value = true

  try {
    await authStore.login(form.email.trim(), form.password)

    // 登录成功，显示提示
    addAlert('success', '登录成功！')

    // 跳转到目标页面（优先跳转到 redirect 参数指定的页面）
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (err: any) {
    // 登录失败，显示错误信息
    const message =
      err.response?.data?.error?.message || err.message || '登录失败，请稍后重试'
    addAlert('error', message)
  } finally {
    loading.value = false
  }
}

/**
 * 演示模式登录（无需后端）
 */
function demoLogin() {
  // 设置演示用户数据
  authStore.token = 'demo-token'
  authStore.user = {
    id: 'demo-user-id',
    email: 'demo@yule.local',
    name: '演示用户',
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem('token', 'demo-token')
  localStorage.setItem('user', JSON.stringify(authStore.user))

  addAlert('success', '演示模式已启动！')
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <!-- 提示消息 -->
    <AppAlert :alerts="alerts" @dismiss="dismissAlert" />

    <!-- 登录卡片 -->
    <div class="auth-card">
      <!-- Logo / 标题 -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">
          予乐 Yule Notion
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          登录到你的笔记本
        </p>
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleSubmit" class="space-y-5">
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
          <!-- 邮箱错误提示 -->
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
            placeholder="输入密码"
            autocomplete="current-password"
            class="input-base"
            :class="{
              'border-red-400 focus:border-red-400 focus:ring-red-400/20': errors.password,
            }"
          />
          <!-- 密码错误提示 -->
          <p v-if="errors.password" class="mt-1 text-xs text-red-500">
            {{ errors.password }}
          </p>
        </div>

        <!-- 登录按钮 -->
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
            登录中...
          </span>
          <span v-else>登录</span>
        </button>
      </form>

      <!-- 分隔线 -->
      <div class="mt-6 flex items-center gap-3">
        <div class="flex-1 h-px bg-gray-200" />
        <span class="text-xs text-gray-400">或者</span>
        <div class="flex-1 h-px bg-gray-200" />
      </div>

      <!-- 演示模式按钮 -->
      <button
        type="button"
        class="btn-secondary w-full py-2.5 mt-4"
        @click="demoLogin"
      >
        🎮 演示模式（无需登录）
      </button>

      <!-- 注册链接 -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-500">
          没有账号？
          <router-link
            to="/register"
            class="text-primary hover:text-primary-600 font-medium transition-colors"
          >
            去注册
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
