import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const materialsSource = readFileSync(new URL('../src/pages/MaterialsPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<materials-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'materials page must receive integration data from App');
assert.match(appSource, /<materials-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'materials page must receive integration state from App');
assert.match(materialsSource, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'materials page must declare integrationData prop');
assert.match(materialsSource, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*'loading'\s*\}/, 'materials page must declare a real-loading integration state');
assert.match(materialsSource, /\['MAT-001'\]/, 'materials page must consume MAT-001 remote facets');
assert.match(materialsSource, /\['MAT-002'\]/, 'materials page must consume MAT-002 remote material records');
assert.match(materialsSource, /const displayedMaterials = computed\(\(\) => remoteMaterials\.value\)/, 'materials page must project only real integration results');
assert.doesNotMatch(materialsSource, /\bmaterials\b\s*=\s*\[/, 'business mock material arrays must not enter the page');
assert.doesNotMatch(materialsSource, /\[\.\.\.materials,\s*\.\.\.remoteMaterials/, 'remote materials must not mix local generated items');
assert.match(materialsSource, /remoteState\.value === 'error' \|\| remoteState\.value === 'authentication-required'/, 'remote error/auth states must keep a true error boundary');
assert.match(materialsSource, /remoteState\.value === 'empty'/, 'remote empty state must keep a true empty boundary');

console.log('P1 material center remote-only MAT-001 projection contract passed');
