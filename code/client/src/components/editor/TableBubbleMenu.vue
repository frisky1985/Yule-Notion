<!-- ===================================================
     TableBubbleMenu — 表格浮动工具栏

     功能：
     - 点击表格时显示在表格上方
     - 列等宽 / 自适应宽度
     - 合并/拆分单元格
     - 插入/删除行列
     - 固定行标题/列标题
     - 删除表格
     =================================================== -->

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  editor: any
}

const props = defineProps<Props>()

const visible = ref(false)
const menuPosition = ref({ top: 0, left: 0 })
const menuRef = ref<HTMLElement | null>(null)
const tableMode = ref<'equal' | 'auto'>('auto')

// 检测光标是否在表格内
function checkTableSelection() {
  if (!props.editor) { visible.value = false; return }

  const isInTable = props.editor.isActive('table')
  if (isInTable) {
    // 获取表格 DOM 元素位置
    const { view } = props.editor
    const { state } = view
    const { selection } = state

    // 找到表格节点的位置
    let tablePos = -1
    const resolvedPos = selection.$anchor
    for (let d = resolvedPos.depth; d > 0; d--) {
      if (resolvedPos.node(d).type.name === 'table') {
        tablePos = resolvedPos.before(d)
        break
      }
    }

    if (tablePos >= 0) {
      const dom = view.nodeDOM(tablePos) as HTMLElement
      if (dom) {
        const rect = dom.getBoundingClientRect()
        menuPosition.value = {
          top: rect.top - 44,
          left: rect.left + rect.width / 2,
        }
        visible.value = true
        return
      }
    }
  }
  visible.value = false
}

// 列等宽
function setEqualWidth() {
  tableMode.value = 'equal'
  const { view, state } = props.editor
  const { selection } = state
  const resolvedPos = selection.$anchor

  for (let d = resolvedPos.depth; d > 0; d--) {
    if (resolvedPos.node(d).type.name === 'table') {
      const tableStart = resolvedPos.before(d)
      const dom = view.nodeDOM(tableStart) as HTMLElement
      if (dom) {
        const table = dom.querySelector('table') || dom
        table.style.tableLayout = 'fixed'
        table.style.width = '100%'
      }
      break
    }
  }
}

// 自适应宽度
function setAutoWidth() {
  tableMode.value = 'auto'
  const { view, state } = props.editor
  const { selection } = state
  const resolvedPos = selection.$anchor

  for (let d = resolvedPos.depth; d > 0; d--) {
    if (resolvedPos.node(d).type.name === 'table') {
      const tableStart = resolvedPos.before(d)
      const dom = view.nodeDOM(tableStart) as HTMLElement
      if (dom) {
        const table = dom.querySelector('table') || dom
        table.style.tableLayout = 'auto'
        table.style.width = '100%'
      }
      break
    }
  }
}

// 固定首行表头
function toggleHeaderRow() {
  props.editor.chain().focus().toggleHeaderRow().run()
}

// 固定首列表头
function toggleHeaderColumn() {
  props.editor.chain().focus().toggleHeaderColumn().run()
}

// 监听编辑器选区变化
function handleSelectionUpdate() {
  nextTick(() => checkTableSelection())
}

function handleTransaction() {
  nextTick(() => { if (visible.value) checkTableSelection() })
}

// 点击外部关闭
function handleClickOutside(event: MouseEvent) {
  if (!visible.value) return
  const target = event.target as HTMLElement
  if (menuRef.value && !menuRef.value.contains(target)) {
    // 检查点击是否在表格内
    const isInTable = target.closest('table') || target.closest('.tableWrapper')
    if (!isInTable) {
      visible.value = false
    }
  }
}

onMounted(() => {
  if (props.editor) {
    props.editor.on('selectionUpdate', handleSelectionUpdate)
    props.editor.on('transaction', handleTransaction)
  }
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  if (props.editor) {
    props.editor.off('selectionUpdate', handleSelectionUpdate)
    props.editor.off('transaction', handleTransaction)
  }
  document.removeEventListener('mousedown', handleClickOutside)
})

watch(() => props.editor, (newEditor, oldEditor) => {
  if (oldEditor) {
    oldEditor.off('selectionUpdate', handleSelectionUpdate)
    oldEditor.off('transaction', handleTransaction)
  }
  if (newEditor) {
    newEditor.on('selectionUpdate', handleSelectionUpdate)
    newEditor.on('transaction', handleTransaction)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="table-bubble"
      :style="{
        top: menuPosition.top + 'px',
        left: menuPosition.left + 'px',
      }"
    >
      <!-- 宽度模式 -->
      <button
        class="tbl-btn tbl-btn-text"
        :class="{ active: tableMode === 'equal' }"
        @click="setEqualWidth"
        title="列等宽"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        <span>列等宽</span>
      </button>
      <button
        class="tbl-btn tbl-btn-text"
        :class="{ active: tableMode === 'auto' }"
        @click="setAutoWidth"
        title="自适应宽度"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />
        </svg>
        <span>自适应宽度</span>
      </button>

      <span class="tbl-sep" />

      <!-- 固定标题行/列 -->
      <button class="tbl-btn" @click="toggleHeaderRow" title="固定行标题">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><path d="M8 15l2 2 4-4" />
        </svg>
      </button>
      <button class="tbl-btn" @click="toggleHeaderColumn" title="固定列标题">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><path d="M15 10l2 2 -2 2" />
        </svg>
      </button>

      <span class="tbl-sep" />

      <!-- 行列操作 -->
      <button class="tbl-btn" @click="editor.chain().focus().addRowBefore().run()" title="上方插入行">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="3" x2="12" y2="9" /><line x1="9" y1="6" x2="15" y2="6" />
        </svg>
      </button>
      <button class="tbl-btn" @click="editor.chain().focus().addRowAfter().run()" title="下方插入行">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="15" x2="12" y2="21" /><line x1="9" y1="18" x2="15" y2="18" />
        </svg>
      </button>
      <button class="tbl-btn" @click="editor.chain().focus().addColumnBefore().run()" title="左侧插入列">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="6" y1="9" x2="6" y2="15" />
        </svg>
      </button>
      <button class="tbl-btn" @click="editor.chain().focus().addColumnAfter().run()" title="右侧插入列">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="15" y1="12" x2="21" y2="12" /><line x1="18" y1="9" x2="18" y2="15" />
        </svg>
      </button>

      <span class="tbl-sep" />

      <!-- 合并/拆分 -->
      <button class="tbl-btn" @click="editor.chain().focus().mergeCells().run()" title="合并单元格">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 14l3-3 3 3" /><path d="M9 10l3 3 3-3" />
        </svg>
      </button>
      <button class="tbl-btn" @click="editor.chain().focus().splitCell().run()" title="拆分单元格">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </button>

      <span class="tbl-sep" />

      <!-- 删除行/列/表格 -->
      <button class="tbl-btn tbl-btn-danger" @click="editor.chain().focus().deleteRow().run()" title="删除行">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="8" y1="6" x2="16" y2="6" />
        </svg>
      </button>
      <button class="tbl-btn tbl-btn-danger" @click="editor.chain().focus().deleteColumn().run()" title="删除列">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="6" y1="8" x2="6" y2="16" />
        </svg>
      </button>
      <button class="tbl-btn tbl-btn-danger" @click="editor.chain().focus().deleteTable().run()" title="删除表格">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.table-bubble {
  position: fixed;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: #1e1e2e;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  transform: translateX(-50%);
  white-space: nowrap;
}

.tbl-sep {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: #3f3f5a;
  margin: 0 4px;
  flex-shrink: 0;
}

.tbl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #a1a1b5;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
  padding: 0 4px;
}
.tbl-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e5ef;
}
.tbl-btn.active {
  background: rgba(96, 165, 250, 0.18);
  color: #60a5fa;
}
.tbl-btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.tbl-btn-text {
  gap: 4px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
}
.tbl-btn-text span {
  color: inherit;
}
</style>
