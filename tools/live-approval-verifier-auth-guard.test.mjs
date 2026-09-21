import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./verify-live-feishu-approval-flow.mjs', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /page\.route\(['"]\*\*\/api\/v1\/approvals\/instances/,
  '真实审批验收不得拦截审批接口'
);
assert.match(source, /launchPersistentContext\(/, '真实审批验收必须保留可交互的 OAuth 浏览器会话');
assert.match(source, /\/api\/v1\/auth\/feishu\/session/, '真实审批验收必须确认服务端 OAuth 会话');
assert.match(source, /\/api\/v1\/approvals\/instances['"]/, '真实审批验收必须调用真实提交接口');
assert.match(source, /\/approve/, '真实审批验收必须执行测试审批任务');
assert.match(source, /statusPageApproved/, '真实审批验收必须确认状态页展示已通过');
assert.match(source, /LIVE_EVIDENCE_FILE/, '真实审批验收必须产生持久化证据');
assert.match(source, /--resume-instance=/, '真实审批验收必须支持从已创建的 PENDING 实例续跑，避免重复创建');
assert.match(source, /确认授权\|授权\|允许/, '真实审批验收应在用户已明确授权后自动确认飞书授权提示');

console.log('live approval verifier requires OAuth session and does not intercept approval requests');
