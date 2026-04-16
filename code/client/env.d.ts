/// <reference types="vite/client" />

/**
 * 环境类型声明
 * - 声明 .vue 文件的模块类型，让 TypeScript 识别 SFC
 */

// 声明所有 .vue 文件为 Vue SFC 模块
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// 声明 Vite 环境变量类型
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
    readonly url: string
  }
}
