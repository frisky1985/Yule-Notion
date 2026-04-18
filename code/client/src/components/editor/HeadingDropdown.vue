<!-- ===================================================
     HeadingDropdown — 段落格式下拉菜单（语雀深色风格）

     功能：
     - 显示当前块级格式（正文/标题1~6）
     - 下拉选择切换格式
     =================================================== -->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  editor: any
}

const props = defineProps<Props>()

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

const currentFormat = computed(() => {
  if (!props.editor) return '正文'
  for (let i = 1; i <= 6; i++) {
    if (props.editor.isActive('heading', { level: i })) return `标题 ${i}`
  }
  return '正文'
})

const options = [
  { label: '正文', size: '13px', weight: '400', action: () => props.editor.chain().focus().setParagraph().run() },
  { label: '标题 1', size: '18px', weight: '700', action: () => props.editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: '标题 2', size: '16px', weight: '700', action: () => props.editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: '标题 3', size: '15px', weight: '600', action: () => props.editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: '标题 4', size: '14px', weight: '600', action: () => props.editor.chain().focus().toggleHeading({ level: 4 }).run() },
  { label: '标题 5', size: '13px', weight: '600', action: () => props.editor.chain().focus().toggleHeading({ level: 5 }).run() },
  { label: '标题 6', size: '12px', weight: '600', action: () => props.editor.chain().focus().toggleHeading({ level: 6 }).run() },
]

function select(option: typeof options[number]) {
  option.action()
  showDropdown.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (
    dropdownRef.value && !dropdownRef.value.contains(target) &&
    triggerRef.value && !triggerRef.value.contains(target)
  ) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      class="heading-trigger"
      @click.stop="showDropdown = !showDropdown"
      title="段落格式"
    >
      <span class="heading-label">{{ currentFormat }}</span>
      <svg class="heading-arrow" :class="{ open: showDropdown }" width="10" height="10" viewBox="0 0 10 10">
        <path d="M2.5 4L5 6.5L7.5 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="showDropdown" ref="dropdownRef" class="heading-dropdown">
      <div
        v-for="option in options"
        :key="option.label"
        class="heading-option"
        :class="{ active: currentFormat === option.label }"
        :style="{ fontSize: option.size, fontWeight: option.weight }"
        @click="select(option)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.heading-trigger {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 8px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #d1d5db;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.heading-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
}

.heading-arrow {
  color: #9ca3af;
  transition: transform 0.2s;
}
.heading-arrow.open {
  transform: rotate(180deg);
}

.heading-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  min-width: 140px;
  background: #2d2d3d;
  border: 1px solid #3f3f5a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.heading-option {
  padding: 6px 10px;
  border-radius: 5px;
  color: #d1d5db;
  cursor: pointer;
  transition: background 0.1s;
  line-height: 1.4;
}
.heading-option:hover {
  background: rgba(255, 255, 255, 0.08);
}
.heading-option.active {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}
</style>
