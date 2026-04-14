/**
 * Knex 配置文件
 *
 * 支持 development 和 test 两种环境。
 * 通过环境变量 DATABASE_URL 或 NODE_ENV 切换数据库连接。
 */

import type { Knex } from 'knex';

/**
 * 开发环境数据库配置（本地 PostgreSQL）
 */
const development: Knex.Config = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL || 'postgresql://yule:password@localhost:5432/yule',
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/db/seeds',
  },
};

/**
 * 测试环境数据库配置
 */
const test: Knex.Config = {
  client: 'postgresql',
  connection: process.env.TEST_DATABASE_URL || 'postgresql://yule:password@localhost:5432/yule_test',
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/db/seeds',
  },
};

/**
 * 生产环境数据库配置
 */
const production: Knex.Config = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL || 'postgresql://yule:password@localhost:5432/yule',
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/db/seeds',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

/**
 * 根据当前 NODE_ENV 选择对应的数据库配置
 */
const config: Record<string, Knex.Config> = {
  development,
  test,
  production,
};

export default config[process.env.NODE_ENV || 'development'];
