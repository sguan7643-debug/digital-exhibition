Author: 003 Product Reviewer
Target path: `C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\.ai-team\tasks\DEH-REQ-GAP-20260910\reviews\product-review.md`
Provenance: 因 sandbox 无法直写目标路径，由 Team Lead 仅做字节一致机械转存；不得修改下列评审正文。

# Product Scope Review - Revised

## Verdict

`approved`

修订 PRD 已关闭旧产品评审提出的六项 material finding，当前可提交用户进行 Scope 决策。此 verdict 仅表示 Scope 提案决策就绪；不代表用户已批准 Scope，亦不授权设计、开发、提交、部署或发布。

## Evidence

- 受控 PRD：Length `47744`，SHA-256 `DDE038F301A9EC4417222B26B3415FA3A342505B47FE160D48410EFB0FBB6DCE`。
- 旧产品评审包含 7 个 finding；本轮按其中的六个实质整改主题复核。
- PRD 的唯一范围矩阵为 `R01`–`R46`：46 行、46 个唯一 ID、无重复或遗漏。

## Previous Finding Closure

### 完整范围

- **Evidence:** PRD §1、§2.3 与 §3.4 明确 R01–R46 全部保留在本任务，P0–P3 仅是执行顺序，不能缩减范围或触发二次范围决定。
- **Impact:** 不再以单一素材批次替代完整需求规格差距范围。
- **Recommendation:** 将 R01–R46 矩阵作为用户 Scope 决策的唯一范围台账。

### 过度乐观状态校正

- **Evidence:** F05–F14 与 R02、R03、R22、R25、R27 等将 fixture、`TEST_` 过滤、硬编码详情、未消费 PTS-004、公告未接线、生产网络守卫和 REG-001 如实标为部分完成、待修或外部阻塞。§2.2 禁止把 fixture/固定值回退、合同、单测或构建单独表述为业务完成。
- **Impact:** 页面真实闭环不再被服务合同或局部测试误替代。
- **Recommendation:** 实施与 QA 持续按该判定口径更新矩阵证据。

### 仓库内必做

- **Evidence:** §3.1 和 P0/P1 明确纳入生产网络守卫、REG-001、应用目录/九类详情、素材、培训、人才、认证、积分、公告、运营、后台及日志等当前仓库可闭合缺口。
- **Impact:** 已知页面接线、fixture 回退和集成门禁问题不会被外部依赖掩盖。
- **Recommendation:** 先按 P0 修复网络守卫与 REG-001，再执行 P1 页面接线。

### 外部责任拆分

- **Evidence:** §7 的 D01–D11 分别记录外部 owner、输入制品、最晚决策点、影响矩阵项、未提供影响、可并行工作与解除证据；R01–R46 仍保留相关 Web 接入、状态和验收责任。
- **Impact:** 外部合同缺失不再把本任务的可并行 Web 工作移出范围，也不允许虚构外部闭环。
- **Recommendation:** Scope 批准时为 D01–D11 补充具名负责人和日期。

### 全域 GWT

- **Evidence:** §8 的 AC 覆盖应用、素材、培训、人才、认证、积分、公告、消息、运营、后台、权限、日志、监控、安全、生命周期与最终回归。AC-STATE-01 覆盖所有相关路由的成功、加载、空、错误、未登录、无权限、禁用及恢复，并禁止 remote fixture 伪成功。
- **Impact:** 所有范围域均具备可执行验收，不能仅以素材验收代表任务完成。
- **Recommendation:** 所有执行证据应关联矩阵 ID、页面/operation、环境、角色和数据样本。

### 依赖、风险、REG-001 与生产网络守卫

- **Evidence:** K01–K03 将网络守卫、REG-001 和合同漂移标为 P0 仓库风险；AC-PLT-01 要求生产同源 API 不被客户端误拦截且未允许跨源仍被拒绝；AC-PLT-02 和 AC-REG-01 要求完整集成 30/30 与 `npm test`、`npm run test:integration`、`npm run build` 均 exit code 0。
- **Impact:** 当前 29/30 集成失败与生产网络阻塞被明确保留为开发前置，而非被构建成功掩盖。
- **Recommendation:** P0 完成后须以完整未短路日志复验；外部依赖未解除的能力保持具名 blocked，不得宣称交付完成。

## Decision Readiness

无未解决的 Scope material finding。用户可决定是否批准 R01–R46 完整范围、确认 P0–P3 不缩减范围、接受外部输入与本任务 Web 接入责任边界，并决定 R42 是否明确排除。批准 Scope 仍不等于外部依赖解除或生产/发布授权。

## Review Boundary

本报告仅为 003 的暂存评审，供字节一致机械转存至目标路径。未修改 PRD、代码、task 状态、批准字段、提交或外部系统。
