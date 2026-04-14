# API 接口设计文档 — 予乐 Yule Notion

> **版本：** v1.0  
> **架构师：** arch  
> **日期：** 2026-03-19  
> **PRD版本：** v1.0  

---

## 一、总则

### 1.1 基础约定

| 项目 | 规范 |
|------|------|
| Base URL | `/api/v1` |
| 协议 | HTTPS（生产环境强制） |
| Content-Type | `application/json`（默认）；`multipart/form-data`（文件上传） |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601 UTC (`2026-03-20T10:00:00.000Z`) |
| ID 格式 | UUID v4 |
| 认证方式 | `Authorization: Bearer <JWT_TOKEN>` |
| 分页参数 | `?page=1&pageSize=20`（page 从 1 开始，pageSize 范围 1-100） |

### 1.2 统一响应格式

**成功响应：**

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

> `meta` 仅在列表/分页接口中出现。单资源接口直接返回 `{ data: { ... } }`。

**错误响应：**

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "页面不存在",
    "details": {}
  }
}
```

### 1.3 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 查询/更新成功 |
| 201 | Created | 创建成功 |
| 204 | No Content | 删除成功（无响应体） |
| 400 | Bad Request | 参数验证失败 |
| 401 | Unauthorized | 未认证 / Token 过期 |
| 403 | Forbidden | 无权限访问该资源 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如邮箱已注册） |
| 413 | Payload Too Large | 文件超过大小限制 |
| 422 | Unprocessable Entity | 业务逻辑校验失败 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务端异常 |

### 1.4 错误码枚举

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数校验失败 |
| `UNAUTHORIZED` | 401 | 未提供或 Token 无效 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `FORBIDDEN` | 403 | 无权访问此资源 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `EMAIL_ALREADY_EXISTS` | 409 | 邮箱已被注册 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `FILE_TOO_LARGE` | 413 | 文件超过 5MB |
| `UNSUPPORTED_FILE_TYPE` | 422 | 不支持的文件类型 |
| `SYNC_CONFLICT` | 409 | 同步冲突 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务端内部错误 |

---

## 二、认证模块 `/api/v1/auth`

### 2.1 POST /api/v1/auth/register — 用户注册

**认证：** 否

**请求体：**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| email | string | ✅ | 合法邮箱格式，最长 254 字符 |
| password | string | ✅ | 最少 8 字符，至少含大小写字母和数字 |
| name | string | ✅ | 1-50 字符 |

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "用户名"
}
```

**响应 201：**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "name": "用户名",
      "createdAt": "2026-03-20T10:00:00.000Z"
    }
  }
}
```

### 2.2 POST /api/v1/auth/login — 用户登录

**认证：** 否

**请求体：**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| email | string | ✅ | 合法邮箱格式 |
| password | string | ✅ | 非空 |

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**响应 200：**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "name": "用户名",
      "createdAt": "2026-03-20T10:00:00.000Z"
    }
  }
}
```

### 2.3 GET /api/v1/auth/me — 获取当前用户信息

**认证：** ✅

**响应 200：**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "用户名",
    "createdAt": "2026-03-20T10:00:00.000Z"
  }
}
```

---

## 三、页面模块 `/api/v1/pages`

### 3.1 GET /api/v1/pages — 获取页面列表

**认证：** ✅

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tree | boolean | 否 | `true` 返回嵌套树形结构，`false`（默认）返回扁平列表 |
| parentId | string | 否 | 筛选指定父页面下的子页面（`null` 或不传 = 根页面） |
| includeDeleted | boolean | 否 | 是否包含已删除页面（仅 `tree=false` 时有效） |

**响应 200（扁平列表）：**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "title": "工作笔记",
      "parentId": null,
      "order": 0,
      "icon": "📄",
      "tags": ["tag-uuid-1"],
      "isDeleted": false,
      "version": 3,
      "createdAt": "2026-03-20T10:00:00.000Z",
      "updatedAt": "2026-03-20T12:00:00.000Z"
    }
  ]
}
```

**响应 200（树形结构 tree=true）：**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "title": "工作笔记",
      "parentId": null,
      "order": 0,
      "icon": "📄",
      "children": [
        {
          "id": "b2c3d4e5-...",
          "title": "项目A",
          "parentId": "a1b2c3d4-...",
          "order": 0,
          "icon": "📁",
          "children": []
        }
      ]
    }
  ]
}
```

> 树形结构不含 `content`、`tags`、时间戳等详情字段，用于侧边栏展示。详情需通过单页面接口获取。

### 3.2 POST /api/v1/pages — 创建页面

**认证：** ✅

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 默认 `"无标题"` |
| content | object | 否 | TipTap JSON，默认空文档 `{ "type": "doc", "content": [] }` |
| parentId | string | 否 | 父页面 ID，`null` 为根页面 |
| order | integer | 否 | 同级排序，默认追加到末尾 |
| icon | string | 否 | 页面图标 Emoji，默认 `"📄"` |

```json
{
  "title": "新页面",
  "parentId": null,
  "icon": "📝"
}
```

**响应 201：**

```json
{
  "data": {
    "id": "f5e4d3c2-b1a0-9876-5432-10fedcba0987",
    "title": "新页面",
    "content": { "type": "doc", "content": [] },
    "parentId": null,
    "order": 5,
    "icon": "📝",
    "tags": [],
    "isDeleted": false,
    "version": 1,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

### 3.3 GET /api/v1/pages/:id — 获取单个页面

**认证：** ✅

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 页面 ID |

**响应 200：**

```json
{
  "data": {
    "id": "f5e4d3c2-b1a0-9876-5432-10fedcba0987",
    "title": "新页面",
    "content": {
      "type": "doc",
      "content": [
        {
          "type": "heading",
          "attrs": { "level": 1 },
          "content": [{ "type": "text", "text": "标题" }]
        },
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "正文内容" }]
        }
      ]
    },
    "parentId": null,
    "order": 5,
    "icon": "📝",
    "tags": ["tag-uuid-1"],
    "isDeleted": false,
    "version": 2,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T12:30:00.000Z"
  }
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 404 | `RESOURCE_NOT_FOUND` | 页面不存在或已被删除 |
| 403 | `FORBIDDEN` | 非当前用户的页面 |

### 3.4 PUT /api/v1/pages/:id — 更新页面

**认证：** ✅

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 页面 ID |

**请求体（部分更新）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 新标题 |
| content | object | 否 | TipTap JSON（整篇替换，不支持 patch） |
| icon | string | 否 | 新图标 Emoji |

```json
{
  "title": "更新后的标题",
  "content": { "type": "doc", "content": [...] }
}
```

**乐观锁机制：** 客户端可在请求头中携带 `If-Match: <version>`，服务端检查版本号是否匹配。不匹配返回 409 Conflict。

**响应 200：**

```json
{
  "data": {
    "id": "f5e4d3c2-...",
    "title": "更新后的标题",
    "content": { "type": "doc", "content": [...] },
    "parentId": null,
    "order": 5,
    "icon": "📝",
    "tags": [],
    "isDeleted": false,
    "version": 3,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T13:00:00.000Z"
  }
}
```

### 3.5 DELETE /api/v1/pages/:id — 删除页面

**认证：** ✅

**行为：** 软删除，设置 `is_deleted = true`，`deleted_at = now()`。

**递归删除：** 删除父页面时，其所有子页面一并软删除。

**响应 204**（无响应体）

### 3.6 PUT /api/v1/pages/:id/move — 移动页面

**认证：** ✅

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| parentId | string | 否 | 新父页面 ID，`null` 移到根级 |
| order | integer | 否 | 新排序位置（同级索引） |

```json
{
  "parentId": "a1b2c3d4-...",
  "order": 2
}
```

**校验规则：**
- 不能将页面移动到自身或其子页面下（防止循环引用）
- `parentId` 必须是当前用户的页面

**响应 200：** 返回更新后的页面（同 GET 单页面格式）

---

## 四、搜索模块 `/api/v1/search`

### 4.1 GET /api/v1/search — 全文搜索

**认证：** ✅

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | ✅ | 搜索关键词，最少 1 字符，最长 200 |
| page | integer | 否 | 页码，默认 1 |
| pageSize | integer | 否 | 每页条数，默认 20，最大 50 |
| tagId | string | 否 | 按标签 ID 筛选 |

**响应 200：**

```json
{
  "data": {
    "results": [
      {
        "id": "a1b2c3d4-...",
        "title": "匹配的页面标题",
        "titleHighlight": "匹配的<em>页面</em>标题",
        "snippet": "...这是包含<em>关键词</em>的上下文片段...",
        "icon": "📄",
        "updatedAt": "2026-03-20T12:00:00.000Z"
      }
    ],
    "total": 15
  },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 15
  }
}
```

**搜索规则：**
- 同时搜索 `title` 和 `content` 字段
- 标题匹配权重 > 内容匹配权重
- 结果按相关度降序排列
- `titleHighlight` 为高亮后的标题（关键词用 `<em>` 标签包裹），直接用于前端展示，避免客户端重复高亮处理
- `snippet` 中关键词用 `<em>` 标签高亮，前后各取 50 字符

---

## 五、标签模块 `/api/v1/tags`

### 5.1 GET /api/v1/tags — 获取所有标签

**认证：** ✅

**响应 200：**

```json
{
  "data": [
    {
      "id": "t1a2b3c4-...",
      "name": "工作",
      "color": "#3b82f6",
      "pageCount": 5
    }
  ]
}
```

### 5.2 POST /api/v1/tags — 创建标签

**认证：** ✅

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 标签名，1-30 字符，同一用户下唯一 |
| color | string | 否 | 颜色值（HEX），默认 `"#6b7280"` |

```json
{
  "name": "工作",
  "color": "#3b82f6"
}
```

**响应 201：**

```json
{
  "data": {
    "id": "t1a2b3c4-...",
    "name": "工作",
    "color": "#3b82f6",
    "pageCount": 0,
    "createdAt": "2026-03-20T10:00:00.000Z"
  }
}
```

**错误：** 409 `RESOURCE_CONFLICT` — 同名标签已存在

### 5.3 DELETE /api/v1/tags/:id — 删除标签

**认证：** ✅

**行为：** 删除标签，同时移除所有页面的关联。

**响应 204**

### 5.4 PUT /api/v1/pages/:id/tags — 更新页面标签

**认证：** ✅

**请求体：**

```json
{
  "tagIds": ["t1a2b3c4-...", "t5e6f7g8-..."]
}
```

> 全量替换模式：传入的 `tagIds` 将替换该页面所有现有标签关联。传空数组 `[]` 清空所有标签。

**响应 200：**

```json
{
  "data": {
    "tags": [
      { "id": "t1a2b3c4-...", "name": "工作", "color": "#3b82f6" },
      { "id": "t5e6f7g8-...", "name": "学习", "color": "#10b981" }
    ]
  }
}
```

### 5.5 GET /api/v1/tags/:id/pages — 获取标签下的页面

**认证：** ✅

**查询参数：** `?page=1&pageSize=20`

**响应 200：**

```json
{
  "data": {
    "tag": {
      "id": "t1a2b3c4-...",
      "name": "工作",
      "color": "#3b82f6"
    },
    "pages": [
      {
        "id": "a1b2c3d4-...",
        "title": "项目A笔记",
        "icon": "📄",
        "updatedAt": "2026-03-20T12:00:00.000Z"
      }
    ],
    "total": 5
  },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 5
  }
}
```

---

## 六、文件上传模块 `/api/v1/upload`

### 6.1 POST /api/v1/upload/image — 上传图片

**认证：** ✅

**Content-Type：** `multipart/form-data`

**请求字段：**

| 字段 | 类型 | 必填 | 校验 |
|------|------|------|------|
| file | File | ✅ | 格式：jpg/png/gif/webp；大小：≤ 5MB |

**响应 200：**

```json
{
  "data": {
    "id": "u1a2b3c4-...",
    "url": "/uploads/images/u1a2b3c4-original.png",
    "filename": "original.png",
    "size": 102400,
    "mimeType": "image/png",
    "createdAt": "2026-03-20T10:00:00.000Z"
  }
}
```

**存储策略：**
- 文件路径：`/uploads/images/<uuid>-<原文件名>`
- 通过 Nginx 静态服务访问：`https://domain.com/uploads/images/...`
- 不做图片压缩/转码（MVP 简化），保留原文件
- 图片访问无需鉴权（URL 不可猜测即可）

---

## 七、导出模块 `/api/v1/pages/:id/export`

### 7.1 GET /api/v1/pages/:id/export?format=markdown — 导出 Markdown

**认证：** ✅

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | ✅ | `markdown` 或 `pdf` |

**响应 (Markdown)：**

```
HTTP/1.1 200 OK
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="*=UTF-8''%E9%A1%B5%E9%9D%A2%E6%A0%87%E9%A2%98.md"
```

响应体为 Markdown 文本，格式转换规则：

| TipTap 块类型 | Markdown 输出 |
|---------------|---------------|
| heading (level 1) | `# 标题` |
| heading (level 2) | `## 标题` |
| heading (level 3) | `### 标题` |
| bulletList > listItem | `- 列表项` |
| orderedList > listItem | `1. 列表项` |
| codeBlock | `` ```language\n代码\n``` `` |
| blockquote | `> 引用文本` |
| paragraph | 普通文本段落 |
| image | `![alt](url)` |

### 7.2 GET /api/v1/pages/:id/export?format=pdf — 导出 PDF

**响应 (PDF)：**

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="*=UTF-8''%E9%A1%B5%E9%9D%A2%E6%A0%87%E9%A2%98.pdf"
```

**实现方式：** 服务端使用 Puppeteer 渲染 HTML → PDF（或前端使用 html2pdf.js）。

> PDF 导出为 P2 功能，MVP 阶段可使用前端 html2pdf.js 方案，避免服务端引入 Puppeteer 的重量级依赖。

---

## 八、数据同步模块 `/api/v1/sync`

### 8.1 POST /api/v1/sync — 推送本地变更

**认证：** ✅

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| changes | array | ✅ | 变更列表 |
| changes[].type | string | ✅ | `create` / `update` / `delete` |
| changes[].pageId | string | ✅ | 页面 UUID |
| changes[].title | string | 条件 | type 为 create/update 时必填 |
| changes[].content | object | 条件 | type 为 create/update 时必填 |
| changes[].version | integer | 条件 | type 为 update 时必填 |
| changes[].localUpdatedAt | string | ✅ | 本地修改时间 ISO 8601 |
| changes[].parentId | string | 否 | 页面父级 |
| changes[].order | integer | 否 | 排序 |
| changes[].icon | string | 否 | 图标 |
| lastSyncAt | string | 否 | 客户端上次同步时间，用于返回服务端增量变更 |

```json
{
  "changes": [
    {
      "type": "create",
      "pageId": "f5e4d3c2-...",
      "title": "离线新建的页面",
      "content": { "type": "doc", "content": [] },
      "parentId": null,
      "order": 0,
      "localUpdatedAt": "2026-03-20T15:00:00.000Z"
    },
    {
      "type": "update",
      "pageId": "a1b2c3d4-...",
      "title": "离线编辑的标题",
      "content": { "type": "doc", "content": [...] },
      "version": 3,
      "localUpdatedAt": "2026-03-20T15:05:00.000Z"
    }
  ],
  "lastSyncAt": "2026-03-20T10:00:00.000Z"
}
```

**响应 200：**

```json
{
  "data": {
    "synced": ["f5e4d3c2-..."],
    "conflicts": [
      {
        "pageId": "a1b2c3d4-...",
        "localVersion": 3,
        "serverVersion": 5,
        "resolution": "server_wins",
        "serverPage": {
          "id": "a1b2c3d4-...",
          "title": "服务端版本标题",
          "content": { "type": "doc", "content": [...] },
          "version": 5,
          "updatedAt": "2026-03-20T14:00:00.000Z"
        }
      }
    ],
    "serverChanges": [
      {
        "type": "update",
        "pageId": "x1y2z3w4-...",
        "title": "其他设备修改的标题",
        "content": { "type": "doc", "content": [...] },
        "parentId": null,
        "order": 2,
        "icon": "📝",
        "version": 4,
        "updatedAt": "2026-03-20T12:00:00.000Z"
      }
    ],
    "syncedAt": "2026-03-20T15:10:00.000Z"
  }
}
```

**冲突处理规则：**
- LWW：比较 `localUpdatedAt` vs 服务端 `updatedAt`，保留时间戳更晚的版本
- 如果服务端 version > 客户端 version 且服务端 updatedAt > localUpdatedAt → **server_wins**
- 冲突的页面在 `conflicts` 数组中返回服务端版本，客户端用其覆盖本地
- `synced` 数组列出成功同步（无冲突）的 pageId

### 8.2 GET /api/v1/sync/changes?since=timestamp — 获取服务端增量变更

**认证：** ✅

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| since | string (ISO 8601) | ✅ | 起始时间 |
| limit | integer | 否 | 最大返回条数，默认 100，最大 500 |

**响应 200：**

```json
{
  "data": {
    "changes": [
      {
        "type": "create",
        "pageId": "x1y2z3w4-...",
        "title": "新创建的页面",
        "content": { "type": "doc", "content": [] },
        "parentId": null,
        "order": 0,
        "icon": "📄",
        "version": 1,
        "updatedAt": "2026-03-20T13:00:00.000Z"
      }
    ],
    "hasMore": false,
    "serverTime": "2026-03-20T15:10:00.000Z"
  }
}
```

**说明：** 返回该用户在 `since` 之后的所有变更（包括自己在其他设备上的修改）。

---

## 九、API 汇总表

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/v1/auth/register | ❌ | 用户注册 |
| POST | /api/v1/auth/login | ❌ | 用户登录 |
| GET | /api/v1/auth/me | ✅ | 获取当前用户 |
| GET | /api/v1/pages | ✅ | 获取页面列表/树 |
| POST | /api/v1/pages | ✅ | 创建页面 |
| GET | /api/v1/pages/:id | ✅ | 获取单个页面 |
| PUT | /api/v1/pages/:id | ✅ | 更新页面 |
| DELETE | /api/v1/pages/:id | ✅ | 删除页面（软删除） |
| PUT | /api/v1/pages/:id/move | ✅ | 移动页面 |
| GET | /api/v1/search?q=&page=&pageSize=&tagId= | ✅ | 全文搜索 |
| GET | /api/v1/tags | ✅ | 获取所有标签 |
| POST | /api/v1/tags | ✅ | 创建标签 |
| DELETE | /api/v1/tags/:id | ✅ | 删除标签 |
| PUT | /api/v1/pages/:id/tags | ✅ | 更新页面标签 |
| GET | /api/v1/tags/:id/pages | ✅ | 获取标签下页面 |
| POST | /api/v1/upload/image | ✅ | 上传图片 |
| GET | /api/v1/pages/:id/export?format=markdown | ✅ | 导出 Markdown |
| GET | /api/v1/pages/:id/export?format=pdf | ✅ | 导出 PDF |
| POST | /api/v1/sync | ✅ | 推送本地变更 |
| GET | /api/v1/sync/changes?since= | ✅ | 获取服务端增量变更 |

**共计 20 个接口。**

---

## 十、前端请求拦截规范

### 10.1 Axios 实例配置

```typescript
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截：注入 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：401 跳转登录
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)
```

### 10.2 同步请求特殊处理

同步 API 请求需特殊处理：
- 失败自动重试（最多 3 次，指数退避）
- 网络离线时缓存请求到队列，恢复后重发
- 不触发 401 跳转（避免同步过程中打断用户操作）

---

_API 设计文档 v1.0 \| arch \| 2026-03-19_
