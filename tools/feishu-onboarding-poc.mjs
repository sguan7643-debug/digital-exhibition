import { resolve } from 'node:path';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { createFeishuSafeTestRecordService } from '../server/feishu-safe-test-record-service.mjs';
import { createFeishuOnboardingPocOrchestrator } from '../server/feishu-onboarding-poc-orchestrator.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createRedactedEvidence, writeRedactedEvidence } from '../server/contracts/feishu-onboarding-poc-evidence.mjs';

const startedAt = new Date().toISOString();
const applySchema = process.argv.includes('--apply-schema');
const prepareData = process.argv.includes('--prepare-data');
const cleanup = process.argv.includes('--cleanup');
if ([applySchema || prepareData, cleanup].filter(Boolean).length > 1) throw new Error('结构/数据准备与清理不能在同一次运行中执行');

const ledgerFile = resolve(process.env.FEISHU_ONBOARDING_POC_LEDGER_PATH || '.local/feishu-onboarding-poc-ledger.json');
const evidenceFile = resolve(process.env.FEISHU_ONBOARDING_POC_EVIDENCE_PATH || '.local/feishu-onboarding-poc-orchestration-evidence.json');
const approverToken = String(process.env.FEISHU_POC_APPROVER_ACCESS_TOKEN || '');
const approverUserId = String(process.env.FEISHU_POC_APPROVER_USER_ID || '');
const session = { identity: { userId: approverUserId }, accessToken: approverToken };
const adminClient = createFeishuSchemaAdminClient();
const identityClient = createFeishuOpenApiClient();
const safeRecordService = createFeishuSafeTestRecordService({ client: adminClient });
const orchestrator = createFeishuOnboardingPocOrchestrator({ adminClient, identityClient, ledgerFile });

async function prepareMinimumDictionaryData(context) {
  const tables = new Map((await adminClient.listTables()).map(table => [String(table.name || ''), table]));
  const required = ['应用类型配置', '业务域字典', '用户字典', '部门字典'];
  for (const tableName of required) if (!tables.has(tableName)) throw Object.assign(new Error(`目录表不存在，禁止由 POC 创建：${tableName}`), { code: 'POC_DICTIONARY_TABLE_MISSING' });
  const existing = new Map();
  for (const tableName of required) existing.set(tableName, await adminClient.listRecords(tables.get(tableName).table_id));
  const marker = `TEST_${context.runId}`;
  const specifications = [
    { tableName: '应用类型配置', sufficient: rows => rows.some(row => String(row.fields?.['类型编码'] || '') === 'T005'), keyField: '类型ID', key: `${marker}_TYPE`, fields: { 类型名称: '海能Work POC', 类型编码: 'T005', 排序: 999, 状态: '启用', 是否系统内置: false, 类型描述: 'POC 最小目录数据', 追踪ID: context.runId } },
    { tableName: '业务域字典', sufficient: rows => rows.some(row => row.fields?.['启用'] !== false), keyField: '业务域ID', key: `${marker}_DOMAIN`, fields: { 业务域名称: 'POC 业务域', 业务域编码: `${marker}_DOMAIN`, 描述: 'POC 最小目录数据', 启用: true, 排序: 999, 追踪ID: context.runId } },
    { tableName: '用户字典', sufficient: rows => rows.some(row => String(row.fields?.['AD账号'] || '') === approverUserId), keyField: 'AD账号', key: `${marker}_USER`, fields: { 姓名: 'POC 目录占位用户', 工号: `${marker}_EMP`, 所属部门ID: `${marker}_DEPT`, 所属部门名称: 'POC 部门', 邮箱脱敏值: 'p***@example.invalid', 手机号脱敏值: '***', 启用: true, 任职状态: '在职', 追踪ID: context.runId } },
    { tableName: '部门字典', sufficient: rows => rows.length > 0, keyField: '部门ID', key: `${marker}_DEPT`, fields: { 部门名称: 'POC 部门' } }
  ];
  const results = [];
  for (const spec of specifications) {
    if (spec.sufficient(existing.get(spec.tableName))) {
      results.push({ tableName: spec.tableName, action: 'EXISTING_SUFFICIENT' });
      continue;
    }
    const fields = { ...spec.fields, [spec.keyField]: spec.key };
    orchestrator.assertRecordWrite(spec.tableName, fields);
    const created = await safeRecordService.createOnce({ tableName: spec.tableName, keyField: spec.keyField, businessKey: spec.key, idempotencyKey: `${marker}_${spec.tableName}`, governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' }, fields: spec.fields });
    if (!created.replayed) orchestrator.appendLedger({ objectType: 'RECORD', tableName: spec.tableName, tableId: created.tableId, recordId: String(created.record?.record_id || ''), keyField: spec.keyField, businessKey: spec.key, cleanupStrategy: 'EXACT_RECORD_DELETE' });
    results.push({ tableName: spec.tableName, action: created.replayed ? 'REPLAYED' : 'CREATED' });
  }
  return results;
}

let context;
try {
  if (cleanup) {
    const result = await orchestrator.cleanup({ session });
    const evidence = createRedactedEvidence({ phase: 'cleanup', passed: true, runId: result.runId, identity: session.identity, startedAt, checks: result });
    writeRedactedEvidence(evidenceFile, evidence);
    console.log(JSON.stringify({ ...evidence, evidenceFile }, null, 2));
  } else {
    context = applySchema || prepareData ? await orchestrator.execute({ session }) : await orchestrator.prepare({ session });
    const dictionary = prepareData ? await prepareMinimumDictionaryData(context) : [];
    const evidence = createRedactedEvidence({ phase: prepareData ? 'prepare-data' : applySchema ? 'apply-schema' : 'dry-run', passed: true, runId: context.runId, identity: session.identity, startedAt, checks: { gates: context.gates, plannedActions: context.plannedActions || context.plan, applied: context.applied || 0, before: context.before, after: context.after || null, dictionary } });
    writeRedactedEvidence(evidenceFile, evidence);
    console.log(JSON.stringify({ ...evidence, evidenceFile }, null, 2));
  }
} catch (error) {
  const evidence = createRedactedEvidence({ phase: cleanup ? 'cleanup' : prepareData ? 'prepare-data' : applySchema ? 'apply-schema' : 'dry-run', passed: false, runId: context?.runId || '', identity: session.identity, startedAt, failure: error });
  writeRedactedEvidence(evidenceFile, evidence);
  console.error(JSON.stringify({ ...evidence, evidenceFile }, null, 2));
  process.exitCode = 1;
}
