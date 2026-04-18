/* ===================================================
 * TypeScript 类型定义
 * 集中管理项目中使用的接口和类型
 * =================================================== */

/** 用户信息 */
export interface User {
  /** 用户唯一标识 */
  id: string
  /** 用户邮箱 */
  email: string
  /** 用户名 */
  name: string
  /** 注册时间 (ISO 8601) */
  createdAt: string
}

/** 登录请求参数 */
export interface LoginParams {
  email: string
  password: string
}

/** 注册请求参数 */
export interface RegisterParams {
  email: string
  password: string
  name: string
}

/** 登录/注册成功响应（后端返回） */
export interface AuthResponse {
  /** JWT 访问令牌 */
  token: string
  /** 用户信息 */
  user: User
}

/** API 错误响应详情项 */
export interface ErrorDetail {
  /** 字段名 */
  field: string
  /** 错误描述 */
  message: string
}

/** API 统一错误响应（与后端 API-SPEC 1.2 完全对齐） */
export interface ApiErrorResponse {
  error: {
    /** 错误码枚举（如 VALIDATION_ERROR、UNAUTHORIZED 等） */
    code: string
    /** 人类可读的错误消息 */
    message: string
    /** 详细字段错误列表 */
    details?: ErrorDetail[]
  }
}

/** 提示消息类型 */
export type AlertType = 'success' | 'error' | 'warning' | 'info'

/** 提示消息接口 */
export interface AlertMessage {
  /** 消息类型 */
  type: AlertType
  /** 消息内容 */
  text: string
  /** 唯一标识（用于关闭指定消息） */
  id: number
}

/** 笔记页面 */
export interface Page {
  /** 页面唯一标识 */
  id: string
  /** 页面标题 */
  title: string
  /** 页面内容 (TipTap JSON) */
  content: Record<string, unknown>
  /** 父页面ID */
  parentId?: string
  /** 排序顺序 */
  order: number
  /** 页面图标 */
  icon: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 创建笔记参数 */
export interface CreatePageParams {
  /** 页面标题 */
  title: string
  /** 父页面ID */
  parentId?: string
  /** 页面图标 */
  icon?: string
}
