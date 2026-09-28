import assert from 'node:assert/strict';
import { createOnboardingUniqueIdentifierClient } from '../server/onboarding-unique-identifier-client.mjs';

const calls = [];
const client = createOnboardingUniqueIdentifierClient({
  baseUrl: 'http://approval.example.test/',
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ code: '00000', data: { uniqueIdentifier: 'ONB_TEST_BACKEND_001' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

assert.equal(await client.getUniqueIdentifier(), 'ONB_TEST_BACKEND_001');
assert.equal(calls.length, 1);
assert.equal(calls[0].url, 'http://approval.example.test/api/onboarding/unique-identifier');
assert.equal(calls[0].options.method, 'GET');

const invalid = createOnboardingUniqueIdentifierClient({
  baseUrl: 'http://approval.example.test',
  fetchImpl: async () => Response.json({ code: '00000', data: {} })
});
await assert.rejects(() => invalid.getUniqueIdentifier(), error => error?.code === 'ONBOARDING_UNIQUE_IDENTIFIER_INVALID');

const unavailable = createOnboardingUniqueIdentifierClient({
  baseUrl: 'http://approval.example.test',
  timeoutMs: 1_000,
  fetchImpl: async () => { throw new TypeError('fetch failed'); }
});
const firstFallback = await unavailable.getUniqueIdentifier({ fallbackKey: 'user-1\0attempt-1' });
const replayedFallback = await unavailable.getUniqueIdentifier({ fallbackKey: 'user-1\0attempt-1' });
const otherFallback = await unavailable.getUniqueIdentifier({ fallbackKey: 'user-1\0attempt-2' });
assert.match(firstFallback, /^ONB[A-F0-9]{32}$/);
assert.equal(replayedFallback, firstFallback, '同一申请在后端不可用时必须复用稳定唯一标识');
assert.notEqual(otherFallback, firstFallback, '不同申请的降级唯一标识不得重复');

console.log('onboarding unique identifier client uses the backend endpoint and rejects empty identifiers');
