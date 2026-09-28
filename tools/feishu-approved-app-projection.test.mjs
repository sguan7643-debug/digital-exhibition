import assert from 'node:assert/strict';
import { createFeishuApprovedAppProjection } from '../server/feishu-approved-app-projection.mjs';
import { ONBOARDING_POC_MANIFEST } from '../server/contracts/feishu-onboarding-poc-schema-manifest.mjs';

const writes = [];
const updates = [];
let indexRecord = null;
const allowedFields = new Map(ONBOARDING_POC_MANIFEST.tables.map(table => [table.table_name, new Set(table.fields.map(field => field.field_name))]));
const projection = createFeishuApprovedAppProjection({
  now: () => new Date('2026-09-10T10:00:00.000Z'),
  orchestrator: {
    prepared: { runId: 'TEST_ONBOARDING_POC_PROJECTION' },
    assertRecordWrite(tableName, fields) {
      assert.ok(allowedFields.has(tableName), `unexpected record table: ${tableName}`);
      assert.deepEqual(Object.keys(fields).filter(field => !allowedFields.get(tableName).has(field)), [], `${tableName} contains fields outside the POC manifest`);
    },
    appendLedger() {}
  },
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
      updates.push(input);
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
    uniqueIdentifier: 'ONB_TEST_UNIQUE_IDENTIFIER_001',
    webAddress: 'https://example.com/app', applicant: 'owner-001', department: 'dept-001',
    contact: 'developer-001', contactDepartment: 'dev-dept-001',
    users: 'authorized-user-001', accessDepartment: 'authorized-dept-001'
  }
});

assert.equal(writes.length, 1, 'PENDING 只能写上架申请，不得提前发布应用索引或海能work详情');
assert.equal(writes[0].tableName, '上架申请');
assert.match(writes[0].businessKey, /^TEST_ONBOARDING_/);
assert.equal(writes[0].fields['审批来源'], '飞书审批');
assert.equal(writes[0].fields['审批实例ID'], 'TEST_INSTANCE_001');
assert.equal(writes[0].fields['授权用户'], 'authorized-user-001');
assert.equal(writes[0].fields['授权部门'], 'authorized-dept-001');
assert.equal(writes[0].fields['应用类型ID'], 'T005');
assert.equal(writes[0].fields['唯一标识'], 'ONB_TEST_UNIQUE_IDENTIFIER_001');
assert.equal(writes[0].fields['提交时间'], '2026-09-10 09:30:00');
assert.deepEqual(writes[0].governance, { versionField: '', sourceField: '', traceField: '', deletedField: '' });
assert.deepEqual(
  writes[0].reconcileFields,
  ['唯一标识', '审批实例ID', '授权用户', '授权部门', '状态', '当前审批节点', '最近同步时间', '完成时间', '退回原因'],
  '上架申请重放只能补写批准的字段白名单'
);
assert.equal(Object.hasOwn(writes[0].fields, '应用图标'), false, '上架申请不得重复保存应用图标');
assert.equal(Object.hasOwn(writes[0].fields, '申请附件'), false, '上架申请不得重复保存申请附件');
assert.equal(result.published, false);
assert.equal(result.indexRecordId, '');

const approved = await projection.publish({
  resourceId: 'TEST_HW_001', instanceId: 'TEST_INSTANCE_001', idempotencyKey: 'TEST_IDEM_001',
  status: 'APPROVED', creatorUserId: 'user-001',
  application: {
    name: 'TEST_海能Work应用', applicationCode: 'HW-001', summary: '审批上架测试',
    applicant: 'owner-001', department: 'dept-001', contact: 'developer-001', contactDepartment: 'dev-dept-001',
    users: 'authorized-user-001', accessDepartment: 'authorized-dept-001'
  }
});
assert.equal(writes[1].tableName, '上架申请');
assert.equal(writes[1].businessKey, writes[0].businessKey, '同一审批状态刷新必须复用同一条上架申请记录');
assert.equal(writes[2].tableName, '应用索引');
assert.equal(writes[2].businessKey, 'TEST_HW_001');
assert.equal(writes[2].fields['状态'], '审核通过');
assert.equal(writes[2].fields['应用类型'], 'T005');
assert.equal(writes[2].fields['申请人AD账号'], 'owner-001', '申请人必须写入现有应用索引字段');
assert.equal(writes[3].tableName, '海能work应用详情');
assert.equal(writes[3].fields['应用ID'], 'TEST_HW_001');
assert.equal(indexRecord.fields['状态'], '审核通过');
assert.equal(approved.version, 1);
assert.equal(approved.published, true);
assert.match(projection.version, /^feishu-approved-app-projection\./);
assert.equal(updates.length, 0, '无版本字段的 POC 投影应通过 createOnce 白名单修复，不得走通用版本更新');
for (const write of writes) {
  assert.deepEqual(write.governance, { versionField: '', sourceField: '', traceField: '', deletedField: '' }, `${write.tableName} 不得注入 manifest 外的通用治理字段`);
}

for (const statusValue of ['REJECTED', 'CANCELLED']) {
  const before = writes.length;
  const terminal = await projection.publish({
    resourceId: `TEST_HW_${statusValue}`, instanceId: `TEST_INSTANCE_${statusValue}`, idempotencyKey: `TEST_IDEM_${statusValue}`,
    status: statusValue, creatorUserId: 'user-001',
    application: { name: `${statusValue}应用`, applicationCode: `HW-${statusValue}`, users: 'authorized-user-001', accessDepartment: 'authorized-dept-001' }
  });
  assert.equal(terminal.published, false);
  assert.deepEqual(writes.slice(before).map(write => write.tableName), ['上架申请'], `${statusValue} 不得写应用索引或海能work详情`);
}

await assert.rejects(
  () => projection.publish({ resourceId: 'HW_001', application: { name: '应用', applicationCode: 'HW-001' } }),
  error => error?.code === 'TEST_RESOURCE_REQUIRED'
);

const richTextReplay = createFeishuApprovedAppProjection({
  now: () => new Date('2026-09-10T10:00:00.000Z'),
  orchestrator: {
    prepared: { runId: 'TEST_ONBOARDING_POC_RICH_TEXT' },
    assertRecordWrite() {},
    appendLedger() {}
  },
  safeRecordService: {
    async createOnce() {
      return {
        record: {
          record_id: 'rec-rich-text',
          fields: { '运行标识': [{ type: 'text', text: 'TEST_ONBOARDING_POC_RICH_TEXT' }] }
        },
        replayed: true,
        version: 0
      };
    }
  }
});
const replayed = await richTextReplay.publish({
  resourceId: 'TEST_HW_RICH_TEXT',
  instanceId: 'TEST_INSTANCE_RICH_TEXT',
  idempotencyKey: 'TEST_IDEM_RICH_TEXT',
  creatorUserId: 'user-001',
  application: {
    name: 'TEST_富文本运行标识',
    applicationCode: 'TEST-HW-RICH-TEXT',
    users: 'authorized-user-001',
    accessDepartment: 'authorized-dept-001'
  }
});
assert.equal(replayed.replayed, true, '飞书富文本数组中的同一 runId 必须被识别为当前 POC 记录');

console.log('Feishu Work approvals project idempotently into onboarding, index, and detail tables');
