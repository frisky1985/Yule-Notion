<!-- ===================================================
     NewNoteButton — 新建笔记按钮

     功能：
     - 点击创建新笔记
     - 支持快捷键 Ctrl/Cmd + N
     - 悬停显示提示
     =================================================== -->

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { usePagesStore } from '@/stores/pages'

const pagesStore = usePagesStore()

/**
 * 创建新笔记
 */
function handleCreate() {
  pagesStore.createPage()
}

/**
 * 键盘快捷键监听
 */
function handleKeydown(e: KeyboardEvent) {
  // Ctrl/Cmd + N
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    handleCreate()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <button
    class="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium transition-all duration-200 hover:bg-primary-600 active:bg-primary-700 hover:shadow-md"
    @click="handleCreate"
    title="新建笔记 (Ctrl+N)"
  >
    <!-- 加号图标 -->
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    <span>新建笔记</span>
    <!-- 快捷键提示 -->
    <span class="ml-auto text-xs opacity-60 hidden group-hover:inline">
      Ctrl+N
    </span>
  </button>
</template>
