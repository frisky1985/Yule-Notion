<!-- ===================================================
     ImageUpload — 图片上传组件（深色工具栏适配）

     功能：
     - 点击上传图片
     - 支持粘贴图片
     =================================================== -->

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  editor: any
}

const props = defineProps<Props>()
const fileInput = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    uploadFiles(Array.from(files))
  }
  // 重置 input 以允许选择相同文件
  if (target) target.value = ''
}

function uploadFiles(files: File[]) {
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        props.editor.chain().focus().setImage({ src: result }).run()
      }
    }
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <div class="relative">
    <button
      class="image-trigger"
      title="插入图片"
      @click="triggerUpload"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleFileSelect"
    >
  </div>
</template>

<style scoped>
.image-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #d1d5db;
  cursor: pointer;
  transition: background 0.15s;
}
.image-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
}
.hidden { display: none; }
</style>
