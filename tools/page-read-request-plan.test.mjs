import assert from 'node:assert/strict';
import { buildPageReadRequestPlan } from '../src/integration/page-read-request-plan.js';
import { resolveIntegrationRuntime } from '../src/integration/runtime-config.js';

const plan = buildPageReadRequestPlan({
  route: '/workbench',
  readOperationIds: ['COM-005', 'WB-002', 'COM-005'],
  operationContracts: {
    'COM-005': { requestSchema: { properties: {}, required: [] } },
    'WB-002': { requestSchema: { properties: {}, required: [] } }
  }
});
assert.deepEqual(plan.operationIds, ['COM-005', 'WB-002'], 'a workbench plan must not dispatch the same operation twice');
assert.equal(resolveIntegrationRuntime({ remoteEnabled: true }).timeoutMs, 12000);

const detailPlan = buildPageReadRequestPlan({
  route: '/apps/report-001',
  readOperationIds: ['APP-003', 'APP-009', 'MAT-001', 'MAT-002'],
  operationContracts: {
    'APP-003': { requestSchema: { properties: { appId: {} }, required: ['appId'] } },
    'APP-009': { requestSchema: { properties: { appId: {}, page: {}, pageSize: {}, sort: {} }, required: ['appId'] } },
    'MAT-001': { requestSchema: { properties: { query: {}, keyword: {}, materialType: {}, appTypeCode: {}, domainId: {}, categoryId: {} }, required: [] } },
    'MAT-002': { requestSchema: { properties: { relatedAppId: {}, page: {}, pageSize: {}, sort: {} }, required: [] } }
  },
  search: '?appId=APP006'
});
assert.deepEqual(detailPlan.inputByOperation['MAT-001'], {}, 'MAT-001 facet read must not receive unsupported pagination input');

console.log('workbench request plan deduplication and 12-second remote default passed');
