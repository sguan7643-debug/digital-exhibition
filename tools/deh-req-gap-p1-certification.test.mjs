import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/CertificationPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<certification-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into certification page');
assert.match(appSource, /<certification-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into certification page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'certification page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*"mock"\s*\}/, 'certification page must declare integrationState prop');
assert.match(source, /\['CER-001'\]/, 'certification page must consume CER-001 overview');
assert.match(source, /\['CER-002'\]/, 'certification page must consume CER-002 list');
assert.match(source, /\['CER-003'\]/, 'certification page must consume CER-003 detail when present');
assert.match(source, /remoteMode\.value \? remoteDirections\.value : directions/, 'remote certification directions must not fall back to static directions');
assert.match(source, /remoteMode\.value \? remoteScenes\.value : scenes/, 'remote certification scenes must not fall back to static scenes');
assert.match(source, /remoteMode\.value \? remoteNews\.value : news/, 'remote certification news must not fall back to static news');
assert.match(source, /remoteState\.value === "error" \|\| remoteState\.value === "authentication-required"/, 'remote error/auth must show a true failure boundary');
assert.match(source, /remoteState\.value === "empty"/, 'remote empty must show a true empty boundary');

console.log('P1 certification remote-only CER projection contract passed');
