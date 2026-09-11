import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/AdminPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<admin-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into admin page');
assert.match(appSource, /<admin-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into admin page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'admin page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*["']mock["']\s*\}/, 'admin page must declare integrationState prop');
assert.match(source, /const remoteMode\s*=\s*computed\(\(\)\s*=>\s*props\.integrationState\s*!==\s*["']mock["']\)/, 'any non-mock integration state must remain remote');
for (const operationId of ['ADM-003','ADM-004','INT-001','INT-004','ARC-002']) assert.match(source, new RegExp(`\\['${operationId}'\\]`), `admin page must consume ${operationId} when available`);
assert.match(source, /remoteMode\.value\s*\?\s*remoteAuditRows\.value/, 'remote audit region must not fall back to static log rows');
assert.match(source, /remoteMode\.value\s*\?\s*remoteConnections\.value/, 'remote health region must not fall back to static connection data');
assert.match(source, /remoteState\.value\s*===\s*["']empty["']/, 'remote empty must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']error["']/, 'remote error must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']authentication-required["']/, 'remote authentication must render a truthful state');
assert.match(source, /正式配置写入合同尚未提供/, 'unavailable configuration writes must be explicitly blocked');
assert.match(source, /:disabled="remoteMode"/, 'remote configuration mutations must remain disabled');

console.log('P1 admin remote-only projection contract passed');
