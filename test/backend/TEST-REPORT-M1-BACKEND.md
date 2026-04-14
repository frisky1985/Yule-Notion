# M1 后端接口静态代码审查测试报告

> **项目：** 予乐 Yule Notion (notebook-app)  
> **测试模块：** M1 用户认证模块  
> **测试类型：** 静态代码审查 (Static Code Review)  
> **测试基准：** API-SPEC.md v1.0  
> **代码范围：** `code/server/src/`  
> **测试日期：** 2026-03-19  
> **测试人：** test (subagent)  
> **测试结论：** ⚠️ **条件通过**（1 个阻塞级缺陷需修复）

---

## 一、测试范围和策略

### 1.1 测试范围

| 类别 | 范围 |
|------|------|
| API 接口 | POST /register, POST /login, GET /me |
| 安全性 | JWT、密码加密、CORS、rate-limit、helmet、错误堆栈 |
| 代码质量 | 分层架构、错误处理、Zod 验证、类型完整性 |
| 数据库 | 迁移 DDL、索引、触发器、约束 |

### 1.2 被测源文件清单

| 文件 | 职责 |
|------|------|
| `src/app.ts` | Express 应用配置、中间件注册 |
| `src/index.ts` | 服务器启动、优雅关闭 |
| `src/config/index.ts` | 环境变量解析、JWT 配置 |
| `src/types/index.ts` | 类型定义、ErrorCode、AppError |
| `src/routes/auth.routes.ts` | 认证路由定义、Zod Schema |
| `src/controllers/auth.controller.ts` | 请求/响应处理 |
| `src/services/auth.service.ts` | 业务逻辑（注册、登录、获取用户） |
| `src/middleware/auth.ts` | JWT 鉴权中间件 |
| `src/middleware/errorHandler.ts` | 全局错误处理中间件 |
| `src/middleware/validate.ts` | Zod 请求体验证中间件 |
| `src/db/connection.ts` | Knex 数据库连接 |
| `src/db/migrations/20260319_init.ts` | 数据库迁移 DDL |

### 1.3 测试策略

逐条对照 API-SPEC.md 进行静态代码审查，从以下维度验证：
1. **接口契约**：HTTP 方法、路径、请求/响应格式是否与规范一致
2. **数据校验**：Zod Schema 是否覆盖所有约束规则
3. **安全防护**：认证、加密、CORS、频率限制等安全措施
4. **错误处理**：错误码、状态码、响应格式是否统一规范
5. **数据库设计**：表结构、索引、触发器是否完整正确

---

## 二、测试用例清单

### 2.1 POST /api/v1/auth/register（用户注册）

| # | 测试项 | 预期结果 | 实际结果 | 结论 |
|---|--------|----------|----------|------|
| REG-01 | 请求方法 | POST | `router.post('/register', ...)` | ✅ PASS |
| REG-02 | 请求路径 | `/api/v1/auth/register` | 路由挂载于 `app.use('/api/v1/auth', createAuthRouter())` + `router.post('/register', ...)` | ✅ PASS |
| REG-03 | 认证要求（无需认证） | 不需要认证 | 路由未绑定 `authMiddleware`，仅 `validate(registerSchema)` + controller | ✅ PASS |
| REG-04 | email 字段：必填 | Zod required | `z.string().email(...)` 默认 required | ✅ PASS |
| REG-05 | email 字段：邮箱格式 | 合法邮箱格式校验 | `.email('请输入有效的邮箱地址')` | ✅ PASS |
| REG-06 | email 字段：max 254 | 最长 254 字符 | `.max(254, '邮箱长度不能超过 254 个字符')` | ✅ PASS |
| REG-07 | password 字段：必填 | Zod required | `z.string().min(8, ...)` 默认 required | ✅ PASS |
| REG-08 | password 字段：min 8 | 最少 8 字符 | `.min(8, '密码长度不能少于 8 个字符')` | ✅ PASS |
| REG-09 | password 字段：含小写字母 | 至少一个小写字母 | `.regex(/[a-z]/, '密码必须包含小写字母')` | ✅ PASS |
| REG-10 | password 字段：含大写字母 | 至少一个大写字母 | `.regex(/[A-Z]/, '密码必须包含大写字母')` | ✅ PASS |
| REG-11 | password 字段：含数字 | 至少一个数字 | `.regex(/[0-9]/, '密码必须包含数字')` | ✅ PASS |
| REG-12 | name 字段：必填 | Zod required | `z.string().min(1, ...)` 默认 required | ✅ PASS |
| REG-13 | name 字段：min 1 | 最少 1 字符 | `.min(1, '用户名不能为空')` | ✅ PASS |
| REG-14 | name 字段：max 50 | 最长 50 字符 | `.max(50, '用户名长度不能超过 50 个字符')` | ✅ PASS |
| REG-15 | 成功响应状态码 | 201 | `res.status(201).json({ data: result })` | ✅ PASS |
| REG-16 | 成功响应结构 | `{ data: { token, user: { id, email, name, createdAt } } }` | service 返回 `AuthResponse = { token, user: SafeUser }`，SafeUser = `{ id, email, name, createdAt }` | ✅ PASS |
| REG-17 | token 为 JWT 格式 | JWT Token 字符串 | `jwt.sign(payload, config.jwt.secret, { expiresIn: ... })` 生成 | ✅ PASS |
| REG-18 | user.id 为 UUID v4 | UUID v4 格式 | DDL: `table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))` + `uuid-ossp` 扩展 | ✅ PASS |
| REG-19 | user.createdAt 为 ISO 8601 UTC | ISO 8601 UTC 格式 | `toSafeUser`: `row.created_at.toISOString()` — JavaScript `toISOString()` 返回 ISO 8601 UTC（如 `2026-03-20T10:00:00.000Z`） | ✅ PASS |
| REG-20 | 错误 400 VALIDATION_ERROR | 参数校验失败返回 400 + `VALIDATION_ERROR` | validate 中间件捕获 ZodError → `AppError(ErrorCode.VALIDATION_ERROR, ...)` → `errorStatusMap[VALIDATION_ERROR] = 400` | ✅ PASS |
| REG-21 | 错误 409 EMAIL_ALREADY_EXISTS | 邮箱已注册返回 409 + `EMAIL_ALREADY_EXISTS` | service: `throw new AppError(ErrorCode.EMAIL_ALREADY_EXISTS, ...)` → `errorStatusMap = 409` | ✅ PASS |
| REG-22 | password_hash 不出现在响应中 | 响应中不包含 password_hash | `toSafeUser()` 仅返回 `{ id, email, name, createdAt }`，SafeUser 接口无 password_hash 字段 | ✅ PASS |

### 2.2 POST /api/v1/auth/login（用户登录）

| # | 测试项 | 预期结果 | 实际结果 | 结论 |
|---|--------|----------|----------|------|
| LOG-01 | 请求方法 | POST | `router.post('/login', ...)` | ✅ PASS |
| LOG-02 | 请求路径 | `/api/v1/auth/login` | 路由挂载于 `/api/v1/auth` + `router.post('/login', ...)` | ✅ PASS |
| LOG-03 | 认证要求（无需认证） | 不需要认证 | 路由未绑定 `authMiddleware` | ✅ PASS |
| LOG-04 | email 字段：必填 | Zod required | `z.string().email(...)` | ✅ PASS |
| LOG-05 | email 字段：邮箱格式 | 合法邮箱格式校验 | `.email('请输入有效的邮箱地址')` | ✅ PASS |
| LOG-06 | password 字段：必填 | Zod required | `z.string().min(1, ...)` | ✅ PASS |
| LOG-07 | password 字段：非空 | 非空字符串 | `.min(1, '密码不能为空')` | ✅ PASS |
| LOG-08 | 成功响应状态码 | 200 | `res.status(200).json({ data: result })` | ✅ PASS |
| LOG-09 | 成功响应结构 | `{ data: { token, user } }` | service 返回 `AuthResponse = { token, user: SafeUser }` | ✅ PASS |
| LOG-10 | 错误 401 INVALID_CREDENTIALS | 邮箱或密码错误返回 401 + `INVALID_CREDENTIALS` | 用户不存在和密码错误均抛出 `AppError(ErrorCode.INVALID_CREDENTIALS, '邮箱或密码错误')` → 状态码 401 | ✅ PASS |
| LOG-11 | 统一错误信息防用户枚举 | 无论用户是否存在都返回相同信息 | 两处均使用相同消息 `'邮箱或密码错误'` 和相同错误码 `INVALID_CREDENTIALS` | ✅ PASS |
| LOG-12 | password_hash 不出现在响应中 | 响应中不包含 password_hash | `toSafeUser()` 仅返回安全字段 | ✅ PASS |

### 2.3 GET /api/v1/auth/me（获取当前用户）

| # | 测试项 | 预期结果 | 实际结果 | 结论 |
|---|--------|----------|----------|------|
| ME-01 | 请求方法 | GET | `router.get('/me', ...)` | ✅ PASS |
| ME-02 | 请求路径 | `/api/v1/auth/me` | 路由挂载于 `/api/v1/auth` + `router.get('/me', ...)` | ✅ PASS |
| ME-03 | 认证要求（Bearer Token） | 需要 Bearer Token 认证 | 路由绑定 `authMiddleware` | ✅ PASS |
| ME-04 | 成功响应状态码 | 200 | `res.status(200).json({ data: user })` | ✅ PASS |
| ME-05 | 成功响应结构 | `{ data: { id, email, name, createdAt } }` | `getCurrentUser` 返回 `SafeUser = { id, email, name, createdAt }` | ✅ PASS |
| ME-06 | 无 token 返回 401 | 401 UNAUTHORIZED | auth 中间件：`!authHeader → AppError(UNAUTHORIZED, '未提供认证令牌')` | ✅ PASS |
| ME-07 | token 格式错误返回 401 | 401 UNAUTHORIZED | auth 中间件：`parts.length !== 2 || parts[0] !== 'Bearer' → AppError(UNAUTHORIZED, '认证令牌格式错误...')` | ✅ PASS |
| ME-08 | token 无效返回 401 | 401 UNAUTHORIZED | auth 中间件：jwt.verify 失败且非 TokenExpiredError → `AppError(UNAUTHORIZED, '认证令牌无效')` | ✅ PASS |
| ME-09 | token 过期返回 401 | 401 TOKEN_EXPIRED | auth 中间件：`err instanceof jwt.TokenExpiredError → AppError(TOKEN_EXPIRED, '认证令牌已过期')` | ✅ PASS |
| ME-10 | 不返回 password_hash | 响应中不包含 password_hash | `getCurrentUser` → `toSafeUser()` 仅返回安全字段 | ✅ PASS |

### 2.4 安全性测试

| # | 测试项 | 预期结果 | 实际结果 | 结论 |
|---|--------|----------|----------|------|
| SEC-01 | JWT_SECRET 生产环境强制校验 | 生产环境必须设置 JWT_SECRET，否则拒绝启动 | `config/index.ts`: `if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-secret-change-me') { throw new Error(...) }` | ✅ PASS |
| SEC-02 | 密码 bcrypt 加密 | 使用 bcrypt 加密密码 | `bcrypt.hash(password, SALT_ROUNDS)`，`bcrypt.compare(password, user.password_hash)` | ✅ PASS |
| SEC-03 | bcrypt salt rounds | 合理的 salt 轮数 | `SALT_ROUNDS = 10`（行业标准，约 100ms/次） | ✅ PASS |
| SEC-04 | 登录防用户枚举（错误信息） | 统一错误信息 | 用户不存在和密码错误均返回 `'邮箱或密码错误'` | ✅ PASS |
| SEC-05 | 登录防用户枚举（错误码） | 统一错误码 | 两处均使用 `INVALID_CREDENTIALS` | ✅ PASS |
| SEC-06 | CORS 白名单（开发环境） | 允许所有来源 | `origin: config.isDev ? true : allowedOrigins` → 开发环境 `true` | ✅ PASS |
| SEC-07 | CORS 白名单（生产环境） | 仅允许白名单来源 | 生产环境使用 `allowedOrigins`（来自 `ALLOWED_ORIGINS` 环境变量） | ❌ **FAIL** |
| SEC-08 | rate-limit 全局配置 | 请求频率限制 | `rateLimit({ windowMs: 15*60*1000, max: 100 })`，错误码 `RATE_LIMIT_EXCEEDED` | ✅ PASS |
| SEC-09 | helmet 安全头 | 设置安全响应头 | `app.use(helmet())` | ✅ PASS |
| SEC-10 | 生产环境隐藏错误堆栈 | 未知错误不暴露内部信息 | `message: isDev ? err.message : '服务端内部错误'` | ✅ PASS |
| SEC-11 | JWT_SECRET 生产环境最小长度 | 密钥强度校验 | 仅检查不等于默认值，**未校验最小长度**（错误消息声称"至少 32 个字符"但实际未校验） | ⚠️ **FAIL** |

### 2.5 代码质量测试

| # | 测试项 | 预期结果 | 实际结果 | 结论 |
|---|--------|----------|----------|------|
| QUA-01 | 分层架构：routes 层 | 路由定义独立 | `src/routes/auth.routes.ts` — 路由注册 + Zod Schema | ✅ PASS |
| QUA-02 | 分层架构：controllers 层 | 控制器独立 | `src/controllers/auth.controller.ts` — 请求解析 + 响应格式化 | ✅ PASS |
| QUA-03 | 分层架构：services 层 | 业务逻辑独立 | `src/services/auth.service.ts` — 核心业务逻辑 | ✅ PASS |
| QUA-04 | 分层架构：db 层 | 数据库访问独立 | `src/db/connection.ts` + `src/db/migrations/` | ✅ PASS |
| QUA-05 | 职责分离 | controller 不含业务逻辑 | controller 仅调用 service 并格式化响应，不包含 SQL 或加密逻辑 | ✅ PASS |
| QUA-06 | AppError 自定义错误类 | 统一业务错误类型 | `AppError` 类包含 `code`、`statusCode`、`details`，通过 `errorStatusMap` 自动映射状态码 | ✅ PASS |
| QUA-07 | ErrorCode 枚举完整性 | 覆盖 API-SPEC 所有错误码 | 枚举包含 12 个错误码，与 API-SPEC 1.4 节一一对应 | ✅ PASS |
| QUA-08 | errorHandler 中间件 | 全局统一错误处理 | 捕获 AppError（业务错误）和 Error（未知错误），统一格式输出 | ✅ PASS |
| QUA-09 | Zod 验证覆盖（register） | 注册请求体验证 | `registerSchema` 覆盖 email、password、name 全部约束 | ✅ PASS |
| QUA-10 | Zod 验证覆盖（login） | 登录请求体验证 | `loginSchema` 覆盖 email、password 约束 | ✅ PASS |
| QUA-11 | 统一错误格式 | `{ error: { code, message, details } }` | `ErrorResponse` 接口 + errorHandler 统一输出 | ✅ PASS |
| QUA-12 | 验证错误 details 结构 | 字段级错误信息 | validate 中间件将 ZodError 转为 `[{ field, message }]` 数组 | ✅ PASS |
| QUA-13 | HTTP 状态码一致性 | 与 API-SPEC 一致 | `errorStatusMap` 中所有映射与 API-SPEC 1.3 节一致 | ✅ PASS |
| QUA-14 | TypeScript strict 模式 | 开启严格类型检查 | `tsconfig.json`: `"strict": true` + `noImplicitReturns` + `noFallthroughCasesInSwitch` + `noUnusedLocals` + `noUnusedParameters` + `noUncheckedIndexedAccess` | ✅ PASS |
| QUA-15 | TypeScript 类型完整性 | 关键类型定义 | `UserRow`、`SafeUser`、`AuthResponse`、`RegisterBody`、`LoginBody`、`JwtPayload`、`ErrorResponse` 均已定义 | ✅ PASS |
| QUA-16 | Express 类型扩展 | req.user 类型注入 | `declare global { namespace Express { interface Request { user?: JwtPayload } } }` | ✅ PASS |
| QUA-17 | 错误处理链路完整 | controller → next(err) → errorHandler | 所有 controller 方法使用 try-catch + `next(err)` | ✅ PASS |
| QUA-18 | 404 处理 | 未匹配路由返回 404 | `app.use((_req, res) => { res.status(404).json({ error: { code: 'RESOURCE_NOT_FOUND', ... } }) })` | ✅ PASS |

### 2.6 数据库测试

| # | 测试项 | 预期结果 | 实际结果 | 结论 |
|---|--------|----------|----------|------|
| DB-01 | users 表 DDL 正确性 | 字段类型和约束正确 | uuid PK, email(254) NOT NULL, password_hash(255) NOT NULL, name(50) NOT NULL, created_at, updated_at | ✅ PASS |
| DB-02 | users 表 email 唯一约束 | `UNIQUE (email)` | `table.unique(['email'])` | ✅ PASS |
| DB-03 | users 表 UUID 默认值 | `uuid_generate_v4()` | `table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))` | ✅ PASS |
| DB-04 | uuid-ossp 扩展启用 | 启用 UUID 生成扩展 | `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` | ✅ PASS |
| DB-05 | pg_trgm 扩展启用 | 启用三元组模糊匹配扩展 | `CREATE EXTENSION IF NOT EXISTS "pg_trgm"` | ✅ PASS |
| DB-06 | idx_users_email 索引 | email 列索引 | `CREATE INDEX idx_users_email ON users (email)` | ✅ PASS |
| DB-07 | pages 表 DDL 正确性 | 字段类型和约束正确 | uuid PK, user_id FK, title, content JSONB, parent_id FK, order, icon, is_deleted, deleted_at, version, created_at, updated_at, search_vector TSVECTOR | ✅ PASS |
| DB-08 | pages 表 check 约束 | order >= 0, version > 0 | `check('"order" >= 0')`, `check('version > 0')` | ✅ PASS |
| DB-09 | pages 表索引覆盖 | user_id, user+parent, user+order, user+updated, search GIN, content GIN | 6 个索引全部创建，含条件过滤 `WHERE is_deleted = FALSE` | ✅ PASS |
| DB-10 | tags 表 DDL 正确性 | 字段和约束正确 | uuid PK, user_id FK, name(30), color(7), created_at, unique(user_id, name) | ✅ PASS |
| DB-11 | tags 表 color check 约束 | HEX 格式校验 | `check("color ~ '^#[0-9a-fA-F]{6}$'")` | ✅ PASS |
| DB-12 | page_tags 关联表 DDL | 复合主键 | `table.primary(['page_id', 'tag_id'])` | ✅ PASS |
| DB-13 | uploaded_files 表 DDL | 字段和约束正确 | uuid PK, user_id FK, original_name, storage_path, mime_type, size, created_at, check(size > 0 AND size <= 5242880) | ✅ PASS |
| DB-14 | sync_log 表 DDL | 字段和约束正确 | uuid PK, user_id FK, page_id FK, sync_type, action, conflict, ip_address INET, user_agent, check(sync_type IN (...)), check(action IN (...)) | ✅ PASS |
| DB-15 | 触发器：pages_search_vector_update | 从 title 和 content 提取全文搜索向量 | 函数正确解析 TipTap JSON 提取文本，setweight(title='A', content='B')，BEFORE INSERT OR UPDATE OF title, content | ✅ PASS |
| DB-16 | 触发器：trg_pages_search_vector | 绑定到 pages 表 | `CREATE TRIGGER trg_pages_search_vector BEFORE INSERT OR UPDATE OF title, content ON pages` | ✅ PASS |
| DB-17 | 触发器：update_updated_at_column | 自动更新 updated_at | 函数 `NEW.updated_at = NOW(); RETURN NEW;` | ✅ PASS |
| DB-18 | 触发器：trg_users_updated_at | users 表 updated_at 自动更新 | `BEFORE UPDATE ON users FOR EACH ROW` — 对所有列更新触发 | ✅ PASS |
| DB-19 | FK 级联删除 | 子表随父表删除 | users → pages/tags/page_tags/uploaded_files/sync_log 均 `onDelete('CASCADE')`；pages → page_tags `onDelete('CASCADE')` | ✅ PASS |
| DB-20 | pages 表 updated_at 触发器完整性 | 所有列更新时 updated_at 自动更新 | `updated_at` 仅在 `pages_search_vector_update` 中更新，该触发器仅对 `title, content` 列变更触发；**其他列（icon, parent_id, order, is_deleted 等）更新时 updated_at 不会自动更新** | ❌ **FAIL** |
| DB-21 | 迁移回滚完整性 | down() 正确清理 | 按依赖逆序 drop 表 → 删除触发器 → 删除函数 | ✅ PASS |

---

## 三、缺陷清单

### 🔴 阻塞级（必须修复）

| # | 缺陷编号 | 模块 | 缺陷描述 | 预期行为 | 实际行为 | 影响 |
|---|----------|------|----------|----------|----------|------|
| 1 | BUG-SEC-01 | CORS 生产白名单 | 生产环境未配置 `ALLOWED_ORIGINS` 时，CORS 允许所有来源（含 credentials），相当于无白名单保护 | 生产环境应拒绝未在白名单中的来源，或至少不默认允许所有来源 | 当 `ALLOWED_ORIGINS` 环境变量未设置时，`allowedOrigins` 为 `undefined`，cors 中间件将其视为"反射请求来源"，等效于允许所有来源访问 API | 任何网站可在用户已登录的情况下跨域调用 API，导致 CSRF 风险 |

**BUG-SEC-01 修复建议：**

```typescript
// app.ts — 当前代码
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : undefined;

// 修复方案：生产环境未配置时拒绝所有跨域请求
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : (config.isDev ? true : false); // 生产环境默认拒绝

// 或在 config/index.ts 中添加生产环境强制校验（与 JWT_SECRET 类似）：
if (env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error(
    '🚨 安全错误：生产环境必须设置 ALLOWED_ORIGINS 环境变量'
  );
}
```

### 🟡 建议级（推荐修复）

| # | 缺陷编号 | 模块 | 缺陷描述 | 预期行为 | 实际行为 | 影响 |
|---|----------|------|----------|----------|----------|------|
| 2 | BUG-DB-01 | 数据库迁移 | pages 表 `updated_at` 仅在 `title` 或 `content` 变更时触发更新 | 所有列更新时 `updated_at` 都应自动更新 | `pages_search_vector_update` 触发器绑定为 `UPDATE OF title, content`，而 `updated_at := NOW()` 写在该函数内；当仅更新 `icon`、`parent_id`、`order`、`is_deleted` 等列时，触发器不执行，`updated_at` 不会更新 | 客户端显示的"最后编辑时间"不准确（M2 页面模块会受影响） |

**BUG-DB-01 修复建议：**

```sql
-- 方案1：为 pages 表添加独立的 updated_at 触发器
CREATE TRIGGER trg_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 并从 pages_search_vector_update 函数中移除 NEW.updated_at := NOW();

-- 方案2：修改现有触发器的触发条件
-- 将 BEFORE INSERT OR UPDATE OF title, content 改为 BEFORE INSERT OR UPDATE
```

| # | 缺陷编号 | 模块 | 缺陷描述 | 预期行为 | 实际行为 | 影响 |
|---|----------|------|----------|----------|----------|------|
| 3 | BUG-SEC-02 | JWT_SECRET 校验 | 生产环境 JWT_SECRET 仅检查不等于默认值，未校验最小长度；错误消息声称"至少 32 个字符"但代码未强制执行 | 如错误消息所述，应校验密钥长度至少 32 字符 | `if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-secret-change-me')` — 仅做字符串相等比较，未验证长度 | 运维人员可能设置弱密钥（如 `my-secret`）通过校验，降低 JWT 安全性 |

**BUG-SEC-02 修复建议：**

```typescript
if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === 'dev-secret-change-me' || env.JWT_SECRET.length < 32) {
    throw new Error(
      '🚨 安全错误：生产环境必须设置 JWT_SECRET 环境变量（至少 32 个字符），不能使用默认值'
    );
  }
}
```

### 🔵 优化级（建议改进）

| # | 缺陷编号 | 模块 | 缺陷描述 | 建议 |
|---|----------|------|----------|------|
| 4 | OPT-SEC-01 | 登录防暴力破解 | 全局 rate-limit 为 100 次/15 分钟，对登录接口过于宽松 | 建议为 `/auth/login` 和 `/auth/register` 添加独立的更严格 rate-limit（如 5 次/分钟），防止暴力破解 |
| 5 | OPT-SEC-02 | 登录时序攻击 | 用户不存在时直接抛出异常（快速），用户存在时执行 bcrypt.compare（慢约 100ms），存在可被利用的时序差异 | 建议用户不存在时也执行 `bcrypt.compare(password, DUMMY_HASH)` 以消除时序差异（需固定时间消耗） |
| 6 | OPT-RES-01 | 错误响应 details 字段 | API-SPEC 示例中 `details` 始终存在（空对象 `{}`），但代码中 details 为空时不返回该字段 | 建议统一：要么始终返回 `details: {}`，要么在 API-SPEC 中明确标注为可选 |
| 7 | OPT-RES-02 | rate-limit 标准头 | 已配置 `standardHeaders: true, legacyHeaders: false`，建议在 API-SPEC 中文档化 `RateLimit-*` 响应头 | 在 API-SPEC 基础约定中补充 rate-limit 响应头说明 |

---

## 四、测试统计

| 分类 | 通过 | 失败 | 通过率 |
|------|------|------|--------|
| 接口契约（注册 22 项） | 22 | 0 | 100% |
| 接口契约（登录 12 项） | 12 | 0 | 100% |
| 接口契约（me 10 项） | 10 | 0 | 100% |
| 安全性（11 项） | 9 | 2 | 81.8% |
| 代码质量（18 项） | 18 | 0 | 100% |
| 数据库（21 项） | 20 | 1 | 95.2% |
| **合计** | **91** | **3** | **95.7%** |

---

## 五、整体结论

### 结论：⚠️ 条件通过

M1 用户认证模块的 3 个 API 接口（注册、登录、获取当前用户）在**功能正确性、数据校验、响应格式、错误处理、代码质量**方面表现优秀，44 项接口契约测试全部通过。

发现 **1 个阻塞级缺陷**（CORS 生产白名单失效）和 **2 个建议级缺陷**（pages updated_at 触发器不完整、JWT_SECRET 长度未校验）：

- **BUG-SEC-01（阻塞级）**：生产环境未配置 `ALLOWED_ORIGINS` 时 CORS 允许所有来源，存在安全风险。**必须修复后才能通过测试。**
- **BUG-DB-01（建议级）**：pages 表 `updated_at` 触发器仅对 title/content 列生效，其他列更新时不会自动更新时间戳。影响 M2 页面模块，建议在 M1 阶段一并修复。
- **BUG-SEC-02（建议级）**：JWT_SECRET 生产环境校验仅检查默认值，未校验最小长度。建议补充长度校验。

### 修复后预期

修复 BUG-SEC-01 后，整体测试通过率可达 **95.7% → 97.8%**（剩余 2 个建议级缺陷可在后续迭代中修复）。

### 亮点

1. **分层架构清晰**：routes → controllers → services → db 四层职责分明，代码可维护性好
2. **类型安全完善**：TypeScript strict 模式 + Zod 运行时校验，双保险
3. **错误处理规范**：AppError + ErrorCode + errorHandler 三件套，统一错误格式
4. **安全意识到位**：bcrypt 加密、JWT 签名、防用户枚举、helmet 安全头、生产环境隐藏堆栈
5. **Zod 验证精确**：密码复杂度要求（大小写 + 数字）完全匹配 API-SPEC 规则
6. **数据库设计专业**：索引含条件过滤、JSONB GIN 索引、全文搜索 TSVECTOR、CHECK 约束、CASCADE 级联删除

---

_测试报告 v1.0 \| test agent \| 2026-03-19_
