import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FeishuProxyError } from './feishu-open-api-client.mjs';
import {
  ONBOARDING_POC_MANIFEST,
  ONBOARDING_POC_MANIFEST_SHA256,
  ONBOARDING_POC_RECORD_TABLES,
  ONBOARDING_POC_SCHEMA_TABLES
} from './contracts/feishu-onboarding-poc-schema-manifest.mjs';

const ALLOWED_ACTIONS = new Set(['CREATE_TABLE', 'CREATE_FIELD']);
const DICTIONARY_FIELDS = Object.freeze({
  应用类型配置: new Set(['类型ID', '类型名称', '类型编码', '排序', '状态', '是否系统内置', '类型描述', '追踪ID']),
  业务域字典: new Set(['业务域ID', '业务域名称', '业务域编码', '描述', '启用', '排序', '追踪ID']),
  用户字典: new Set(['AD账号', '姓名', '工号', '所属部门ID', '所属部门名称', '邮箱脱敏值', '手机号脱敏值', '启用', '任职状态', '追踪ID']),
  部门字典: new Set(['部门ID', '部门名称'])
});
const RECORD_KEY_FIELDS = Object.freeze({
  应用类型配置: '类型ID', 业务域字典: '业务域ID', 用户字典: 'AD账号', 部门字典: '部门ID',
  上架申请: '申请单号', 文件上传会话: '上传ID', 附件资料: '主键', 应用索引: '应用ID', 海能work应用详情: '主键'
});

function fail(code, message, status = 409) {
  throw new FeishuProxyError(code, message, status);
}

function fingerprint(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function sessionSubject(session) {
  return String(session?.identity?.userId || session?.identity?.openId || session?.identity?.subject || '');
}

function requiredOptionNames(field) {
  return new Set((field.property?.options || []).map(option => String(option.name || '')));
}

function existingOptionNames(field) {
  return new Set((field.property?.options || []).map(option => String(option.name || '')));
}

function compatibleField(expected, actual) {
  if (Number(expected.type) !== Number(actual.type)) return false;
  if (expected.primary === true && actual.is_primary !== true && actual.isPrimary !== true) return false;
  const required = requiredOptionNames(expected);
  const existing = existingOptionNames(actual);
  return [...required].every(value => existing.has(value));
}

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

export function createFeishuOnboardingPocOrchestrator({
  adminClient,
  identityClient,
  baseToken = process.env.FEISHU_BASE_TOKEN || '',
  expectedFingerprint = process.env.FEISHU_POC_BASE_FINGERPRINT || '',
  ledgerFile = process.env.FEISHU_ONBOARDING_POC_LEDGER_PATH || '',
  now = Date.now,
  randomBytes = nodeRandomBytes
} = {}) {
  if (!adminClient?.listTables || !adminClient?.listFields) throw new Error('POC 编排器缺少结构管理客户端');
  let prepared = null;

  function assertFingerprint() {
    const expected = String(expectedFingerprint || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected)) fail('POC_BASE_FINGERPRINT_REQUIRED', 'POC Base 指纹缺失或格式非法', 503);
    const actual = fingerprint(baseToken);
    if (actual !== expected) fail('POC_BASE_FINGERPRINT_MISMATCH', 'POC Base 指纹不匹配', 503);
    return actual;
  }

  function assertRealApprover(session) {
    if (!sessionSubject(session) || !session?.accessToken) fail('POC_REAL_APPROVER_REQUIRED', '真实申请人和审批人会话不可用', 401);
  }

  function requiresRunId(tableName) {
    return Boolean(ONBOARDING_POC_MANIFEST.tables.find(table => table.table_name === tableName)?.fields.some(field => field.field_name === '运行标识'));
  }

  function assertSchemaPlan(plan) {
    for (const action of plan || []) {
      if (!ALLOWED_ACTIONS.has(action.action)) fail('POC_SCHEMA_ACTION_FORBIDDEN', 'POC schema 计划包含禁止动作');
      if (!ONBOARDING_POC_SCHEMA_TABLES.has(action.tableName)) fail('POC_SCHEMA_TABLE_FORBIDDEN', 'POC schema 计划包含非白名单表');
      const schema = ONBOARDING_POC_MANIFEST.tables.find(item => item.table_name === action.tableName);
      if (action.action === 'CREATE_FIELD' && !schema?.fields.some(field => field.field_name === action.fieldName)) fail('POC_SCHEMA_FIELD_FORBIDDEN', 'POC schema 计划包含非白名单字段');
    }
    return true;
  }

  async function inspect() {
    const tables = await adminClient.listTables();
    const byName = new Map(tables.map(table => [String(table.name || ''), table]));
    const plan = [];
    const before = [];
    const conflicts = [];
    for (const schema of ONBOARDING_POC_MANIFEST.tables) {
      const table = byName.get(schema.table_name);
      if (!table) {
        plan.push({ action: 'CREATE_TABLE', tableName: schema.table_name, schema });
        before.push({ tableName: schema.table_name, tableId: '', fields: [], missing: schema.fields.map(field => field.field_name) });
        continue;
      }
      const fields = await adminClient.listFields(table.table_id);
      const fieldsByName = new Map(fields.map(field => [String(field.field_name || ''), field]));
      const missing = [];
      for (const expected of schema.fields) {
        const actual = fieldsByName.get(expected.field_name);
        if (!actual) {
          missing.push(expected.field_name);
          plan.push({ action: 'CREATE_FIELD', tableName: schema.table_name, tableId: table.table_id, fieldName: expected.field_name, field: expected });
        } else if (!compatibleField(expected, actual)) {
          conflicts.push({ tableName: schema.table_name, fieldName: expected.field_name, expectedType: expected.type, actualType: actual.type });
        }
      }
      before.push({ tableName: schema.table_name, tableId: table.table_id, fields: fields.map(field => ({ fieldId: field.field_id || '', fieldName: field.field_name, type: field.type, primary: Boolean(field.is_primary || field.isPrimary), options: [...existingOptionNames(field)] })), missing });
    }
    assertSchemaPlan(plan);
    if (conflicts.length) fail('POC_SCHEMA_CONFLICT', 'POC schema 存在同名异型、主键或选项冲突');
    return { plan, before, conflicts };
  }

  function buildRunId() {
    const stamp = new Date(Number(now())).toISOString().replace(/[-:.TZ]/g, '');
    return `TEST_ONBOARDING_POC_${stamp}_${randomBytes(4).toString('hex').slice(0, 8)}`;
  }

  function createLedger(baseFingerprint) {
    if (!ledgerFile) fail('POC_LEDGER_PATH_REQUIRED', 'POC 清理台账路径未配置', 503);
    if (existsSync(ledgerFile)) {
      const existing = JSON.parse(readFileSync(ledgerFile, 'utf8'));
      if (existing?.status === 'ACTIVE' && existing?.baseFingerprint === baseFingerprint) {
        if (existing.manifestSha256 !== ONBOARDING_POC_MANIFEST_SHA256 || existing.manifestVersion !== ONBOARDING_POC_MANIFEST.version) {
          fail('POC_LEDGER_MANIFEST_MISMATCH', '活动清理台账与当前 POC manifest 不一致');
        }
        return existing;
      }
    }
    const ledger = {
      version: 'onboarding-poc-ledger.v1',
      runId: buildRunId(),
      baseFingerprint,
      manifestVersion: ONBOARDING_POC_MANIFEST.version,
      manifestSha256: ONBOARDING_POC_MANIFEST_SHA256,
      createdAt: new Date(Number(now())).toISOString(),
      status: 'ACTIVE',
      objects: []
    };
    atomicWrite(ledgerFile, ledger);
    return ledger;
  }

  async function prepare({ session } = {}) {
    const baseFingerprint = assertFingerprint();
    assertRealApprover(session);
    const subject = sessionSubject(session);
    if (prepared?.ready && prepared.baseFingerprint === baseFingerprint) {
      if (prepared.actorBinding?.subject !== subject) fail('POC_ACTOR_BINDING_MISMATCH', '当前会话不是本 runId 已确认的申请人与审批人', 403);
      return prepared;
    }
    if (!identityClient?.preflightOnboardingPocActor) fail('POC_IDENTITY_PREFLIGHT_UNAVAILABLE', '飞书身份与审批人只读预检不可用', 503);
    const actor = await identityClient.preflightOnboardingPocActor({ session });
    if (!actor?.identityVerified || !actor?.approverCapabilityVerified || !actor?.active) fail('POC_APPROVER_UNAVAILABLE', '飞书审批人只读预检未通过', 409);
    const discovery = await inspect();
    const ledger = createLedger(baseFingerprint);
    const actorBinding = Object.freeze({ runId: ledger.runId, subject, userId: String(actor.userId || ''), openId: String(actor.openId || ''), applicantUserId: String(actor.userId || subject), approverUserId: String(actor.userId || subject) });
    prepared = Object.freeze({
      ready: true,
      runId: ledger.runId,
      baseFingerprint,
      manifestVersion: ONBOARDING_POC_MANIFEST.version,
      manifestSha256: ONBOARDING_POC_MANIFEST_SHA256,
      plan: discovery.plan,
      before: discovery.before,
      actorBinding,
      gates: Object.freeze({ baseFingerprint: true, realApprover: true, identityPreflight: true, approverCapability: true, schemaDryRun: true, ledgerCreated: true })
    });
    return prepared;
  }

  async function execute({ session } = {}) {
    const context = await prepare({ session });
    if (context.plan.length && !adminClient.schemaWriteEnabled) fail('POC_SCHEMA_WRITE_DISABLED', 'POC schema 写入门禁未开启', 403);
    for (const action of context.plan) {
      if (action.action === 'CREATE_TABLE') await adminClient.createTable(action.schema);
      else await adminClient.createField(action.tableId, action.field);
    }
    const after = await inspect();
    if (after.plan.length) fail('POC_SCHEMA_VERIFY_FAILED', 'POC schema 执行后仍存在缺失项');
    const result = Object.freeze({ ...context, plan: Object.freeze([]), plannedActions: context.plan, after: after.before, applied: context.plan.length });
    prepared = result;
    return result;
  }

  function allowedFieldsFor(tableName) {
    const schema = ONBOARDING_POC_MANIFEST.tables.find(item => item.table_name === tableName);
    return schema ? new Set(schema.fields.map(field => field.field_name)) : DICTIONARY_FIELDS[tableName];
  }

  function assertRecordWrite(tableName, fields = {}) {
    if (!ONBOARDING_POC_RECORD_TABLES.has(tableName)) fail('POC_RECORD_TABLE_FORBIDDEN', 'POC 记录写入目标不在白名单');
    const allowed = allowedFieldsFor(tableName);
    if (!allowed || Object.keys(fields).some(field => !allowed.has(field))) fail('POC_RECORD_FIELD_FORBIDDEN', 'POC 记录包含非白名单字段');
    return true;
  }

  function appendLedger(entry) {
    if (!prepared) fail('POC_GATES_NOT_READY', '首次真实写入前四项门禁尚未完成', 503);
    const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
    if (ledger.status !== 'ACTIVE' || ledger.runId !== prepared.runId) fail('POC_LEDGER_NOT_ACTIVE', 'POC 清理台账不是当前活动 runId');
    if (entry.objectType === 'RECORD') {
      if (!ONBOARDING_POC_RECORD_TABLES.has(entry.tableName) || !entry.tableId || !entry.recordId) fail('POC_LEDGER_RECORD_INVALID', '记录台账缺少精确表或记录标识');
      if (!String(entry.businessKey || '').startsWith('TEST_')) fail('POC_LEDGER_TEST_KEY_REQUIRED', '记录台账业务键必须使用 TEST_ 前缀');
      if (entry.keyField !== RECORD_KEY_FIELDS[entry.tableName]) fail('POC_LEDGER_KEY_FIELD_INVALID', '记录台账 keyField 不是该表批准主键');
      if (!requiresRunId(entry.tableName) && !String(entry.businessKey).startsWith(`TEST_${prepared.runId}`)) fail('POC_LEDGER_RUN_KEY_REQUIRED', '无运行标识表必须使用完整 TEST_<runId> 主键');
    } else if (entry.objectType === 'APPROVAL_INSTANCE') {
      if (!entry.instanceId || !String(entry.businessKey || '').startsWith('TEST_')) fail('POC_LEDGER_APPROVAL_INVALID', '审批实例台账缺少实例或 TEST_ 业务键');
    }
    const duplicate = ledger.objects.some(item => item.objectType === entry.objectType && item.tableId === entry.tableId && item.recordId === entry.recordId && item.instanceId === entry.instanceId && item.businessKey === entry.businessKey);
    if (duplicate) return;
    ledger.objects.push({ ...entry, baseFingerprint: prepared.baseFingerprint, runId: prepared.runId, createdAt: new Date(Number(now())).toISOString(), cleanupResult: 'PENDING' });
    atomicWrite(ledgerFile, ledger);
  }

  async function cleanup({ session } = {}) {
    const baseFingerprint = assertFingerprint();
    assertRealApprover(session);
    if (!ledgerFile || !existsSync(ledgerFile)) fail('POC_LEDGER_NOT_FOUND', 'POC 清理台账不存在', 404);
    const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
    if (ledger.baseFingerprint !== baseFingerprint || ledger.manifestSha256 !== ONBOARDING_POC_MANIFEST_SHA256) fail('POC_LEDGER_SCOPE_MISMATCH', 'POC 清理台账不属于当前 Base 或 manifest');
    let deleted = 0;
    let verifiedAbsent = 0;
    let retained = 0;
    const retainedObjects = [];
    for (const entry of [...ledger.objects].reverse()) {
      if (entry.cleanupResult === 'VERIFIED_ABSENT') {
        verifiedAbsent += 1;
        continue;
      }
      if (entry.objectType !== 'RECORD') {
        entry.cleanupResult = 'RETAINED_PENDING_GC';
        entry.cleanupReason = entry.objectType === 'APPROVAL_INSTANCE'
          ? '飞书审批实例作为审计对象保留，POC 不执行不可逆删除'
          : '飞书媒体接口不提供本 POC 可验证的物理删除能力；仅保留 token 哈希';
        retained += 1;
        retainedObjects.push({ objectType: entry.objectType, instanceId: entry.instanceId || '', businessKey: entry.businessKey || '', cleanupResult: entry.cleanupResult, cleanupReason: entry.cleanupReason });
        atomicWrite(ledgerFile, ledger);
        continue;
      }
      if (!ONBOARDING_POC_RECORD_TABLES.has(entry.tableName) || !entry.tableId || !entry.recordId || entry.keyField !== RECORD_KEY_FIELDS[entry.tableName] || !String(entry.businessKey || '').startsWith('TEST_')) {
        fail('POC_CLEANUP_LEDGER_INVALID', '清理台账记录越界或缺少精确标识');
      }
      const dictionaryRunPrefix = `TEST_${ledger.runId}`;
      if (!requiresRunId(entry.tableName) && !String(entry.businessKey).startsWith(dictionaryRunPrefix)) {
        fail('POC_CLEANUP_OWNERSHIP_MISMATCH', '无运行标识表的批准主键不属于当前 runId，拒绝删除');
      }
      let record;
      try {
        record = await adminClient.getRecord(entry.tableId, entry.recordId);
      } catch (error) {
        if (error?.status === 404) {
          entry.cleanupResult = 'VERIFIED_ABSENT';
          verifiedAbsent += 1;
          atomicWrite(ledgerFile, ledger);
          continue;
        }
        throw error;
      }
      const fields = record?.fields || {};
      const remoteBusinessKey = String(fields[entry.keyField] || '');
      const runOwned = requiresRunId(entry.tableName)
        ? String(fields['运行标识'] || '') === ledger.runId
        : remoteBusinessKey.startsWith(dictionaryRunPrefix);
      const keyOwned = remoteBusinessKey === String(entry.businessKey || '');
      if (!runOwned || !keyOwned) fail('POC_CLEANUP_OWNERSHIP_MISMATCH', '精确记录不属于当前 runId 与业务键，拒绝删除');
      await adminClient.deleteRecord(entry.tableId, entry.recordId);
      deleted += 1;
      try {
        await adminClient.getRecord(entry.tableId, entry.recordId);
        fail('POC_CLEANUP_VERIFY_FAILED', '删除后精确记录仍存在');
      } catch (error) {
        if (error?.status !== 404) throw error;
      }
      entry.cleanupResult = 'VERIFIED_ABSENT';
      entry.cleanedAt = new Date(Number(now())).toISOString();
      verifiedAbsent += 1;
      atomicWrite(ledgerFile, ledger);
    }
    ledger.status = retained ? 'CLEANED_WITH_MEDIA_RETENTION' : 'CLEANED';
    ledger.cleanedAt = new Date(Number(now())).toISOString();
    atomicWrite(ledgerFile, ledger);
    return Object.freeze({ runId: ledger.runId, deleted, verifiedAbsent, retained, retainedObjects: Object.freeze(retainedObjects), status: ledger.status });
  }

  return Object.freeze({ prepare, execute, cleanup, inspect, assertFingerprint, assertSchemaPlan, assertRecordWrite, appendLedger, get prepared() { return prepared; } });
}
