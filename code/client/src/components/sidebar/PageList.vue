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
  <div class="page-list-container">
    <!-- 空状态 -->
    <div
      v-if="pagesStore.rootPages.length === 0"
      class="empty-state"
    >
      <div class="empty-icon-wrapper">
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
      </div>
      <p class="empty-text">
        还没有笔记<br>
        点击上方按钮创建
      </p>
    </div>

    <!-- 笔记列表 -->
    <div v-else class="page-items-list">
      <div
        v-for="page in pagesStore.rootPages"
        :key="page.id"
        class="page-item"
        :class="{
          'page-item-active': pagesStore.currentPageId === page.id,
          'page-item-inactive': pagesStore.currentPageId !== page.id,
        }"
        @click="selectPage(page.id)"
      >
        <!-- 图标 -->
        <span class="page-icon">{{ page.icon }}</span>
        <!-- 标题 -->
        <span class="page-title">{{ page.title }}</span>
        <!-- 日期 -->
        <span class="page-date">
          {{ formatDate(page.updatedAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
}

.empty-icon-wrapper {
  color: var(--border-default);
  margin-bottom: 0.75rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto;
}

.empty-text {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.page-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin: 0 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.page-item-active {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.page-item-inactive {
  color: var(--text-secondary);
}

.page-item-inactive:hover {
  background-color: var(--bg-hover);
}

.page-icon {
  font-size: 1rem;
}

.page-title {
  flex: 1;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-date {
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.2s;
}

.page-item:hover .page-date {
  opacity: 1;
}
</style>
