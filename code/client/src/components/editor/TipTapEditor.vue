<!-- ===================================================
     TipTapEditor — 富文本编辑器（语雀风格）

     功能：
     - 语雀深色工具栏
     - 撤销/重做、段落格式、文字样式
     - 文字颜色/背景色、对齐、列表
     - 引用、代码块、分割线、链接、图片、Emoji
     - 斜杠 / 命令菜单
     - 自动保存
     =================================================== -->

<script setup lang="ts">
import { computed, watch, onBeforeUnmount, ref, onMounted, onUnmounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TipTapAIExtension } from './extensions/TipTapAIExtension'
import { useAIStore } from '@/stores/ai'
import AIPanel from '@/components/ai/AIPanel.vue'
import AICommandPalette from '@/components/ai/AICommandPalette.vue'
import type { Page } from '@/types'
import EmojiPicker from './EmojiPicker.vue'
import LinkDialog from './LinkDialog.vue'
import ImageUpload from './ImageUpload.vue'
import HeadingDropdown from './HeadingDropdown.vue'
import ColorPicker from './ColorPicker.vue'
import AlignDropdown from './AlignDropdown.vue'
import SlashCommandMenu from './SlashCommandMenu.vue'
import type { SlashMenuItem } from './SlashCommandMenu.vue'
import TableBubbleMenu from './TableBubbleMenu.vue'

interface Props {
  page: Page | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update', content: Record<string, unknown>): void
}>()

// ==================== 状态 ====================
const showLinkDialog = ref(false)
const slashMenuVisible = ref(false)
const slashMenuQuery = ref('')
const slashMenuPosition = ref({ top: 0, left: 0 })
const slashMenuRef = ref<InstanceType<typeof SlashCommandMenu> | null>(null)
const slashStartPos = ref<number | null>(null)

// ==================== AI ====================
const aiStore = useAIStore()
const commandPaletteRef = ref<InstanceType<typeof AICommandPalette> | null>(null)

// ==================== Toolbar visibility ====================
const isToolbarVisible = ref(false)
let hideTimeout: ReturnType<typeof setTimeout> | null = null
let focusDebounce: ReturnType<typeof setTimeout> | null = null
const HIDE_DELAY = 2500 // 2.5 seconds
const editorContainer = ref<HTMLElement | null>(null)

// ==================== Toolbar visibility control ====================
function showToolbar() {
  cancelHide()
  isToolbarVisible.value = true
}

function scheduleHide() {
  cancelHide()
  hideTimeout = setTimeout(() => {
    isToolbarVisible.value = false
  }, HIDE_DELAY)
}

function cancelHide() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

function handleEditorFocus() {
  if (focusDebounce) clearTimeout(focusDebounce)
  focusDebounce = setTimeout(showToolbar, 50)
}

function handleEditorBlur() {
  scheduleHide()
}

function handleToolbarEnter() {
  cancelHide()
}

function handleToolbarLeave() {
  scheduleHide()
}

// ==================== AI Handlers ====================
function handleAIInsert(text: string) {
  editor.value?.chain().focus().insertAIResponse(text).run()
}

function handleAIReplace(text: string) {
  editor.value?.chain().focus().replaceSelectionWithAI(text).run()
}

function handleAICommand(operation: string, text: string) {
  if (text) {
    aiStore.openPanel(operation as any, text)
  } else {
    aiStore.openPanel(operation as any)
  }
}

function handleScroll() {
  const scrollTop = editorContainer.value?.scrollTop || 0
  if (scrollTop > 100 && isToolbarVisible.value) {
    isToolbarVisible.value = false
  }
}

// ==================== 编辑器 ====================
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return '标题'
        return '输入 / 调出命令菜单...'
      },
    }),
    Link.configure({ openOnClick: false }),
    Image,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'editor-table' },
    }),
    TableRow,
    TableCell,
    TableHeader,
    TipTapAIExtension.configure({
      onOpenAI: (operation: string, text: string) => {
        if (text) {
          aiStore.openPanel(operation as any || undefined, text)
        } else {
          commandPaletteRef.value?.open()
        }
      }
    }),
  ],
  content: props.page?.content || createEmptyContent(),
  editorProps: {
    attributes: {
      class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px]',
    },
    handleKeyDown: (_view, event) => {
      if (slashMenuVisible.value && slashMenuRef.value) {
        const handled = slashMenuRef.value.handleKeyDown(event)
        if (handled) return true
      }
      return false
    },
    handlePaste: (_view, event) => {
      const items = event.clipboardData?.items
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              const reader = new FileReader()
              reader.onload = (e) => {
                const result = e.target?.result as string
                if (result && editor.value) {
                  editor.value.chain().focus().setImage({ src: result }).run()
                }
              }
              reader.readAsDataURL(file)
            }
            return true
          }
        }
      }
      return false
    },
  },
  onUpdate: ({ editor: ed }) => {
    emit('update', ed.getJSON())
    checkSlashCommand(ed)
  },
  onSelectionUpdate: ({ editor: ed }) => {
    // Show toolbar when text is selected
    if (!ed.state.selection.empty) {
      showToolbar()
    }
    checkSlashCommand(ed)
  },
  onFocus: () => {
    handleEditorFocus()
  },
  onBlur: () => {
    handleEditorBlur()
  },
})

// ==================== 斜杠命令 ====================
function getSlashMenuItems(): SlashMenuItem[] {
  return [
    { id: 'paragraph', label: '正文', description: '普通文本段落', icon: 'Aa', category: '基础',
      action: () => editor.value?.chain().focus().setParagraph().run() },
    { id: 'heading1', label: '一级标题', description: '大标题', icon: 'H1', category: '基础',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: 'heading2', label: '二级标题', description: '中标题', icon: 'H2', category: '基础',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: 'heading3', label: '三级标题', description: '小标题', icon: 'H3', category: '基础',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: 'heading4', label: '四级标题', description: '四级标题', icon: 'H4', category: '基础',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 4 }).run() },
    { id: 'heading5', label: '五级标题', description: '五级标题', icon: 'H5', category: '基础',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 5 }).run() },
    { id: 'heading6', label: '六级标题', description: '六级标题', icon: 'H6', category: '基础',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 6 }).run() },
    { id: 'bulletList', label: '无序列表', description: '创建无序列表', icon: '•', category: '列表',
      action: () => editor.value?.chain().focus().toggleBulletList().run() },
    { id: 'orderedList', label: '有序列表', description: '创建有序列表', icon: '1.', category: '列表',
      action: () => editor.value?.chain().focus().toggleOrderedList().run() },
    { id: 'taskList', label: '任务列表', description: '创建待办清单', icon: '☑', category: '列表',
      action: () => editor.value?.chain().focus().toggleTaskList().run() },
    { id: 'blockquote', label: '引用', description: '插入引用块', icon: '❝', category: '块',
      action: () => editor.value?.chain().focus().toggleBlockquote().run() },
    { id: 'codeBlock', label: '代码块', description: '插入代码块', icon: '<>', category: '块',
      action: () => editor.value?.chain().focus().toggleCodeBlock().run() },
    { id: 'horizontalRule', label: '分割线', description: '插入水平分割线', icon: '—', category: '块',
      action: () => editor.value?.chain().focus().setHorizontalRule().run() },
    { id: 'table', label: '表格', description: '插入表格', icon: '▦', category: '块',
      action: () => editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'link', label: '链接', description: '插入超链接', icon: '🔗', category: '插入',
      action: () => { showLinkDialog.value = true } },
    { id: 'image', label: '图片', description: '上传或插入图片', icon: '🖼', category: '插入',
      action: () => {
        const input = document.createElement('input')
        input.type = 'file'; input.accept = 'image/*'
        input.onchange = (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              const src = ev.target?.result as string
              if (src) editor.value?.chain().focus().setImage({ src }).run()
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
      } },
  ]
}

function checkSlashCommand(ed: any) {
  const { state } = ed
  const { $anchor } = state.selection
  const textBefore = $anchor.parent.textContent.slice(0, $anchor.parentOffset)
  const slashMatch = textBefore.match(/\/([^\s]*)$/)

  if (slashMatch) {
    slashMenuQuery.value = slashMatch[1]
    slashStartPos.value = $anchor.pos - slashMatch[0].length
    const coords = ed.view.coordsAtPos($anchor.pos)
    slashMenuPosition.value = { top: coords.bottom + 6, left: coords.left }
    slashMenuVisible.value = true
  } else {
    slashMenuVisible.value = false
    slashStartPos.value = null
  }
}

function handleSlashSelect(item: SlashMenuItem) {
  if (editor.value && slashStartPos.value !== null) {
    const end = editor.value.state.selection.$anchor.pos
    editor.value.chain().focus().deleteRange({ from: slashStartPos.value, to: end }).run()
  }
  item.action()
  closeSlashMenu()
}

function closeSlashMenu() {
  slashMenuVisible.value = false
  slashMenuQuery.value = ''
  slashStartPos.value = null
}

function handleGlobalClick(event: MouseEvent) {
  if (slashMenuVisible.value) {
    const menu = document.querySelector('.slash-menu')
    if (menu && !menu.contains(event.target as HTMLElement)) closeSlashMenu()
  }
}

onMounted(() => document.addEventListener('click', handleGlobalClick))
onUnmounted(() => document.removeEventListener('click', handleGlobalClick))

// ==================== 内容同步 ====================
function createEmptyContent() {
  return { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
}

// Keep toolbar visible when link dialog is open
watch(showLinkDialog, (isOpen) => {
  if (isOpen) {
    cancelHide()
    isToolbarVisible.value = true
  } else {
    scheduleHide()
  }
})

watch(() => props.page, (newPage) => {
  if (editor.value && newPage) {
    const cur = editor.value.getJSON()
    if (JSON.stringify(cur) !== JSON.stringify(newPage.content)) {
      editor.value.commands.setContent(newPage.content)
    }
  }
}, { deep: true })

const activeFormats = computed(() => ({
  bold: editor.value?.isActive('bold') || false,
  italic: editor.value?.isActive('italic') || false,
  strike: editor.value?.isActive('strike') || false,
  underline: editor.value?.isActive('underline') || false,
  code: editor.value?.isActive('code') || false,
  codeBlock: editor.value?.isActive('codeBlock') || false,
  bulletList: editor.value?.isActive('bulletList') || false,
  orderedList: editor.value?.isActive('orderedList') || false,
  taskList: editor.value?.isActive('taskList') || false,
  blockquote: editor.value?.isActive('blockquote') || false,
  link: editor.value?.isActive('link') || false,
}))

onBeforeUnmount(() => {
  editor.value?.destroy()
  if (hideTimeout) clearTimeout(hideTimeout)
  if (focusDebounce) clearTimeout(focusDebounce)
})
</script>

<template>
  <div class="editor-root">
    <!-- ====== 语雀风格工具栏 (Auto-Hide) ====== -->
    <div 
      v-if="editor" 
      class="yuque-toolbar"
      :class="{ 'toolbar-visible': isToolbarVisible }"
      @mouseenter="handleToolbarEnter"
      @mouseleave="handleToolbarLeave"
    >

      <!-- 插入块按钮 -->
      <button
        class="tb-plus"
        title="插入内容块"
        @click="editor.chain().focus().run()"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <span class="tb-sep" />

      <!-- 撤销 / 重做 -->
      <button class="tb-btn" title="撤销 (Ctrl+Z)" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <button class="tb-btn" title="重做 (Ctrl+Shift+Z)" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
        </svg>
      </button>

      <span class="tb-sep" />

      <!-- 段落格式下拉 -->
      <HeadingDropdown :editor="editor" />

      <span class="tb-sep" />

      <!-- B I S U Code -->
      <button class="tb-btn" :class="{ active: activeFormats.bold }" title="粗体 (Ctrl+B)" @click="editor.chain().focus().toggleBold().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.italic }" title="斜体 (Ctrl+I)" @click="editor.chain().focus().toggleItalic().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.strike }" title="删除线 (Ctrl+Shift+X)" @click="editor.chain().focus().toggleStrike().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.1 2.4 3.1 3.1" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <path d="M15 12.5c1 .5 1.7 1.3 1.7 2.5 0 3.4-4.2 4-6.7 4a12 12 0 0 1-4.6-.8" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.underline }" title="下划线 (Ctrl+U)" @click="editor.chain().focus().toggleUnderline().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.code }" title="行内代码 (Ctrl+E)" @click="editor.chain().focus().toggleCode().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      <span class="tb-sep" />

      <!-- 文字颜色 / 背景色 -->
      <ColorPicker :editor="editor" mode="color" />
      <ColorPicker :editor="editor" mode="highlight" />

      <span class="tb-sep" />

      <!-- 对齐 -->
      <AlignDropdown :editor="editor" />

      <span class="tb-sep" />

      <!-- 列表 -->
      <button class="tb-btn" :class="{ active: activeFormats.bulletList }" title="无序列表" @click="editor.chain().focus().toggleBulletList().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.orderedList }" title="有序列表" @click="editor.chain().focus().toggleOrderedList().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.taskList }" title="任务列表" @click="editor.chain().focus().toggleTaskList().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><polyline points="9 11 12 14 22 4" />
        </svg>
      </button>

      <span class="tb-sep" />

      <!-- 链接 / 引用 / 分割线 -->
      <button class="tb-btn" :class="{ active: activeFormats.link }" title="插入链接 (Ctrl+K)" @click="showLinkDialog = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <button class="tb-btn" :class="{ active: activeFormats.blockquote }" title="引用" @click="editor.chain().focus().toggleBlockquote().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
        </svg>
      </button>
      <button class="tb-btn" title="分割线" @click="editor.chain().focus().setHorizontalRule().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      </button>

      <span class="tb-sep" />

      <!-- 代码块 / 表格 / 图片 / Emoji -->
      <button class="tb-btn" :class="{ active: activeFormats.codeBlock }" title="代码块" @click="editor.chain().focus().toggleCodeBlock().run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><polyline points="9 8 5 12 9 16" /><polyline points="15 8 19 12 15 16" />
        </svg>
      </button>
      <button class="tb-btn" title="插入表格" @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>
      <ImageUpload :editor="editor" />
      <EmojiPicker :editor="editor" />
    </div>

    <!-- ====== 编辑区 ====== -->
    <div ref="editorContainer" class="editor-scroll-container" @scroll="handleScroll">
      <EditorContent :editor="editor" />
    </div>

    <!-- ====== 表格浮动工具栏 ====== -->
    <TableBubbleMenu v-if="editor" :editor="editor" />

    <!-- ====== 斜杠命令 ====== -->
    <SlashCommandMenu
      ref="slashMenuRef"
      :items="getSlashMenuItems()"
      :query="slashMenuQuery"
      :visible="slashMenuVisible"
      :position="slashMenuPosition"
      @select="handleSlashSelect"
      @close="closeSlashMenu"
    />

    <!-- ====== 链接弹窗 ====== -->
    <LinkDialog :editor="editor" :show="showLinkDialog" @close="showLinkDialog = false" />

    <!-- ====== AI 面板 ====== -->
    <AIPanel 
      @insert="handleAIInsert"
      @replace="handleAIReplace"
    />

    <!-- ====== AI 命令面板 ====== -->
    <AICommandPalette 
      ref="commandPaletteRef"
      @execute="handleAICommand"
    />
  </div>
</template>

<style scoped>
/* ====== 编辑器容器 ====== */
.editor-root {
  position: relative;
}

/* Scroll container for editor */
.editor-scroll-container {
  position: relative;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

/* ====== 语雀工具栏 (Auto-Hide) ====== */
.yuque-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px 8px;
  margin-bottom: 20px;
  background: var(--bg-editor);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
  flex-wrap: wrap;
  box-shadow: var(--shadow-sm);
  
  /* Auto-hide animation */
  transform: translateY(-100%);
  opacity: 0;
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.yuque-toolbar.toolbar-visible {
  transform: translateY(0);
  opacity: 1;
}

/* 分隔符 */
.tb-sep {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: var(--border-default);
  margin: 0 5px;
  flex-shrink: 0;
}

/* 加号按钮 */
.tb-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: #22c55e;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.tb-plus:hover {
  background: #16a34a;
  transform: scale(1.05);
}

/* 普通按钮 */
.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}
.tb-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.tb-btn.active {
  background: var(--color-active-bg);
  color: var(--color-active);
}
.tb-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ====== TipTap 内容样式 ====== */
:deep(.ProseMirror) {
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #9ca3af;
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.ProseMirror h1) {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 1.5rem 0 1rem;
  line-height: 1.2;
}

:deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 1.25rem 0 0.75rem;
  line-height: 1.25;
}

:deep(.ProseMirror h3) {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 1rem 0 0.5rem;
  line-height: 1.3;
}

:deep(.ProseMirror h4) {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0.875rem 0 0.4rem;
  line-height: 1.35;
}

:deep(.ProseMirror h5) {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0.75rem 0 0.35rem;
  line-height: 1.4;
}

:deep(.ProseMirror h6) {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  margin: 0.625rem 0 0.3rem;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

:deep(.ProseMirror p) {
  color: #374151;
  line-height: 1.75;
  margin-bottom: 0.5rem;
}

:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.ProseMirror li) { margin-bottom: 0.2rem; }
:deep(.ProseMirror li > p) { display: inline; }

/* 任务列表 */
:deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}
:deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
:deep(.ProseMirror ul[data-type="taskList"] li label) {
  flex-shrink: 0;
  margin-top: 3px;
}
:deep(.ProseMirror ul[data-type="taskList"] li label input[type="checkbox"]) {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  cursor: pointer;
}
:deep(.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p) {
  text-decoration: line-through;
  color: #9ca3af;
}

:deep(.ProseMirror code) {
  background: #f3f4f6;
  color: #dc2626;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

:deep(.ProseMirror pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.6;
}
:deep(.ProseMirror pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: inherit;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #6366f1;
  padding-left: 16px;
  color: #6b7280;
  font-style: italic;
  margin: 12px 0;
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 24px 0;
}

:deep(.ProseMirror strong) { font-weight: 700; }
:deep(.ProseMirror em) { font-style: italic; }
:deep(.ProseMirror s) { text-decoration: line-through; }
:deep(.ProseMirror u) { text-decoration: underline; }

:deep(.ProseMirror a) {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}
:deep(.ProseMirror a:hover) { color: #1d4ed8; }

:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
}

:deep(.ProseMirror mark) {
  border-radius: 2px;
  padding: 1px 2px;
}

/* 表格样式 */
:deep(.ProseMirror table) {
  border-collapse: collapse;
  table-layout: auto;
  width: 100%;
  margin: 16px 0;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

:deep(.ProseMirror th) {
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  font-size: 0.875rem;
}

:deep(.ProseMirror td) {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  vertical-align: top;
  font-size: 0.875rem;
  color: #374151;
}

:deep(.ProseMirror td > p),
:deep(.ProseMirror th > p) {
  margin: 0;
}

:deep(.ProseMirror .selectedCell) {
  background: rgba(96, 165, 250, 0.12);
}

:deep(.ProseMirror .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #60a5fa;
  cursor: col-resize;
  z-index: 10;
}

:deep(.ProseMirror .tableWrapper) {
  overflow-x: auto;
  margin: 16px 0;
}

:deep(.ProseMirror .resize-cursor) {
  cursor: col-resize;
}
</style>
