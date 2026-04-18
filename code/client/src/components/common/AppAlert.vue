<!-- ===================================================
     AppAlert — 全局提示组件（替代 alert/confirm）

     功能：
     - 支持多种消息类型：success / error / warning / info
     - 自动消失（3 秒后）
     - 手动关闭
     - 多条消息堆叠显示
     =================================================== -->

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AlertMessage } from '@/types'

/** 组件属性 */
interface Props {
  /** 提示消息列表 */
  alerts?: AlertMessage[]
}

const props = withDefaults(defineProps<Props>(), {
  alerts: () => [],
})

/** 组件事件 */
const emit = defineEmits<{
  /** 关闭指定消息 */
  (e: 'dismiss', id: number): void
}>()

/** 自动消失计时器 ID 映射 */
const timers = ref<Map<number, ReturnType<typeof setTimeout>>>(new Map())

/**
 * 关闭提示消息
 * @param id - 消息唯一标识
 */
function dismiss(id: number) {
  // 清除自动消失计时器
  const timer = timers.value.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.value.delete(id)
  }
  emit('dismiss', id)
}

/**
 * 设置自动消失计时器
 * @param alert - 提示消息
 */
function startTimer(alert: AlertMessage) {
  const timer = setTimeout(() => {
    dismiss(alert.id)
  }, 3000) // 3 秒后自动消失
  timers.value.set(alert.id, timer)
}

// 监听消息变化，为新增消息设置计时器
// 使用 watch 替代 setup 中的 forEach，确保组件挂载后新增的消息也能触发自动消失
watch(
  () => props.alerts,
  (newAlerts) => {
    newAlerts.forEach((alert) => {
      if (!timers.value.has(alert.id)) {
        startTimer(alert)
      }
    })
  },
  { immediate: true },
)
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
    <TransitionGroup
      name="alert"
      tag="div"
      class="flex flex-col gap-2"
    >
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm border backdrop-blur-sm"
        :class="{
          'bg-green-50 border-green-200 text-green-800': alert.type === 'success',
          'bg-red-50 border-red-200 text-red-800': alert.type === 'error',
          'bg-yellow-50 border-yellow-200 text-yellow-800': alert.type === 'warning',
          'bg-blue-50 border-blue-200 text-blue-800': alert.type === 'info',
        }"
      >
        <!-- 消息内容 -->
        <span class="flex-1">{{ alert.text }}</span>

        <!-- 关闭按钮 -->
        <button
          class="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
          @click="dismiss(alert.id)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* 提示消息进出动画 */
.alert-enter-active {
  transition: all 0.3s ease-out;
}
.alert-leave-active {
  transition: all 0.2s ease-in;
}
.alert-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.alert-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
