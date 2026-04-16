import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vite 配置
 * - 开发代理：/api → http://localhost:3000
 * - UnoCSS 原子化 CSS
 * - Vue 3 SFC 支持
 */
export default defineConfig({
  base: '/Yule-Notion/',
  plugins: [
    vue(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      // 路径别名 @ → src
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 开发环境 API 代理，将 /api 请求转发到后端服务
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {},
  },
})
