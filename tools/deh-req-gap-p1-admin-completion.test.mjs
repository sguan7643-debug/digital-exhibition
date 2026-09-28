import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const admin = read('src/pages/AdminPage.vue');
const remoteRecord = read('src/components/RemoteRecordPage.vue');
const matrix = read('src/integration/page-integration-matrix.js');

assert.match(admin, /<RemoteRecordPage/, '后台管理必须复用真实记录渲染器');
assert.match(admin, /:record="props\.integrationData"/, '后台管理必须展示服务端投影数据');
assert.match(admin, /:state="integrationState"/, '后台管理必须透传真实加载状态');
assert.doesNotMatch(admin, /可视化|生产运营|记录号 FX-817-0|未处理告警 2/, '后台管理不得保留演示业务数据');

for (const state of ['loading', 'authentication-required', 'permission-denied', 'error', 'empty']) {
  assert.ok(remoteRecord.includes(state), `真实记录渲染器缺少状态：${state}`);
}
assert.match(remoteRecord, /Object\.entries/, '真实记录渲染器必须遍历服务端返回字段');
assert.doesNotMatch(remoteRecord, /v-html|innerHTML/, '后台返回内容必须按惰性文本渲染');

for (const operationId of ['ADM-006', 'ADM-007', 'INT-001', 'INT-003', 'INT-004', 'INT-005', 'ADM-003', 'ADM-004', 'ARC-002']) {
  assert.match(matrix, new RegExp(`['"]${operationId}['"]`), `后台管理路由缺少 ${operationId}`);
}

console.log('后台管理真实记录合同：权威投影、状态隔离、无业务 mock 与惰性文本渲染通过');
