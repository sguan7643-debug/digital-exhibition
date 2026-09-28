import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/OperationsPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<operations-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into operations page');
assert.match(appSource, /<operations-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into operations page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'operations page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*["']loading["']\s*\}/, 'operations page must declare a real-loading integration state');
assert.match(source, /\['OPS-001'\]/, 'operations page must consume OPS-001 dashboard projection');
assert.match(source, /\['OPS-003'\]/, 'operations page must consume OPS-003 metric definitions projection');
assert.match(source, /const dashboard\s*=\s*computed\(\(\)\s*=>\s*remoteDashboard\.value\|\|\{\}\)/, 'remote dashboard data must flow from OPS-001');
assert.match(source, /const stats=computed\(\(\)=>\(Array\.isArray\(dashboard\.value\.metrics\)/, 'dashboard values must come only from OPS-001 metrics');
assert.doesNotMatch(source, /createOperationsController|OPERATIONS_FIXTURES/, 'business operations fixtures must not enter the page');
assert.match(source, /remoteState\.value\s*===\s*["']empty["']/, 'remote empty must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']error["']/, 'remote error must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']authentication-required["']/, 'remote authentication must render a truthful state');
assert.match(source, /飞书运营导出服务暂未开放/, 'remote export must remain explicitly unavailable');
assert.match(source, /飞书运营刷新任务暂未开放/, 'remote refresh task must remain explicitly unavailable');

console.log('P1 operations remote-only OPS projection contract passed');
