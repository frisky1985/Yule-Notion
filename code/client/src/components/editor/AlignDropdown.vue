<!-- ===================================================
     AlignDropdown — 文字对齐下拉菜单

     功能：
     - 左对齐 / 居中 / 右对齐 / 两端对齐
     - 语雀风格深色下拉
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

const alignments = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
  { value: 'justify', label: '两端对齐' },
]

const currentAlign = computed(() => {
  for (const a of alignments) {
    if (props.editor?.isActive({ textAlign: a.value })) return a.value
  }
  return 'left'
})

function setAlign(value: string) {
  props.editor.chain().focus().setTextAlign(value).run()
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
      class="align-trigger"
      @click.stop="showDropdown = !showDropdown"
      title="对齐方式"
    >
      <!-- 对齐图标：根据当前对齐方式变化 -->
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <template v-if="currentAlign === 'left'">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
        </template>
        <template v-else-if="currentAlign === 'center'">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </template>
        <template v-else-if="currentAlign === 'right'">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
        </template>
        <template v-else>
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </template>
      </svg>
      <svg class="dropdown-arrow" width="8" height="8" viewBox="0 0 8 8">
        <path d="M1.5 3L4 5.5L6.5 3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="showDropdown" ref="dropdownRef" class="align-dropdown">
      <button
        v-for="a in alignments"
        :key="a.value"
        class="align-option"
        :class="{ active: currentAlign === a.value }"
        @click="setAlign(a.value)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <template v-if="a.value === 'left'">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
          </template>
          <template v-else-if="a.value === 'center'">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </template>
          <template v-else-if="a.value === 'right'">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
          </template>
          <template v-else>
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </template>
        </svg>
        <span>{{ a.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.align-trigger {
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
}
.align-trigger:hover { background: rgba(255,255,255,0.1); }

.dropdown-arrow { color: #9ca3af; }

.align-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: #2d2d3d;
  border: 1px solid #3f3f5a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  padding: 4px;
  min-width: 120px;
}

.align-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 5px;
  color: #d1d5db;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.1s;
}
.align-option:hover { background: rgba(255,255,255,0.08); }
.align-option.active { background: rgba(96,165,250,0.15); color: #60a5fa; }
</style>
