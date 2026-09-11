import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');
assert.doesNotMatch(source, /String\(item\.appId \|\| item\.id \|\| ''\)\.startsWith\('TEST_'\)/, 'remote app directory must not discard production IDs');
assert.doesNotMatch(source, /\[\.\.\.APP_FIXTURES, \.\.\.remoteApps/, 'remote app directory must not mix fixtures into remote results');
assert.match(source, /remoteMode\.value \? remoteApps\.value : APP_FIXTURES/, 'mock fixtures must be isolated from remote directory');
assert.doesNotMatch(source, /props\.integrationState !== 'mock' && Array\.isArray\(props\.integrationData\?\.\['APP-002'\]\?\.items\)/, 'remote error state must not fall back to mock fixtures');
console.log('P1 app directory remote-only projection contract passed');
