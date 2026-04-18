<!-- ===================================================
     EmojiPicker — Emoji 选择器（深色工具栏适配）

     功能：
     - 弹出式 Emoji 选择面板
     - 支持搜索
     - 点击插入到编辑器
     =================================================== -->

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface Props {
  editor: any
}

const props = defineProps<Props>()

const showPicker = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)

const emojiCategories = [
  {
    name: '最近使用',
    emojis: ['👍', '❤️', '😂', '🎉', '🤔', '👏', '🔥', '✅', '⭐', '💡']
  },
  {
    name: '表情',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳']
  },
  {
    name: '手势',
    emojis: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿']
  },
  {
    name: '物体',
    emojis: ['💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨']
  },
  {
    name: '符号',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐']
  },
]

const searchQuery = ref('')

const filteredEmojis = computed(() => {
  if (!searchQuery.value) return null
  const allEmojis = emojiCategories.flatMap(cat => cat.emojis)
  return allEmojis.filter(emoji => emoji.includes(searchQuery.value))
})

function insertEmoji(emoji: string) {
  props.editor.chain().focus().insertContent(emoji).run()
  showPicker.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (
    pickerRef.value && !pickerRef.value.contains(target) &&
    buttonRef.value && !buttonRef.value.contains(target)
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
      ref="buttonRef"
      class="emoji-trigger"
      :class="{ active: showPicker }"
      @click.stop="showPicker = !showPicker"
      title="插入 Emoji"
    >
      <span class="emoji-icon">😊</span>
    </button>

    <div v-if="showPicker" ref="pickerRef" class="emoji-panel">
      <div class="emoji-search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 Emoji..."
          class="emoji-search-input"
        >
      </div>
      <div class="emoji-list">
        <div v-if="searchQuery && filteredEmojis" class="emoji-grid">
          <button
            v-for="emoji in filteredEmojis"
            :key="emoji"
            class="emoji-item"
            @click="insertEmoji(emoji)"
          >{{ emoji }}</button>
        </div>
        <div v-else>
          <div v-for="category in emojiCategories" :key="category.name" class="emoji-category">
            <div class="emoji-category-name">{{ category.name }}</div>
            <div class="emoji-grid">
              <button
                v-for="emoji in category.emojis"
                :key="emoji"
                class="emoji-item"
                @click="insertEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emoji-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.emoji-trigger:hover { background: rgba(255,255,255,0.1); }
.emoji-trigger.active { background: rgba(255,255,255,0.15); }
.emoji-icon { font-size: 15px; line-height: 1; }

.emoji-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  width: 320px;
  background: #2d2d3d;
  border: 1px solid #3f3f5a;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  overflow: hidden;
}

.emoji-search {
  padding: 10px;
  border-bottom: 1px solid #3f3f5a;
}
.emoji-search-input {
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  background: #1e1e2e;
  border: 1px solid #3f3f5a;
  border-radius: 6px;
  color: #d1d5db;
  outline: none;
}
.emoji-search-input::placeholder { color: #6b7280; }
.emoji-search-input:focus { border-color: #60a5fa; }

.emoji-list {
  max-height: 260px;
  overflow-y: auto;
  padding: 8px;
}

.emoji-category { margin-bottom: 12px; }
.emoji-category-name { font-size: 11px; color: #6b7280; margin-bottom: 6px; padding-left: 2px; }

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.emoji-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.emoji-item:hover { background: rgba(255,255,255,0.1); }
</style>
