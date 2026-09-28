# Design Handoff Aggregate

Owner: AI Team Lead

## UX/Interaction Evidence

Source: `design/ux-handoff.md`

保留现有信息架构，以自动化检查、已授权浏览器回归和真实 TEST_ 上线申请闭环构成验收流程。所有主操作需防重复，授权失效走正常恢复，筛选按钮有明确结果，上传和审批同步可局部重试。六类状态均定义触发、内容、操作、恢复、焦点和可访问性行为。Web 在桌面、761–1200px、≤760px 和 200% 缩放下有明确重排与可达要求；uni-app 不适用。

## UI Visual Evidence

Source: `design/ui-handoff.md`

沿用 `src/style.css` 和 `src/h5.css` 的蓝白企业主题、现有 xlt 变量、4–20px 间距节奏、桌面字体角色与移动端 44px 控件规则。错误、空态、禁用、授权不足和加载都有独立视觉处理；时间线连接线不得穿过文字；仅表格允许局部横向滚动；键盘焦点必须可见。

## Cross-Source Traceability

| PRD requirement | UX evidence | UI evidence |
|---|---|---|
| AC-01 自动化与构建 | 系统级自动化流、失败分层与重跑规则 | 不通过视觉改动掩盖测试；状态证据保持可读 |
| AC-02 已授权桌面路由 | 已授权浏览器流、权限恢复和阻断定义 | 桌面层级、focus-visible、错误状态 |
| AC-03 360px/200% | Web Behavior、键盘与局部滚动规则 | ≤760/430/380px、200% 换行与 44px 控件 |
| AC-04 真实上线申请 | 上线申请流、上传/提交/同步防重复 | 表单、上传项、加载/错误/禁用视觉 |
| AC-05 多表投影 | 统一申请标识和逐表核验步骤 | 详情、状态、时间线和文件信息层级 |
| AC-06 数据与权限边界 | TEST_ 限制、正常授权恢复 | permission-denied 状态不展示裸 JSON |
| AC-07 最终结论 | 证据齐全且阻断为 0 才通过 | 检查结果使用明确状态、证据和限制 |

## Unresolved Conflicts

无。OAuth 长期会话持久化明确留在独立任务，本设计只覆盖正常授权恢复路径。
