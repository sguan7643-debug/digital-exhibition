import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE_INTEGRATION_MATRIX } from '../src/integration/page-integration-matrix.js';
import { buildPageReadRequestPlan } from '../src/integration/page-read-request-plan.js';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const contracts = createVerifiedReadOperationContracts();
const deferredExpected = new Set(['TRN-003', 'TRN-006', 'CER-003', 'ARC-002']);
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
const submittedWorkDetail = buildPageReadRequestPlan({ route: '/apps/haineng-work-001', readOperationIds: ['APP-003', 'APP-009', 'APP-007'], operationContracts: contracts, search: '?appId=TEST_HW_001' });
const training = buildPageReadRequestPlan({ route: '/training', readOperationIds: ['TRN-003', 'TRN-006'], operationContracts: contracts, search: '?courseId=TEST_COURSE_001' });
const certification = buildPageReadRequestPlan({ route: '/certification', readOperationIds: ['CER-003'], operationContracts: contracts, search: '?certificationId=TEST_CERTIFICATION_001' });
const adminDetail = buildPageReadRequestPlan({ route: '/admin', readOperationIds: ['ARC-002', 'COM-010'], operationContracts: contracts, search: '?archiveTaskId=TEST_ARCHIVE_001&exportId=TEST_EXPORT_001' });
const points = buildPageReadRequestPlan({ route: '/points', readOperationIds: ['PTS-001', 'PTS-003', 'PTS-004'], operationContracts: contracts });
for (const plan of [onboarding, submittedWorkDetail, training, certification, adminDetail]) {
  assert.equal(plan.deferredOperationIds.length, 0);
  for (const operationId of plan.operationIds) assert.doesNotThrow(() => validateContractSchema(plan.inputByOperation[operationId], contracts[operationId].requestSchema, operationId));
}
assert.equal(submittedWorkDetail.inputByOperation['APP-003'].appId, 'TEST_HW_001', '审批生成的资源必须覆盖详情页的静态示例 ID');
assert.equal(submittedWorkDetail.inputByOperation['APP-009'].appId, 'TEST_HW_001');
assert.equal(points.inputByOperation['PTS-004'].pageSize, 10, '积分首页仅展示规则摘要，不得以 100 条全表读取阻塞首屏');
const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /\/api\/v1\/approvals\/reconcile/,
  '应用中心首入不得自动执行审批对账；审批提交和状态页负责显式同步，避免旧实例故障污染普通读取');
assert.ok(planned.size >= 45, `页面自动加载应覆盖主要读接口，实际 ${planned.size}`);
console.log(`page read plans validate ${planned.size} immediate operations; 4 resource detail operations defer until a selected id exists; interaction reads never auto-run`);
