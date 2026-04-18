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
  <aside class="sidebar">
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <div class="logo-container">
        <div class="logo-icon">
          <span class="logo-text">予</span>
        </div>
        <div class="brand-info">
          <span class="brand-name">予乐</span>
          <span class="brand-sub">Yule</span>
        </div>
      </div>
    </div>

    <!-- 新建笔记按钮 -->
    <div class="new-note-wrapper">
      <NewNoteButton />
    </div>

    <!-- 笔记列表 -->
    <PageList />

    <!-- 底部：用户信息 -->
    <div class="user-section">
      <div class="user-info">
        <!-- 用户头像 -->
        <div class="user-avatar">
          {{ authStore.user?.name?.[0] || '?' }}
        </div>
        <!-- 用户信息 -->
        <div class="user-details">
          <p class="user-name">
            {{ authStore.user?.name || '用户' }}
          </p>
          <p class="user-email">
            {{ authStore.user?.email || '' }}
          </p>
        </div>
        <!-- 退出按钮 -->
        <button
          class="logout-button"
          @click="handleLogout"
          title="退出登录"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="logout-icon"
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

<style scoped>
.sidebar {
  width: 16rem;
  height: 100vh;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 3.5rem;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border-light);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 2rem;
  height: 2rem;
  background-color: var(--color-primary);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  color: var(--text-inverse);
  font-size: 0.875rem;
  font-weight: bold;
}

.brand-info {
  display: flex;
  align-items: baseline;
}

.brand-name {
  font-weight: bold;
  color: var(--text-primary);
}

.brand-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: 0.25rem;
}

.new-note-wrapper {
  padding: 0.75rem;
}

.user-section {
  border-top: 1px solid var(--border-light);
  padding: 0.75rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-button {
  padding: 0.375rem;
  border-radius: 0.5rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.logout-button:hover {
  color: var(--text-secondary);
  background-color: var(--bg-hover);
}

.logout-icon {
  width: 1rem;
  height: 1rem;
}
</style>
