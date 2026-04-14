/* ===================================================
 * Vue Router 配置 + 导航守卫
 *
 * 路由表：
 * - / → 重定向到 /login
 * - /login → 登录页
 * - /register → 注册页
 * - /dashboard → 仪表盘（需认证）
 *
 * 导航守卫：
 * - 未登录访问受保护路由时重定向到 /login
 * =================================================== */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    // 根路径重定向到登录页
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      // 标记为公开页面（不需要认证）
      requiresAuth: false,
    },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: {
      requiresAuth: false,
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: {
      // 标记为受保护页面（需要认证）
      requiresAuth: true,
    },
  },
]

/** 创建路由实例 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 路由切换时滚动到顶部
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

/**
 * 全局前置守卫
 * - 检查目标路由是否需要认证
 * - 未登录时重定向到登录页
 */
router.beforeEach(async (to) => {
  // 延迟导入 auth store，避免循环依赖
  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()

  // 需要认证的页面
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 保存目标路径，登录后可以跳回
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    }
  }

  // 已登录用户访问登录/注册页时重定向到仪表盘
  if (
    !to.meta.requiresAuth &&
    authStore.isLoggedIn &&
    (to.name === 'Login' || to.name === 'Register')
  ) {
    return { name: 'Dashboard' }
  }
})

export default router
