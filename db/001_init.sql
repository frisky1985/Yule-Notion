-- ============================================================
-- 予乐 Yule Notion — 数据库初始化 DDL
-- 版本: v1.0 | 日期: 2026-03-19 | 架构师: arch
-- 数据库: PostgreSQL 15+
-- ============================================================

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- 模糊搜索支持

-- ============================================================
-- 1. 用户表
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(254) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户唯一标识 UUID v4';
COMMENT ON COLUMN users.email IS '登录邮箱，唯一';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 加密后的密码';
COMMENT ON COLUMN users.name IS '用户显示名';

-- ============================================================
-- 2. 页面表
-- ============================================================
CREATE TABLE pages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL DEFAULT '无标题',
    content         JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
    parent_id       UUID REFERENCES pages(id) ON DELETE CASCADE,
    "order"         INTEGER NOT NULL DEFAULT 0,
    icon            VARCHAR(10) NOT NULL DEFAULT '📄',
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 全文搜索向量列
    search_vector   TSVECTOR,

    CONSTRAINT chk_pages_order CHECK ("order" >= 0),
    CONSTRAINT chk_pages_version CHECK (version > 0)
);

-- 核心索引
CREATE INDEX idx_pages_user_id ON pages (user_id);
CREATE INDEX idx_pages_user_parent ON pages (user_id, parent_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_pages_user_order ON pages (user_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), "order")
    WHERE is_deleted = FALSE;
CREATE INDEX idx_pages_user_updated ON pages (user_id, updated_at DESC) WHERE is_deleted = FALSE;

-- 全文搜索 GIN 索引
CREATE INDEX idx_pages_search ON pages USING GIN (search_vector);

-- 内容 JSONB 索引（备用，用于特定 JSON 查询）
CREATE INDEX idx_pages_content ON pages USING GIN (content jsonb_path_ops);

COMMENT ON TABLE pages IS '页面表 - 核心内容存储';
COMMENT ON COLUMN pages.content IS 'TipTap JSON 编辑器内容，JSONB 格式';
COMMENT ON COLUMN pages.parent_id IS '父页面 ID，NULL 表示根页面（邻接表模型，支持3级嵌套）';
COMMENT ON COLUMN pages.search_vector IS 'PostgreSQL 全文搜索向量，由触发器自动维护';
COMMENT ON COLUMN pages.version IS '乐观锁版本号，每次更新 +1';
COMMENT ON COLUMN pages.is_deleted IS '软删除标记';
COMMENT ON COLUMN pages.deleted_at IS '删除时间，用于30天自动清理';

-- ============================================================
-- 3. 标签表
-- ============================================================
CREATE TABLE tags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(30) NOT NULL,
    color       VARCHAR(7) NOT NULL DEFAULT '#6b7280',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_tags_user_name UNIQUE (user_id, name),
    CONSTRAINT chk_tags_color CHECK (color ~ '^#[0-9a-fA-F]{6}$')
);

CREATE INDEX idx_tags_user_id ON tags (user_id);
CREATE INDEX idx_tags_user_name ON tags (user_id, name);

COMMENT ON TABLE tags IS '标签表 - 用户自定义分类标签';
COMMENT ON COLUMN tags.color IS '标签颜色 HEX 值，如 #3b82f6';

-- ============================================================
-- 4. 页面-标签关联表
-- ============================================================
CREATE TABLE page_tags (
    page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_page_tags PRIMARY KEY (page_id, tag_id)
);

CREATE INDEX idx_page_tags_tag_id ON page_tags (tag_id);

COMMENT ON TABLE page_tags IS '页面与标签多对多关联表';

-- ============================================================
-- 5. 上传文件表
-- ============================================================
CREATE TABLE uploaded_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name   VARCHAR(255) NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size            INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_file_size CHECK (size > 0 AND size <= 5242880)  -- 5MB
);

CREATE INDEX idx_files_user_id ON uploaded_files (user_id);

COMMENT ON TABLE uploaded_files IS '上传文件元数据表（实际文件存储在文件系统）';
COMMENT ON COLUMN uploaded_files.storage_path IS '相对于 uploads/ 目录的存储路径';
COMMENT ON COLUMN uploaded_files.size IS '文件大小（字节），限制最大 5MB';

-- ============================================================
-- 6. 同步日志表（可选，用于调试和审计）
-- ============================================================
CREATE TABLE sync_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_id         UUID REFERENCES pages(id) ON DELETE SET NULL,
    sync_type       VARCHAR(10) NOT NULL,  -- 'push' | 'pull'
    action          VARCHAR(10) NOT NULL,  -- 'create' | 'update' | 'delete'
    client_version  INTEGER,
    server_version  INTEGER,
    conflict        BOOLEAN NOT NULL DEFAULT FALSE,
    resolution      VARCHAR(20),            -- 'server_wins' | 'client_wins'
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_sync_type CHECK (sync_type IN ('push', 'pull')),
    CONSTRAINT chk_sync_action CHECK (action IN ('create', 'update', 'delete'))
);

CREATE INDEX idx_sync_log_user ON sync_log (user_id, created_at DESC);
CREATE INDEX idx_sync_log_page ON sync_log (page_id);

COMMENT ON TABLE sync_log IS '数据同步操作日志，用于冲突排查和审计';

-- ============================================================
-- 7. 触发器：自动维护 search_vector
-- ============================================================

-- 搜索向量更新函数
-- 将 title（权重 A）和 content 文本提取（权重 B）合并为 tsvector
CREATE OR REPLACE FUNCTION pages_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', 
            COALESCE(
                -- 从 TipTap JSON 中提取纯文本
                (
                    SELECT string_agg(
                        COALESCE(t->>'text', ''),
                        ' '
                    )
                    FROM jsonb_array_elements(
                        COALESCE(
                            -- 处理顶层 content 数组
                            CASE 
                                WHEN jsonb_typeof(NEW.content) = 'array' THEN NEW.content
                                WHEN NEW.content ? 'content' THEN NEW.content->'content'
                                ELSE '[]'::jsonb
                            END,
                            '[]'::jsonb
                        )
                    ) AS node
                    CROSS JOIN LATERAL jsonb_array_elements(
                        CASE 
                            WHEN jsonb_typeof(node) = 'object' AND node ? 'content' 
                            THEN node->'content'
                            ELSE '[]'::jsonb
                        END
                    ) AS leaf
                    WHERE leaf->>'text' IS NOT NULL
                ),
                ''
            )
        ), 'B');
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 创建触发器
CREATE TRIGGER trg_pages_search_vector
    BEFORE INSERT OR UPDATE OF title, content ON pages
    FOR EACH ROW
    EXECUTE FUNCTION pages_search_vector_update();

COMMENT ON FUNCTION pages_search_vector_update() IS '从页面标题和 TipTap JSON content 中提取文本生成全文搜索向量';

-- ============================================================
-- 8. 触发器：自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- pages 的 updated_at 已在搜索向量触发器中维护，无需重复

-- ============================================================
-- 9. 视图：搜索结果
-- ============================================================
-- 全文搜索便捷视图（前端通过 API 调用，此视图供后端 Service 使用）
-- 注意：实际搜索在应用层使用 SQL 直接查询，视图仅作参考

-- ============================================================
-- 10. 定时清理软删除页面（30天）
-- ============================================================
-- 可通过 pg_cron 或应用层定时任务执行
-- DELETE FROM pages WHERE is_deleted = TRUE AND deleted_at < NOW() - INTERVAL '30 days';

-- ============================================================
-- 11. 初始数据
-- ============================================================
-- 无需种子数据，应用启动后用户自行注册

-- ============================================================
-- DDL 完成
-- 共 6 张表 + 2 个触发器 + 1 个函数
-- ============================================================
