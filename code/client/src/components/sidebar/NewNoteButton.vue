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
    class="new-note-button"
    @click="handleCreate"
    title="新建笔记 (Ctrl+N)"
  >
    <!-- 加号图标 -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="new-note-icon"
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
    <span class="shortcut-hint">
      Ctrl+N
    </span>
  </button>
</template>

<style scoped>
.new-note-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background-color: var(--color-primary);
  color: var(--text-inverse);
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.new-note-button:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-md);
}

.new-note-button:active {
  background-color: var(--color-primary);
  transform: scale(0.98);
}

.new-note-icon {
  width: 1rem;
  height: 1rem;
}

.shortcut-hint {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.6;
  display: none;
}

.new-note-button:hover .shortcut-hint {
  display: inline;
}
</style>
