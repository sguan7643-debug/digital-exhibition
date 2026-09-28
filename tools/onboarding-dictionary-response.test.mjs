import assert from 'node:assert/strict';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';
import { createVerifiedReadOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { normalizeApplicationType } from '../src/integration/onboarding-approval.js';

const dictionaryResponse = {
  code: 'OK',
  data: {
    itemsByType: {
      APPLICATION_TYPE: [{
        dictType: 'APPLICATION_TYPE', value: 'HAINENG', label: '海能work应用', description: null,
        colorToken: null, iconFileId: null, sortOrder: 5, enabled: true, parentValue: null, extra: null,
      }],
      BUSINESS_DOMAIN: [{
        dictType: 'BUSINESS_DOMAIN', value: 'BD005', label: '数字化办公', description: null,
        colorToken: null, iconFileId: null, sortOrder: 1, enabled: true, parentValue: null, extra: null,
      }],
    },
    version: 'feishu-dictionaries.v3',
    updatedAt: '2026-08-01 00:00:00',
  },
  traceId: 'trace-dictionary',
  schemaVersion: 'feishu-dictionaries.v1',
  sourceUpdatedAt: '2026-09-24T09:35:45.470Z',
  isComplete: true,
  dataStale: false,
  refreshing: false,
  cacheStatus: 'fresh',
};

const client = createSafeProxyClient({
  baseUrl: '/api/v1',
  origin: 'http://127.0.0.1:4173',
  operationContracts: createVerifiedReadOperationContracts(),
  fetchImpl: async () => new Response(JSON.stringify(dictionaryResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
});

const accepted = await client.execute('COM-005', {
  dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN'],
  includeDisabled: false,
});
assert.equal(accepted.data.itemsByType.APPLICATION_TYPE[0].label, '海能work应用');
assert.equal(normalizeApplicationType(accepted.data.itemsByType.APPLICATION_TYPE[0].value), 'T005');
assert.equal(accepted.data.itemsByType.BUSINESS_DOMAIN[0].label, '数字化办公');
assert.equal(accepted.data.itemsByType.APPLICATION_TYPE[0].colorToken, null, '合同允许的颜色令牌不能被误判为认证密钥');

console.log('COM-005 display colorToken passes the browser security boundary');
