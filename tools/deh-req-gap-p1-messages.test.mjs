import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/MessagesPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<messages-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into messages page');
assert.match(appSource, /<messages-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into messages page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'messages page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*["']mock["']\s*\}/, 'messages page must declare integrationState prop');
assert.match(source, /const remoteMode\s*=\s*computed\(\(\)\s*=>\s*props\.integrationState\s*!==\s*["']mock["']\)/, 'any non-mock integration state must remain remote');
assert.match(source, /\['MSG-001'\]/, 'messages page must consume MSG-001 statistics');
assert.match(source, /\['MSG-002'\]/, 'messages page must consume MSG-002 message rows');
assert.match(source, /\}\)\)\|\|\[\]\);/, 'missing MSG-002 data must normalize to an empty remote result, never a fixture fallback');
assert.match(source, /if\(!remoteMode\.value\)return controller\.results;/, 'only mock mode may read the message fixture controller');
assert.match(source, /remoteMode\.value\s*\?\s*remoteRows\.value\s*:\s*MESSAGE_FIXTURES/, 'remote message types must not fall back to fixture types');
assert.match(source, /remoteMode\.value\s*\?\s*Number\(value\?\.totalCount\?\?0\)\s*:\s*controller\.totalCount/, 'remote statistics must not fall back to fixture counts');
assert.match(source, /remoteState\.value\s*===\s*["']error["']/, 'remote errors must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']authentication-required["']/, 'remote authentication must render a truthful state');
assert.match(source, /remoteState\.value\s*===\s*["']permission-denied["']/, 'remote permission denial must not be downgraded to an empty message list');
assert.match(source, /remoteState\.value\s*===\s*["']empty["']/, 'remote empty must render a truthful state');
assert.match(source, /真实消息写操作尚未开放/, 'remote read actions must remain explicitly unavailable');
assert.match(source, /:disabled="liveMode"/, 'remote mark-all-read must remain disabled');

console.log('P1 messages remote-only MSG projection contract passed');
