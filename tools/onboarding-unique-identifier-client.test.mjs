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

console.log('onboarding unique identifier client uses the backend endpoint and rejects empty identifiers');
