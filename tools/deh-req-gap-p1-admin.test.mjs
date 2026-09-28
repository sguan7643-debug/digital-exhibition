import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/AdminPage.vue', import.meta.url), 'utf8');
const matrix = readFileSync(new URL('../src/integration/page-integration-matrix.js', import.meta.url), 'utf8');
const remoteRecord = readFileSync(new URL('../src/components/RemoteRecordPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<admin-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into admin page');
assert.match(appSource, /<admin-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into admin page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'admin page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*["']loading["']\s*\}/, 'admin page must declare a real-loading integration state');
assert.match(source, /<RemoteRecordPage/, 'admin page must use the shared real-record renderer');
assert.match(source, /:record="props\.integrationData"/, 'admin page must pass only real integration data to the renderer');
assert.match(source, /:state="integrationState"/, 'admin page must expose truthful integration states');
for (const operationId of ['ADM-003','ADM-004','INT-001','INT-004','ARC-002']) assert.match(matrix, new RegExp(`['"]${operationId}['"]`), `admin route must request ${operationId}`);
assert.match(remoteRecord, /authentication-required|permission-denied/, 'shared renderer must preserve authentication and permission states');
assert.doesNotMatch(source, /FIXTURE|mock/i, 'admin page must not contain business mock fallback data');

console.log('P1 admin remote-only projection contract passed');
