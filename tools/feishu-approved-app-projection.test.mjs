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
      if (input.tableName === '应用索引') indexRecord = { record_id: 'rec-1', fields: input.fields };
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
  creatorUserId: 'user-001',
  application: {
    name: 'TEST_海能Work应用', applicationCode: 'HW-001', summary: '审批上架测试',
    webAddress: 'https://example.com/app', contact: 'contact-001', contactDepartment: 'dept-001'
  }
});

assert.equal(writes.length, 2);
assert.equal(writes[0].tableName, '应用索引');
assert.equal(writes[0].businessKey, 'TEST_HW_001');
assert.equal(writes[0].fields['状态'], '审核中');
assert.equal(writes[0].fields['应用类型'], 'T005');
assert.equal(writes[1].tableName, '海能work应用详情');
assert.equal(writes[1].fields['应用ID'], 'TEST_HW_001');
assert.equal(result.indexRecordId, 'rec-1');

const approved = await projection.publish({
  resourceId: 'TEST_HW_001', status: 'APPROVED', creatorUserId: 'user-001',
  application: { name: 'TEST_海能Work应用', applicationCode: 'HW-001', summary: '审批上架测试' }
});
assert.equal(indexRecord.fields['状态'], '审核通过');
assert.equal(approved.version, 2);

await assert.rejects(
  () => projection.publish({ resourceId: 'HW_001', application: { name: '应用', applicationCode: 'HW-001' } }),
  error => error?.code === 'TEST_RESOURCE_REQUIRED'
);

console.log('approved Feishu Work applications project idempotently into index and detail tables');
