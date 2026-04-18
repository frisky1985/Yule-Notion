<!-- ===================================================
     LinkDialog — 链接插入对话框

     功能：
     - 输入链接 URL 和文本
     - 支持修改现有链接
     - 支持取消链接
     =================================================== -->

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  editor: any
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const url = ref('')
const text = ref('')
const isEditing = ref(false)

// 监听显示状态
watch(() => props.show, (show) => {
  if (show && props.editor) {
    const { state } = props.editor
    const { selection } = state
    const { from, to } = selection

    // 获取选中的文本
    const selectedText = state.doc.textBetween(from, to, ' ')
    text.value = selectedText

    // 检查是否已有链接
    const linkMark = props.editor.getAttributes('link')
    if (linkMark.href) {
      url.value = linkMark.href
      isEditing.value = true
    } else {
      url.value = ''
      isEditing.value = false
    }
  }
})

// 插入链接
function insertLink() {
  if (!url.value) return

  if (text.value && !props.editor.state.selection.empty) {
    // 如果有选中文本，直接设置链接
    props.editor.chain().focus().setLink({ href: url.value }).run()
  } else if (text.value) {
    // 如果没有选中文本但有输入文本，插入带链接的文本
    props.editor.chain().focus().insertContent({
      type: 'text',
      text: text.value,
      marks: [{ type: 'link', attrs: { href: url.value } }]
    }).run()
  } else {
    // 只设置链接
    props.editor.chain().focus().setLink({ href: url.value }).run()
  }

  close()
}

// 取消链接
function unsetLink() {
  props.editor.chain().focus().unsetLink().run()
  close()
}

// 关闭对话框
function close() {
  url.value = ''
  text.value = ''
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="close"
    >
      <div class="bg-white rounded-xl shadow-xl w-96 max-w-[90vw] p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ isEditing ? '编辑链接' : '插入链接' }}
        </h3>

        <div class="space-y-4">
          <!-- URL 输入 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              链接地址
            </label>
            <input
              v-model="url"
              type="url"
              placeholder="https://example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              @keydown.enter="insertLink"
            >
          </div>

          <!-- 文本输入 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              显示文本（可选）
            </label>
            <input
              v-model="text"
              type="text"
              placeholder="链接文字"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              @keydown.enter="insertLink"
            >
          </div>
        </div>

        <!-- 按钮 -->
        <div class="flex items-center justify-end gap-2 mt-6">
          <button
            v-if="isEditing"
            class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            @click="unsetLink"
          >
            移除链接
          </button>
          <button
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="close"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            :disabled="!url"
            @click="insertLink"
          >
            {{ isEditing ? '更新' : '插入' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
