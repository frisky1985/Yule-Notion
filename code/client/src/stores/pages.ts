/* ===================================================
 * Pages Store — 笔记页面状态管理
 *
 * 功能：
 * - 管理笔记列表
 * - 创建、更新、删除笔记
 * - 当前选中笔记
 * =================================================== */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Page, CreatePageParams } from '@/types'

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 获取当前日期作为默认标题
 */
function getDefaultTitle(): string {
  const now = new Date()
  return `未命名笔记 ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * 创建空内容
 */
function createEmptyContent() {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: []
      }
    ]
  }
}

export const usePagesStore = defineStore('pages', () => {
  // ============ State ============
  /** 笔记列表 */
  const pages = ref<Page[]>([])
  /** 当前选中笔记ID */
  const currentPageId = ref<string | null>(null)
  /** 加载状态 */
  const loading = ref(false)

  // ============ Getters ============
  /** 当前选中笔记 */
  const currentPage = computed(() => {
    return pages.value.find(p => p.id === currentPageId.value) || null
  })

  /** 根页面列表（无父页面） */
  const rootPages = computed(() => {
    return pages.value.filter(p => !p.parentId).sort((a, b) => a.order - b.order)
  })

  /** 获取子页面 */
  const getChildren = (parentId: string) => {
    return pages.value.filter(p => p.parentId === parentId).sort((a, b) => a.order - b.order)
  }

  // ============ Actions ============
  /**
   * 创建新笔记
   */
  function createPage(params?: CreatePageParams): Page {
    const now = new Date().toISOString()
    const newPage: Page = {
      id: generateId(),
      title: params?.title || getDefaultTitle(),
      content: createEmptyContent(),
      parentId: params?.parentId,
      order: pages.value.length,
      icon: params?.icon || '📝',
      createdAt: now,
      updatedAt: now,
    }

    pages.value.push(newPage)
    currentPageId.value = newPage.id

    // 保存到本地存储
    saveToLocalStorage()

    return newPage
  }

  /**
   * 更新笔记
   */
  function updatePage(id: string, updates: Partial<Page>) {
    const page = pages.value.find(p => p.id === id)
    if (page) {
      Object.assign(page, { ...updates, updatedAt: new Date().toISOString() })
      saveToLocalStorage()
    }
  }

  /**
   * 删除笔记
   */
  function deletePage(id: string) {
    const index = pages.value.findIndex(p => p.id === id)
    if (index > -1) {
      pages.value.splice(index, 1)
      if (currentPageId.value === id) {
        currentPageId.value = pages.value[0]?.id || null
      }
      saveToLocalStorage()
    }
  }

  /**
   * 设置当前笔记
   */
  function setCurrentPage(id: string | null) {
    currentPageId.value = id
  }

  /**
   * 保存到本地存储
   */
  function saveToLocalStorage() {
    localStorage.setItem('yule-pages', JSON.stringify(pages.value))
  }

  /**
   * 从本地存储加载
   */
  function loadFromLocalStorage() {
    const saved = localStorage.getItem('yule-pages')
    if (saved) {
      try {
        pages.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load pages from localStorage:', e)
      }
    }
  }

  // 初始化时加载
  loadFromLocalStorage()

  return {
    pages,
    currentPageId,
    currentPage,
    rootPages,
    loading,
    getChildren,
    createPage,
    updatePage,
    deletePage,
    setCurrentPage,
    loadFromLocalStorage,
  }
})
