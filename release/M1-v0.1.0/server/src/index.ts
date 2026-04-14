/**
 * Express 入口文件
 *
 * 应用启动入口，负责：
 * 1. 启动 HTTP 服务器
 * 2. 监听指定端口
 * 3. 处理优雅关闭（SIGTERM/SIGINT）
 * 4. 未捕获异常处理
 */

import { app, logger } from './app';
import { closeDb } from './db/connection';
import { config } from './config';

/**
 * 启动 HTTP 服务器
 */
const server = app.listen(config.port, () => {
  logger.info(`🚀 予乐 Yule Notion 服务已启动`, {
    port: config.port,
    env: config.nodeEnv,
    url: `http://localhost:${config.port}`,
  });
});

/**
 * 优雅关闭处理
 *
 * 当收到 SIGTERM（容器终止）或 SIGINT（Ctrl+C）信号时：
 * 1. 停止接收新请求
 * 2. 等待现有请求处理完成
 * 3. 关闭数据库连接
 * 4. 退出进程
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

  // 停止接收新请求，等待现有请求处理完成
  server.close(() => {
    logger.info('HTTP 服务器已关闭');
  });

  // 关闭数据库连接
  try {
    await closeDb();
    logger.info('数据库连接已关闭');
  } catch (err) {
    logger.error({ err }, '关闭数据库连接时出错');
  }

  process.exit(0);
}

// 注册信号监听
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * 未捕获异常处理
 *
 * 这些是最后的兜底处理，正常情况下错误应该在业务逻辑中被捕获。
 */
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, '未捕获的异常');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, '未处理的 Promise 拒绝');
  process.exit(1);
});

/**
 * 导出服务器实例（用于测试）
 */
export { server };
