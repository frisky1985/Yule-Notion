import {
  defineConfig,
  presetUno,
  presetIcons,
} from 'unocss'

/**
 * UnoCSS 配置
 * - presetUno: 默认预设，包含 Tailwind CSS / Windi CSS 兼容语法
 * - presetIcons: 图标预设，支持 lucide 图标等
 */
export default defineConfig({
  presets: [
    // Tailwind 兼容语法预设
    presetUno(),
    // 图标预设：使用 i-lucide-xxx 格式引用图标
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  // 自定义主题扩展
  theme: {
    colors: {
      // 主色调：品牌蓝
      primary: {
        DEFAULT: '#3b82f6',
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
    },
  },
  // 快捷方式
  shortcuts: {
    // 输入框基础样式
    'input-base': 'w-full px-3 py-2 rounded-md border border-gray-300 text-sm outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20',
    // 按钮基础样式
    'btn-primary': 'inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium transition-colors duration-200 hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-secondary': 'inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium transition-colors duration-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
    // 卡片容器
    'auth-card': 'w-full max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-100',
  },
})
