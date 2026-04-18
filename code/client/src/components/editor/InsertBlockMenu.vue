<!-- ===================================================
     InsertBlockMenu — 插入块菜单（绿色+按钮弹出）

     功能：
     - 搜索功能
     - 最近使用（标签式）
     - 基础块：图片、表格、代码块 等
     - 分类展示
     =================================================== -->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface BlockItem {
  id: string
  label: string
  description?: string
  icon: string
  shortcut?: string
}

interface BlockCategory {
  name: string
  display: 'grid' | 'list' | 'tags'
  items: BlockItem[]
}

interface Props {
  editor: any
  visible: boolean
  position: { top: number; left: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const searchQuery = ref('')
const menuRef = ref<HTMLElement | null>(null)

// 最近使用
const RECENT_KEY = 'yule-insert-recent'
const MAX_RECENT = 6

function getRecentIds(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') }
  catch { return [] }
}

function saveRecentId(id: string) {
  const ids = getRecentIds().filter(i => i !== id)
  ids.unshift(id)
  if (ids.length > MAX_RECENT) ids.length = MAX_RECENT
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids))
}

// 所有可插入的块
const allBlocks: BlockItem[] = [
  { id: 'image', label: '图片', icon: '🖼', description: '上传或插入图片' },
  { id: 'table', label: '表格', icon: '▦', description: '插入数据表格', shortcut: '/table' },
  { id: 'codeBlock', label: '代码块', icon: '💻', description: '插入代码块', shortcut: '/code' },
  { id: 'blockquote', label: '引用', icon: '❝', description: '插入引用块' },
  { id: 'bulletList', label: '无序列表', icon: '•', description: '创建无序列表' },
  { id: 'orderedList', label: '有序列表', icon: '1.', description: '创建有序列表' },
  { id: 'taskList', label: '任务列表', icon: '☑', description: '创建待办清单' },
  { id: 'heading1', label: '标题 1', icon: 'H1', description: '一级标题' },
  { id: 'heading2', label: '标题 2', icon: 'H2', description: '二级标题' },
  { id: 'heading3', label: '标题 3', icon: 'H3', description: '三级标题' },
  { id: 'horizontalRule', label: '分割线', icon: '—', description: '水平分割线' },
  { id: 'link', label: '链接', icon: '🔗', description: '插入超链接' },
]

// 分类
const categories = computed<BlockCategory[]>(() => {
  const recentIds = getRecentIds()
  const recentItems = recentIds
    .map(id => allBlocks.find(b => b.id === id))
    .filter((b): b is BlockItem => !!b)

  const result: BlockCategory[] = []

  if (recentItems.length > 0 && !searchQuery.value) {
    result.push({ name: '最近使用', display: 'tags', items: recentItems })
  }

  const basicItems = ['image', 'table', 'codeBlock', 'blockquote']
  const listItems = ['bulletList', 'orderedList', 'taskList']
  const headingItems = ['heading1', 'heading2', 'heading3']
  const otherItems = ['horizontalRule', 'link']

  function filterItems(ids: string[]) {
    let items = allBlocks.filter(b => ids.includes(b.id))
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      items = items.filter(b =>
        b.label.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
      )
    }
    return items
  }

  const basic = filterItems(basicItems)
  const lists = filterItems(listItems)
  const headings = filterItems(headingItems)
  const others = filterItems(otherItems)

  if (basic.length) result.push({ name: '基础', display: 'grid', items: basic })
  if (lists.length) result.push({ name: '列表', display: 'list', items: lists })
  if (headings.length) result.push({ name: '标题', display: 'list', items: headings })
  if (others.length) result.push({ name: '其他', display: 'list', items: others })

  return result
})

// 执行插入操作
function executeBlock(item: BlockItem) {
  const ed = props.editor
  if (!ed) return

  saveRecentId(item.id)

  const actions: Record<string, () => void> = {
    image: () => {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = 'image/*'
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const src = ev.target?.result as string
            if (src) ed.chain().focus().setImage({ src }).run()
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    },
    table: () => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    codeBlock: () => ed.chain().focus().toggleCodeBlock().run(),
    blockquote: () => ed.chain().focus().toggleBlockquote().run(),
    bulletList: () => ed.chain().focus().toggleBulletList().run(),
    orderedList: () => ed.chain().focus().toggleOrderedList().run(),
    taskList: () => ed.chain().focus().toggleTaskList().run(),
    heading1: () => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    heading2: () => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    heading3: () => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    horizontalRule: () => ed.chain().focus().setHorizontalRule().run(),
    link: () => {
      // 由父组件处理
    },
  }

  actions[item.id]?.()
  emit('close')
}

// 点击外部关闭
function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as HTMLElement)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="insert-menu"
      :style="{ top: position.top + 'px', left: position.left + 'px' }"
    >
      <!-- 搜索 -->
      <div class="insert-search">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="请输入要搜索的功能名称"
          class="search-input"
          autofocus
        >
      </div>

      <!-- 分类列表 -->
      <div class="insert-list">
        <template v-for="cat in categories" :key="cat.name">
          <div class="insert-category-name">{{ cat.name }}</div>

          <!-- 标签模式（最近使用） -->
          <div v-if="cat.display === 'tags'" class="insert-tags">
            <button
              v-for="item in cat.items"
              :key="item.id"
              class="insert-tag"
              @click="executeBlock(item)"
            >
              {{ item.label }}
            </button>
          </div>

          <!-- 网格模式（基础） -->
          <div v-else-if="cat.display === 'grid'" class="insert-grid">
            <button
              v-for="item in cat.items"
              :key="item.id"
              class="insert-grid-item"
              @click="executeBlock(item)"
            >
              <span class="grid-icon">{{ item.icon }}</span>
              <span class="grid-label">{{ item.label }}</span>
              <span v-if="item.shortcut" class="grid-shortcut">{{ item.shortcut }}</span>
            </button>
          </div>

          <!-- 列表模式 -->
          <div v-else class="insert-list-items">
            <button
              v-for="item in cat.items"
              :key="item.id"
              class="insert-list-item"
              @click="executeBlock(item)"
            >
              <span class="list-icon">{{ item.icon }}</span>
              <div class="list-text">
                <span class="list-label">{{ item.label }}</span>
                <span v-if="item.description" class="list-desc">{{ item.description }}</span>
              </div>
              <span v-if="item.shortcut" class="list-shortcut">{{ item.shortcut }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.insert-menu {
  position: fixed;
  z-index: 999;
  width: 320px;
  max-height: 480px;
  background: var(--bg-dropdown);
  border: 1px solid var(--border-toolbar);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.insert-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-toolbar);
}
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-on-toolbar-hover);
}
.search-input::placeholder { color: var(--text-muted); }

.insert-list {
  overflow-y: auto;
  padding: 8px;
  max-height: 420px;
}

.insert-category-name {
  padding: 6px 4px 4px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

/* 标签模式 */
.insert-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 8px;
}
.insert-tag {
  padding: 4px 12px;
  font-size: 12px;
  color: var(--text-on-toolbar-hover);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-toolbar);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}
.insert-tag:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* 网格模式 */
.insert-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 4px 0 8px;
}
.insert-grid-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
  color: var(--text-on-toolbar-hover);
}
.insert-grid-item:hover {
  background: var(--bg-dropdown-hover);
}
.grid-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-toolbar);
  border-radius: 6px;
  font-size: 14px;
  flex-shrink: 0;
}
.grid-label {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  text-align: left;
}
.grid-shortcut {
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
}

/* 列表模式 */
.insert-list-items {
  padding: 2px 0 6px;
}
.insert-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
  color: var(--text-on-toolbar-hover);
}
.insert-list-item:hover {
  background: var(--bg-dropdown-hover);
}
.list-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-toolbar);
  border-radius: 6px;
  font-size: 13px;
  flex-shrink: 0;
}
.list-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  text-align: left;
}
.list-label { font-size: 13px; font-weight: 500; }
.list-desc { font-size: 11px; color: var(--text-muted); }
.list-shortcut {
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
}
</style>
