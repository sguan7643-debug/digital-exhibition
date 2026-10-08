import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ONBOARDING_POC_MANIFEST } from '../server/contracts/feishu-onboarding-poc-schema-manifest.mjs';
import { createFeishuOnboardingPocOrchestrator } from '../server/feishu-onboarding-poc-orchestrator.mjs';

const baseToken = 'poc-runtime-schema-base';
const expectedFingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(baseToken))
  .then(buffer => Buffer.from(buffer).toString('hex'));
const session = { identity: { userId: 'u_runtime', openId: 'ou_runtime' }, accessToken: 'server-only' };
const identityClient = {
  async preflightOnboardingPocActor() {
    return { userId: 'u_runtime', openId: 'ou_runtime', active: true, identityVerified: true, approverCapabilityVerified: true };
  }
};

function manifestTables() {
  return ONBOARDING_POC_MANIFEST.tables.map((table, tableIndex) => ({ table_id: `tbl-${tableIndex}`, name: table.table_name }));
}

function manifestFields() {
  return new Map(ONBOARDING_POC_MANIFEST.tables.map((table, tableIndex) => [
    `tbl-${tableIndex}`,
    table.fields.map((field, fieldIndex) => ({
      field_id: `fld-${tableIndex}-${fieldIndex}`,
      field_name: field.field_name,
      type: field.type,
      is_primary: field.primary === true,
      property: field.property || {}
    }))
  ]));
}

async function withTempLedger(prefix, callback) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  try {
    await callback(join(directory, 'ledger.json'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

await withTempLedger('onboarding-schema-compatible-duplicate-', async ledgerFile => {
  const fieldsByTable = manifestFields();
  const uploadTable = manifestTables().find(table => table.name === '文件上传会话');
  const runMarker = fieldsByTable.get(uploadTable.table_id).find(field => field.field_name === '运行标识');
  fieldsByTable.get(uploadTable.table_id).push({ ...runMarker, field_id: 'fld-compatible-duplicate' });
  const orchestrator = createFeishuOnboardingPocOrchestrator({
    adminClient: {
      async listTables() { return manifestTables(); },
      async listFields(tableId) { return fieldsByTable.get(tableId); }
    },
    identityClient,
    baseToken,
    expectedFingerprint,
    ledgerFile
  });

  const prepared = await orchestrator.prepare({ session });
  assert.equal(prepared.ready, true, '同名、同类型、同配置的历史重复字段不应阻断日常上传');
});

await withTempLedger('onboarding-schema-incompatible-duplicate-', async ledgerFile => {
  const fieldsByTable = manifestFields();
  const uploadTable = manifestTables().find(table => table.name === '文件上传会话');
  fieldsByTable.get(uploadTable.table_id).push({
    field_id: 'fld-incompatible-duplicate',
    field_name: '运行标识',
    type: 2,
    is_primary: false,
    property: {}
  });
  const orchestrator = createFeishuOnboardingPocOrchestrator({
    adminClient: {
      async listTables() { return manifestTables(); },
      async listFields(tableId) { return fieldsByTable.get(tableId); }
    },
    identityClient,
    baseToken,
    expectedFingerprint,
    ledgerFile
  });

  await assert.rejects(
    () => orchestrator.prepare({ session }),
    error => error?.code === 'POC_SCHEMA_CONFLICT',
    '同名异型字段仍必须阻断写入'
  );
});

await withTempLedger('onboarding-schema-single-flight-', async ledgerFile => {
  const tables = manifestTables();
  const fieldsByTable = manifestFields();
  const uploadTable = tables.find(table => table.name === '文件上传会话');
  fieldsByTable.set(uploadTable.table_id, fieldsByTable.get(uploadTable.table_id).filter(field => field.field_name !== '运行标识'));
  let createFieldCalls = 0;
  const adminClient = {
    schemaWriteEnabled: true,
    async listTables() { return tables; },
    async listFields(tableId) { return fieldsByTable.get(tableId); },
    async createTable() { throw new Error('unexpected createTable'); },
    async createField(tableId, field) {
      createFieldCalls += 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      fieldsByTable.get(tableId).push({
        field_id: `fld-created-${createFieldCalls}`,
        field_name: field.field_name,
        type: field.type,
        is_primary: field.primary === true,
        property: field.property || {}
      });
    }
  };
  const orchestrator = createFeishuOnboardingPocOrchestrator({
    adminClient,
    identityClient,
    baseToken,
    expectedFingerprint,
    ledgerFile
  });

  const [first, second] = await Promise.all([
    orchestrator.execute({ session }),
    orchestrator.execute({ session })
  ]);
  assert.equal(first.ready, true);
  assert.equal(second.ready, true);
  assert.equal(createFieldCalls, 1, '并发上传只能执行一次 schema 补齐');
  assert.equal(fieldsByTable.get(uploadTable.table_id).filter(field => field.field_name === '运行标识').length, 1);
});

console.log('onboarding runtime accepts compatible duplicate fields, rejects incompatible drift, and serializes schema execution');
