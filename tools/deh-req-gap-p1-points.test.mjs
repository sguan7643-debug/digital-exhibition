import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/pages/PointsPage.vue', import.meta.url), 'utf8');
assert.match(source, /\['PTS-004'\]/, 'points page must consume the governed rules projection');
assert.match(source, /v-for="rule in rules"/, 'points rules must be rendered from data');
assert.match(source, /rule\.name|rule\.ruleName/, 'points rules must expose governed rule names');
console.log('P1 points rule projection contract passed');
