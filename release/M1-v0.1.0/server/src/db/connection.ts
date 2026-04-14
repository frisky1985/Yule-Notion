/**
 * Knex 数据库连接实例
 *
 * 创建并导出全局唯一的 Knex 实例。
 * Knex 使用连接池管理数据库连接，避免频繁创建/销毁连接。
 */

import knex from 'knex';
import { config } from '../config';

/**
 * Knex 实例
 *
 * 配置说明：
 * - client: 使用 PostgreSQL 驱动
 * - connection: 从 config 中获取数据库连接字符串
 * - pool: 连接池配置，控制最大/最小连接数
 *
 * 注意：knex 使用 node-postgres (pg) 驱动，
 * 它会自动解析 DATABASE_URL 格式的连接字符串。
 */
export const db = knex({
  client: 'postgresql',
  connection: config.databaseUrl,
  pool: {
    min: 2,
    max: 10,
  },
});

/**
 * 优雅关闭数据库连接
 *
 * 在应用关闭时调用，确保所有 pending 的查询完成后再断开连接。
 * @returns 关闭 Promise
 */
export async function closeDb(): Promise<void> {
  await db.destroy();
}
