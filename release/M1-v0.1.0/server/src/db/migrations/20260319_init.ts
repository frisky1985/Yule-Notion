/**
 * Knex 迁移文件：初始化数据库
 *
 * 将 db/001_init.sql 中的完整 DDL 转换为 Knex 迁移格式。
 * 包含所有表、索引、约束、触发器和函数的创建。
 *
 * 数据库：PostgreSQL 15+
 * 共 6 张表 + 2 个触发器函数 + 2 个触发器
 */

import type { Knex } from 'knex';

/**
 * 执行迁移（创建所有数据库对象）
 * @param knex - Knex 实例
 */
export async function up(knex: Knex): Promise<void> {
  // 启用必要扩展
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

  // ============================================================
  // 1. 用户表
  // ============================================================
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 254).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('name', 50).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['email']);
  });

  await knex.schema.raw('CREATE INDEX idx_users_email ON users (email)');

  await knex.schema.raw('COMMENT ON TABLE users IS \'用户表\'');
  await knex.schema.raw('COMMENT ON COLUMN users.id IS \'用户唯一标识 UUID v4\'');
  await knex.schema.raw('COMMENT ON COLUMN users.email IS \'登录邮箱，唯一\'');
  await knex.schema.raw('COMMENT ON COLUMN users.password_hash IS \'bcrypt 加密后的密码\'');
  await knex.schema.raw('COMMENT ON COLUMN users.name IS \'用户显示名\'');

  // ============================================================
  // 2. 页面表
  // ============================================================
  await knex.schema.createTable('pages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 500).notNullable().defaultTo('无标题');
    table.jsonb('content').notNullable().defaultTo('{"type":"doc","content":[]}');
    table.uuid('parent_id').references('id').inTable('pages').onDelete('CASCADE');
    table.integer('order').notNullable().defaultTo(0);
    table.string('icon', 10).notNullable().defaultTo('📄');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('deleted_at', { useTz: true });
    table.integer('version').notNullable().defaultTo(1);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.specificType('search_vector', 'TSVECTOR');
    table.check('"order" >= 0', {}, 'chk_pages_order');
    table.check('version > 0', {}, 'chk_pages_version');
  });

  // 核心索引
  await knex.schema.raw('CREATE INDEX idx_pages_user_id ON pages (user_id)');
  await knex.schema.raw(
    'CREATE INDEX idx_pages_user_parent ON pages (user_id, parent_id) WHERE is_deleted = FALSE'
  );
  await knex.schema.raw(
    `CREATE INDEX idx_pages_user_order ON pages (user_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), "order")
     WHERE is_deleted = FALSE`
  );
  await knex.schema.raw(
    'CREATE INDEX idx_pages_user_updated ON pages (user_id, updated_at DESC) WHERE is_deleted = FALSE'
  );

  // 全文搜索 GIN 索引
  await knex.schema.raw('CREATE INDEX idx_pages_search ON pages USING GIN (search_vector)');

  // 内容 JSONB 索引
  await knex.schema.raw('CREATE INDEX idx_pages_content ON pages USING GIN (content jsonb_path_ops)');

  await knex.schema.raw('COMMENT ON TABLE pages IS \'页面表 - 核心内容存储\'');
  await knex.schema.raw(
    'COMMENT ON COLUMN pages.content IS \'TipTap JSON 编辑器内容，JSONB 格式\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN pages.parent_id IS \'父页面 ID，NULL 表示根页面（邻接表模型，支持3级嵌套）\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN pages.search_vector IS \'PostgreSQL 全文搜索向量，由触发器自动维护\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN pages.version IS \'乐观锁版本号，每次更新 +1\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN pages.is_deleted IS \'软删除标记\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN pages.deleted_at IS \'删除时间，用于30天自动清理\''
  );

  // ============================================================
  // 3. 标签表
  // ============================================================
  await knex.schema.createTable('tags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 30).notNullable();
    table.string('color', 7).notNullable().defaultTo('#6b7280');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['user_id', 'name']);
    table.check("color ~ '^#[0-9a-fA-F]{6}$'", {}, 'chk_tags_color');
  });

  await knex.schema.raw('CREATE INDEX idx_tags_user_id ON tags (user_id)');
  await knex.schema.raw('CREATE INDEX idx_tags_user_name ON tags (user_id, name)');

  await knex.schema.raw('COMMENT ON TABLE tags IS \'标签表 - 用户自定义分类标签\'');
  await knex.schema.raw(
    'COMMENT ON COLUMN tags.color IS \'标签颜色 HEX 值，如 #3b82f6\''
  );

  // ============================================================
  // 4. 页面-标签关联表
  // ============================================================
  await knex.schema.createTable('page_tags', (table) => {
    table.uuid('page_id').notNullable().references('id').inTable('pages').onDelete('CASCADE');
    table.uuid('tag_id').notNullable().references('id').inTable('tags').onDelete('CASCADE');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(['page_id', 'tag_id']);
  });

  await knex.schema.raw('CREATE INDEX idx_page_tags_tag_id ON page_tags (tag_id)');
  await knex.schema.raw('COMMENT ON TABLE page_tags IS \'页面与标签多对多关联表\'');

  // ============================================================
  // 5. 上传文件表
  // ============================================================
  await knex.schema.createTable('uploaded_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('original_name', 255).notNullable();
    table.string('storage_path', 500).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('size').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check('size > 0 AND size <= 5242880', {}, 'chk_file_size');
  });

  await knex.schema.raw('CREATE INDEX idx_files_user_id ON uploaded_files (user_id)');

  await knex.schema.raw(
    'COMMENT ON TABLE uploaded_files IS \'上传文件元数据表（实际文件存储在文件系统）\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN uploaded_files.storage_path IS \'相对于 uploads/ 目录的存储路径\''
  );
  await knex.schema.raw(
    'COMMENT ON COLUMN uploaded_files.size IS \'文件大小（字节），限制最大 5MB\''
  );

  // ============================================================
  // 6. 同步日志表
  // ============================================================
  await knex.schema.createTable('sync_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('page_id').references('id').inTable('pages').onDelete('SET NULL');
    table.string('sync_type', 10).notNullable();
    table.string('action', 10).notNullable();
    table.integer('client_version');
    table.integer('server_version');
    table.boolean('conflict').notNullable().defaultTo(false);
    table.string('resolution', 20);
    table.specificType('ip_address', 'INET');
    table.text('user_agent');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check("sync_type IN ('push', 'pull')", {}, 'chk_sync_type');
    table.check("action IN ('create', 'update', 'delete')", {}, 'chk_sync_action');
  });

  await knex.schema.raw(
    'CREATE INDEX idx_sync_log_user ON sync_log (user_id, created_at DESC)'
  );
  await knex.schema.raw('CREATE INDEX idx_sync_log_page ON sync_log (page_id)');

  await knex.schema.raw(
    'COMMENT ON TABLE sync_log IS \'数据同步操作日志，用于冲突排查和审计\''
  );

  // ============================================================
  // 7. 触发器函数：自动维护 search_vector
  // ============================================================

  await knex.raw(`
    CREATE OR REPLACE FUNCTION pages_search_vector_update() RETURNS TRIGGER AS $$
    BEGIN
        NEW.search_vector :=
            setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
            setweight(to_tsvector('simple',
                COALESCE(
                    (
                        SELECT string_agg(
                            COALESCE(t->>'text', ''),
                            ' '
                        )
                        FROM jsonb_array_elements(
                            COALESCE(
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
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_pages_search_vector
        BEFORE INSERT OR UPDATE OF title, content ON pages
        FOR EACH ROW
        EXECUTE FUNCTION pages_search_vector_update();
  `);

  // pages 表的 updated_at 独立触发器，覆盖所有列的更新
  // 注意：search_vector 触发器也会设置 updated_at，但仅限于 title/content 更新
  // 此触发器确保更新任何列时 updated_at 都会自动更新
  await knex.raw(`
    CREATE TRIGGER trg_pages_updated_at
        BEFORE UPDATE ON pages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);

  await knex.raw(
    `COMMENT ON FUNCTION pages_search_vector_update() IS '从页面标题和 TipTap JSON content 中提取文本生成全文搜索向量'`
  );

  // ============================================================
  // 8. 触发器函数：自动更新 updated_at
  // ============================================================

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * 回滚迁移（删除所有数据库对象）
 * @param knex - Knex 实例
 */
export async function down(knex: Knex): Promise<void> {
  // 按照依赖关系的逆序删除表
  await knex.schema.dropTableIfExists('sync_log');
  await knex.schema.dropTableIfExists('uploaded_files');
  await knex.schema.dropTableIfExists('page_tags');
  await knex.schema.dropTableIfExists('tags');
  await knex.schema.dropTableIfExists('pages');
  await knex.schema.dropTableIfExists('users');

  // 删除触发器和函数
  await knex.raw('DROP TRIGGER IF EXISTS trg_users_updated_at ON users');
  await knex.raw('DROP TRIGGER IF EXISTS trg_pages_search_vector ON pages');
  await knex.raw('DROP TRIGGER IF EXISTS trg_pages_updated_at ON pages');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
  await knex.raw('DROP FUNCTION IF EXISTS pages_search_vector_update()');
}
