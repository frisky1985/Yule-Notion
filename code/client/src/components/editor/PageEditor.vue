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
  <div class="page-editor-container">
    <!-- 空状态 -->
    <div
      v-if="!pagesStore.currentPage"
      class="empty-state"
    >
      <div class="empty-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="empty-icon"
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
        <p class="empty-title">选择或创建一个笔记开始编辑</p>
        <p class="empty-subtitle">按 Ctrl+N 快速创建</p>
      </div>
    </div>

    <!-- 编辑器内容 -->
    <div v-else class="editor-content">
      <!-- 标题区域 -->
      <div class="title-section">
        <!-- 图标 -->
        <div class="icon-wrapper">
          <span class="page-icon">{{ pagesStore.currentPage.icon }}</span>
        </div>

        <!-- 标题输入 -->
        <input
          v-model="editingTitle"
          class="title-input"
          placeholder="无标题"
          @blur="saveTitle"
          @keydown.enter="saveTitle"
        />

        <!-- 元信息 -->
        <div class="meta-info">
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

<style scoped>
.page-editor-container {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  background-color: var(--bg-editor);
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.empty-content {
  text-align: center;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  opacity: 0.3;
}

.empty-title {
  font-size: 1.125rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.6;
}

.editor-content {
  max-width: 48rem;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.title-section {
  margin-bottom: 2rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.page-icon {
  font-size: 2.25rem;
}

.title-input {
  width: 100%;
  font-size: 2.25rem;
  font-weight: bold;
  color: var(--editor-heading);
  background-color: transparent;
  border: none;
  outline: none;
}

.title-input::placeholder {
  color: var(--text-muted);
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}
</style>
