import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/pages/ProfilePage.vue', import.meta.url), 'utf8');
const live = readFileSync(new URL('../src/components/ProfileLiveSections.vue', import.meta.url), 'utf8');

assert.match(app, /<profile-page[^>]*:integration-data="integrationEnvelope\.data"[^>]*:integration-state="integrationEnvelope\.state"[^>]*:operation-executor="executeReadOperation"/s);
assert.match(app, /<profile-live-sections[^>]*:integration-data="integrationEnvelope\.data"[^>]*:integration-state="integrationEnvelope\.state"/s);
assert.match(profile, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*['"]mock['"]/);
assert.match(profile, /const remoteMode\s*=\s*computed\(\(\)\s*=>\s*props\.integrationState\s*!==\s*['"]mock['"]\)/);
assert.match(profile, /\['WB-003'\]/);
assert.match(profile, /\['WB-004'\]/);
assert.match(profile, /safeLocalPath/);
assert.match(profile, /authentication-required/);
assert.doesNotMatch(profile, /remoteMode\.value\s*\?[^:]+:\s*stats/, 'remote states must not fall back to mock stats');
assert.match(live, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*['"]mock['"]/);
assert.match(live, /authentication-required|permission-denied/);

console.log('DEH profile governed remote projection contract passed.');
