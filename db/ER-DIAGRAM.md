# ER 图 — 予乐 Yule Notion

> **版本：** v1.0 | **架构师：** arch | **日期：** 2026-03-19

---

## 实体关系图（文字描述）

```
┌──────────────────┐         ┌──────────────────────────────────┐
│     users        │         │            pages                 │
├──────────────────┤         ├──────────────────────────────────┤
│ PK id (UUID)     │──┐  ┌──│ PK id (UUID)                     │
│    email (UQ)    │  │  │  │ FK user_id (UUID) ──────────────►│
│    password_hash │  │  │  │    title (VARCHAR 500)            │
│    name (VARCHAR)│  │  │  │    content (JSONB) ◆             │
│    created_at    │  │  │  │ FK parent_id (UUID, nullable) ──►│ (自引用)
│    updated_at    │  │  │  │    order (INTEGER)               │
└──────────────────┘  │  │  │    icon (VARCHAR 10)             │
                      │  │  │    is_deleted (BOOLEAN)          │
                      │  │  │    deleted_at (TIMESTAMPTZ)      │
                      │  │  │    version (INTEGER)             │
                      │  │  │    search_vector (TSVECTOR)      │
                      │  │  │    created_at                    │
                      │  │  │    updated_at                    │
                      │  │  └──────────────────────────────────┘
                      │  │          │        │
                      │  │          │        │
                      │  │          ▼        ▼
                      │  │  ┌──────────────────┐
                      │  │  │   page_tags      │
                      │  │  ├──────────────────┤
                      │  │  │ FK page_id ──────┘
                      │  │  │ FK tag_id  ──────┐
                      │  │  │ PK(page_id,tag_id)│
                      │  │  │    created_at     │
                      │  │  └──────────────────┘
                      │  │           │
                      │  │           ▼
                      │  │  ┌──────────────────┐
                      │  │  │     tags         │
                      │  │  ├──────────────────┤
                      │  │  │ PK id (UUID)     │
                      │  └──│ FK user_id       │
                      │     │    name (VARCHAR) │
                      │     │    color (VARCHAR)│
                      │     │    created_at     │
                      │     └──────────────────┘
                      │
                      │  ┌──────────────────┐
                      │  │ uploaded_files   │
                      │  ├──────────────────┤
                      │  │ PK id (UUID)     │
                      └──│ FK user_id       │
                          │    original_name │
                          │    storage_path  │
                          │    mime_type     │
                          │    size (INTEGER)│
                          │    created_at     │
                          └──────────────────┘

┌──────────────────┐
│   sync_log       │
├──────────────────┤
│ PK id (UUID)     │
│ FK user_id       │
│ FK page_id       │
│    sync_type     │
│    action        │
│    client_version│
│    server_version│
│    conflict      │
│    resolution    │
│    ip_address    │
│    user_agent    │
│    created_at     │
└──────────────────┘
```

## 图例

| 符号 | 含义 |
|------|------|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `UQ` | Unique Constraint |
| `◆` | JSONB 字段（非结构化数据） |
| `──►` | 一对多关系（父 → 子） |
| `──┐ ┌──` | 多对一关系 |
| `──┘ └──` | 多对多关系（通过关联表） |

---

## 表关系说明

### users ↔ pages (一对多)
- 一个用户拥有多个页面
- `pages.user_id` 外键引用 `users.id`
- ON DELETE CASCADE：删除用户时级联删除所有页面

### pages ↔ pages (自引用，一对多)
- 页面支持树形层级（最多 3 级嵌套）
- `pages.parent_id` 引用 `pages.id`（邻接表模型）
- ON DELETE CASCADE：删除父页面时级联删除所有子页面

### users ↔ tags (一对多)
- 一个用户拥有多个标签
- `tags.user_id` 外键引用 `users.id`
- ON DELETE CASCADE

### pages ↔ tags (多对多)
- 通过 `page_tags` 关联表实现
- 复合主键 `(page_id, tag_id)`
- ON DELETE CASCADE：页面或标签删除时自动清理关联

### users ↔ uploaded_files (一对多)
- 一个用户可上传多个文件
- `uploaded_files.user_id` 外键引用 `users.id`
- ON DELETE CASCADE

### users ↔ sync_log (一对多)
- 同步日志按用户维度记录
- `sync_log.user_id` 外键引用 `users.id`
- `sync_log.page_id` 可选引用 `pages.id`（ON DELETE SET NULL，保留日志）

---

## 索引清单

| 表 | 索引名 | 字段 | 类型 | 说明 |
|----|--------|------|------|------|
| users | idx_users_email | email | B-tree | 邮箱唯一索引 |
| pages | idx_pages_user_id | user_id | B-tree | 用户维度查询 |
| pages | idx_pages_user_parent | user_id, parent_id | B-tree | 条件索引，仅未删除 |
| pages | idx_pages_user_order | user_id, parent_id, order | B-tree | 排序查询 |
| pages | idx_pages_user_updated | user_id, updated_at DESC | B-tree | 按更新时间排序 |
| pages | idx_pages_search | search_vector | GIN | 全文搜索 |
| pages | idx_pages_content | content | GIN | JSONB 内容查询（备用） |
| tags | idx_tags_user_id | user_id | B-tree | 用户维度查询 |
| tags | idx_tags_user_name | user_id, name | B-tree | 用户下标签名查询 |
| page_tags | idx_page_tags_tag_id | tag_id | B-tree | 按标签查页面 |
| uploaded_files | idx_files_user_id | user_id | B-tree | 用户维度查询 |
| sync_log | idx_sync_log_user | user_id, created_at DESC | B-tree | 同步日志查询 |
| sync_log | idx_sync_log_page | page_id | B-tree | 页面同步历史 |

---

## 关键设计决策

1. **JSONB 存储 TipTap 内容** — 无需额外文本表，PostgreSQL JSONB 查询性能优秀
2. **邻接表树结构** — 3 级嵌套场景简单高效，无需闭包表或物化路径
3. **tsvector 全文搜索** — 由触发器自动维护，对应用层透明；标题权重 A > 内容权重 B
4. **软删除 + 30天清理** — `is_deleted` + `deleted_at`，防止误删，定期清理
5. **version 乐观锁** — 每次更新 version +1，同步冲突检测基础
6. **sync_log 审计表** — 记录每次同步操作，便于冲突排查

---

_ER 图 v1.0 \| arch \| 2026-03-19_
