/* ===================================================
 * Theme Store — 主题管理
 *
 * 功能：
 * - 跟随系统主题 (system)
 * - 手动切换 (light / dark)
 * - localStorage 持久化
 * =================================================== */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'yule-theme-mode'

export const useThemeStore = defineStore('theme', () => {
  // 用户选择的模式
  const mode = ref<ThemeMode>(loadSavedMode())

  // 实际应用的主题
  const resolved = ref<'light' | 'dark'>(resolveTheme(mode.value))

  // 从 localStorage 读取
  function loadSavedMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    } catch { /* ignore */ }
    return 'system'
  }

  // 根据 mode 解析实际主题
  function resolveTheme(m: ThemeMode): 'light' | 'dark' {
    if (m === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return m
  }

  // 应用到 DOM
  function applyTheme() {
    resolved.value = resolveTheme(mode.value)
    document.documentElement.setAttribute('data-theme', resolved.value)
  }

  // 设置主题
  function setMode(m: ThemeMode) {
    mode.value = m
    localStorage.setItem(STORAGE_KEY, m)
    applyTheme()
  }

  // 快捷切换
  function toggle() {
    if (resolved.value === 'dark') {
      setMode('light')
    } else {
      setMode('dark')
    }
  }

  // 监听系统主题变化
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', () => {
    if (mode.value === 'system') {
      applyTheme()
    }
  })

  // 初始化
  watch(mode, () => applyTheme(), { immediate: true })

  return { mode, resolved, setMode, toggle }
})
