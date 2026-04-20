# Yule Notion

予乐 Yule Notion 是一个现代化的全栈笔记应用，采用 Vue 3 前端和 Node.js 后端架构，提供流畅的用户体验和强大的数据管理能力。

## 技术栈

### 前端 (Client)
- **框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router
- **构建工具**: Vite
- **UI 框架**: UnoCSS + Lucide Icons
- **HTTP 客户端**: Axios

### 后端 (Server)
- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL (通过 Knex.js ORM)
- **认证**: JWT + BcryptJS
- **日志**: Pino
- **验证**: Zod
- **安全**: Helmet + CORS + Rate Limiting
- **AI 服务**: OpenAI API (GPT-4o-mini)

## 项目结构

```
notebook-app/
├── code/
│   ├── client/          # 前端代码
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── server/          # 后端代码
│       ├── src/
│       ├── db/
│       └── package.json
├── api-spec/            # API 规范文档
├── arch/                # 架构设计文档
├── design/              # 详细设计文档
├── prd/                 # 产品需求文档
└── test/                # 测试报告
```

## 快速开始

### 环境要求
- Node.js v20+
- PostgreSQL 14+
- Redis (可选，用于会话管理)

### 安装依赖

```bash
# 安装前端依赖
cd code/client
npm install

# 安装后端依赖
cd code/server
npm install
```

### 开发环境

```bash
# 启动前端开发服务器
cd code/client
npm run dev

# 启动后端开发服务器
cd code/server
npm run dev
```

### 生产构建

```bash
# 构建前端
cd code/client
npm run build

# 构建后端
cd code/server
npm run build
```

## 数据库迁移

```bash
# 创建新迁移文件
cd code/server
npm run migrate:make -- <migration-name>

# 执行迁移
npm run migrate

# 回滚迁移
npm run migrate:rollback
```

## CI/CD

本项目已配置完整的 GitHub Actions CI/CD 流程：

- **持续集成**: 自动运行单元测试和代码质量检查
- **Docker 构建**: 多阶段构建优化镜像大小
- **自动部署**: 推送到 VPS 并自动重启服务

详细配置请查看 `.github/workflows/ci-cd.yml`。

## 文档

- **产品需求**: `prd/PRD-v1.0.md`
- **架构设计**: `arch/ARCHITECTURE.md`
- **API 规范**: `api-spec/API-SPEC.md`
- **详细设计**: `design/DETAILED-DESIGN-M1.md`
- **AI 笔记本设计**: `docs/superpowers/specs/2026-04-18-ai-notebook-design.md`
- **AI 实现计划**: `docs/superpowers/plans/2026-04-18-ai-notebook-implementation.md`

## 许可证

专有软件 - © 2026 明天华