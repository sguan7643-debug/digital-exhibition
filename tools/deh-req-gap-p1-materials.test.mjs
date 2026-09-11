import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const materialsSource = readFileSync(new URL('../src/pages/MaterialsPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<materials-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'materials page must receive integration data from App');
assert.match(appSource, /<materials-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'materials page must receive integration state from App');
assert.match(materialsSource, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'materials page must declare integrationData prop');
assert.match(materialsSource, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*'mock'\s*\}/, 'materials page must declare integrationState prop');
assert.match(materialsSource, /\['MAT-001'\]/, 'materials page must consume MAT-001 remote projection');
assert.match(materialsSource, /remoteMode\.value \? remoteMaterials\.value : materials/, 'mock fixtures must be isolated from remote materials');
assert.doesNotMatch(materialsSource, /\[\.\.\.materials,\s*\.\.\.remoteMaterials/, 'remote materials must not mix local generated items');
assert.match(materialsSource, /remoteState\.value === 'error' \|\| remoteState\.value === 'authentication-required'/, 'remote error/auth states must keep a true error boundary');
assert.match(materialsSource, /remoteState\.value === 'empty'/, 'remote empty state must keep a true empty boundary');

console.log('P1 material center remote-only MAT-001 projection contract passed');
