# 技术架构设计文档 — 予乐 Yule Notion

> **版本：** v1.0  
> **架构师：** arch  
> **日期：** 2026-03-19  
> **状态：** 待评审  
> **PRD版本：** v1.0  
> **项目周期：** 2026-03-20 ~ 2026-03-27（7天 MVP）

---

## 一、架构总览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client)                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Web 浏览器  │  │  PWA 离线模式 │  │  Electron 桌面端       │  │
│  │  (Chrome 90+) │  │ (SW+IndexedDB)│  │ (macOS/Win/Linux)     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                       │              │
│  ┌──────┴─────────────────┴───────────────────────┴──────────┐  │
│  │              Vue 3 + Vite (SPA)                          │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────────┐  │  │
│  │  │ TipTap   │ │ 同步引擎  │ │ Pinia  │ │ Vue Router    │  │  │
│  │  │ 编辑器   │ │(SyncEngine)│ │ 状态管理│ │ 路由          │  │  │
│  │  └─────────┘ └──────────┘ └────────┘ └───────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │           IndexedDB (Dexie.js 封装)                 │ │  │
│  │  │  pages / tags / syncQueue / meta                    │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │ HTTPS                          │
└──────────────────────────────┼─────────────────────────────────┘
                               │
┌──────────────────────────────┼─────────────────────────────────┐
│                    服务端层 (Server)                            │
│                              │                                 │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │              Nginx (反向代理 + 静态资源)                   │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐  │  │
│  │  │ 静态文件服务          │  │ API 反向代理             │  │  │
│  │  │ /uploads/*           │  │ /api/* → :3000           │  │  │
│  │  └──────────────────────┘  └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │           Node.js + Express (REST API)                   │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────────┐  │  │
│  │  │ Auth     │ │ Pages    │ │ Search │ │ Sync          │  │  │
│  │  │ 中间件   │ │ Controller│ │ Engine │ │ Controller   │  │  │
│  │  │ (JWT)   │ │          │ │(tsearch)│ │              │  │  │
│  │  └─────────┘ └──────────┘ └────────┘ └───────────────┘  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐                    │  │
│  │  │ Upload  │ │ Export   │ │ Tags   │                    │  │
│  │  │ Controller│ │Controller│ │Controller│                   │  │
│  │  └─────────┘ └──────────┘ └────────┘                    │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │             数据访问层 (Repository)                       │  │
│  │  ┌──────────────┐  ┌──────────────────┐                 │  │
│  │  │ Knex.js (SQL │  │ Prisma ORM (可选 │                 │  │
│  │  │ 查询构建器)   │  │ 后续迁移使用)     │                 │  │
│  │  └──────────────┘  └──────────────────┘                 │  │
│  └───────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────┘
                               │
┌──────────────────────────────┼─────────────────────────────────┐
│                    数据存储层 (Storage)                         │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  PostgreSQL 15+  │  │  本地文件系统                         │ │
│  │  ┌────────────┐  │  │  /data/uploads/images/               │ │
│  │  │ users      │  │  │  (图片上传存储)                      │ │
│  │  │ pages      │  │  └──────────────────────────────────────┘ │
│  │  │ tags       │  │                                          │
│  │  │ page_tags  │  │                                          │
│  │  │ uploads    │  │                                          │
│  │  │ sync_log   │  │                                          │
│  │  └────────────┘  │                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 架构风格

采用**经典三层架构 + 前后端分离**模式：

| 层 | 职责 | 技术选型 |
|----|------|----------|
| 客户端 | UI 渲染、本地存储、离线编辑 | Vue 3 + Vite + TipTap + Dexie.js |
| 服务端 | 业务逻辑、API、数据持久化 | Node.js + Express + Knex.js |
| 数据层 | 结构化存储、全文检索 | PostgreSQL 15+ (JSONB + tsvector) |

---

## 二、技术选型说明

### 2.1 前端技术栈

| 技术 | 选型 | 理由 |
|------|------|------|
| **框架** | Vue 3 (Composition API) | PRD 指定；生态成熟，TipTap 有官方 Vue 3 支持 |
| **构建工具** | Vite 5 | 极快的 HMR，原生 ESM 支持，开发体验优于 Webpack |
| **状态管理** | Pinia | Vue 3 官方推荐，TypeScript 友好，轻量 |
| **路由** | Vue Router 4 | 标准选择 |
| **编辑器** | TipTap 2 | PRD 指定；基于 ProseMirror，块编辑原生支持，Vue 3 官方绑定 |
| **HTTP 客户端** | Axios | 拦截器机制方便 JWT 注入和 401 处理 |
| **本地存储** | Dexie.js (IndexedDB) | IndexedDB 的 Promise 封装，API 友好，事务支持 |
| **UI 样式** | UnoCSS + Tailwind 语法 | 原子化 CSS，零运行时，构建产物极小；适合快速开发 |
| **图标** | Lucide Icons | 轻量、树摇友好、风格统一 |
| **PWA** | Vite PWA Plugin (workbox) | 与 Vite 深度集成，自动生成 Service Worker |
| **拖拽** | @dnd-kit/core | Vue 3 兼容，性能优于 sortablejs，支持键盘操作 |
| **PDF 导出** | html2pdf.js (html2canvas + jsPDF) | 浏览器端生成，无需服务端依赖 |
| **日期** | dayjs | 轻量替代 moment，体积仅 2KB |

### 2.2 后端技术栈

| 技术 | 选型 | 理由 |
|------|------|------|
| **运行时** | Node.js 20 LTS | 前后端统一语言，开发效率高 |
| **框架** | Express 4 | 轻量成熟，中间件生态丰富，适合 MVP 快速开发 |
| **数据库驱动** | Knex.js (SQL Query Builder) | 轻量级，提供迁移和种子功能，灵活控制 SQL |
| **认证** | jsonwebtoken + bcryptjs | JWT 标准，bcrypt 加密密码 |
| **验证** | zod | 类型安全的 Schema 验证，运行时和编译时双重保障 |
| **文件上传** | multer | Express 标准上传中间件 |
| **日志** | pino | 极高性能 JSON 日志 |
| **CORS** | cors | 标准中间件 |
| **安全** | helmet + express-rate-limit | 安全头 + 速率限制 |

### 2.3 Electron 桌面端

| 技术 | 选型 | 理由 |
|------|------|------|
| **框架** | Electron 28+ | PRD 指定 |
| **打包** | electron-builder | 跨平台打包成熟方案 |
| **加载方式** | 直接加载 Vite dev/prod URL | 最简方案，复用 Web 端代码 |

### 2.4 部署技术栈

| 技术 | 用途 |
|------|------|
| Docker | 前端 + 后端容器化 |
| Docker Compose | 一键编排（前端 Nginx + 后端 + PostgreSQL） |
| Nginx | 静态资源服务 + API 反向代理 |

### 2.5 技术选型决策记录

| 决策点 | 选项 | 决定 | 理由 |
|--------|------|------|------|
| ORM vs Query Builder | Prisma vs Knex.js | **Knex.js** | MVP 阶段灵活性更高，不引入生成文件；JSONB 操作更直接 |
| CSS 方案 | Tailwind CSS vs UnoCSS vs SCSS | **UnoCSS (Tailwind 语法)** | 零运行时，构建更快，API 兼容 Tailwind |
| 拖拽库 | sortablejs vs @dnd-kit | **@dnd-kit** | 更好的 Vue 3 兼容性，支持无障碍 |
| 状态管理 | Pinia vs Vuex | **Pinia** | Vue 3 官方推荐，API 更简洁 |

---

## 三、系统分层与模块划分

### 3.1 前端项目结构

```
packages/client/
├── index.html
├── vite.config.ts
├── public/
│   ├── favicon.ico
│   └── manifest.json          # PWA manifest
├── src/
│   ├── main.ts                # 应用入口
│   ├── App.vue                # 根组件
│   ├── router/
│   │   └── index.ts           # 路由配置 + 导航守卫
│   ├── stores/                # Pinia 状态管理
│   │   ├── auth.ts            # 认证状态
│   │   ├── pages.ts           # 页面列表/树
│   │   ├── editor.ts          # 编辑器状态
│   │   └── sync.ts            # 同步状态
│   ├── composables/           # 组合式函数
│   │   ├── useAutoSave.ts     # 自动保存逻辑
│   │   ├── useSearch.ts       # 搜索功能
│   │   ├── useNetworkStatus.ts # 网络状态检测
│   │   └── useBlockMenu.ts    # / 命令菜单
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.vue      # 主布局（侧边栏 + 编辑区）
│   │   │   ├── Sidebar.vue        # 侧边栏
│   │   │   ├── PageTree.vue       # 页面树
│   │   │   ├── PageTreeNode.vue   # 树节点（递归）
│   │   │   └── Breadcrumb.vue     # 面包屑
│   │   ├── editor/
│   │   │   ├── Editor.vue         # TipTap 编辑器主组件
│   │   │   ├── BlockMenu.vue      # / 命令菜单
│   │   │   ├── EditorToolbar.vue  # 工具栏
│   │   │   ├── ImageUpload.vue    # 图片上传块
│   │   │   └── BlockHandle.vue    # 拖拽手柄
│   │   ├── search/
│   │   │   ├── SearchDialog.vue   # 搜索弹窗（Ctrl+K）
│   │   │   └── SearchResults.vue  # 搜索结果列表
│   │   ├── tags/
│   │   │   ├── TagManager.vue     # 标签管理
│   │   │   └── TagFilter.vue      # 标签筛选
│   │   ├── export/
│   │   │   └── ExportMenu.vue     # 导出菜单
│   │   └── common/
│   │       ├── StatusIndicator.vue # 保存/同步状态
│   │       └── ConfirmDialog.vue  # 确认弹窗
│   ├── db/                    # IndexedDB (Dexie)
│   │   ├── index.ts           # Dexie 实例 + Schema 定义
│   │   ├── syncQueue.ts       # 同步队列管理
│   │   └── migrations.ts      # 本地数据库版本迁移
│   ├── sync/                  # 离线同步引擎
│   │   ├── SyncEngine.ts      # 同步引擎主类
│   │   ├── ConflictResolver.ts # 冲突解决器
│   │   └── SyncScheduler.ts   # 同步调度器
│   ├── services/              # API 服务层
│   │   ├── api.ts             # Axios 实例 + 拦截器
│   │   ├── auth.service.ts
│   │   ├── pages.service.ts
│   │   ├── search.service.ts
│   │   ├── tags.service.ts
│   │   ├── upload.service.ts
│   │   └── sync.service.ts
│   ├── utils/
│   │   ├── markdown-export.ts # TipTap JSON → Markdown 转换
│   │   ├── pdf-export.ts      # PDF 导出
│   │   └── helpers.ts
│   ├── styles/
│   │   └── main.css           # UnoCSS 入口 + 全局样式
│   └── types/
│       └── index.ts           # TypeScript 类型定义
```

### 3.2 后端项目结构

```
packages/server/
├── package.json
├── tsconfig.json
├── knexfile.ts                # Knex 配置
├── src/
│   ├── index.ts               # Express 入口
│   ├── app.ts                 # Express app 配置
│   ├── config/
│   │   └── index.ts           # 环境变量配置
│   ├── middleware/
│   │   ├── auth.ts            # JWT 鉴权中间件
│   │   ├── errorHandler.ts    # 全局错误处理
│   │   └── validate.ts        # Zod 验证中间件
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── pages.routes.ts
│   │   ├── search.routes.ts
│   │   ├── tags.routes.ts
│   │   ├── upload.routes.ts
│   │   ├── export.routes.ts
│   │   └── sync.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── pages.controller.ts
│   │   ├── search.controller.ts
│   │   ├── tags.controller.ts
│   │   ├── upload.controller.ts
│   │   ├── export.controller.ts
│   │   └── sync.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── pages.service.ts
│   │   ├── search.service.ts
│   │   ├── tags.service.ts
│   │   ├── upload.service.ts
│   │   ├── export.service.ts
│   │   └── sync.service.ts
│   ├── db/
│   │   ├── connection.ts       # Knex 实例
│   │   ├── migrations/         # 数据库迁移文件
│   │   └── seeds/              # 种子数据
│   └── types/
│       └── index.ts
├── uploads/                   # 图片上传目录（Docker Volume）
└── Dockerfile
```

### 3.3 Monorepo 结构

```
yule-notion/
├── package.json               # Workspace 根配置
├── pnpm-workspace.yaml        # pnpm workspace
├── packages/
│   ├── client/                # 前端 (Vue 3)
│   └── server/                # 后端 (Express)
├── electron/                  # Electron 主进程
│   ├── main.ts
│   ├── preload.ts
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   ├── nginx/
│   │   └── default.conf
│   └── .env.example
└── docs/                      # 项目文档
```

---

## 四、离线同步方案（重点设计）

### 4.1 同步模型

采用**增量时间戳同步 + Last-Write-Wins (LWW)** 策略：

```
┌─────────────────────────────────────────────────────┐
│                  同步流程                             │
│                                                       │
│  [本地编辑]                                          │
│      │                                                │
│      ▼                                                │
│  [IndexedDB 写入] ←─ 同时写入本地                    │
│      │                                                │
│      ▼                                                │
│  [sync_queue 记录变更] ← type: create/update/delete  │
│      │                                                │
│      ▼                                                │
│  [检测网络恢复 / 定时触发]                             │
│      │                                                │
│      ├── 在线 → 立即触发同步                          │
│      └── 离线 → 等待网络恢复                          │
│      │                                                │
│      ▼                                                │
│  [1. GET /sync/changes?since=lastSyncAt]             │
│      │    获取服务端变更                               │
│      ▼                                                │
│  [2. 合并服务端变更到本地]                            │
│      │    LWW: 比较 updatedAt，新版本覆盖旧版本        │
│      ▼                                                │
│  [3. POST /sync 推送本地变更]                         │
│      │    服务端逐条处理，同样 LWW                    │
│      ▼                                                │
│  [4. 处理冲突]                                       │
│      │    服务端版本 > 本地版本 → 保留服务端版本      │
│      │    UI 提示用户有冲突                           │
│      ▼                                                │
│  [5. 清空 sync_queue，更新 lastSyncAt]               │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 4.2 本地数据层设计 (IndexedDB Schema)

```typescript
// Dexie 数据库定义
class YuleDB extends Dexie {
  pages!: Table<LocalPage, string>
  tags!: Table<LocalTag, string>
  syncQueue!: Table<SyncQueueItem, string>
  meta!: Table<SyncMeta, string>

  constructor() {
    super('yule-notion')
    this.version(1).stores({
      pages: 'id, parentId, updatedAt, title',  // 复合索引
      tags: 'id, name',
      syncQueue: '++id, pageId, type, createdAt',
      meta: 'key'  // key-value 存储
    })
  }
}
```

**LocalPage 扩展字段：**
```typescript
interface LocalPage {
  // ... 与服务端 Page 相同的字段
  id: string
  title: string
  content: object          // TipTap JSON
  parentId: string | null
  order: number
  icon: string
  tags: string[]
  createdAt: string
  updatedAt: string
  version: number
  isDeleted: boolean
  
  // 本地扩展字段
  _syncStatus: 'synced' | 'pending' | 'conflict'
  _dirty: boolean          // 标记是否有未同步变更
}
```

### 4.3 同步引擎核心逻辑

```typescript
class SyncEngine {
  private db: YuleDB
  private isOnline: boolean
  private syncInProgress: boolean

  // 网络恢复时自动触发
  async onOnline() {
    await this.sync()
  }

  // 核心同步流程
  async sync() {
    if (!this.isOnline || this.syncInProgress) return
    this.syncInProgress = true

    try {
      const lastSyncAt = await this.getLastSyncAt()

      // Step 1: 拉取服务端变更
      const serverChanges = await syncApi.getChanges(lastSyncAt)

      // Step 2: 合并服务端变更到本地（LWW）
      for (const change of serverChanges) {
        const local = await this.db.pages.get(change.id)
        if (!local || change.updatedAt > local.updatedAt) {
          // 服务端更新或本地不存在 → 写入本地
          await this.db.pages.put(change)
        }
        // 否则本地更新 → 保留本地，推送到服务端
      }

      // Step 3: 推送本地变更
      const pendingChanges = await this.db.syncQueue.toArray()
      if (pendingChanges.length > 0) {
        const result = await syncApi.pushChanges(pendingChanges)

        // Step 4: 处理冲突
        for (const conflict of result.conflicts) {
          await this.handleConflict(conflict)
        }

        // Step 5: 清理已同步的队列
        const syncedIds = new Set(result.synced)
        await this.db.syncQueue.bulkDelete(
          pendingChanges.filter(c => syncedIds.has(c.pageId)).map(c => c.id)
        )
      }

      // Step 6: 更新同步时间戳
      await this.setLastSyncAt(new Date().toISOString())

    } finally {
      this.syncInProgress = false
    }
  }

  // 冲突处理：服务端优先 + 用户提示
  async handleConflict(conflict: SyncConflict) {
    // 服务端版本覆盖本地
    await this.db.pages.put(conflict.serverVersion)
    
    // 通知用户
    eventBus.emit('sync:conflict', {
      pageId: conflict.pageId,
      message: '此页面有服务端更新，已自动同步'
    })
  }
}
```

### 4.4 自动保存流程

```typescript
// useAutoSave composable
function useAutoSave(pageId: Ref<string>, content: Ref<object>) {
  let saveTimer: NodeJS.Timeout | null = null

  // 1s debounce 保存
  watch(content, (newContent) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      // Step 1: 写入 IndexedDB（即时）
      await db.pages.update(pageId.value, {
        content: newContent,
        updatedAt: new Date().toISOString(),
        _syncStatus: 'pending',
        _dirty: true
      })

      // Step 2: 加入同步队列
      await db.syncQueue.add({
        pageId: pageId.value,
        type: 'update',
        createdAt: new Date().toISOString()
      })

      // Step 3: 如果在线，触发同步
      if (navigator.onLine) {
        syncEngine.sync()
      }

      // UI: 显示保存状态
      saveStatus.value = 'saved'
    }, 1000)
  }, { deep: true })
}
```

### 4.5 PWA 策略

| 资源类型 | 缓存策略 | 说明 |
|----------|----------|------|
| HTML (app shell) | Network First | 优先网络，离线回退缓存 |
| JS/CSS 静态资源 | Cache First (版本化) | 带 hash 的资源长期缓存 |
| API 请求 | Network Only | 数据走 IndexedDB，API 仅同步用 |
| 图片 | Cache First | 上传图片缓存到本地 |
| 字体 | Cache First | 系统字体栈无需加载外部字体 |

---

## 五、接口设计概要

详细的 API 接口规范见 `api-spec/API-SPEC.md`。此处仅列出核心设计原则：

1. **RESTful 风格** — 资源路由标准化，HTTP 方法语义明确
2. **版本化 API** — `/api/v1/` 前缀，预留版本演进空间
3. **统一错误格式** — `{ error: { code, message, details } }`
4. **分页标准化** — `?page=1&pageSize=20`，响应含 `total`
5. **JWT Bearer Token** — Authorization Header，7天有效期
6. **数据隔离** — 所有接口自动注入 `userId` 过滤

---

## 六、数据模型设计

详细的 DDL 和 ER 图见 `db/` 目录。核心设计要点：

1. **pages.content 使用 JSONB** — 存储 TipTap JSON，PostgreSQL 原生支持 JSONB 查询
2. **全文搜索** — `search_vector tsvector` 列 + GIN 索引，通过触发器自动维护
3. **树结构** — `parent_id` 邻接表模型（3级嵌套足够，无需闭包表）
4. **软删除** — `is_deleted` 字段 + `deleted_at`，30天后自动清理
5. **版本号** — `version` 整数字段，用于乐观锁和冲突检测
6. **同步日志** — `sync_log` 表记录同步操作，用于调试和审计

---

## 七、部署架构

### 7.1 Docker Compose 编排

```yaml
# docker-compose.yml 概要
services:
  # 前端 - Nginx 静态资源服务
  web:
    build: ./packages/client
    ports: ["80:80"]
    depends_on: [api]

  # 后端 - Node.js API 服务
  api:
    build: ./packages/server
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://yule:password@db:5432/yule
      - JWT_SECRET=${JWT_SECRET}
      - UPLOAD_DIR=/app/uploads
    volumes:
      - uploads:/app/uploads
    depends_on: [db]

  # 数据库
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=yule
      - POSTGRES_USER=yule
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
  uploads:
```

### 7.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 后端端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://yule:password@localhost:5432/yule` |
| `JWT_SECRET` | JWT 签名密钥 | **必填** |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `UPLOAD_DIR` | 上传文件目录 | `./uploads` |
| `UPLOAD_MAX_SIZE` | 上传大小限制 | `5242880` (5MB) |

---

## 八、技术风险评估与对策

| 风险 | 等级 | 影响 | 对策 |
|------|------|------|------|
| **离线同步可靠性** | 🔴 高 | 核心功能 | LWW 简化冲突；sync_queue 持久化保证断电不丢；完善重试机制 |
| **7天工期紧张** | 🔴 高 | 功能裁剪 | 严格优先级：P0 先行；Knex.js 简化 ORM 开发；组件库复用 |
| **TipTap 编辑器复杂度** | 🟡 中 | 编辑体验 | MVP 限6种块类型；使用官方扩展；不自定义复杂节点 |
| **Electron 打包兼容性** | 🟡 中 | 桌面端 | 优先 Web 端；桌面端使用最简方案加载 URL |
| **全文搜索性能** | 🟢 低 | 搜索体验 | PG tsvector + GIN 索引；1000篇文档内 < 500ms 有保障 |
| **JSONB 大文档写入** | 🟢 低 | 保存性能 | 单页面 TipTap JSON 通常 < 100KB，无压力 |

### 8.1 同步方案降级策略

如果离线同步开发超时，降级方案：
1. **第一版：** 仅实现 PWA 缓存前端资源 + IndexedDB 本地读写，手动触发同步
2. **第二版：** 实现自动同步引擎
3. **最坏情况：** 去掉离线编辑，仅保留 PWA 离线浏览

---

## 九、编码规范要求

### 9.1 通用规范

- **语言：** TypeScript strict mode
- **代码风格：** ESLint + Prettier（统一配置）
- **命名：** camelCase (变量/函数)，PascalCase (组件/类)，snake_case (数据库字段)
- **Git 提交：** Conventional Commits (`feat:`, `fix:`, `chore:` 等)
- **分支：** `main` / `feat/*` / `fix/*`

### 9.2 前端规范

- 组件使用 `<script setup lang="ts">` 语法
- 状态管理用 Pinia Composition API 风格
- 样式使用 UnoCSS 工具类为主，复杂样式用 `<style scoped>`
- API 调用统一走 `services/` 层，组件不直接使用 Axios

### 9.3 后端规范

- 路由定义与控制器分离
- 使用 Zod Schema 验证所有入参
- 统一错误码枚举，错误处理中间件兜底
- 数据库迁移通过 Knex migrations 管理，禁止手动改表
- 所有查询必须带 `userId` 条件，防止数据越权

---

## 十、PRD 开放问题决策

| # | 问题 | PRD 状态 | 架构决策 | 理由 |
|---|------|----------|----------|------|
| 1 | 离线同步冲突策略 | ✅ 已定 | LWW (server_wins) + 用户提示 | MVP 最简方案，详见第四章 |
| 2 | 编辑器存储格式 | ✅ 已定 | TipTap JSON (JSONB) | 保持与 PRD 一致 |
| 3 | 图片存储 | ✅ 已定 | 本地文件系统 + Nginx 静态 | 保持与 PRD 一致 |
| 4 | 页面回收站 | ⏳ 待定 | **不做回收站**，软删除 + 30天自动清理 | MVP 时间不够，软删除已提供基本保护 |
| 5 | 深色主题 | ⏳ 待定 | **MVP 不做** | 通过 CSS 变量预留，后续迭代 |

---

## 十一、交付物索引

| 文档 | 路径 | 状态 |
|------|------|------|
| 技术架构设计文档 | `arch/ARCHITECTURE.md` | ✅ 本文档 |
| API 接口设计文档 | `api-spec/API-SPEC.md` | ✅ 已产出 |
| 数据库 DDL | `db/001_init.sql` | ✅ 已产出 |
| ER 图 | `db/ER-DIAGRAM.md` | ✅ 已产出 |

---

_架构设计 v1.0 \| arch \| 2026-03-19_
