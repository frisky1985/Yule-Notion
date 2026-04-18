<!-- ===================================================
     PageEditor — 笔记编辑器

     功能：
     - 编辑笔记标题
     - 编辑笔记内容（占位）
     - 显示笔记信息
     =================================================== -->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePagesStore } from '@/stores/pages'
import TipTapEditor from './TipTapEditor.vue'

const pagesStore = usePagesStore()

/** 编辑中的标题 */
const editingTitle = ref('')

/** 是否正在编辑标题 */
const isEditingTitle = ref(false)

// 同步当前笔记标题
watch(() => pagesStore.currentPage, (page) => {
  if (page) {
    editingTitle.value = page.title
  }
}, { immediate: true })

/**
 * 保存标题
 */
function saveTitle() {
  if (pagesStore.currentPage && editingTitle.value.trim()) {
    pagesStore.updatePage(pagesStore.currentPage.id, {
      title: editingTitle.value.trim()
    })
  }
  isEditingTitle.value = false
}

/**
 * 保存内容
 */
function saveContent(content: Record<string, unknown>) {
  if (pagesStore.currentPage) {
    pagesStore.updatePage(pagesStore.currentPage.id, { content })
  }
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="flex-1 h-screen overflow-y-auto bg-white">
    <!-- 空状态 -->
    <div
      v-if="!pagesStore.currentPage"
      class="h-full flex items-center justify-center text-gray-400"
    >
      <div class="text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-16 h-16 mx-auto mb-4 opacity-30"
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
        <p class="text-lg">选择或创建一个笔记开始编辑</p>
        <p class="text-sm mt-2 opacity-60">按 Ctrl+N 快速创建</p>
      </div>
    </div>

    <!-- 编辑器内容 -->
    <div v-else class="max-w-3xl mx-auto px-8 py-12">
      <!-- 标题区域 -->
      <div class="mb-8">
        <!-- 图标 -->
        <div class="flex items-center gap-3 mb-4">
          <span class="text-4xl">{{ pagesStore.currentPage.icon }}</span>
        </div>

        <!-- 标题输入 -->
        <input
          v-model="editingTitle"
          class="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent"
          placeholder="无标题"
          @blur="saveTitle"
          @keydown.enter="saveTitle"
        />

        <!-- 元信息 -->
        <div class="flex items-center gap-4 mt-4 text-sm text-gray-400">
          <span>创建于 {{ formatDate(pagesStore.currentPage.createdAt) }}</span>
          <span>·</span>
          <span>更新于 {{ formatDate(pagesStore.currentPage.updatedAt) }}</span>
        </div>
      </div>

      <!-- 富文本编辑器 -->
      <TipTapEditor
        :page="pagesStore.currentPage"
        @update="saveContent"
      />
    </div>
  </div>
</template>
