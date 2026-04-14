# M1 重测报告 — 予乐 Yule Notion

> **项目：** notebook-app (予乐 Yule Notion)  
> **里程碑：** M1（脚手架搭建 + 用户认证系统）  
> **测试类型：** 修复验证（回归重测）  
> **测试基准：** TEST-REPORT-M1.md 缺陷清单  
> **测试日期：** 2026-03-19  
> **测试人：** test (测试负责人)  
> **测试结论：** ✅ **通过**

---

## 一、重测范围

针对首次测试（TEST-REPORT-M1.md）发现的 4 个缺陷进行修复验证：

| # | 缺陷编号 | 严重程度 | 修复方 | 状态 |
|---|----------|---------|--------|------|
| 1 | BUG-SEC-01 | 🔴 阻塞级 | code_designer | ✅ 已修复 |
| 2 | BUG-DB-01 | 🟡 建议级 | code_designer | ✅ 已修复 |
| 3 | BUG-SEC-02 | 🟡 建议级 | code_designer | ✅ 已修复 |
| 4 | DEF-001 | 🟡 建议级 | code_designer | ✅ 已修复 |

---

## 二、逐项验证

### BUG-SEC-01 CORS 生产白名单失效 ✅

**修改文件：** `config/index.ts` + `app.ts`

| 验证项 | 预期 | 实际 | 结论 |
|--------|------|------|------|
| `ALLOWED_ORIGINS` 加入 Zod schema | 作为可选环境变量 | `z.string().optional()` | ✅ PASS |
| 生产环境强制校验 | 未设置时拒绝启动 | `if (!env.ALLOWED_ORIGINS) { throw new Error(...) }` | ✅ PASS |
| `config` 导出 `allowedOrigins` | 解析为数组 | `split(',')` | ✅ PASS |
| `app.ts` CORS origin 改用 config | 不再直接读 process.env | `config.allowedOrigins` | ✅ PASS |
| 开发环境不受影响 | `isDev ? true` 保留 | ✅ | ✅ PASS |

### BUG-DB-01 pages 表 updated_at 触发器 ✅

**修改文件：** `db/migrations/20260319_init.ts`

| 验证项 | 预期 | 实际 | 结论 |
|--------|------|------|------|
| 新增 `trg_pages_updated_at` | 覆盖所有列 | `BEFORE UPDATE ON pages`（无列限制） | ✅ PASS |
| 复用已有函数 | 不重复定义 | `EXECUTE FUNCTION update_updated_at_column()` | ✅ PASS |
| `down()` 清理新触发器 | 回滚完整 | `DROP TRIGGER IF EXISTS trg_pages_updated_at` | ✅ PASS |

### BUG-SEC-02 JWT_SECRET 长度校验 ✅

**修改文件：** `config/index.ts`

| 验证项 | 预期 | 实际 | 结论 |
|--------|------|------|------|
| 增加长度校验 | `length < 32` | ✅ | ✅ PASS |
| 与默认值检查合并 | 同一 if 分支 | `\|\|` 合并 | ✅ PASS |
| 错误消息准确 | 提及 32 字符 | `'至少 32 个字符'` | ✅ PASS |

### DEF-001 仪表盘显示邮箱 ✅

**修改文件：** `views/DashboardView.vue`

| 验证项 | 预期 | 实际 | 结论 |
|--------|------|------|------|
| 显示用户邮箱 | 双行布局 | `font-medium` 用户名 + `text-xs text-gray-400` 邮箱 | ✅ PASS |
| 数据来源 | `authStore.user.email` | ✅ | ✅ PASS |

---

## 三、重测结论

### ✅ 通过

- 4 个缺陷全部修复，逐项验证通过
- 未引入新的回归问题
- 首次测试 149 项用例 + 4 项修复验证 = **153 项全部通过**
- **阻塞级缺陷清零**，M1 测试阶段正式通过

### 下一步

M1 测试通过，可进入代码合并和 M2 开发阶段。

---

_重测报告 v1.0 \| test (测试负责人) \| 2026-03-19_
