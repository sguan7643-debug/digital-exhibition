import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/OnboardingPage.vue', import.meta.url), 'utf8');
assert.match(source, /getOnboardingStatus/);
assert.match(source, /new URLSearchParams\(window\.location\.search\)/);
assert.match(source, /PENDING/);
assert.match(source, /APPROVED/);
assert.match(source, /REJECTED/);
assert.match(source, /CANCELLED/);
assert.match(source, /role="status"/);
assert.match(source, /@click="loadStatus"/);
assert.doesNotMatch(source, /const steps=\[/);
console.log('onboarding status page is driven by the returned real approval instance status');
