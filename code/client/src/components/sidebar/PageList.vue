<!-- ===================================================
     PageList — 笔记列表

     功能：
     - 显示所有笔记
     - 支持层级结构
     - 点击切换当前笔记
     =================================================== -->

<script setup lang="ts">
import { usePagesStore } from '@/stores/pages'

const pagesStore = usePagesStore()

/**
 * 选择笔记
 */
function selectPage(id: string) {
  pagesStore.setCurrentPage(id)
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="flex-1 overflow-y-auto py-2">
    <!-- 空状态 -->
    <div
      v-if="pagesStore.rootPages.length === 0"
      class="px-4 py-8 text-center"
    >
      <div class="text-gray-300 mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-12 h-12 mx-auto"
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
      <p class="text-sm text-gray-400">
        还没有笔记<br>
        点击上方按钮创建
      </p>
    </div>

    <!-- 笔记列表 -->
    <div v-else class="space-y-0.5">
      <div
        v-for="page in pagesStore.rootPages"
        :key="page.id"
        class="group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors duration-150"
        :class="{
          'bg-primary/10 text-primary': pagesStore.currentPageId === page.id,
          'hover:bg-gray-100 text-gray-700': pagesStore.currentPageId !== page.id,
        }"
        @click="selectPage(page.id)"
      >
        <!-- 图标 -->
        <span class="text-base">{{ page.icon }}</span>
        <!-- 标题 -->
        <span class="flex-1 text-sm truncate">{{ page.title }}</span>
        <!-- 日期 -->
        <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {{ formatDate(page.updatedAt) }}
        </span>
      </div>
    </div>
  </div>
</template>
