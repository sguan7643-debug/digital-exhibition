import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const pages = {
  people: readFileSync(new URL('../src/pages/TalentPeoplePage.vue', import.meta.url), 'utf8'),
  projects: readFileSync(new URL('../src/pages/TalentProjectsPage.vue', import.meta.url), 'utf8'),
  progress: readFileSync(new URL('../src/pages/TalentProgressPage.vue', import.meta.url), 'utf8')
};

for (const tag of ['talent-people-page', 'talent-projects-page', 'talent-progress-page']) {
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:integration-data="integrationEnvelope\\.data"`), `${tag} must receive integration data`);
  assert.match(app, new RegExp(`<${tag}[\\s\\S]*?:integration-state="integrationEnvelope\\.state"`), `${tag} must receive integration state`);
}
for (const [name, source] of Object.entries(pages)) {
  assert.match(source, /integrationData:\s*\{\s*type:\s*Object/, `${name} must declare integrationData`);
  assert.match(source, /integrationState:\s*\{\s*type:\s*String/, `${name} must declare integrationState`);
  assert.match(source, /props\.integrationState\s*!==\s*['"]mock['"]/, `${name} must distinguish remote mode from mock`);
  assert.match(source, /authentication-required|permission-denied/, `${name} must render authentication state truthfully`);
  assert.match(source, /正式人才写入合同尚未提供/, `${name} must explain unavailable remote writes`);
  assert.match(source, /:disabled="remoteMode"/, `${name} must disable remote mutations`);
}
assert.match(pages.people, /\['TAL-001'\]/, 'people page must consume TAL-001 only');
assert.match(pages.projects, /\['TAL-002'\]/, 'projects page must consume TAL-002 only');
assert.match(pages.progress, /\['TAL-003'\]/, 'progress page must consume TAL-003 only');
console.log('P1 talent remote-only projection contract passed');
