<!-- ===================================================
     Sidebar — 侧边栏

     功能：
     - 显示 Logo
     - 新建笔记按钮
     - 笔记列表
     - 用户信息
     =================================================== -->

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import NewNoteButton from './NewNoteButton.vue'
import PageList from './PageList.vue'

const authStore = useAuthStore()

/**
 * 退出登录
 */
function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <aside class="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
    <!-- Logo 区域 -->
    <div class="h-14 flex items-center px-4 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span class="text-white text-sm font-bold">予</span>
        </div>
        <div>
          <span class="font-bold text-gray-900">予乐</span>
          <span class="text-xs text-gray-400 ml-1">Yule</span>
        </div>
      </div>
    </div>

    <!-- 新建笔记按钮 -->
    <div class="p-3">
      <NewNoteButton />
    </div>

    <!-- 笔记列表 -->
    <PageList />

    <!-- 底部：用户信息 -->
    <div class="border-t border-gray-100 p-3">
      <div class="flex items-center gap-2">
        <!-- 用户头像 -->
        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
          {{ authStore.user?.name?.[0] || '?' }}
        </div>
        <!-- 用户信息 -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ authStore.user?.name || '用户' }}
          </p>
          <p class="text-xs text-gray-400 truncate">
            {{ authStore.user?.email || '' }}
          </p>
        </div>
        <!-- 退出按钮 -->
        <button
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          @click="handleLogout"
          title="退出登录"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
