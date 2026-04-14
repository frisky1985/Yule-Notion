# 细化设计文档 — M1 里程碑（脚手架 + 用户系统）

> **版本：** v1.0  
> **设计者：** code_designer  
> **日期：** 2026-03-19  
> **架构版本：** ARCHITECTURE.md v1.0  
> **API 版本：** API-SPEC.md v1.0  

---

## 一、M1 范围

### 1.1 本期目标

搭建项目基础架构，实现用户认证全流程，为后续编辑器和页面管理功能奠定基础。

### 1.2 交付清单

| 模块 | 交付物 | 优先级 |
|------|--------|--------|
| Monorepo | 根 package.json + pnpm-workspace.yaml + .gitignore | P0 |
| 后端 | Express + Knex.js + TypeScript 脚手架 | P0 |
| 后端 | 用户注册/登录/获取当前用户 API（3个接口） | P0 |
| 后端 | JWT 认证中间件 | P0 |
| 后端 | Knex 迁移（6张表 + 触发器） | P0 |
| 后端 | Zod 参数验证 + 统一错误处理 | P0 |
| 前端 | Vue 3 + Vite + TypeScript 脚手架 | P0 |
| 前端 | 登录/注册页面 + 表单验证 | P0 |
| 前端 | Pinia 认证状态管理 | P0 |
| 前端 | Axios 实例 + Token 注入 + 401 拦截 | P0 |
| 前端 | Vue Router + 导航守卫 | P0 |

### 1.3 不在本期范围

- 页面管理 CRUD
- TipTap 编辑器
- 标签系统
- 搜索功能
- 文件上传
- 导出功能
- 离线同步
- PWA
- Electron 桌面端

---

## 二、后端细化设计

### 2.1 项目结构

```
code/server/
├── package.json
├── tsconfig.json
├── knexfile.ts
├── src/
│   ├── index.ts               # 入口：创建 HTTP 服务器并监听
│   ├── app.ts                 # Express app：注册全局中间件和路由
│   ├── config/
│   │   └── index.ts           # 环境变量解析（zod schema）
│   ├── middleware/
│   │   ├── auth.ts            # JWT 鉴权：从 Authorization header 解码 token
│   │   ├── errorHandler.ts    # 全局错误处理：统一错误响应格式
│   │   └── validate.ts        # 请求验证：将 zod schema 转为中间件
│   ├── routes/
│   │   └── auth.routes.ts     # POST /register, POST /login, GET /me
│   ├── controllers/
│   │   └── auth.controller.ts # 处理请求，调用 service，返回响应
│   ├── services/
│   │   └── auth.service.ts    # 业务逻辑：注册、登录、获取用户
│   ├── db/
│   │   ├── connection.ts      # 导出 Knex 实例（单例）
│   │   └── migrations/
│   │       └── 20260319_init.ts
│   └── types/
│       └── index.ts           # AppError 类 + 错误码枚举 + 接口类型
└── uploads/
    └── .gitkeep
```

### 2.2 模块职责

#### app.ts — Express 应用配置

注册顺序：
1. helmet() — 安全头
2. cors() — 跨域
3. express.json() — JSON 解析
4. express-rate-limit() — 速率限制
5. pino logger 中间件 — 请求日志
6. /api/v1/* 路由
7. errorHandler — 全局错误兜底

#### config/index.ts — 环境变量

使用 zod schema 验证：
```
PORT          : number (默认 3000)
DATABASE_URL  : string
JWT_SECRET    : string
JWT_EXPIRES_IN: string (默认 '7d')
NODE_ENV      : 'development' | 'production' | 'test'
```

#### middleware/auth.ts — JWT 中间件

流程：
1. 从 `Authorization: Bearer <token>` 提取 token
2. jwt.verify() 验证并解码
3. 将 `{ userId, email }` 挂载到 `req.user`
4. token 无效/过期 → 抛出 401 AppError

#### middleware/errorHandler.ts — 全局错误处理

- 捕获 AppError → 返回对应状态码和错误码
- 捕获 ZodError → 返回 400 VALIDATION_ERROR
- 捕获其他未知错误 → 返回 500 INTERNAL_ERROR（生产环境不暴露堆栈）

#### middleware/validate.ts — Zod 验证中间件

- 接收一个 zod schema，返回 Express 中间件
- 验证 req.body / req.params / req.query
- 失败抛出 400 VALIDATION_ERROR

#### services/auth.service.ts — 认证服务

| 方法 | 逻辑 |
|------|------|
| register(email, password, name) | 1. 检查邮箱是否已存在 → 2. bcrypt 加密密码 → 3. 插入 users 表 → 4. 生成 JWT → 5. 返回 token + user |
| login(email, password) | 1. 查询用户 → 2. bcrypt.compare 验证密码 → 3. 生成 JWT → 4. 返回 token + user |
| getMe(userId) | 1. 查询 users 表 → 2. 返回用户信息（不含 password_hash） |

### 2.3 数据库迁移

将 DDL 转换为 Knex migration：
- 使用 knex.schema.createTable() 创建 6 张表
- 使用 knex.raw() 创建扩展（uuid-ossp, pg_trgm）和触发器
- 使用 knex.schema.createIndex() 创建索引
- up() + down() 完整可回滚

### 2.4 API 接口验证 Schema

#### 注册验证
```typescript
z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码需含大小写字母和数字'),
  name: z.string().min(1).max(50)
})
```

#### 登录验证
```typescript
z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
```

### 2.5 错误码映射

| 业务错误 | HTTP | code |
|----------|------|------|
| 参数验证失败 | 400 | VALIDATION_ERROR |
| 邮箱已注册 | 409 | EMAIL_ALREADY_EXISTS |
| 邮箱或密码错误 | 401 | INVALID_CREDENTIALS |
| Token 无效/过期 | 401 | UNAUTHORIZED |
| 用户不存在 | 404 | RESOURCE_NOT_FOUND |
| 服务器异常 | 500 | INTERNAL_ERROR |

---

## 三、前端细化设计

### 3.1 项目结构

```
code/client/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── env.d.ts
├── uno.config.ts
├── public/
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   └── auth.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.service.ts
│   ├── views/
│   │   ├── LoginView.vue
│   │   ├── RegisterView.vue
│   │   └── DashboardView.vue
│   ├── components/
│   │   └── common/
│   │       └── AppAlert.vue
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── main.css
```

### 3.2 模块职责

#### router/index.ts — 路由配置

路由表：
- `/` → redirect to `/login`
- `/login` → LoginView
- `/register` → RegisterView
- `/dashboard` → DashboardView (meta: { requiresAuth: true })

导航守卫 (beforeEach)：
```typescript
if (to.meta.requiresAuth && !authStore.token) {
  return '/login'
}
```

#### stores/auth.ts — 认证状态 (Pinia Setup 语法)

```typescript
// State
token: ref<string | null>(localStorage.getItem('token'))
user: ref<User | null>(null)

// Actions
async login(email, password) → authApi.login() → setToken + setUser + router.push('/dashboard')
async register(email, password, name) → authApi.register() → setToken + setUser + router.push('/dashboard')
async fetchMe() → authApi.getMe() → setUser
logout() → clearToken + clearUser + router.push('/login')
```

#### services/api.ts — Axios 实例

```typescript
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// 请求拦截：注入 Bearer token
// 响应拦截：401 → authStore.logout() + router.push('/login')
```

#### services/auth.service.ts — 认证 API

```typescript
login(data) → POST /auth/login
register(data) → POST /auth/register
getMe() → GET /auth/me
```

#### views/LoginView.vue — 登录页

- 邮箱 + 密码表单
- ref 管理表单数据，手动验证
- loading 状态管理（防止重复提交）
- 错误显示
- 切换到注册页链接

#### views/RegisterView.vue — 注册页

- 邮箱 + 密码 + 确认密码 + 用户名表单
- 密码强度实时提示
- 注册成功自动登录
- 切换到登录页链接

### 3.3 UI 设计规范

| 元素 | 样式 |
|------|------|
| 背景 | #f8fafc（浅灰） |
| 卡片 | 白色、圆角 12px、阴影 shadow-lg |
| 主按钮 | bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-2.5 |
| 输入框 | border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent |
| 错误文本 | text-red-500 text-sm mt-1 |
| 链接 | text-blue-500 hover:text-blue-700 underline |
| 标题 | text-2xl font-bold text-gray-800 |
| Logo/品牌 | text-3xl "📝 予乐" 在卡片顶部 |

### 3.4 TypeScript 类型

```typescript
// 前后端共享的类型定义
interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AuthResponse {
  token: string
  user: User
}

interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}
```

---

## 四、集成要点

### 4.1 前后端联调

1. 后端启动：`cd code/server && pnpm dev` → 监听 3000
2. 前端启动：`cd code/client && pnpm dev` → 监听 5173
3. Vite proxy 将 `/api` 代理到 `http://localhost:3000`
4. 前端开发环境跨域由 Vite proxy 解决

### 4.2 数据库准备

```bash
# 启动 PostgreSQL 后执行迁移
cd code/server
pnpm migrate
```

### 4.3 后续迭代预留

- services/ 目录已预留，后续添加 pages/search/tags 等模块
- stores/ 目录已预留，后续添加 pages/editor/sync
- views/ 目录已预留，后续添加编辑器页面
- middleware/validate.ts 通用化，后续模块直接复用

---

## 五、风险与注意事项

| 项目 | 风险 | 对策 |
|------|------|------|
| bcrypt 在 Node.js 中 CPU 密集 | 高并发注册时阻塞事件循环 | MVP 阶段用户量小，无需担忧；后续可改用 bcrypt.compareAsync 或 Worker |
| JWT Secret 硬编码 | 安全风险 | config 中强制 production 环境必须设置环境变量 |
| Knex 迁移中 raw SQL | PostgreSQL 专有语法 | 架构已确定使用 PostgreSQL，无兼容性问题 |

---

_细化设计 v1.0 \| code_designer \| 2026-03-19_
