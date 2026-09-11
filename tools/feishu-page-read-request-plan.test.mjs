import assert from 'node:assert/strict';
import { PAGE_INTEGRATION_MATRIX } from '../src/integration/page-integration-matrix.js';
import { buildPageReadRequestPlan } from '../src/integration/page-read-request-plan.js';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const contracts = createVerifiedReadOperationContracts();
const deferredExpected = new Set(['APP-010', 'TRN-003', 'TRN-006', 'CER-003', 'ARC-002']);
const planned = new Set();
const deferred = new Set();

for (const page of PAGE_INTEGRATION_MATRIX) {
  const plan = buildPageReadRequestPlan({ route: page.route, readOperationIds: page.readOperationIds, operationContracts: contracts });
  for (const operationId of plan.operationIds) {
    assert.doesNotThrow(() => validateContractSchema(plan.inputByOperation[operationId], contracts[operationId].requestSchema, `${page.route}:${operationId}`));
    planned.add(operationId);
  }
  plan.deferredOperationIds.forEach(operationId => deferred.add(operationId));
}

assert.deepEqual(deferred, deferredExpected);
const onboarding = buildPageReadRequestPlan({ route: '/apps/onboarding/status', readOperationIds: ['APP-010'], operationContracts: contracts, search: '?applicationId=TEST_APPLICATION_001' });
const training = buildPageReadRequestPlan({ route: '/training', readOperationIds: ['TRN-003', 'TRN-006'], operationContracts: contracts, search: '?courseId=TEST_COURSE_001' });
const certification = buildPageReadRequestPlan({ route: '/certification', readOperationIds: ['CER-003'], operationContracts: contracts, search: '?certificationId=TEST_CERTIFICATION_001' });
const adminDetail = buildPageReadRequestPlan({ route: '/admin', readOperationIds: ['ARC-002', 'COM-010'], operationContracts: contracts, search: '?archiveTaskId=TEST_ARCHIVE_001&exportId=TEST_EXPORT_001' });
for (const plan of [onboarding, training, certification, adminDetail]) {
  assert.equal(plan.deferredOperationIds.length, 0);
  for (const operationId of plan.operationIds) assert.doesNotThrow(() => validateContractSchema(plan.inputByOperation[operationId], contracts[operationId].requestSchema, operationId));
}
assert.ok(planned.size >= 45, `页面自动加载应覆盖主要读接口，实际 ${planned.size}`);
console.log(`page read plans validate ${planned.size} immediate operations; 5 resource detail operations defer until a selected id exists; interaction reads never auto-run`);
