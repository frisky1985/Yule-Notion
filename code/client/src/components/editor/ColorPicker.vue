<!-- ===================================================
     ColorPicker — 文字颜色 / 背景色选择器

     功能：
     - 语雀风格颜色选择面板
     - 支持文字颜色和背景高亮
     =================================================== -->

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  editor: any
  mode: 'color' | 'highlight'
}

const props = defineProps<Props>()

const showPicker = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

const textColors = [
  { label: '默认', value: '' },
  { label: '灰色', value: '#6b7280' },
  { label: '红色', value: '#ef4444' },
  { label: '橙色', value: '#f97316' },
  { label: '黄色', value: '#eab308' },
  { label: '绿色', value: '#22c55e' },
  { label: '蓝色', value: '#3b82f6' },
  { label: '紫色', value: '#8b5cf6' },
  { label: '粉色', value: '#ec4899' },
]

const highlightColors = [
  { label: '无', value: '' },
  { label: '红色', value: '#fecaca' },
  { label: '橙色', value: '#fed7aa' },
  { label: '黄色', value: '#fef08a' },
  { label: '绿色', value: '#bbf7d0' },
  { label: '蓝色', value: '#bfdbfe' },
  { label: '紫色', value: '#ddd6fe' },
  { label: '粉色', value: '#fbcfe8' },
  { label: '灰色', value: '#e5e7eb' },
]

const colors = props.mode === 'color' ? textColors : highlightColors

function applyColor(color: string) {
  if (props.mode === 'color') {
    if (color) {
      props.editor.chain().focus().setColor(color).run()
    } else {
      props.editor.chain().focus().unsetColor().run()
    }
  } else {
    if (color) {
      props.editor.chain().focus().toggleHighlight({ color }).run()
    } else {
      props.editor.chain().focus().unsetHighlight().run()
    }
  }
  showPicker.value = false
}

function getCurrentColor(): string {
  if (props.mode === 'color') {
    return props.editor?.getAttributes('textStyle')?.color || ''
  }
  return props.editor?.getAttributes('highlight')?.color || ''
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (
    pickerRef.value && !pickerRef.value.contains(target) &&
    triggerRef.value && !triggerRef.value.contains(target)
  ) {
    showPicker.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      class="color-trigger"
      @click.stop="showPicker = !showPicker"
      :title="mode === 'color' ? '文字颜色' : '背景色'"
    >
      <!-- 文字颜色 A 图标 -->
      <svg v-if="mode === 'color'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h3l11-11-3-3L4 17v3z" />
        <path d="M15 6l3 3" />
      </svg>
      <!-- 高亮图标 -->
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <span class="color-indicator" :style="{ background: getCurrentColor() || (mode === 'color' ? '#e5e7eb' : '#e5e7eb') }" />
      <svg class="dropdown-arrow" width="8" height="8" viewBox="0 0 8 8">
        <path d="M1.5 3L4 5.5L6.5 3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="showPicker" ref="pickerRef" class="color-dropdown">
      <div class="color-grid">
        <button
          v-for="c in colors"
          :key="c.label"
          class="color-swatch"
          :class="{ active: getCurrentColor() === c.value, empty: !c.value }"
          :style="c.value ? { background: c.value } : {}"
          :title="c.label"
          @click="applyColor(c.value)"
        >
          <svg v-if="!c.value" width="12" height="12" viewBox="0 0 12 12" stroke="#9ca3af" stroke-width="1.5">
            <line x1="2" y1="2" x2="10" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-trigger {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #d1d5db;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}
.color-trigger:hover { background: rgba(255,255,255,0.1); }

.color-indicator {
  width: 14px;
  height: 3px;
  border-radius: 1px;
  position: absolute;
  bottom: 3px;
  left: 4px;
}

.dropdown-arrow { color: #9ca3af; flex-shrink: 0; }

.color-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: #2d2d3d;
  border: 1px solid #3f3f5a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  padding: 8px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, transform 0.1s;
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.active { border-color: #60a5fa; }
.color-swatch.empty { background: #3f3f5a; }
</style>
