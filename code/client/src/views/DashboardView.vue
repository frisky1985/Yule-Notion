<!-- ===================================================
     DashboardView — 仪表盘占位页面

     功能：
     - 显示欢迎信息（用户名 + 邮箱）
     - 退出登录按钮
     - 后续在此处开发笔记编辑器
     =================================================== -->

<script setup lang="ts">
/**
 * 仪表盘页面（占位）
 * 登录成功后的主页面
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppAlert from '@/components/common/AppAlert.vue'
import type { AlertMessage } from '@/types'

/** 路由实例 */
const router = useRouter()

/** 认证状态 */
const authStore = useAuthStore()

/** 提示消息列表 */
const alerts = ref<AlertMessage[]>([])

/** 自增消息 ID */
let alertIdCounter = 0

/**
 * 移除指定提示消息
 */
function dismissAlert(id: number) {
  alerts.value = alerts.value.filter((a) => a.id !== id)
}

/**
 * 退出登录
 */
function handleLogout() {
  authStore.logout()
}

/**
 * 获取当前日期的格式化字符串
 */
function getCurrentDate(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }
  return now.toLocaleDateString('zh-CN', options)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 提示消息 -->
    <AppAlert :alerts="alerts" @dismiss="dismissAlert" />

    <!-- 顶部导航栏 -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <!-- 左侧：Logo -->
        <div class="flex items-center gap-2">
          <span class="text-lg font-bold text-gray-900">予乐</span>
          <span class="text-sm text-gray-400">Notion</span>
        </div>

        <!-- 右侧：用户信息 + 退出按钮 -->
        <div class="flex items-center gap-4">
          <!-- 用户名和邮箱显示 -->
          <div v-if="authStore.user" class="text-right">
            <span class="block text-sm text-gray-900 font-medium">
              {{ authStore.user.name }}
            </span>
            <span class="block text-xs text-gray-400">
              {{ authStore.user.email }}
            </span>
          </div>

          <!-- 退出登录按钮 -->
          <button
            class="btn-secondary text-xs py-1.5 px-3"
            @click="handleLogout"
          >
            退出登录
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="max-w-5xl mx-auto px-6 py-12">
      <!-- 欢迎区域 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          <span v-if="authStore.user">
            你好，{{ authStore.user.name }}
          </span>
          <span v-else>
            你好 👋
          </span>
        </h1>
        <p class="mt-2 text-gray-500">
          {{ getCurrentDate() }}
        </p>
      </div>

      <!-- 占位内容 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- 快速入口卡片 -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">新建笔记</h3>
          <p class="text-sm text-gray-500">创建一篇新的笔记文档</p>
        </div>

        <!-- 最近编辑卡片 -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-green-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">最近编辑</h3>
          <p class="text-sm text-gray-500">查看最近编辑过的笔记</p>
        </div>

        <!-- 收藏夹卡片 -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div class="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-yellow-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">收藏夹</h3>
          <p class="text-sm text-gray-500">查看已收藏的重要笔记</p>
        </div>
      </div>

      <!-- 空状态提示 -->
      <div class="mt-12 text-center py-16">
        <div class="text-gray-300 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-16 h-16 mx-auto"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-400 mb-2">编辑器即将上线</h3>
        <p class="text-sm text-gray-400">
          笔记编辑器正在开发中，敬请期待 ✨
        </p>
      </div>
    </main>
  </div>
</template>
