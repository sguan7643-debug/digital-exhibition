import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');
assert.doesNotMatch(source, /String\(item\.appId \|\| item\.id \|\| ''\)\.startsWith\('TEST_'\)/, 'remote app directory must not discard production IDs');
assert.doesNotMatch(source, /\[\.\.\.APP_FIXTURES, \.\.\.remoteApps/, 'remote app directory must not mix fixtures into remote results');
assert.doesNotMatch(source, /APP_FIXTURES/, 'business mock fixtures must not enter the application directory');
assert.match(source, /const displayedApps = computed\(\(\) => remoteApps\.value\)/, 'application directory must project only real integration results');
assert.doesNotMatch(source, /props\.integrationState !== 'mock' && Array\.isArray\(props\.integrationData\?\.\['APP-002'\]\?\.items\)/, 'remote error state must not fall back to mock fixtures');
console.log('P1 app directory remote-only projection contract passed');
