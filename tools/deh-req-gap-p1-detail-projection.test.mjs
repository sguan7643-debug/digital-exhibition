import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const projection = readFileSync(new URL('../src/components/AppDetailRemoteProjection.vue', import.meta.url), 'utf8');
assert.doesNotMatch(app, /<app-detail-remote-projection/, 'a top-level remote projection must not replace routed detail pages');
for (const tag of ['tool-detail-page', 'haineng-work-detail-page', 'report-detail-page', 'dashboard-detail-page', 'dataset-detail-page', 'metric-detail-page', 'ai-detail-page', 'ead-detail-page', 'rpa-detail-page']) {
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:integration-data="integrationEnvelope\\.data"`), `${tag} must receive integration data`);
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:integration-state="integrationEnvelope\\.state"`), `${tag} must receive integration state`);
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:operation-executor="executeReadOperation"`), `${tag} must receive the read executor`);
}
for (const id of ['APP-003', 'appCode', 'name', 'summary', 'description', 'versionName', 'attachments']) assert.match(projection, new RegExp(id));
assert.match(projection, /authentication-required/);
assert.match(projection, /当前没有可展示的真实应用详情/);
assert.doesNotMatch(projection, /智能数据处理工具|经营分析可视化报表/);
console.log('P1 shared APP-003 detail projection contract passed');
