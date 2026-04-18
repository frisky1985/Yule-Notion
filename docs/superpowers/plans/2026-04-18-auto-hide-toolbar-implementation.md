# Auto-Hide Editor Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the always-visible dark editor toolbar into an auto-hide toolbar that matches the editor background with smooth animations.

**Architecture:** Add state management for toolbar visibility, implement event handlers for focus/blur/hover/scroll, and use CSS transitions for show/hide animations. All colors will use CSS variables for theme support.

**Tech Stack:** Vue 3 Composition API, TypeScript, TipTap Editor, CSS custom properties, CSS transitions

---

### Task 1: Add Toolbar Visibility State Management

**Files:**
- Modify: `code/client/src/components/editor/TipTapEditor.vue:14-60`

- [ ] **Step 1: Add reactive state and timeout variables**

Add these state variables after line 58 (after `slashStartPos`):

```typescript
// ==================== Toolbar visibility ====================
const isToolbarVisible = ref(false)
let hideTimeout: ReturnType<typeof setTimeout> | null = null
let focusDebounce: ReturnType<typeof setTimeout> | null = null
const HIDE_DELAY = 2500 // 2.5 seconds
const editorContainer = ref<HTMLElement | null>(null)
```

- [ ] **Step 2: Add toolbar visibility control functions**

Add these functions after the state declarations (around line 64):

```typescript
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

function handleScroll() {
  const scrollTop = editorContainer.value?.scrollTop || 0
  if (scrollTop > 100 && isToolbarVisible.value) {
    isToolbarVisible.value = false
  }
}
```

- [ ] **Step 3: Add cleanup on component unmount**

Modify the `onBeforeUnmount` hook at line 259 to include timeout cleanup:

```typescript
onBeforeUnmount(() => {
  editor.value?.destroy()
  if (hideTimeout) clearTimeout(hideTimeout)
  if (focusDebounce) clearTimeout(focusDebounce)
})
```

- [ ] **Step 4: Commit**

```bash
git add code/client/src/components/editor/TipTapEditor.vue
git commit -m "feat: add toolbar visibility state management

- Add isToolbarVisible ref and timeout variables
- Implement show/hide control functions
- Add event handlers for focus, blur, mouse, scroll
- Cleanup timeouts on unmount"
```

---

### Task 2: Add Modal Dialog Watchers

**Files:**
- Modify: `code/client/src/components/editor/TipTapEditor.vue:53-60`
- Import needed: `watch` is already imported at line 14

- [ ] **Step 1: Check existing dialog state variables**

The component already has these dialog states:
```typescript
const showLinkDialog = ref(false) // line 53
```

We need to find emoji picker and image upload states. Let me check the template...

Looking at the template (lines 394-395), EmojiPicker and ImageUpload are components that receive `:editor` prop but don't expose show/hide state. They manage their own internal state.

**Decision:** We'll only watch `showLinkDialog` since it's the only dialog with exposed state in the parent component. The other dialogs are child components with internal state.

- [ ] **Step 2: Add watcher for showLinkDialog**

Add this watcher after the content sync watcher (after line 243):

```typescript
// Keep toolbar visible when link dialog is open
watch(showLinkDialog, (isOpen) => {
  if (isOpen) {
    cancelHide()
    isToolbarVisible.value = true
  } else {
    scheduleHide()
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add code/client/src/components/editor/TipTapEditor.vue
git commit -m "feat: keep toolbar visible when link dialog is open

- Add watcher for showLinkDialog state
- Cancel hide timeout when dialog opens
- Schedule hide when dialog closes"
```

---

### Task 3: Update Template with Auto-Hide Behavior

**Files:**
- Modify: `code/client/src/components/editor/TipTapEditor.vue:262-418`

- [ ] **Step 1: Wrap toolbar with visibility class and event listeners**

Replace lines 265-396 (the entire toolbar div) with:

```vue
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
```

- [ ] **Step 2: Update EditorContent to add focus/blur handlers and scroll container**

Replace lines 398-399 with:

```vue
    <!-- ====== 编辑区 ====== -->
    <div ref="editorContainer" class="editor-scroll-container" @scroll="handleScroll">
      <EditorContent 
        :editor="editor"
        @focus="handleEditorFocus"
        @blur="handleEditorBlur"
      />
    </div>
```

- [ ] **Step 3: Commit**

```bash
git add code/client/src/components/editor/TipTapEditor.vue
git commit -m "feat: add auto-hide behavior to toolbar template

- Add toolbar-visible class binding
- Add mouseenter/mouseleave event listeners
- Add focus/blur handlers to EditorContent
- Wrap editor in scroll container with scroll handler"
```

---

### Task 4: Update CSS for Auto-Hide Animations and Theme Support

**Files:**
- Modify: `code/client/src/components/editor/TipTapEditor.vue:420-731`

- [ ] **Step 1: Update .yuque-toolbar CSS for auto-hide**

Replace lines 427-440 with:

```css
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
```

- [ ] **Step 2: Update separator colors to use CSS variables**

Replace lines 443-450 with:

```css
/* 分隔符 */
.tb-sep {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: var(--border-default);
  margin: 0 5px;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Update button colors to use CSS variables**

Replace lines 473-498 with:

```css
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
```

- [ ] **Step 4: Add scroll container CSS**

Add this after the `.editor-root` rule (after line 424):

```css
/* Scroll container for editor */
.editor-scroll-container {
  position: relative;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}
```

- [ ] **Step 5: Commit**

```bash
git add code/client/src/components/editor/TipTapEditor.vue
git commit -m "feat: update toolbar CSS for auto-hide and theme support

- Add CSS transitions for show/hide animations
- Change toolbar background to use var(--bg-editor)
- Update button colors to use CSS variables
- Add scroll container styling
- Replace hardcoded colors with theme variables"
```

---

### Task 5: Update onSelectionUpdate to Show Toolbar on Text Selection

**Files:**
- Modify: `code/client/src/components/editor/TipTapEditor.vue:130-133`

- [ ] **Step 1: Update onSelectionUpdate callback**

Replace lines 130-133 with:

```typescript
  onSelectionUpdate: ({ editor: ed }) => {
    // Show toolbar when text is selected
    if (!ed.state.selection.empty) {
      showToolbar()
    }
    checkSlashCommand(ed)
  },
```

- [ ] **Step 2: Commit**

```bash
git add code/client/src/components/editor/TipTapEditor.vue
git commit -m "feat: show toolbar on text selection

- Update onSelectionUpdate to call showToolbar()
- Toolbar appears immediately when user selects text"
```

---

### Task 6: Visual Testing and Verification

**Files:**
- No file changes - manual testing only

- [ ] **Step 1: Start development server**

```bash
cd code/client
npm run dev
```

- [ ] **Step 2: Test auto-hide behavior**

Open browser at `http://localhost:5173` and verify:

1. ✅ Load page → toolbar is hidden (opacity: 0, translated up)
2. ✅ Click editor → toolbar slides down smoothly (≤250ms)
3. ✅ Type for 3 seconds → toolbar auto-hides after 2.5s
4. ✅ Hover toolbar → stays visible (no auto-hide)
5. ✅ Leave toolbar → hides after 2.5s
6. ✅ Select text → toolbar shows immediately
7. ✅ Click link button → dialog opens, toolbar stays visible
8. ✅ Close link dialog → toolbar schedules hide
9. ✅ Scroll down 200px → toolbar hides
10. ✅ Tab navigation → toolbar shows on focus

- [ ] **Step 3: Test theme switching**

1. ✅ Switch to light theme → toolbar has white/light background
2. ✅ Switch to dark theme → toolbar has dark background
3. ✅ All button colors adapt to theme
4. ✅ Separators use correct theme colors

- [ ] **Step 4: Test existing features**

1. ✅ Slash command menu (type `/`) still works
2. ✅ All formatting buttons work (Bold, Italic, etc.)
3. ✅ Heading dropdown works
4. ✅ Color pickers work
5. ✅ Align dropdown works
6. ✅ List buttons work
7. ✅ Table insertion works
8. ✅ Table bubble menu works
9. ✅ Emoji picker works
10. ✅ Image upload works

- [ ] **Step 5: Check for console errors**

Open browser DevTools → Console tab, verify:
- ✅ No JavaScript errors
- ✅ No Vue warnings
- ✅ No TipTap errors

- [ ] **Step 6: Commit (documentation)**

```bash
git add .
git commit -m "docs: verify auto-hide toolbar functionality

- All acceptance criteria met
- Theme switching works correctly
- All existing features preserved
- No console errors"
```

---

## Self-Review Checklist

### 1. Spec Coverage

✅ Toolbar hidden by default - Task 1 (isToolbarVisible = false)  
✅ Shows on focus/hover/selection - Task 3 (event handlers), Task 5 (selection)  
✅ Auto-hides after 2.5s - Task 1 (HIDE_DELAY = 2500, scheduleHide)  
✅ Smooth CSS transitions - Task 4 (transform + opacity, 0.25s)  
✅ Background matches editor - Task 4 (var(--bg-editor))  
✅ All colors use CSS variables - Task 4 (tb-btn, tb-sep updates)  
✅ Modal dialogs keep toolbar visible - Task 2 (watch showLinkDialog)  
✅ Scroll hides toolbar - Task 1 (handleScroll function)  
✅ Cleanup on unmount - Task 1 (onBeforeUnmount)  
✅ All existing features preserved - Task 6 (testing checklist)  

### 2. Placeholder Scan

No placeholders found. All steps contain complete code.

### 3. Type Consistency

✅ `isToolbarVisible` is `Ref<boolean>` - consistent throughout  
✅ `hideTimeout` and `focusDebounce` use `ReturnType<typeof setTimeout>` - TypeScript safe  
✅ `HIDE_DELAY` is constant 2500 - used consistently  
✅ Function signatures match usage in template  
✅ CSS class names match between template and styles  

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-auto-hide-toolbar-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
