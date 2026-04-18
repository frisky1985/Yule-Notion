<!-- ===================================================
     SlashCommandMenu — 斜杠命令菜单

     功能：
     - 输入 / 时弹出命令面板
     - 支持关键词过滤
     - 键盘导航（上下选择、回车确认、Esc 关闭）
     - 记录最近使用的命令
     =================================================== -->

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

export interface SlashMenuItem {
  id: string
  label: string
  description: string
  icon: string
  category: string
  action: () => void
}

interface Props {
  items: SlashMenuItem[]
  query: string
  visible: boolean
  position: { top: number; left: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', item: SlashMenuItem): void
  (e: 'close'): void
}>()

const selectedIndex = ref(0)
const menuRef = ref<HTMLElement | null>(null)

// ==================== 最近使用 ====================
const RECENT_STORAGE_KEY = 'yule-slash-recent'
const MAX_RECENT = 5

function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveRecentId(id: string) {
  const ids = getRecentIds().filter(i => i !== id)
  ids.unshift(id)
  if (ids.length > MAX_RECENT) ids.length = MAX_RECENT
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids))
}

// 最近使用的命令条目
const recentItems = computed(() => {
  const ids = getRecentIds()
  return ids
    .map(id => props.items.find(item => item.id === id))
    .filter((item): item is SlashMenuItem => !!item)
})

// 根据关键词过滤命令
const filteredItems = computed(() => {
  if (!props.query) {
    // 无查询时：最近使用 + 全部（按原始分类）
    return props.items
  }
  const q = props.query.toLowerCase()
  return props.items.filter(
    item =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
  )
})

// 构建分组：最近使用排在最前
const groupedItems = computed(() => {
  const groups: Record<string, SlashMenuItem[]> = {}

  // 无查询时添加最近使用分组
  if (!props.query && recentItems.value.length > 0) {
    groups['最近使用'] = recentItems.value
  }

  for (const item of filteredItems.value) {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
  }
  return groups
})

// 扁平列表用于键盘导航
const flatItems = computed(() => {
  const result: SlashMenuItem[] = []
  for (const items of Object.values(groupedItems.value)) {
    for (const item of items) {
      // 避免重复（最近使用中的项也会出现在分类中）
      if (!result.some(r => r === item)) {
        result.push(item)
      }
    }
  }
  return result
})

// 重置选中索引
watch(() => props.query, () => { selectedIndex.value = 0 })
watch(() => props.visible, (v) => { if (v) selectedIndex.value = 0 })

// 键盘导航
function handleKeyDown(event: KeyboardEvent) {
  if (!props.visible) return false

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = selectedIndex.value <= 0
        ? flatItems.value.length - 1
        : selectedIndex.value - 1
      scrollToSelected()
      return true
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = selectedIndex.value >= flatItems.value.length - 1
        ? 0
        : selectedIndex.value + 1
      scrollToSelected()
      return true
    case 'Enter':
      event.preventDefault()
      if (flatItems.value[selectedIndex.value]) {
        selectItem(flatItems.value[selectedIndex.value])
      }
      return true
    case 'Escape':
      event.preventDefault()
      emit('close')
      return true
  }
  return false
}

function scrollToSelected() {
  nextTick(() => {
    const el = menuRef.value?.querySelector('.slash-item.selected')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function selectItem(item: SlashMenuItem) {
  saveRecentId(item.id)
  emit('select', item)
}

// 获取 flatItems 中项的索引（跳过重复项）
function getFlatIndex(item: SlashMenuItem): number {
  return flatItems.value.indexOf(item)
}

defineExpose({ handleKeyDown })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && flatItems.length > 0"
      ref="menuRef"
      class="slash-menu"
      :style="{
        top: position.top + 'px',
        left: position.left + 'px',
      }"
    >
      <div class="slash-menu-header">
        <span class="slash-menu-hint">输入筛选</span>
      </div>

      <div class="slash-menu-list">
        <template v-for="(items, category) in groupedItems" :key="category">
          <div class="slash-category">{{ category }}</div>
          <div
            v-for="item in items"
            :key="category + '-' + item.id"
            class="slash-item"
            :class="{ selected: getFlatIndex(item) === selectedIndex }"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = getFlatIndex(item)"
          >
            <span class="slash-item-icon">{{ item.icon }}</span>
            <div class="slash-item-text">
              <span class="slash-item-label">{{ item.label }}</span>
              <span class="slash-item-desc">{{ item.description }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.slash-menu {
  position: fixed;
  z-index: 999;
  width: 280px;
  max-height: 400px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.slash-menu-header {
  padding: 8px 12px 4px;
  border-bottom: 1px solid #f3f4f6;
}

.slash-menu-hint {
  font-size: 11px;
  color: #9ca3af;
  letter-spacing: 0.02em;
}

.slash-menu-list {
  overflow-y: auto;
  padding: 4px;
  max-height: 360px;
}

.slash-category {
  padding: 8px 8px 4px;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.slash-item:hover,
.slash-item.selected {
  background-color: #f3f4f6;
}

.slash-item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.slash-item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slash-item-label {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.3;
}

.slash-item-desc {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
