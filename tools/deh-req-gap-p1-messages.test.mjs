import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/MessagesPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<messages-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into messages page');
assert.match(appSource, /<messages-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into messages page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'messages page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*["']loading["']\s*\}/, 'messages page must declare a real-loading integration state');
assert.match(source, /\['MSG-001'\]/, 'messages page must consume MSG-001 statistics');
assert.match(source, /\['MSG-002'\]/, 'messages page must consume MSG-002 message rows');
assert.match(source, /\}\)\)\|\|\[\]\);/, 'missing MSG-002 data must normalize to an empty remote result, never a fixture fallback');
assert.doesNotMatch(source, /MESSAGE_FIXTURES/, 'business message fixtures must not enter the page');
assert.match(source, /const rows=remoteRows\.value\.filter/, 'message filters must operate only on real MSG-002 rows');
assert.match(source, /count\(value\?\.totalCount\)/, 'message statistics must come from MSG-001');
assert.doesNotMatch(source, /(?:totalCount|unreadCount|readCount|todayCount)\s*\?\?\s*0/, 'missing MSG-001 statistics must not be presented as zero');
assert.match(source, /remoteState\.value\s*===\s*["']error["']/, 'remote errors must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']authentication-required["']/, 'remote authentication must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']permission-denied["']/, 'remote permission denial must not be downgraded to an empty message list');
assert.match(source, /remoteState\.value\s*===\s*["']empty["']/, 'remote empty must render a truthful state');
assert.match(source, /真实消息写操作尚未开放/, 'remote read actions must remain explicitly unavailable');
assert.match(source, /<button type="button" disabled title="真实消息写操作尚未开放">全部标为已读<\/button>/, 'mark-all-read must remain disabled until a real write contract exists');

console.log('P1 messages remote-only MSG projection contract passed');
