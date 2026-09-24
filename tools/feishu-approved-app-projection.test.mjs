import assert from 'node:assert/strict';
import { createFeishuApprovedAppProjection } from '../server/feishu-approved-app-projection.mjs';

const writes = [];
let indexRecord = null;
const projection = createFeishuApprovedAppProjection({
  now: () => new Date('2026-09-10T10:00:00.000Z'),
  safeRecordService: {
    async createOnce(input) {
      writes.push(input);
      if (input.tableName === '应用索引' && indexRecord) return { record: indexRecord, replayed: true, version: 1 };
      if (input.tableName === '应用索引') {
        indexRecord = { record_id: 'rec-1', fields: input.fields };
        return { record: indexRecord, replayed: false, version: 1 };
      }
      return { record: { record_id: `rec-${writes.length}` }, replayed: false };
    },
    async update(input) {
      writes.push(input);
      indexRecord = { ...indexRecord, fields: { ...indexRecord.fields, ...input.fields } };
      return { record: indexRecord, version: 2 };
    }
  }
});

const result = await projection.publish({
  resourceId: 'TEST_HW_001',
  instanceId: 'TEST_INSTANCE_001',
  idempotencyKey: 'TEST_IDEM_001',
  createdAt: new Date('2026-09-10T09:30:00.000Z').getTime(),
  creatorUserId: 'user-001',
  application: {
    name: 'TEST_海能Work应用', applicationCode: 'HW-001', summary: '审批上架测试',
    webAddress: 'https://example.com/app', applicant: 'owner-001', department: 'dept-001',
    contact: 'developer-001', contactDepartment: 'dev-dept-001',
    users: 'authorized-user-001', accessDepartment: 'authorized-dept-001'
  }
});

assert.equal(writes.length, 3);
assert.equal(writes[0].tableName, '上架申请');
assert.match(writes[0].businessKey, /^TEST_ONBOARDING_/);
assert.equal(writes[0].fields['审批来源'], '飞书审批');
assert.equal(writes[0].fields['审批实例ID'], 'TEST_INSTANCE_001');
assert.equal(writes[0].fields['授权用户'], 'authorized-user-001');
assert.equal(writes[0].fields['授权部门'], 'authorized-dept-001');
assert.equal(writes[0].fields['应用类型ID'], 'T005');
assert.equal(writes[0].fields['提交时间'], '2026-09-10 09:30:00');
assert.deepEqual(writes[0].governance, { versionField: '', sourceField: '', traceField: '', deletedField: '' });
assert.equal(writes[1].tableName, '应用索引');
assert.equal(writes[1].businessKey, 'TEST_HW_001');
assert.equal(writes[1].fields['状态'], '审核中');
assert.equal(writes[1].fields['应用类型'], 'T005');
assert.equal(writes[1].fields['申请人AD账号'], 'owner-001', '申请人必须写入现有应用索引字段');
assert.equal(writes[1].fields['接入人AD账号'], 'developer-001', '接入人必须写入现有应用索引字段');
assert.equal(writes[1].fields['所属部门ID'], 'dept-001', '申请表选择的所属部门必须投影为负责部门');
assert.equal(writes[1].fields['接入人所属部门ID'], 'dev-dept-001');
assert.equal(Object.hasOwn(writes[1].fields, '负责人ID'), false, '不得写入飞书应用索引中不存在的旧字段');
assert.equal(Object.hasOwn(writes[1].fields, '开发者ID'), false, '不得写入飞书应用索引中不存在的旧字段');
assert.equal(Object.hasOwn(writes[1].fields, '开发部门ID'), false, '不得写入飞书应用索引中不存在的旧字段');
assert.equal(writes[1].fields['当前结构版本'], 'V1.0');
assert.equal(writes[2].tableName, '海能work应用详情');
assert.equal(writes[2].fields['应用ID'], 'TEST_HW_001');
assert.equal(result.indexRecordId, 'rec-1');

const approved = await projection.publish({
  resourceId: 'TEST_HW_001', instanceId: 'TEST_INSTANCE_001', idempotencyKey: 'TEST_IDEM_001',
  status: 'APPROVED', creatorUserId: 'user-001',
  application: {
    name: 'TEST_海能Work应用', applicationCode: 'HW-001', summary: '审批上架测试',
    users: 'authorized-user-001', accessDepartment: 'authorized-dept-001'
  }
});
assert.equal(writes[3].tableName, '上架申请');
assert.equal(writes[3].businessKey, writes[0].businessKey, '同一审批状态刷新必须复用同一条上架申请记录');
assert.equal(indexRecord.fields['状态'], '审核通过');
assert.equal(approved.version, 2);

await assert.rejects(
  () => projection.publish({ resourceId: 'HW_001', application: { name: '应用', applicationCode: 'HW-001' } }),
  error => error?.code === 'TEST_RESOURCE_REQUIRED'
);

console.log('Feishu Work approvals project idempotently into onboarding, index, and detail tables');
