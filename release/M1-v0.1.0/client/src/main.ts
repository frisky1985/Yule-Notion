/* ===================================================
 * main.ts — 应用入口
 *
 * 初始化流程：
 * 1. 创建 Vue 应用实例
 * 2. 安装 Pinia（状态管理）
 * 3. 安装 Vue Router（路由）
 * 4. 引入全局样式（包含 UnoCSS）
 * 5. 尝试恢复登录态（fetchMe）
 * 6. 挂载应用
 * =================================================== */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 引入全局样式（包含 UnoCSS 虚拟模块 + Reset + 基础样式）
import './styles/main.css'

// 创建 Vue 应用实例
const app = createApp(App)

// 安装 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 安装路由
app.use(router)

// 尝试恢复登录态：如果本地有 token，则获取当前用户信息
async function initAuth() {
  // 动态导入，确保 Pinia 已安装
  const { useAuthStore } = await import('./stores/auth')
  const authStore = useAuthStore()

  // 如果有 token 但没有 user 信息，尝试获取
  if (authStore.token && !authStore.user) {
    await authStore.fetchMe()
  }
}

// 先恢复认证状态，再挂载应用
initAuth().finally(() => {
  app.mount('#app')
})
