# Auto-Hide Editor Toolbar Design

**Date:** 2026-04-18  
**Status:** Approved  
**Component:** TipTapEditor.vue

## Overview

Transform the editor toolbar from always-visible dark-themed bar to an auto-hide toolbar that matches the editor background, providing a distraction-free writing experience similar to Notion/Obsidian.

## Problem Statement

Current implementation has a dark toolbar (`#1e1e2e`) that creates visual dissonance with the light editor background. The toolbar is always visible, which can be distracting during writing.

## Solution

Implement auto-hide behavior with smooth animations:
- Toolbar hidden by default
- Appears on editor focus/hover/selection
- Auto-hides after 2.5s of inactivity
- Background matches editor theme via CSS variables

## Architecture

### State Management

```typescript
const isToolbarVisible = ref(false)
let hideTimeout: NodeJS.Timeout | null = null
const HIDE_DELAY = 2500 // milliseconds
```

### Visibility Triggers

**Show toolbar when:**
- Editor receives focus
- Mouse enters toolbar area
- Text selection changes
- Modal dialogs open (LinkDialog, EmojiPicker, etc.)

**Hide toolbar when:**
- Editor loses focus + timeout expires
- Mouse leaves toolbar area + timeout expires
- User scrolls down >100px
- Inactivity timer expires (2.5s)

### Event Handlers

```typescript
function showToolbar() {
  cancelHide()
  isToolbarVisible.value = true
}

function scheduleHide() {
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
  showToolbar()
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
```

## CSS Implementation

### Toolbar Container

**Before:**
```css
.yuque-toolbar {
  background: #1e1e2e;
  position: sticky;
  top: 0;
  /* Always visible */
}
```

**After:**
```css
.yuque-toolbar {
  background: var(--bg-editor);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
  
  /* Animation */
  transform: translateY(-100%);
  opacity: 0;
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.yuque-toolbar.toolbar-visible {
  transform: translateY(0);
  opacity: 1;
}
```

### Button Colors (Theme-Aware)

**Before (hardcoded dark theme):**
```css
.tb-btn {
  color: #a1a1b5;
}
.tb-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e5ef;
}
.tb-btn.active {
  background: rgba(96, 165, 250, 0.18);
  color: #60a5fa;
}
.tb-sep {
  background: #3f3f5a;
}
```

**After (CSS variables):**
```css
.tb-btn {
  color: var(--text-secondary);
}
.tb-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.tb-btn.active {
  background: var(--color-active-bg);
  color: var(--color-active);
}
.tb-sep {
  background: var(--border-default);
}
```

## Template Changes

Wrap toolbar in container with event listeners:

```vue
<template>
  <div class="editor-root">
    <!-- Toolbar with auto-hide -->
    <div 
      v-if="editor" 
      class="yuque-toolbar"
      :class="{ 'toolbar-visible': isToolbarVisible }"
      @mouseenter="handleToolbarEnter"
      @mouseleave="handleToolbarLeave"
    >
      <!-- ... existing toolbar buttons ... -->
    </div>

    <!-- Editor content with focus/blur -->
    <EditorContent 
      :editor="editor"
      @focus="handleEditorFocus"
      @blur="handleEditorBlur"
    />
    
    <!-- ... rest of template unchanged ... -->
  </div>
</template>
```

## Edge Cases

### 1. Modal Dialogs
When LinkDialog, EmojiPicker, or ImageUpload are open, keep toolbar visible:

```typescript
watch([showLinkDialog, showEmojiPicker, showImageUpload], ([link, emoji, image]) => {
  if (link || emoji || image) {
    cancelHide()
    isToolbarVisible.value = true
  } else {
    scheduleHide()
  }
})
```

### 2. Rapid Focus/Blur
Debounce prevents flickering:

```typescript
let focusDebounce: NodeJS.Timeout | null = null

function handleEditorFocus() {
  if (focusDebounce) clearTimeout(focusDebounce)
  focusDebounce = setTimeout(showToolbar, 50)
}
```

### 3. Scroll Behavior
Hide toolbar when scrolling down:

```typescript
const editorContainer = ref<HTMLElement | null>(null)

function handleScroll() {
  const scrollTop = editorContainer.value?.scrollTop || 0
  if (scrollTop > 100 && isToolbarVisible.value) {
    hideToolbar()
  }
}
```

### 4. Text Selection
Show toolbar immediately on selection:

```typescript
onSelectionUpdate: ({ editor: ed }) => {
  if (!ed.state.selection.empty) {
    showToolbar()
  }
  checkSlashCommand(ed)
}
```

## Performance Optimizations

1. **CSS transitions:** Only animate `transform` and `opacity` (GPU-accelerated)
2. **Debounced events:** Scroll handler throttled to 16ms (60fps)
3. **Event cleanup:** Proper `onUnmounted` cleanup prevents memory leaks
4. **No v-if re-render:** Visibility controlled via CSS class, not conditional rendering

## Testing Checklist

- [ ] Load page → toolbar hidden
- [ ] Click editor → toolbar slides down smoothly  
- [ ] Type for 3 seconds → toolbar auto-hides
- [ ] Hover toolbar → stays visible
- [ ] Leave toolbar → hides after 2.5s
- [ ] Switch themes (light/dark) → toolbar colors update
- [ ] Open emoji picker → toolbar stays visible
- [ ] Scroll down 200px → toolbar hides
- [ ] Select text → toolbar shows immediately
- [ ] Press Ctrl+N → new note, toolbar hidden initially
- [ ] Tab navigation → toolbar shows on focus

## Migration Path

**No breaking changes:**
- All existing functionality preserved
- Slash command menu works unchanged
- Table bubble menu unaffected
- All dropdown menus functional
- Plus button, emoji picker, image upload work

**Backwards compatible:**
- If issues arise, can revert to always-visible by setting `isToolbarVisible = true` in initialization

## Files Modified

1. `code/client/src/components/editor/TipTapEditor.vue`
   - Add state management for toolbar visibility
   - Add event handlers (focus, blur, mouseenter, mouseleave, scroll)
   - Update CSS to use variables and transitions
   - Wrap toolbar in container with listeners

## Success Criteria

✅ Toolbar hidden by default on page load  
✅ Smooth animation on show/hide (≤250ms)  
✅ Auto-hides after 2.5s inactivity  
✅ All colors use CSS variables (theme-aware)  
✅ No performance degradation  
✅ All existing features work unchanged  
✅ Works in both light and dark themes  
