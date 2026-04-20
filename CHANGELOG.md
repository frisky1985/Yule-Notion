# CHANGELOG — 予乐 Yule Notion

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

---

## [0.6.0] - 2026-04-18 (AI Notebook Phase 1)

### 里程碑
AI Notebook Phase 1：AI 写作助手

### 新增 — 后端 (Server)
- OpenAI API 集成（GPT-4o-mini 模型）
- AI 提供商抽象层（支持扩展多个 AI 服务）
- AI 服务层（上下文收集、提示词工程、速率限制、成本控制）
- AI API 端点：
  - `POST /api/v1/ai/complete` - 同步 AI 完成
  - `POST /api/v1/ai/stream` - 流式 AI 响应（SSE）
  - `GET /api/v1/ai/history` - 操作历史
  - `GET /api/v1/ai/cost` - 月度成本
- 数据库迁移：
  - `ai_operations` 表（操作历史、Token 使用、成本追踪）
  - `ai_usage_limits` 表（月度成本限制）
- 7 种 AI 操作：
  - 摘要 (summarize)
  - 重写 (rewrite)
  - 扩写 (expand)
  - 翻译 (translate)
  - 改进写作 (improveWriting)
  - 修复语法 (fixGrammar)
  - 续写 (continueWriting)
- 速率限制：10 请求/分钟
- 成本限制：$10/月（可配置）

### 新增 — 前端 (Client)
- AI 状态管理（Pinia Store）
- AI 面板组件（AIPanel.vue）
  - 操作选择器
  - 流式响应显示
  - 插入/替换/复制操作
- AI 命令面板（AICommandPalette.vue）
  - 键盘导航（↑↓ 选择，Enter 执行，Esc 关闭）
  - 搜索过滤
- TipTap AI 扩展（TipTapAIExtension.ts）
  - 键盘快捷键：Ctrl+Shift+A
  - 插入/替换 AI 响应命令
- 编辑器集成
  - 选中文本后按 Ctrl+Shift+A 打开 AI 面板
  - 未选中文本时打开命令面板

### 配置
- 环境变量：
  - `OPENAI_API_KEY` - OpenAI API 密钥
  - `OPENAI_MODEL` - 模型名称（默认：gpt-4o-mini）
  - `AI_MAX_TOKENS` - 最大 Token 数（默认：1000）
  - `AI_TEMPERATURE` - 温度参数（默认：0.7）

### 技术特性
- Server-Sent Events (SSE) 流式响应
- 上下文感知（相关页面内容）
- 操作历史追踪
- 成本监控和告警

---

## [0.1.0] - 2026-03-19 (M1)

### 里程碑
M1：脚手架搭建 + 用户认证系统

### 新增 — 后端 (Server)
- Express + TypeScript 项目脚手架（严格模式）
- Zod 环境变量配置校验（含生产环境 CORS 白名单强制检查、JWT_SECRET 长度 ≥ 32 校验）
- 用户注册接口 `POST /auth/register`（bcrypt 10轮 salt、邮箱唯一约束）
- 用户登录接口 `POST /auth/login`（JWT 签发）
- 用户信息接口 `GET /auth/me`（Bearer Token 认证）
- JWT 中间件（区分过期/无效 Token）
- 全局错误处理（生产环境隐藏堆栈）
- 安全中间件：helmet、CORS、rate-limit（100次/15分钟）
- Knex 数据库迁移（6张表、条件索引、GIN 全文搜索索引、触发器）
- pages 表 `trg_pages_updated_at` 触发器（覆盖所有列更新）

### 新增 — 前端 (Client)
- Vue 3 + TypeScript + Vite 项目脚手架
- UnoCSS 原子化 CSS
- PWA manifest 配置
- Axios API 服务层（拦截器、401 自动登出）
- Pinia 认证状态管理（Token 持久化、自动恢复）
- 登录页面（表单验证、错误提示、loading 状态）
- 注册页面（表单验证、密码强度提示）
- 仪表盘页面（用户名+邮箱双行布局、退出登录）
- AppAlert 全局提示组件
- 路由双向守卫（未登录重定向、已登录跳过登录页）

### 修复
- BUG-SEC-01：CORS 生产白名单强制校验，未配置时拒绝启动
- BUG-DB-01：pages 表 updated_at 触发器覆盖所有列（不仅限 title/content）
- BUG-SEC-02：JWT_SECRET 增加 length < 32 校验
- DEF-001：仪表盘导航栏显示用户名+邮箱双行布局

### 测试
- 首轮测试：149 用例，145 通过（通过率 97.3%）
- 发现 4 个缺陷（1 阻塞级 + 3 建议级）
- 重测：153 项全部通过（通过率 100%），缺陷清零

### 文件清单
- Server：16 文件（含 .gitkeep），TypeScript 1,436 行
- Client：21 文件，Vue/TS/CSS/JSON/HTML 1,711 行

---

_合并记录由 repo_manager (仓库管理员) 维护_
