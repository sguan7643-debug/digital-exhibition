# Product Scope Review

## Verdict

`approved`

该提案已达到范围决策就绪状态。目标字段、来源映射、幂等重放修复、安全边界、失败语义和范围外事项均可验证且彼此一致。本结论只表示产品评审通过，不代表用户已经批准当前任务范围。

## Findings

### Finding 1：缺陷根因与修复边界有代码证据支持

- **Evidence:** `prd.md` F-01 至 F-05；当前前端和投影已携带三个目标值，但 `server/feishu-safe-test-record-service.mjs` 在命中已有记录时直接返回，不执行字段一致性检查。
- **Impact:** 修复可以集中在显式的重放补写能力，不需要扩大到页面重做、字段改型或所有表的默认更新。
- **Recommendation:** 批准仅由“上架申请”投影显式开启重放一致性修复，保持其他 `createOnce` 调用的现有语义。

### Finding 2：字段来源明确且可防止串位

- **Evidence:** `prd.md` 3.1、AC-01、AC-02 明确规定审批实例ID来自真实审批结果，授权用户/授权部门分别来自页面 `users`/`accessDepartment`。
- **Impact:** 实现和测试可以精确判断是否误用了申请人、所属部门或固定测试值。
- **Recommendation:** 自动化测试使用不同的用户值和部门值，分别断言三个字段，避免相同样例掩盖映射错误。

### Finding 3：重放更新不会无边界影响其他记录

- **Evidence:** `prd.md` A-03、3.1、AC-03、AC-05、AC-08 将补写限定为唯一精确匹配的 `TEST_` 业务记录，并要求调用方显式启用。
- **Impact:** 可以修复不完整记录，同时避免通用幂等服务对其他表发生隐式更新或模糊命中。
- **Recommendation:** 实现必须保留 `TEST_` 前缀校验、唯一性冲突错误和“默认不更新”回归测试。

### Finding 4：跨系统失败语义已正确限制

- **Evidence:** `prd.md` 3.2、状态清单、AC-07 明确不承诺跨系统事务；投影失败不伪报成功，通过审批注册信息和幂等重试恢复。
- **Impact:** 避免在飞书审批已创建、表格投影失败时误建第二个审批实例，也不把部分成功描述为原子提交。
- **Recommendation:** 测试应断言投影异常向接口传播，并断言再次提交复用原审批实例后完成补写。

### Finding 5：历史数据处理被明确排除

- **Evidence:** `prd.md` A-01、3.2 和第6节均排除扫描、批量回填和生产数据修改。
- **Impact:** 本次修复可以在不触碰既有历史数据和生产配置的前提下完成；若后续需要回填，应另建有审计与回滚方案的任务。
- **Recommendation:** 当前范围批准不得被解释为允许批量修改现有飞书记录。

## Verification Summary

- 目标表固定为“上架申请”，目标字段固定为“审批实例ID”“授权用户”“授权部门”。
- 页面字段与写入字段的一一映射已明确。
- 首次创建、重放一致、重放缺失、输入缺失、写入失败、唯一键冲突和非 `TEST_` 拒绝均有验收标准。
- 其他应用类型、页面UI、表结构、历史回填、部署和发布均明确排除。
- `task.json.state=scope_review` 且 `approvals.scope.approved=false`，符合评审前提。

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, or change task state.
