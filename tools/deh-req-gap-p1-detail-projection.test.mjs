import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../src/state/use-app-detail-projection.js', import.meta.url), 'utf8');
assert.doesNotMatch(app, /<app-detail-remote-projection/, 'a top-level remote projection must not replace routed detail pages');
for (const tag of ['tool-detail-page', 'haineng-work-detail-page', 'report-detail-page', 'dashboard-detail-page', 'dataset-detail-page', 'metric-detail-page', 'ai-detail-page', 'ead-detail-page', 'rpa-detail-page']) {
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:integration-data="integrationEnvelope\\.data"`), `${tag} must receive integration data`);
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:integration-state="integrationEnvelope\\.state"`), `${tag} must receive integration state`);
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:operation-executor="executeReadOperation"`), `${tag} must receive the read executor`);
}
for (const file of ['ToolDetailPage.vue','HainengWorkDetailPage.vue','ReportDetailPage.vue','DashboardDetailPage.vue','DatasetDetailPage.vue','MetricDetailPage.vue','AiDetailPage.vue','EadDetailPage.vue','RpaDetailPage.vue']) {
  const source=readFileSync(new URL(`../src/pages/${file}`,import.meta.url),'utf8');
  assert.match(source,/defineProps\(/,`${file} must consume the injected props`);
  assert.match(source,/useAppDetailProjection\(props/,`${file} must use the shared APP-003 projection`);
  assert.match(source,/projection\.contentVisible|AppDetailStateBoundary/,`${file} must hide fixture content outside a successful state`);
  assert.match(source,/projection\.name/,`${file} must bind its visible title to the projection`);
}
assert.match(helper,/\['APP-003'\]/);
for (const id of ['APP-003', 'appCode', 'name', 'summary', 'versionName', 'attachments']) assert.match(helper, new RegExp(id));
assert.match(helper, /authentication-required/);
console.log('P1 shared APP-003 detail projection contract passed');
