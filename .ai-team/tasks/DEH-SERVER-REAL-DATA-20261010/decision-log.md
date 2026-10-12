# Decision Log

## 2026-10-10 — Scope approval

- **Approval gate:** scope
- **Decision:** approved
- **Approver:** User (Product Owner)
- **User statement:** “批准 `DEH-SERVER-REAL-DATA-20261010` 的 scope”
- **Approved baseline:** `prd.md`，包含固定性能样本、COM-004 self-only、精确 operation 合同、正式字典方案 B、首页原子/LKG/abort+drain 语义、前序 P1/P2 强制关闭和依赖证据矩阵。
- **Rationale:** 以正式飞书数据、自动缓存/同步、真实姓名和部门、受控联系方式、当前用户隔离、稳定写入合同和安全下载作为统一后端交付范围。
- **Impact:** PRD 从此成为不可在下游静默扩展的范围基线；任务可进入设计阶段。闫瑾正式字典 baseline/hash 是 release blocker，不是 development blocker。

## Pending gates

- **Release:** 未批准。

## 2026-10-10 — Design approval

- **Approval gate:** design
- **Decision:** approved
- **Approver:** User (Product Owner)
- **User statement:** “批准 `DEH-SERVER-REAL-DATA-20261010` 的 design。”
- **Approved baseline:** `design/ux-handoff.md`、`design/ui-handoff.md` 与 `design-handoff.md`；独立 `reviews/design-review.md` verdict 为 `approved`。
- **Key decisions:** 前端与视觉零改动；Node listener 后显式预热；fresh/LKG/5秒 handoff/单 syncId；首页五段原子与 abort+drain；COM-004 self-only；`NAME_PROJECTION_INCOMPLETE` 为 422 且不可重试；后端包 SHA-256 与部署/验证/回滚合同。
- **Impact:** 允许进入 Web 后端开发、后端测试和服务器部署包生成；不授权直接部署、发布或修改前端。

## 2026-10-10 — Development completion and QA handoff

- **Decision:** 后端开发、本地自动化测试和纯后端部署包完成，任务进入 `qa`。
- **Evidence:** `npm run test:server-real-data` 最终复跑通过；既有 server-cache、homepage、business-writes、test-deployment 与 check 均通过；最终包 SHA-256 为 `8c49a29cafe38ce52e4dc7cb7d2d654279e2c7bb28cd9d2a1f4ae980a46fc294`。
- **Boundary:** 未修改前端、未直接部署服务器、未批准 release。
- **Open gates:** 正式字典 baseline/hash 与真实授权账号环境验收仍待完成。

## 2026-10-10 — Formal dictionary baseline gate cancelled

- **Approval gate:** scope/design amendment
- **Decision:** approved
- **Approver:** User (Product Owner)
- **User statement:** “批准取消‘正式字典 baseline 强制门禁’，我修改后端为直接读取并过滤飞书现有字典，再重新打包”
- **Behavior:** COM-005 缺少 baseline 时直接读取飞书现有字典，过滤 `TEST_`、测试初始化和停用项，并返回基于实际结果计算的 SHA-256；配置有效 baseline 时仍执行额外一致性校验。
- **Impact:** `formal-dictionary-baseline.json` 不再是部署前置条件；仍禁止伪造字典，真实环境数据质量验证继续保留。

## 2026-10-10 — Live person-field compatibility repair

- **Evidence:** 新部署日志显示 COM-005 已完成，但 WB-002 因 `application.owner` 无法解析进入 `NAME_PROJECTION_INCOMPLETE`。
- **Root cause:** 飞书人员字段可返回对象或数组，旧投影只按字符串 AD 账号处理。
- **Decision:** 支持 `id/user_id/open_id/union_id` 和 `name/display_name` 的对象/数组结构；继续禁止名称回退为 ID。
- **Verification:** `npm run test:server-real-data` 通过；新增对象/数组人员字段回归用例；新包 SHA-256 `112aba3765d43534cef4cd3c51fa318da918f3c2183855b2b34f4c18ca741541`。

## 2026-10-10 — Live application data-quality isolation repair

- **Evidence:** 现场诊断读取到 98 条应用、10 条用户与 10 条部门记录；应用索引混有大量 `TEST_` 记录、无效账号和缺少正式名称映射的历史脏记录。旧实现遇到任意一条未解析记录即整体抛出 `NAME_PROJECTION_INCOMPLETE`，连带阻断 WB-002 与 readiness。
- **Decision:** `TEST_` 应用在投影前过滤；其他名称投影不完整的单条应用使用脱敏指纹记录结构化隔离事件，不写入结果或缓存，不再拖垮有效正式应用。若存在正式候选但全部被隔离，仍返回 422 `NAME_PROJECTION_INCOMPLETE`，禁止空成功和 ID 充当名称。
- **Verification:** 新增正式、测试、脏记录混合回归用例；`npm run test:server-real-data` 一次通过；纯后端包 230 个文件，SHA-256 `34c7dc0d87329f8435f9c8786f31b6bc5411108c1a6f260d66fbdf2e44debcf6`。未修改前端源码或 dist。
