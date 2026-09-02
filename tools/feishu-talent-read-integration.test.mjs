import assert from 'node:assert/strict';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';
import { mapRemoteTalentPerson, mapRemoteTalentProject, mapRemoteTalentProgress } from '../src/integration/talent-read-model.js';

const contracts = createVerifiedReadOperationContracts();
for (const operationId of ['TAL-001', 'TAL-002', 'TAL-003', 'TAL-005']) {
  assert.ok(contracts[operationId], `${operationId} 必须有浏览器请求/响应合同`);
  assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
}

const commonEnvelope = data => ({
  code: 'OK', data, traceId: 'trace-talent', schemaVersion: 'feishu-read-only.v1',
  sourceUpdatedAt: '2026-09-02T08:00:00.000Z', isComplete: true, dataStale: false
});
const paging = { total: 1, page: 1, pageSize: 10, totalPages: 1, hasPrevious: false, hasNext: false, hasMore: false };
const person = {
  id: 'rec-person', talentId: 'TALENT-001', userId: 'U-001', name: '张三丰', employeeNo: 'E001',
  type: '数字化人才', level: '高级', specialties: ['数据治理'], status: '在库',
  departmentId: 'D-001', departmentName: '经营管理部'
};
const project = {
  id: 'rec-project', projectId: 'PROJECT-001', name: '数字人才培养', type: '培训', ownerId: 'U-001',
  ownerName: '张三丰', status: '进行中', startDate: '2026-09-01', endDate: '2026-12-31'
};
const progress = {
  id: 'rec-progress', progressId: 'PROGRESS-001', projectId: 'PROJECT-001', projectName: '数字人才培养',
  phaseName: '实施', status: '进行中', updatedAt: '2026-09-02 10:00:00'
};
assert.doesNotThrow(() => validateContractSchema(commonEnvelope({ items: [person], ...paging, filtersApplied: {}, facetsVersion: 'feishu-talent.v1' }), contracts['TAL-001'].successSchema));
assert.doesNotThrow(() => validateContractSchema(commonEnvelope({ items: [project], ...paging, filtersApplied: {}, facetsVersion: 'feishu-talent.v1' }), contracts['TAL-002'].successSchema));
assert.doesNotThrow(() => validateContractSchema(commonEnvelope({ items: [progress], ...paging, filtersApplied: {}, facetsVersion: 'feishu-talent.v1' }), contracts['TAL-003'].successSchema));
assert.equal(mapRemoteTalentPerson(person).name, '张三丰');
assert.equal(mapRemoteTalentProject(project).manager, '张三丰');
assert.equal(mapRemoteTalentProgress(progress)[1], '数字人才培养');
console.log('TAL-001/002/003/005 browser schemas and truthful talent projections passed');
