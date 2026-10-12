import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { getOperation } from '../src/integration/operation-registry.js';
import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setMaxListeners } from 'node:events';
import {
  READ_OPERATION_CACHE_POLICIES,
  REPRESENTATIVE_CACHE_OPERATION_IDS,
  STRONG_CONSISTENCY_OPERATION_IDS
} from './feishu-read-cache-policies.mjs';
import {
  createReadIsolationKey,
  fingerprintReadIsolation,
  normalizeReadInput,
  normalizeReadPrincipal
} from './feishu-read-isolation-key.mjs';
import { validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { createVerifiedReadOperationContracts } from './feishu-read-operation-contracts.mjs';

const READ_PLANS = Object.freeze({
  'COM-001': Object.freeze({ kind: 'current-user' }),
  'COM-002': Object.freeze({ kind: 'current-navigation' }),
  'COM-005': Object.freeze({ kind: 'dictionary-batch' }),
  'COM-008': Object.freeze({ kind: 'secure-resource' }),
  'WB-002': Object.freeze({ kind: 'workbench-search' }),
  'WB-001': Object.freeze({ kind: 'workbench-personal' }),
  'WB-003': Object.freeze({ kind: 'workbench-personal' }),
  'WB-004': Object.freeze({ kind: 'workbench-personal' }),
  'APP-010': Object.freeze({ kind: 'identity-detail' }),
  'TRN-006': Object.freeze({ kind: 'identity-detail' }),
  'CER-003': Object.freeze({ kind: 'identity-detail' }),
  'COM-010': Object.freeze({ kind: 'identity-detail' }),
  'INT-001': Object.freeze({ kind: 'admin-read' }),
  'INT-004': Object.freeze({ kind: 'admin-read' }),
  'ADM-003': Object.freeze({ kind: 'admin-read' }),
  'ADM-004': Object.freeze({ kind: 'admin-read' }),
  'ARC-002': Object.freeze({ kind: 'admin-read' }),
  'OPS-001': Object.freeze({ kind: 'admin-read' }),
  'OAN-001': Object.freeze({ kind: 'admin-read' }),
  'OAN-002': Object.freeze({ kind: 'admin-read' }),
  'OAP-001': Object.freeze({ kind: 'admin-read' }),
  'OAP-002': Object.freeze({ kind: 'admin-read' }),
  'OAN-003': Object.freeze({ kind: 'admin-read' }),
  'OAN-008': Object.freeze({ kind: 'admin-read' }),
  'OAP-003': Object.freeze({ kind: 'admin-read' }),
  'OAP-006': Object.freeze({ kind: 'admin-read' }),
  'OAP-008': Object.freeze({ kind: 'admin-read' }),
  'OAP-011': Object.freeze({ kind: 'admin-read' }),
  'ADM-006': Object.freeze({ kind: 'admin-read' }),
  'ADM-007': Object.freeze({ kind: 'admin-read' }),
  'INT-003': Object.freeze({ kind: 'admin-read' }),
  'INT-005': Object.freeze({ kind: 'admin-read' }),
  'APP-001': Object.freeze({ kind: 'app-facets' }),
  'ANN-001': Object.freeze({ kind: 'announcement-facets' }),
  'COM-003': Object.freeze({ kind: 'contact-organizations' }),
  'COM-004': Object.freeze({ kind: 'contact-users' }),
  'ANN-002': Object.freeze({ kind: 'announcement-list' }),
  'ANN-003': Object.freeze({ kind: 'first-batch-detail' }),
  'ANN-005': Object.freeze({ kind: 'first-batch-detail' }),
  'APP-002': Object.freeze({ kind: 'app-list' }),
  'APP-003': Object.freeze({ kind: 'first-batch-detail' }),
  'APP-004': Object.freeze({ kind: 'secure-resource' }),
  'APP-007': Object.freeze({ kind: 'app-comments' }),
  'APP-009': Object.freeze({ kind: 'first-batch-detail' }),
  'MSG-001': Object.freeze({ kind: 'personal-read' }),
  'MSG-002': Object.freeze({ kind: 'personal-read' }),
  'FAV-001': Object.freeze({ kind: 'personal-read' }),
  'FAV-002': Object.freeze({ kind: 'personal-read' }),
  'PTS-001': Object.freeze({ kind: 'personal-read' }),
  'PTS-002': Object.freeze({ kind: 'personal-read' }),
  'PTS-003': Object.freeze({ kind: 'personal-read' }),
  'TAL-001': Object.freeze({ kind: 'talent-people' }),
  'TAL-002': Object.freeze({ kind: 'talent-projects' }),
  'TAL-003': Object.freeze({ kind: 'talent-progress' }),
  'TAL-005': Object.freeze({ kind: 'talent-facets' }),
  'PTS-004': Object.freeze({ kind: 'public-read' }),
  'TRN-001': Object.freeze({ kind: 'public-read' }),
  'TRN-002': Object.freeze({ kind: 'public-read' }),
  'TRN-003': Object.freeze({ kind: 'public-read' }),
  'CER-001': Object.freeze({ kind: 'public-read' }),
  'CER-002': Object.freeze({ kind: 'public-read' }),
  'OPS-003': Object.freeze({ kind: 'public-read' }),
  'MAT-001': Object.freeze({ kind: 'public-read' }),
  'MAT-002': Object.freeze({ kind: 'first-batch-detail' }),
  'MAT-003': Object.freeze({ kind: 'secure-resource' })
});
const STRONG_CONSISTENCY_OPERATION_SET = new Set(STRONG_CONSISTENCY_OPERATION_IDS);
const REPRESENTATIVE_CACHE_OPERATION_SET = new Set(REPRESENTATIVE_CACHE_OPERATION_IDS);
const VERIFIED_READ_OPERATION_CONTRACTS = createVerifiedReadOperationContracts();
const HOMEPAGE_CACHE_OPERATION_ID = 'HOM-001';
const HOMEPAGE_CACHE_SECTION_IDS = Object.freeze(['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002']);

const PROFILE_FIELDS = Object.freeze({
  user: Object.freeze(['AD账号', '工号', '姓名', '手机号脱敏值', '邮箱脱敏值', '组织ID', '组织名称', '所属部门ID', '所属部门名称']),
  permissions: Object.freeze(['AD账号', '主体ID', '状态', '权限编码', '数据范围', '启用', '生效时间', '失效时间']),
  messages: Object.freeze(['消息ID', '接收人ID', '消息标题', '消息内容', '分类', '已读状态', '消息时间', '消息类型编码', '消息摘要', '优先级', '发送人ID', '目标类型', '目标ID', '目标路径', '过期时间', '阅读时间']),
  favorites: Object.freeze(['用户ID', '有效']),
  balance: Object.freeze(['用户ID', '当前总积分']),
  cumulativeStats: Object.freeze(['用户ID', '累计访问应用次数', '累计使用应用次数']),
  monthlyStats: Object.freeze(['用户ID', '年月', '当月使用次数']),
  useApplications: Object.freeze(['主键', '应用ID', '申请人ID', '状态', '申请时间', '申请编号', '提交时间', '完成时间']),
  onboardingApplications: Object.freeze(['申请单号', '关联应用ID', '应用类型ID', '申请人ID', '表单数据', '应用名称', '应用编码', '所属业务域ID', '摘要', '状态', '当前审批节点', '提交时间', '完成时间', '退回原因', '审批来源', '审批实例ID', '授权用户', '授权部门', '唯一标识', '最近同步时间']),
  reuseApplications: Object.freeze(['申请编号', '应用ID', '申请人ID', '本地状态', '提交时间', '完成时间']),
  apps: Object.freeze(['应用ID', '应用名称'])
});

function stableCacheValue(value) {
  if (Array.isArray(value)) return value.map(stableCacheValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableCacheValue(value[key])]));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const NORMALIZED_ASYNC_INPUT_OPERATIONS = new Set([
  'COM-001', 'COM-003', 'COM-004', 'COM-005',
  'APP-002', 'APP-003',
  'MAT-001', 'MAT-002', 'FAV-002', 'ADM-003',
  'WB-001', 'WB-002', 'WB-003'
]);

function validatedBusinessInput(operationId, input = {}) {
  const snapshot = stableCacheValue(input && typeof input === 'object' && !Array.isArray(input) ? input : input);
  // Every operation gets an immutable deep snapshot before any asynchronous
  // handoff. COM-004 additionally validates at this boundary because its two
  // public modes are the affected browser/worker contract. Other operations
  // retain their existing normalizers (some accept canonical equivalents that
  // are intentionally wider than the shared transport schema).
  if (operationId === 'COM-004') {
    const contract = VERIFIED_READ_OPERATION_CONTRACTS[operationId];
    if (contract?.requestSchema) {
      try {
        validateContractSchema(snapshot, contract.requestSchema, `${operationId} request`);
      } catch (error) {
        throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400, {
          operationId,
          schemaError: String(error?.message || error),
          retryable: false
        });
      }
    }
  }
  const businessInput = NORMALIZED_ASYNC_INPUT_OPERATIONS.has(operationId)
    ? normalizeReadInput(operationId, snapshot)
    : snapshot;
  return deepFreeze(businessInput);
}

function canonicalDictionaryBaselineHash(baseline) {
  if (!baseline || typeof baseline !== 'object') return '';
  const canonical = { ...baseline };
  delete canonical.sha256;
  return createHash('sha256').update(JSON.stringify(stableCacheValue(canonical))).digest('hex');
}

function fingerprint(value) {
  const source = value && typeof value === 'object'
    ? JSON.stringify(stableCacheValue(value))
    : String(value);
  return createHash('sha256').update(source).digest('hex').slice(0, 32);
}

function valueToText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('、');
  if (typeof value === 'object') return value.text || value.name || value.value || '';
  return String(value);
}

function isFormalDisplayName(value, identifiers = []) {
  const name = valueToText(value).trim();
  if (!name) return false;
  return !identifiers.map(identifier => valueToText(identifier).trim()).filter(Boolean).includes(name);
}

function isControlledTestApplicationRecord(record) {
  const fields = record?.fields || {};
  const identifiers = [fields['应用ID'], fields['应用名称'], fields['唯一标识']]
    .map(value => valueToText(value).trim())
    .filter(Boolean);
  return identifiers.some(value => /(?:^|[\s_（(])TEST(?:[_\-\s）)]|$)/i.test(value));
}

function isControlledTestPersonRecord(person = {}) {
  const identifiers = [person.userId, person.employeeNo]
    .map(value => valueToText(value).trim())
    .filter(Boolean);
  const displayName = valueToText(person.displayName).trim();
  return identifiers.some(value => /^(?:TEST(?:[_-]|$)|U00[1-5]$)/i.test(value))
    || /(?:^|[_\-\s])(TEST|测试|初始化)(?:[_\-\s]|$)/i.test(displayName)
    || ['张三丰', '王五', '赵六', '陈晓明'].includes(displayName) && identifiers.some(value => /^U00[1-5]$/i.test(value));
}

function isControlledTestDepartmentReference(id, name) {
  const normalizedId = valueToText(id).trim();
  const normalizedName = valueToText(name).trim();
  return /^(?:TEST(?:[_-]|$)|D00[1-5]$)/i.test(normalizedId)
    || /(?:^|[_\-\s])(TEST|测试|初始化)(?:[_\-\s]|$)/i.test(normalizedName)
    || normalizedId === 'D004' && normalizedName === '物资采购中心';
}

function isControlledTestApplicationProjection(item = {}) {
  return isControlledTestApplicationRecord({ fields: { 应用ID: item.appId, 应用名称: item.name } })
    || isControlledTestPersonRecord({ userId: item.ownerId, displayName: item.ownerName })
    || isControlledTestPersonRecord({ userId: item.developerId, displayName: item.developerName })
    || isControlledTestDepartmentReference(item.responsibleOrgId, item.responsibleOrgName)
    || isControlledTestDepartmentReference(item.developerOrgId, item.developerOrgName);
}

export function resolveFeishuReadBudgetMs(value) {
  const configured = Number(value ?? 35_000);
  return Number.isFinite(configured) && configured > 0 ? configured : 35_000;
}

// 用户字典以 AD账号 为唯一业务主键。用户ID仅用于兼容迁移前的历史记录；
// 其他业务表仍可保留“用户ID”等字段名，但其中的值必须是这个 AD 账号。
function userDictionaryAccount(fields = {}) {
  return valueToText(fields['AD账号']) || valueToText(fields['用户ID']);
}

function permissionSubjectIdentifier(fields = {}) {
  return valueToText(fields['AD账号']) || valueToText(fields['主体ID']) || valueToText(fields['用户ID']);
}

function personReferenceParts(value) {
  if (value == null) return { identifiers: [], names: [] };
  if (Array.isArray(value)) {
    return value.reduce((result, item) => {
      const parts = personReferenceParts(item);
      result.identifiers.push(...parts.identifiers);
      result.names.push(...parts.names);
      return result;
    }, { identifiers: [], names: [] });
  }
  if (typeof value !== 'object') {
    const text = String(value).trim();
    return { identifiers: text ? [text] : [], names: [] };
  }
  const identifiers = ['id', 'user_id', 'userId', 'open_id', 'openId', 'union_id', 'unionId', 'value']
    .map(key => valueToText(value[key]).trim())
    .filter(Boolean);
  const names = ['name', 'display_name', 'displayName', 'text']
    .map(key => valueToText(value[key]).trim())
    .filter(Boolean);
  return { identifiers: [...new Set(identifiers)], names: [...new Set(names)] };
}

function createUserDictionaryLookup(records, valueField, { fallbackToKey = false } = {}) {
  const result = new Map();
  const canonicalByAlias = new Map();
  for (const record of records || []) {
    const fields = record?.fields || {};
    const account = userDictionaryAccount(fields);
    const value = valueToText(fields[valueField]);
    const aliases = ['AD账号', '用户ID', '工号', '飞书用户ID', 'OpenID', '姓名']
      .flatMap(field => {
        const parts = personReferenceParts(fields[field]);
        return [...parts.identifiers, ...parts.names];
      });
    const canonical = account || aliases[0] || '';
    for (const alias of new Set([canonical, ...aliases].filter(Boolean))) {
      if (value || fallbackToKey) result.set(alias, value || canonical || alias);
      if (canonical) canonicalByAlias.set(alias, canonical);
    }
  }
  Object.defineProperty(result, 'canonicalByAlias', { value: canonicalByAlias });
  return result;
}

function resolvePersonProjection(lookup, values, context) {
  const parts = values.map(personReferenceParts).reduce((result, item) => {
    result.identifiers.push(...item.identifiers);
    result.names.push(...item.names);
    return result;
  }, { identifiers: [], names: [] });
  const aliases = [...new Set([...parts.identifiers, ...parts.names].filter(Boolean))];
  const canonical = aliases.map(alias => lookup?.canonicalByAlias?.get(alias)).find(Boolean) || '';
  const identifier = canonical || parts.identifiers[0] || '';
  const embeddedName = parts.names.find(name => isFormalDisplayName(name, [identifier, ...parts.identifiers])) || '';
  const lookupName = aliases.map(alias => valueToText(lookup?.get(alias)).trim())
    .find(name => isFormalDisplayName(name, [identifier])) || '';
  const name = embeddedName || lookupName || resolvePersonDisplayName(lookup, identifier || aliases[0], context);
  return { identifier, name };
}

const unresolvedPersonDiagnostics = new Set();
export function resolvePersonDisplayName(lookup, identifier, context = 'person') {
  const key = valueToText(identifier).trim();
  if (!key) return '';
  const resolved = valueToText(lookup?.get(key)).trim();
  if (resolved && resolved !== key) return resolved;
  const diagnosticKey = `${context}:${fingerprint(key)}`;
  if (!unresolvedPersonDiagnostics.has(diagnosticKey)) {
    unresolvedPersonDiagnostics.add(diagnosticKey);
    console.warn('[person-name-unresolved]', { context, identifierFingerprint: fingerprint(key) });
  }
  return '';
}

function valueToNumber(value) {
  const normalized = Number(String(valueToText(value)).replaceAll(',', '').trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

function valueToList(value) {
  if (Array.isArray(value)) return value.flatMap(valueToList).filter(Boolean);
  return valueToText(value).split(/[、,，;；|/]/).map(item => item.trim()).filter(Boolean);
}

function valueToBoolean(value) {
  const text = valueToText(value).trim().toLocaleLowerCase('zh-CN');
  return ['是', 'true', '1', 'yes', '置顶'].includes(text);
}

function valueToTimestamp(value) {
  const text = valueToText(value).trim();
  if (!text) return Number.NEGATIVE_INFINITY;
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text);
    return text.length === 10 ? numeric * 1_000 : numeric;
  }
  const parsed = Date.parse(text.replace(' ', 'T'));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function valueToJsonObject(value) {
  const text = valueToText(value).trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function createLookup(records, idFields, labelField, { fallbackToKey = true } = {}) {
  const lookup = new Map();
  for (const record of records) {
    const fields = record?.fields || {};
    const label = valueToText(fields[labelField]);
    for (const field of idFields) {
      const key = valueToText(fields[field]);
      if (key && (label || fallbackToKey)) lookup.set(key, label || key);
    }
  }
  return lookup;
}

const APP_ICON_BY_TYPE = Object.freeze({
  RPA: 'app-rpa', EAD: 'ead-logo', AI: 'app-ai', DATASET: 'app-dataset',
  '数据集': 'app-dataset', '指标': 'app-metric', '海能work应用': 'app-work',
  REPORT: 'app-report', '可视化报表': 'app-report', '报表': 'app-report',
  DASHBOARD: 'app-cockpit', '驾驶舱': 'app-cockpit', '大屏': 'app-screen'
});

const APP_ROUTE_BY_TYPE = Object.freeze({
  RPA: '/apps/rpa-001', EAD: '/apps/ead-001', AI: '/apps/ai-001', DATASET: '/apps/dataset-001',
  '数据集': '/apps/dataset-001', '指标': '/apps/metric-001', '海能work应用': '/apps/haineng-work-001',
  REPORT: '/apps/report-001', '可视化报表': '/apps/report-001', '报表': '/apps/report-001',
  DASHBOARD: '/apps/dashboard-001', '驾驶舱': '/apps/dashboard-001', '大屏': '/apps/dashboard-001'
});

const APP_DETAIL_COUNT_SOURCES = Object.freeze([
  Object.freeze({ tableName: '可视化驾驶舱详情', category: '可视化' }),
  Object.freeze({ tableName: '可视化报表详情', category: '报表' }),
  Object.freeze({ tableName: 'RPA应用详情', category: 'RPA' }),
  Object.freeze({ tableName: '数据集应用详情', category: '数据集' }),
  Object.freeze({ tableName: '指标应用详情', category: '指标' }),
  Object.freeze({ tableName: 'AI应用详情', category: 'AI' }),
  Object.freeze({ tableName: '海能work应用详情', category: '海能work应用' }),
  Object.freeze({ tableName: 'EAD应用详情', category: 'EAD' }),
  Object.freeze({ tableName: '工具应用详情', category: '其他工具' })
]);

function resolveAppPresentation(typeCode, typeName) {
  const value = `${typeCode} ${typeName}`;
  if (/RPA/i.test(value)) return { iconName: 'app-rpa', detailPath: '/apps/rpa-001' };
  if (/EAD/i.test(value)) return { iconName: 'ead-logo', detailPath: '/apps/ead-001' };
  if (/(?:AI|智能体)/i.test(value)) return { iconName: 'app-ai', detailPath: '/apps/ai-001' };
  if (/数据集/i.test(value)) return { iconName: 'app-dataset', detailPath: '/apps/dataset-001' };
  if (/指标/i.test(value)) return { iconName: 'app-metric', detailPath: '/apps/metric-001' };
  if (/(?:海能\s*work|协同办公)/i.test(value)) return { iconName: 'app-work', detailPath: '/apps/haineng-work-001' };
  if (/(?:驾驶舱|大屏)/i.test(value)) return { iconName: 'app-cockpit', detailPath: '/apps/dashboard-001' };
  if (/(?:报表|REPORT)/i.test(value)) return { iconName: 'app-report', detailPath: '/apps/report-001' };
  return {
    iconName: APP_ICON_BY_TYPE[typeCode] || APP_ICON_BY_TYPE[typeName] || 'tool-logo',
    detailPath: APP_ROUTE_BY_TYPE[typeCode] || APP_ROUTE_BY_TYPE[typeName] || '/apps/tool-001'
  };
}

function safeRecord(record, plan) {
  const fields = record?.fields && typeof record.fields === 'object' ? record.fields : {};
  return {
    id: String(record?.record_id || fields['主键'] || ''),
    label: valueToText(fields[plan.labelField]),
    type: valueToText(fields[plan.typeField]),
    count: 0
  };
}

function createSyncAbortController() {
  const controller = new AbortController();
  setMaxListeners(0, controller.signal);
  return controller;
}

export function resolveFeishuReadHandoffBudgetMs(value) {
  const configured = Number(value ?? 5_000);
  if (!Number.isFinite(configured) || configured <= 0) return 0;
  // Production's five-second browser SLO includes serialization and transport.
  // Tiny test budgets stay exact so deterministic unit tests remain practical.
  return configured >= 1_000 ? Math.min(configured, 4_500) : configured;
}

export function createFeishuReadOnlyService(options) {
  const { client, identifierContract } = options || {};
  if (!client || !identifierContract?.byName) throw new Error('只读服务缺少飞书客户端或标识契约');
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  const now = options.now || (() => new Date());
  const appProjectionCacheMs = options.appProjectionCacheMs ?? 30_000;
  const tableReadCacheMs = options.tableReadCacheMs ?? 60_000;
  const configuredColdMissBudgetMs = Number(options.coldMissBudgetMs ?? 0);
  const coldMissBudgetMs = resolveFeishuReadHandoffBudgetMs(configuredColdMissBudgetMs);
  const readNow = options.readNow || Date.now;
  const cacheNow = options.cacheNow || Date.now;
  const readSleep = options.readSleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const persistentCache = options.persistentCache || null;
  const maxSyncConcurrency = Math.max(1, Math.min(3, Number(options.maxSyncConcurrency ?? 3) || 3));
  const backgroundRefreshIntervalMs = Math.max(1_000, Number(options.backgroundRefreshIntervalMs ?? 15_000) || 15_000);
  const syncJobRetentionMs = Math.max(600_000, Number(options.syncJobRetentionMs ?? 600_000) || 600_000);
  const syncRetryAttempts = Math.max(1, Math.min(3, Number(options.syncRetryAttempts ?? 3) || 3));
  const syncRetryBackoffMs = Math.max(1, Math.min(1_000, Number(options.syncRetryBackoffMs ?? 500) || 500));
  const syncTaskTimeoutMs = Math.max(1, Math.min(25_000, Number(options.syncTaskTimeoutMs ?? 25_000) || 25_000));
  const configuredReadBudgetMs = resolveFeishuReadBudgetMs(options.readBudgetMs ?? process.env.FEISHU_READ_BUDGET_MS);
  // A legacy deployment value below the approved task deadline caused a page
  // read to fail around 13 seconds and spend the remaining task budget on a
  // doomed retry. Explicit test overrides remain exact; production/env values
  // can no longer undercut the 25-second background task budget.
  const readBudgetMs = options.readBudgetMs == null
    ? Math.max(configuredReadBudgetMs, syncTaskTimeoutMs)
    : configuredReadBudgetMs;
  const minimumRetryRunwayMs = Math.min(10_000, Math.max(10, Math.floor(syncTaskTimeoutMs * 0.4)));
  const taskStatusAuthorizationBudgetMs = Math.max(1, Math.min(4_500, Number(options.statusAuthorizationBudgetMs ?? 4_000) || 4_000));
  const taskStatusAuthorizationContinuationMs = Math.max(
    2_000,
    Math.min(10_000, Number(options.statusAuthorizationContinuationMs ?? 6_000) || 6_000)
  );
  const realtimeAuthorization = options.realtimeAuthorization !== false;
  const eventLogger = typeof options.eventLogger === 'function' ? options.eventLogger : null;
  const formalDictionaryBaseline = options.formalDictionaryBaseline && typeof options.formalDictionaryBaseline === 'object'
    ? structuredClone(options.formalDictionaryBaseline)
    : null;
  const formalDictionaryBaselineRequired = options.formalDictionaryBaselineRequired === true;
  const emitCacheEvent = (event, fields = {}) => eventLogger?.(Object.freeze({
    event,
    traceId: fields.traceId || null,
    syncId: fields.syncId || null,
    keyDigest: fields.keyDigest || null,
    operationId: fields.operationId || null,
    attempt: Number(fields.attempt || 0),
    page: Number(fields.page || 0),
    queueMs: Number(fields.queueMs || 0),
    budgetMs: Number(fields.budgetMs || syncTaskTimeoutMs),
    commit: fields.commit || null,
    transition: fields.transition || null,
    resource: fields.resource ? String(fields.resource).slice(0, 120) : null,
    errorCode: fields.errorCode ? String(fields.errorCode).slice(0, 120) : null,
    upstreamPath: fields.upstreamPath ? String(fields.upstreamPath).slice(0, 240) : null,
    elapsedMs: Math.max(0, Number(fields.elapsedMs || 0))
  }));
  const tableDependencyScope = new AsyncLocalStorage();
  const strongReadScope = new AsyncLocalStorage();
  const syncTaskScope = new AsyncLocalStorage();
  const sharedReadBatchScope = new AsyncLocalStorage();
  const authorizationReadScope = new AsyncLocalStorage();
  const verifiedAuthorizationContexts = new WeakSet();
  const authorizationRequests = new WeakMap();
  const authorizationRequestsByIdentity = new Map();
  const taskStatusAuthorizationContinuations = new Map();
  const trustedSystemContexts = new WeakSet();
  let activeSyncs = 0;
  let activeOrdinarySyncs = 0;
  const ordinarySyncLimit = maxSyncConcurrency > 1 ? maxSyncConcurrency - 1 : 1;
  const syncQueue = [];
  const prioritySyncQueue = [];
  const authorizationSyncQueue = [];
  const fileAccessService = options.fileAccessService;
  const allowedAppLaunchHosts = new Set((Array.isArray(options.allowedAppLaunchHosts)
    ? options.allowedAppLaunchHosts
    : String(options.allowedAppLaunchHosts || '').split(','))
    .map(item => String(item).trim().toLocaleLowerCase('en-US')).filter(Boolean));
  let appProjectionCache = null;
  let appProjectionExpiresAt = 0;
  let appProjectionPending = null;
  let appProjectionPendingEpoch = -1;
  let appDetailCountCache = null;
  let appDetailCountExpiresAt = 0;
  let appDetailCountPending = null;
  let appDetailCountPendingEpoch = -1;
  const appDetailCountSourceCache = new Map();
  const appDetailCountSourcePending = new Map();
  const appDetailCountSourcePendingEpoch = new Map();
  let announcementProjectionCache = null;
  let announcementProjectionExpiresAt = 0;
  let announcementProjectionPending = null;
  let announcementProjectionPendingEpoch = -1;
  const talentProjectionCache = new Map();
  const talentProjectionPending = new Map();
  const talentProjectionPendingEpoch = new Map();
  let contactProjectionCache = null;
  let contactProjectionExpiresAt = 0;
  let contactProjectionPending = null;
  let contactProjectionPendingEpoch = -1;
  const dictionaryProjectionCache = new Map();
  const dictionaryProjectionPending = new Map();
  const dictionaryProjectionPendingEpoch = new Map();
  const tableReadCache = new Map();
  const tableReadCacheMaxEntries = Math.max(1, Number(options.tableReadCacheMaxEntries ?? 512));
  const tableReadCacheMaxBytes = Math.max(1_024, Number(options.tableReadCacheMaxBytes ?? 128 * 1024 * 1024));
  let tableReadCacheBytes = 0;
  const tableReadPending = new Map();
  const operationCache = new Map();
  const operationCacheStaging = new Map();
  const operationPending = new Map();
  let operationCacheStagingBytes = 0;
  let cacheInvalidationEpoch = 0;
  const tableInvalidationVersions = new Map();
  const syncJobs = new Map();
  const syncByRequest = new Map();
  const syncPromiseStates = new WeakMap();
  const startupPrewarmTenantKey = valueToText(options.prewarmTenantKey || '__startup-prewarm__');
  let boundPrewarmTenantKey = options.prewarmTenantKey ? startupPrewarmTenantKey : '';

  function taskAttemptBudget(state = syncTaskScope.getStore()) {
    if (!state) return null;
    if (!state.attemptBudget) {
      state.attemptBudget = { used: 0, max: syncRetryAttempts };
    }
    return state.attemptBudget;
  }

  function claimTaskAttempt(state = syncTaskScope.getStore()) {
    const budget = taskAttemptBudget(state);
    if (!budget) return null;
    if (budget.used >= budget.max) {
      throw new FeishuProxyError('READ_SYNC_ATTEMPTS_EXHAUSTED', '数据同步重试次数已用尽', 504);
    }
    budget.used += 1;
    state.attempt = budget.used;
    return budget.used;
  }

  function syncDeadlineError() {
    return new FeishuProxyError(
      'READ_SYNC_DEADLINE_EXCEEDED',
      '数据同步超时',
      504,
      { retryAfterSeconds: 2 }
    );
  }

  function failTimedRead(timeoutError, state = syncTaskScope.getStore()) {
    const error = timeoutError();
    if (error?.code === 'READ_SYNC_DEADLINE_EXCEEDED' && state) {
      state.cancelled = true;
      state.controller?.abort(error);
    }
    return error;
  }

  function syncStateExpired(state = syncTaskScope.getStore()) {
    if (!state) return false;
    return state.cancelled === true
      || state.signal?.aborted === true
      || (Number.isFinite(state.deadlineAt) && readNow() >= state.deadlineAt);
  }

  function assertSyncTaskActive(state = syncTaskScope.getStore()) {
    if (!syncStateExpired(state)) return;
    if (state) state.cancelled = true;
    throw syncDeadlineError();
  }

  function hasSyncRetryRunway(state = syncTaskScope.getStore(), backoffMs = 0) {
    if (!state || !Number.isFinite(state.deadlineAt)) return true;
    return state.deadlineAt - readNow() > Math.max(0, Number(backoffMs) || 0) + minimumRetryRunwayMs;
  }

  function syncRequestOptions() {
    const state = syncTaskScope.getStore();
    return state?.signal ? { signal: state.signal } : {};
  }

  async function sleepWithinSync(milliseconds) {
    const state = syncTaskScope.getStore();
    assertSyncTaskActive(state);
    if (!state?.signal) return readSleep(milliseconds);
    let abortHandler;
    try {
      await Promise.race([
        readSleep(milliseconds),
        new Promise((_, reject) => {
          abortHandler = () => reject(syncDeadlineError());
          state.signal.addEventListener('abort', abortHandler, { once: true });
        })
      ]);
    } finally {
      if (abortHandler) state.signal.removeEventListener('abort', abortHandler);
    }
    assertSyncTaskActive(state);
  }

  function runWithSyncSlot(task) {
    const taskState = syncTaskScope.getStore();
    const authorization = authorizationReadScope.getStore() === true;
    const priority = !authorization && sharedReadBatchScope.getStore()?.priority === true;
    const queuedAt = readNow();
    return new Promise((resolve, reject) => {
      let started = false;
      let settled = false;
      let queuedAbortHandler;
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const canRun = () => activeSyncs < maxSyncConcurrency
        && (authorization || activeOrdinarySyncs < ordinarySyncLimit);
      const drainQueues = () => {
        while (authorizationSyncQueue.length && activeSyncs < maxSyncConcurrency) {
          authorizationSyncQueue.shift()?.();
        }
        while (activeSyncs < maxSyncConcurrency && activeOrdinarySyncs < ordinarySyncLimit) {
          const next = prioritySyncQueue.shift() || syncQueue.shift();
          if (!next) break;
          next();
        }
      };
      const run = () => {
        if (started || settled) return;
        started = true;
        emitCacheEvent('feishu-read-slot', {
          ...taskState,
          queueMs: Math.max(0, readNow() - queuedAt),
          transition: 'running'
        });
        if (queuedAbortHandler) taskState.signal.removeEventListener('abort', queuedAbortHandler);
        if (syncStateExpired(taskState)) {
          settle(reject, syncDeadlineError());
          drainQueues();
          return;
        }
        activeSyncs += 1;
        if (!authorization) activeOrdinarySyncs += 1;
        let abortHandler;
        const execution = Promise.resolve().then(() => syncTaskScope.run(taskState, () => {
          assertSyncTaskActive(taskState);
          return task();
        }));
        trackSyncWork(taskState, execution);
        abortHandler = taskState?.signal
          ? () => settle(reject, syncDeadlineError())
          : null;
        if (abortHandler) taskState.signal.addEventListener('abort', abortHandler, { once: true });
        execution.then(
          value => settle(resolve, value),
          error => settle(reject, error)
        ).finally(() => {
          if (abortHandler) taskState.signal.removeEventListener('abort', abortHandler);
          activeSyncs -= 1;
          if (!authorization) activeOrdinarySyncs -= 1;
          drainQueues();
        });
      };
      if (canRun()) run();
      else {
        const queue = authorization ? authorizationSyncQueue : priority ? prioritySyncQueue : syncQueue;
        queue.push(run);
        if (taskState?.signal) {
          queuedAbortHandler = () => {
            const index = queue.indexOf(run);
            if (index >= 0) queue.splice(index, 1);
            settle(reject, syncDeadlineError());
          };
          if (taskState.signal.aborted) queuedAbortHandler();
          else taskState.signal.addEventListener('abort', queuedAbortHandler, { once: true });
        }
      }
    });
  }

  function trackSyncWork(state, promise) {
    if (!state || !promise || typeof promise.then !== 'function') return promise;
    if (!state.inflightWork) state.inflightWork = new Set();
    state.inflightWork.add(promise);
    const release = () => state.inflightWork?.delete(promise);
    promise.then(release, release);
    return promise;
  }

  async function drainSyncWork(state) {
    if (!state?.inflightWork) return;
    while (state.inflightWork.size) {
      await Promise.allSettled([...state.inflightWork]);
    }
  }

  function createAttemptState(parentState) {
    if (!parentState) return null;
    const controller = createSyncAbortController();
    const state = {
      ...parentState,
      controller,
      signal: controller.signal,
      cancelled: false,
      inflightWork: new Set()
    };
    const abort = () => {
      state.cancelled = true;
      controller.abort(parentState.signal?.reason || syncDeadlineError());
    };
    if (parentState.signal?.aborted) abort();
    else parentState.signal?.addEventListener('abort', abort, { once: true });
    return { state, abort, detach: () => parentState.signal?.removeEventListener('abort', abort) };
  }

  async function settleAttempt(attemptScope, error = null) {
    if (!attemptScope) return;
    if (error && !attemptScope.state.signal.aborted) {
      attemptScope.state.cancelled = true;
      attemptScope.state.controller.abort(error);
    }
    await drainSyncWork(attemptScope.state);
    attemptScope.detach();
  }

  function runWithSharedReadBatch(factory, { priority = false } = {}) {
    if (sharedReadBatchScope.getStore()) return factory();
    return sharedReadBatchScope.run({ promises: new Map(), priority: priority === true }, factory);
  }

  function sharedBatchPromise(key, factory) {
    const batch = sharedReadBatchScope.getStore();
    if (!batch) return factory();
    const normalizedKey = String(key || '');
    const current = batch.promises.get(normalizedKey);
    if (current) return current;
    const request = Promise.resolve().then(factory);
    batch.promises.set(normalizedKey, request);
    return request;
  }

  function noteTableDependency(tableName) {
    const normalized = String(tableName || '');
    if (!normalized) return;
    const tracker = tableDependencyScope.getStore();
    if (!tracker) return;
    if (tracker instanceof Set) {
      tracker.add(normalized);
      return;
    }
    tracker.names?.add(normalized);
    if (tracker.versions instanceof Map && !tracker.versions.has(normalized)) {
      tracker.versions.set(normalized, tableInvalidationVersions.get(normalized) || 0);
    }
  }

  function dependencyTracker() {
    return { names: new Set(), versions: new Map() };
  }

  function dependenciesChanged(tracker) {
    if (!tracker?.versions) return false;
    for (const [tableName, version] of tracker.versions) {
      if ((tableInvalidationVersions.get(tableName) || 0) !== version) return true;
    }
    return false;
  }

  function syncTaskCancelled() {
    return syncStateExpired();
  }

  function syncOwner(context) {
    const identity = context?.identity || {};
    return fingerprint({
      tenantKey: valueToText(identity.tenantKey || identity.tenantId),
      principalId: normalizeReadPrincipal(context)
    });
  }

  function syncAuthorizationFingerprint(context) {
    const identity = context?.identity || {};
    const verified = context?.verifiedAuthorization || null;
    const normalizedSet = value => [...new Set(valueToList(value).map(item => valueToText(item).trim()).filter(Boolean))].sort();
    return fingerprint({
      tenantKey: valueToText(identity.tenantKey || identity.tenantId).trim(),
      principalId: normalizeReadPrincipal(context) || valueToText(verified?.userId).trim(),
      permissions: normalizedSet(verified?.permissions ?? identity.permissions),
      dataScope: normalizedSet(verified?.dataScope ?? identity.dataScope)
    });
  }

  function canonicalSyncAuthorizationFingerprint(context) {
    if (!realtimeAuthorization
        || trustedSystemContexts.has(context)
        || verifiedAuthorizationContexts.has(context)
        || context?.verifiedAuthorization) {
      return syncAuthorizationFingerprint(context);
    }
    return '';
  }

  function cleanupSyncJobs() {
    const timestamp = cacheNow();
    for (const [id, job] of syncJobs) {
      if (!job.finishedAt || timestamp - job.finishedAt <= syncJobRetentionMs) continue;
      if (job.state !== 'expired') {
        job.state = 'expired';
        job.expiredAt = timestamp;
        job.updatedAt = timestamp;
        job.error = {
          code: 'SYNC_JOB_EXPIRED', message: '同步任务状态已过期', status: 410, retryable: false
        };
        for (const alias of job.aliases || [job.key]) {
          if (syncByRequest.get(alias) === job) syncByRequest.delete(alias);
        }
        continue;
      }
      if (timestamp - Number(job.expiredAt || timestamp) <= syncJobRetentionMs) continue;
      syncJobs.delete(id);
    }
  }

  function syncFailure(error) {
    return {
      code: String(error?.code || 'READ_SYNC_FAILED'),
      message: error instanceof FeishuProxyError ? error.message : '数据同步失败',
      status: Number(error?.status || 500),
      retryable: false
    };
  }

  function releaseActiveSyncJob(job) {
    for (const alias of job.aliases || [job.key]) {
      if (syncByRequest.get(alias) === job) syncByRequest.delete(alias);
    }
  }

  function trackSync(key, operationId, context, promise) {
    const authorizationFingerprint = canonicalSyncAuthorizationFingerprint(context);
    const scopedKey = `${syncOwner(context)}:${authorizationFingerprint}:${key}`;
    const existing = syncByRequest.get(scopedKey);
    if (existing?.state === 'running') return existing;
    cleanupSyncJobs();
    const taskState = syncPromiseStates.get(promise);
    const job = {
      id: taskState?.syncId || `read-${randomUUID()}`,
      traceId: valueToText(taskState?.traceId || traceIdFactory()) || `trace-${randomUUID()}`,
      key: scopedKey,
      aliases: new Set([scopedKey]),
      owner: syncOwner(context),
      authorizationFingerprint,
      operationId,
      state: 'running',
      createdAt: cacheNow(),
      updatedAt: cacheNow()
    };
    syncJobs.set(job.id, job);
    syncByRequest.set(scopedKey, job);
    emitCacheEvent('sync-transition', { traceId: job.traceId, syncId: job.id, keyDigest: fingerprint(key), operationId, transition: 'running' });
    promise.then(result => { job.result = result; job.state = 'completed'; job.updatedAt = cacheNow(); releaseActiveSyncJob(job); }, error => {
      job.error = syncFailure(error);
      job.state = 'failed';
      job.updatedAt = cacheNow();
      releaseActiveSyncJob(job);
    }).finally(() => {
      job.finishedAt = cacheNow();
      emitCacheEvent('sync-transition', { traceId: job.traceId, syncId: job.id, keyDigest: fingerprint(key), operationId, transition: job.state });
    });
    return job;
  }

  function trackEndToEndSync(operationId, input, context, promise, authorizationFingerprintProvider, authorizedContextProvider, taskState) {
    const resolvedAuthorizationFingerprint = valueToText(authorizationFingerprintProvider?.());
    const resolvedAuthorizedContext = authorizedContextProvider?.();
    const rawIdentity = context?.identity || {};
    const rawScope = {
      tenantKey: valueToText(rawIdentity.tenantKey || rawIdentity.tenantId),
      userId: valueToText(rawIdentity.userId),
      openId: valueToText(rawIdentity.openId),
      adAccount: valueToText(rawIdentity.adAccount),
      permissions: Array.isArray(rawIdentity.permissions) ? [...rawIdentity.permissions].map(String).sort() : [],
      dataScope: valueToList(rawIdentity.dataScope || rawIdentity.departmentId || '').map(String).sort(),
      operationId,
      input: normalizeReadInput(operationId, input || {})
    };
    const provisionalKey = `request-pending-auth:${syncOwner(context)}:${fingerprint(rawScope)}`;
    const canonicalKey = resolvedAuthorizationFingerprint && resolvedAuthorizedContext
      ? `request:${createReadIsolationKey(operationId, input, resolvedAuthorizedContext)}`
      : '';
    const scopedKey = canonicalKey || provisionalKey;
    let existing = canonicalKey ? syncByRequest.get(canonicalKey) : null;
    if (!existing) {
      const provisional = syncByRequest.get(provisionalKey);
      const provisionalAuthorization = valueToText(
        provisional?.authorizationFingerprint || provisional?.authorizationFingerprintProvider?.()
      );
      if (!canonicalKey || !provisionalAuthorization || provisionalAuthorization === resolvedAuthorizationFingerprint) {
        existing = provisional;
      }
    }
    if (existing?.state === 'running') {
      if (canonicalKey) {
        existing.authorizationFingerprint ||= resolvedAuthorizationFingerprint;
        existing.aliases?.add(canonicalKey);
        syncByRequest.set(canonicalKey, existing);
      }
      promise.catch(() => {});
      return existing;
    }
    cleanupSyncJobs();
    const job = {
      id: taskState?.syncId || `read-${randomUUID()}`,
      traceId: valueToText(taskState?.traceId || traceIdFactory()) || `trace-${randomUUID()}`,
      key: scopedKey,
      aliases: new Set([scopedKey, provisionalKey].filter(Boolean)),
      owner: syncOwner(context),
      authorizationFingerprint: resolvedAuthorizationFingerprint,
      authorizationFingerprintProvider,
      operationId,
      state: 'running',
      createdAt: cacheNow(),
      updatedAt: cacheNow()
    };
    syncJobs.set(job.id, job);
    for (const alias of job.aliases) syncByRequest.set(alias, job);
    emitCacheEvent('sync-transition', { traceId: job.traceId, syncId: job.id, keyDigest: fingerprint(scopedKey), operationId, transition: 'running' });
    promise.then(result => {
      job.authorizationFingerprint = valueToText(authorizationFingerprintProvider?.()) || job.authorizationFingerprint;
      const resolvedContext = authorizedContextProvider?.() || null;
      const resolvedKey = resolvedContext
        ? `request:${createReadIsolationKey(operationId, input, resolvedContext)}`
        : '';
      if (resolvedKey) {
        job.aliases.add(resolvedKey);
        syncByRequest.set(resolvedKey, job);
      }
      job.result = result;
      job.state = 'completed';
      job.updatedAt = cacheNow();
      releaseActiveSyncJob(job);
    }, error => {
      job.authorizationFingerprint = valueToText(authorizationFingerprintProvider?.()) || job.authorizationFingerprint;
      job.error = syncFailure(error);
      job.state = 'failed';
      job.updatedAt = cacheNow();
      releaseActiveSyncJob(job);
    }).finally(() => {
      job.finishedAt = cacheNow();
      emitCacheEvent('sync-transition', { traceId: job.traceId, syncId: job.id, keyDigest: fingerprint(scopedKey), operationId, transition: job.state });
    });
    return job;
  }

  async function getReadSyncStatus(id, context = {}) {
    requireIdentity(context);
    cleanupSyncJobs();
    const job = syncJobs.get(id);
    if (!job) throw new FeishuProxyError('SYNC_JOB_NOT_FOUND', '同步任务已过期', 404);
    if (job.owner !== syncOwner(context)) throw new FeishuProxyError('SYNC_JOB_FORBIDDEN', '无权查看该同步任务', 403);
    const statusAuthorization = await authorizeTaskStatus(job.operationId, context, job.id);
    const authorizedContext = statusAuthorization.context;
    const expectedAuthorization = job.authorizationFingerprint
      || valueToText(job.authorizationFingerprintProvider?.());
    if (!statusAuthorization.deferred && !statusAuthorization.error) {
      const currentAuthorization = syncAuthorizationFingerprint(authorizedContext);
      if (expectedAuthorization && expectedAuthorization !== currentAuthorization) {
        throw new FeishuProxyError('SYNC_JOB_FORBIDDEN', '当前权限或数据范围已变化，不能查看该同步任务', 403);
      }
      // Ordinary tenant reads can hand off before a verified authorization
      // projection exists. Bind once after the first successful live check;
      // every later poll still detects a genuine permission/scope change.
      if (!expectedAuthorization) job.authorizationFingerprint = currentAuthorization;
    }
    // A transient authorization refresh must not rewrite an already terminal
    // task to running.  Ownership was bound to the same stable principal when
    // the task was created; a non-transient permission mismatch still fails
    // above with 403.
    const authorizationPending = statusAuthorization.deferred || Boolean(statusAuthorization.error);
    const state = job.state;
    if (['completed', 'failed', 'expired'].includes(state)) {
      job.reportedTerminalState = state;
    }
    return {
      code: 'OK',
      syncId: job.id,
      operationId: job.operationId,
      state,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(job.updatedAt || job.finishedAt || job.createdAt).toISOString(),
      traceId: job.traceId,
      ...(['queued', 'running'].includes(state) ? { pollAfterMs: 2_000 } : {}),
      ...(state === 'completed' && job.result ? { result: job.result } : {}),
      ...(['failed', 'expired'].includes(state) && job.error ? { error: { ...job.error, retryable: false } } : {})
    };
  }
  const uncachedOperationPending = new Map();
  const operationCachePolicies = Object.freeze({ ...READ_OPERATION_CACHE_POLICIES, ...(options.operationCachePolicies || {}) });
  const contactDirectoryCachePolicy = Object.freeze({ code: 'C-U30-DIR', freshMs: 30_000, staleMs: 300_000, scope: 'user' });

  function operationPolicy(operationId, input = {}) {
    if (operationId === 'COM-004') {
      return input?.includeContact === true ? null : contactDirectoryCachePolicy;
    }
    return operationCachePolicies[operationId] || null;
  }
  const operationCacheMaxEntries = Math.max(1, Number(options.operationCacheMaxEntries ?? 1_000));
  const operationCacheMaxBytes = Math.max(1_024, Number(options.operationCacheMaxBytes ?? 128 * 1024 * 1024));
  let operationCacheBytes = 0;
  let operationCacheVersion = 0;
  let persistedOperationCacheVersion = -1;
  let persistedOperationCacheKeys = new Set();
  let persistedCommittedOperationCacheKeys = new Set();
  let persistedCandidateOperationCacheKeys = new Set();
  let attemptedCommittedOperationCacheKeys = new Set();
  let attemptedCandidateOperationCacheKeys = new Set();
  let persistentCommit = null;
  const persistentCommitCoalesceMs = Math.max(0, Math.min(25, Number(options.persistentCommitCoalesceMs ?? 5) || 0));
  const performanceMetrics = {
    requests: 0,
    freshHits: 0,
    staleHits: 0,
    misses: 0,
    refreshes: 0,
    refreshFailures: 0,
    refreshRetries: 0,
    deadlineFailures: 0,
    staleFallbacks: 0,
    inflightDedupeHits: 0
  };

  function resolveTable(tableName) {
    const table = identifierContract.byName.get(tableName);
    if (!table) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', `飞书表标识契约缺失：${tableName}`, 503);
    return table;
  }

  function readBudgetError(startedAt) {
    return new FeishuProxyError('FEISHU_READ_BUDGET_EXCEEDED', '飞书读取响应超时', 504, {
      upstreamPath: '/bitable/v1/apps/{base}/tables/{tableId}/records',
      elapsedMs: Math.max(0, Number(readNow()) - Number(startedAt))
    });
  }

  function normalizedFieldNames(fieldNames) {
    return [...new Set((Array.isArray(fieldNames) ? fieldNames : []).map(valueToText).filter(Boolean))];
  }

  function tableReadKey(tableName, fieldNames) {
    const fields = normalizedFieldNames(fieldNames).slice().sort((left, right) => left.localeCompare(right, 'zh-CN'));
    return `${tableName}\u0000${fields.join('\u0001')}`;
  }

  function tableRequestedFields(tableName, fieldNames) {
    const requested = normalizedFieldNames(fieldNames);
    return requested.length ? requested : resolveTable(tableName).fields.map(field => field.name);
  }

  function fieldsCover(available, requested) {
    return requested.every(fieldName => available.has(fieldName));
  }

  function tableReadResourceKey(tableName, filter = '') {
    return filter ? `${tableName}\u0000${fingerprint(filter)}` : tableName;
  }

  function tableCacheEntrySize(rows) {
    try {
      return Buffer.byteLength(JSON.stringify(rows || []), 'utf8');
    } catch {
      return 1_024;
    }
  }

  function deleteTableReadCacheEntry(key) {
    const entry = tableReadCache.get(key);
    if (!entry) return false;
    tableReadCacheBytes = Math.max(0, tableReadCacheBytes - Number(entry.byteSize || 0));
    return tableReadCache.delete(key);
  }

  function getTableReadCacheEntry(key) {
    const entry = tableReadCache.get(key);
    if (!entry) return null;
    tableReadCache.delete(key);
    tableReadCache.set(key, entry);
    return entry;
  }

  function setTableReadCacheEntry(key, entry) {
    deleteTableReadCacheEntry(key);
    const sizedEntry = { ...entry, byteSize: tableCacheEntrySize(entry.rows) };
    tableReadCache.set(key, sizedEntry);
    tableReadCacheBytes += sizedEntry.byteSize;
    while (tableReadCache.size > tableReadCacheMaxEntries || tableReadCacheBytes > tableReadCacheMaxBytes) {
      const oldestKey = tableReadCache.keys().next().value;
      if (oldestKey == null) break;
      deleteTableReadCacheEntry(oldestKey);
    }
  }

  function equalityFilter(tableName, fieldName, value) {
    const table = resolveTable(tableName);
    if (!table.fields.some(field => field.name === fieldName)) {
      throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', `飞书筛选字段契约缺失：${tableName}.${fieldName}`, 503);
    }
    const escaped = valueToText(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    return `CurrentValue.[${fieldName}] = "${escaped}"`;
  }

  function identityFilter(tableName, fieldNames, value) {
    const available = new Set(resolveTable(tableName).fields.map(field => field.name));
    const clauses = fieldNames.filter(fieldName => available.has(fieldName)).map(fieldName => equalityFilter(tableName, fieldName, value));
    if (!clauses.length) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', `飞书身份筛选字段契约缺失：${tableName}`, 503);
    return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;
  }

  function isFieldContractDrift(error) {
    return error?.code === 'FEISHU_RECORDS_FAILED' && Number(error?.upstreamCode) === 1254045;
  }

  async function readAllUncached(tableName, fieldNames = [], { filter = '' } = {}) {
    assertSyncTaskActive();
    noteTableDependency(tableName);
    const table = resolveTable(tableName);
    const requestedFields = normalizedFieldNames(fieldNames);
    const items = [];
    let pageToken = '';
    let readWithoutProjection = false;
    const readPageWithinBudget = async (query, startedAt) => {
      const deadline = startedAt + readBudgetMs;
      const taskDeadline = syncTaskScope.getStore()?.deadlineAt;
      const effectiveDeadline = Number.isFinite(taskDeadline) ? Math.min(deadline, taskDeadline) : deadline;
      const remaining = effectiveDeadline - readNow();
      const timeoutError = Number.isFinite(taskDeadline) && taskDeadline <= deadline
        ? syncDeadlineError
        : () => readBudgetError(startedAt);
      if (remaining <= 0) throw failTimedRead(timeoutError);
      let timer;
      try {
        return await Promise.race([
          runWithSyncSlot(() => client.listRecords(table.tableId, query, syncRequestOptions())),
          new Promise((_, reject) => { timer = setTimeout(() => reject(failTimedRead(timeoutError)), remaining); })
        ]);
      } finally {
        clearTimeout(timer);
      }
    };
    for (let page = 1; page <= 100; page += 1) {
      assertSyncTaskActive();
      emitCacheEvent('feishu-read-page', { ...syncTaskScope.getStore(), page, resource: tableName, transition: 'request' });
      let result;
      for (let projectionAttempt = 0; projectionAttempt < 2; projectionAttempt += 1) {
        assertSyncTaskActive();
        const attemptStartedAt = readNow();
        try {
          result = await readPageWithinBudget({
            viewId: table.views[0]?.viewId,
            pageSize: 100,
            pageToken,
            filter,
            fieldNames: readWithoutProjection ? [] : requestedFields.length ? requestedFields : table.fields.map(field => field.name)
          }, attemptStartedAt);
          break;
        } catch (error) {
          if (isFieldContractDrift(error) && !readWithoutProjection) {
            readWithoutProjection = true;
            continue;
          }
          emitCacheEvent('feishu-read-page', {
            ...syncTaskScope.getStore(),
            page,
            resource: tableName,
            errorCode: error?.code || error?.cause?.code || 'FEISHU_READ_FAILED',
            upstreamPath: error?.upstreamPath,
            elapsedMs: Math.max(0, readNow() - attemptStartedAt),
            transition: 'failed'
          });
          error.prewarmResource ??= tableName;
          error.upstreamPath ??= '/bitable/v1/apps/{base}/tables/{tableId}/records';
          error.attempt ??= syncTaskScope.getStore()?.attempt;
          // Upstream retries are owned by the operation-level controller so
          // the whole operation observes exactly three attempts and the
          // approved 500/1000 ms backoff. This loop only handles one field
          // projection compatibility retry.
          throw error;
        }
      }
      assertSyncTaskActive();
      items.push(...result.items);
      emitCacheEvent('feishu-read-page', {
        ...syncTaskScope.getStore(),
        page,
        resource: tableName,
        transition: 'completed'
      });
      if (!result.hasMore || !result.nextPageToken) return items;
      pageToken = result.nextPageToken;
    }
    throw new FeishuProxyError('REMOTE_PAGINATION_LIMIT', `飞书表记录超过受控读取上限：${tableName}`, 503);
  }

  function createTableReadBatch(tableName, requestedFields, filter = '') {
    const resourceKey = tableReadResourceKey(tableName, filter);
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    let resolveRequest;
    let rejectRequest;
    const batch = {
      started: false,
      epoch: startedInvalidationEpoch,
      fields: new Set(requestedFields),
      promise: new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      })
    };
    tableReadPending.set(resourceKey, batch);
    queueMicrotask(async () => {
      batch.started = true;
      const cached = getTableReadCacheEntry(resourceKey);
      if (cached && readNow() < cached.expiresAt) {
        for (const fieldName of cached.fields) batch.fields.add(fieldName);
      }
      const mergedFields = [...batch.fields];
      try {
        const rows = await readAllUncached(tableName, mergedFields, { filter });
        if (tableReadCacheMs > 0 && startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
          setTableReadCacheEntry(resourceKey, {
            rows,
            fields: new Set(mergedFields),
            expiresAt: readNow() + tableReadCacheMs
          });
        }
        resolveRequest(rows);
      } catch (error) {
        rejectRequest(error);
      } finally {
        if (tableReadPending.get(resourceKey) === batch) tableReadPending.delete(resourceKey);
      }
    });
    return batch;
  }

  function readAll(tableName, fieldNames = [], { filter = '' } = {}) {
    noteTableDependency(tableName);
    const requestedFields = tableRequestedFields(tableName, fieldNames);
    if (strongReadScope.getStore() === true) return readAllUncached(tableName, requestedFields, { filter });
    const resourceKey = tableReadResourceKey(tableName, filter);
    const cached = getTableReadCacheEntry(resourceKey);
    if (cached && readNow() < cached.expiresAt && fieldsCover(cached.fields, requestedFields)) {
      return Promise.resolve(cached.rows);
    }
    const pending = tableReadPending.get(resourceKey);
    if (pending?.epoch === cacheInvalidationEpoch) {
      if (!pending.started) {
        requestedFields.forEach(fieldName => pending.fields.add(fieldName));
        return pending.promise;
      }
      if (fieldsCover(pending.fields, requestedFields)) return pending.promise;
      return pending.promise.then(() => readAll(tableName, requestedFields, { filter }));
    }
    return createTableReadBatch(tableName, requestedFields, filter).promise;
  }

  async function readPage(tableName, { page = 1, pageSize = 10, fieldNames = [] } = {}) {
    assertSyncTaskActive();
    noteTableDependency(tableName);
    const table = resolveTable(tableName);
    const startedAt = readNow();
    const deadline = startedAt + readBudgetMs;
    let pageToken = '';
    let result;
    let readWithoutProjection = false;
    for (let currentPage = 1; currentPage <= page; currentPage += 1) {
      assertSyncTaskActive();
      const taskDeadline = syncTaskScope.getStore()?.deadlineAt;
      const effectiveDeadline = Number.isFinite(taskDeadline) ? Math.min(deadline, taskDeadline) : deadline;
      const remaining = effectiveDeadline - readNow();
      const timeoutError = Number.isFinite(taskDeadline) && taskDeadline <= deadline
        ? syncDeadlineError
        : () => readBudgetError(startedAt);
      if (remaining <= 0) throw failTimedRead(timeoutError);
      let timer;
      try {
        const query = { viewId: table.views[0]?.viewId, pageSize, pageToken, fieldNames: readWithoutProjection ? [] : fieldNames };
        try {
          result = await Promise.race([
            runWithSyncSlot(() => client.listRecords(table.tableId, query, syncRequestOptions())),
            new Promise((_, reject) => { timer = setTimeout(() => reject(failTimedRead(timeoutError)), remaining); })
          ]);
        } catch (error) {
          if (!isFieldContractDrift(error) || readWithoutProjection) throw error;
          readWithoutProjection = true;
          assertSyncTaskActive();
          result = await Promise.race([
            runWithSyncSlot(() => client.listRecords(table.tableId, { ...query, fieldNames: [] }, syncRequestOptions())),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(failTimedRead(timeoutError)), Math.max(0, effectiveDeadline - readNow()));
            })
          ]);
        }
      } finally {
        clearTimeout(timer);
      }
      assertSyncTaskActive();
      if (currentPage < page) {
        if (!result.hasMore || !result.nextPageToken) break;
        pageToken = result.nextPageToken;
      }
    }
    return result || { items: [], total: 0, hasMore: false, nextPageToken: '' };
  }

  function getDictionaryProjection(tableName, fieldNames = []) {
    noteTableDependency(tableName);
    if (strongReadScope.getStore() === true) return readAll(tableName, fieldNames);
    const timestamp = Date.now();
    const key = tableReadKey(tableName, fieldNames);
    const cached = dictionaryProjectionCache.get(key);
    if (cached && timestamp < cached.expiresAt) return Promise.resolve(cached.rows);
    const pending = dictionaryProjectionPending.get(key);
    if (pending && dictionaryProjectionPendingEpoch.get(key) === cacheInvalidationEpoch) return pending;
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    const projection = readAll(tableName, fieldNames).then(rows => {
      if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
        dictionaryProjectionCache.set(key, { rows, expiresAt: Date.now() + appProjectionCacheMs });
      }
      return rows;
    }).finally(() => {
      if (dictionaryProjectionPending.get(key) === projection) {
        dictionaryProjectionPending.delete(key);
        dictionaryProjectionPendingEpoch.delete(key);
      }
    });
    dictionaryProjectionPending.set(key, projection);
    dictionaryProjectionPendingEpoch.set(key, startedInvalidationEpoch);
    return projection;
  }

  async function readAppProjection() {
    const [typeRows, userRows, departmentRows, domainRows, sceneRows, appRows] = await Promise.all([
      getDictionaryProjection('应用类型配置'), getDictionaryProjection('用户字典', PROFILE_FIELDS.user), getDictionaryProjection('部门字典'),
      getDictionaryProjection('业务域字典'), getDictionaryProjection('场景字典'), readAll('应用索引')
    ]);
    const typeLookup = createLookup(typeRows, ['类型ID', '类型编码', '类型名称'], '类型名称');
    const userLookup = createUserDictionaryLookup(userRows, '姓名');
    const departmentLookup = createLookup(departmentRows, ['部门ID', '部门名称'], '部门名称');
    const domainLookup = createLookup(domainRows, ['业务域ID', '业务域名称'], '业务域名称');
    const sceneLookup = createLookup(sceneRows, ['场景ID', '场景名称'], '场景名称');
    const projectionCandidates = appRows.filter(record => {
      if (!isControlledTestApplicationRecord(record)) return true;
      emitCacheEvent('app-record-quarantined', {
        ...syncTaskScope.getStore(),
        resource: fingerprint({
          recordId: record?.record_id || '',
          appId: valueToText(record?.fields?.['应用ID'])
        }),
        errorCode: 'CONTROLLED_TEST_RECORD',
        transition: 'filtered'
      });
      return false;
    });
    const quarantined = [];
    const items = projectionCandidates.map(record => {
      const fields = record?.fields || {};
      const typeCode = valueToText(fields['应用类型']);
      const typeName = typeLookup.get(typeCode) || typeCode || '其他应用';
      const subtype = valueToText(fields['子类型']);
      const domainId = valueToText(fields['所属业务域ID']);
      const sceneIds = valueToList(fields['所属场景ID']);
      const ownerProjection = resolvePersonProjection(userLookup, [fields['负责人ID'], fields['申请人AD账号']], 'application.owner');
      const developerProjection = resolvePersonProjection(userLookup, [fields['开发者ID'], fields['接入人AD账号']], 'application.developer');
      const ownerId = ownerProjection.identifier;
      const developerId = developerProjection.identifier;
      const responsibleOrgId = valueToText(fields['所属部门ID']);
      const developerOrgId = valueToText(fields['开发部门ID']) || valueToText(fields['接入人所属部门ID']);
      const presentation = resolveAppPresentation(typeCode, typeName);
      const ownerName = ownerProjection.name;
      const developerName = developerProjection.name;
      const responsibleOrgName = valueToText(departmentLookup.get(responsibleOrgId)).trim();
      const developerOrgName = valueToText(departmentLookup.get(developerOrgId)).trim();
      const unresolved = [
        [ownerId, ownerName, 'ownerName'],
        [developerId, developerName, 'developerName'],
        [responsibleOrgId, responsibleOrgName, 'responsibleOrgName'],
        [developerOrgId, developerOrgName, 'developerOrgName']
      ].filter(([identifier, name]) => identifier && (!name || name === identifier));
      if (unresolved.length) {
        quarantined.push({
          recordFingerprint: fingerprint({
            recordId: record?.record_id || '',
            appId: valueToText(fields['应用ID'])
          }),
          fields: unresolved.map(([, , field]) => field)
        });
        emitCacheEvent('app-record-quarantined', {
          ...syncTaskScope.getStore(),
          resource: quarantined.at(-1).recordFingerprint,
          errorCode: 'NAME_PROJECTION_INCOMPLETE',
          transition: 'quarantined'
        });
        return null;
      }
      const item = {
        id: String(record?.record_id || valueToText(fields['主键']) || valueToText(fields['应用ID'])),
        appId: valueToText(fields['应用ID']) || String(record?.record_id || ''),
        name: valueToText(fields['应用名称']),
        typeCode,
        typeName,
        categoryCode: subtype || typeCode,
        categoryName: subtype || typeName,
        domainId,
        domainName: domainLookup.get(domainId) || domainId,
        sceneIds,
        sceneNames: sceneIds.map(id => sceneLookup.get(id) || id),
        keywords: valueToList(fields['应用关键字']),
        summary: valueToText(fields['应用简介']),
        status: valueToText(fields['状态']),
        usageCount: valueToNumber(fields['使用次数']),
        favoriteCount: valueToNumber(fields['收藏数']),
        ownerId,
        ownerName,
        developerId,
        developerName,
        responsibleOrgId,
        responsibleOrgName,
        developerOrgId,
        developerOrgName,
        versionName: valueToText(fields['当前结构版本']),
        updatedAt: valueToText(fields['最近更新日期']),
        iconName: presentation.iconName,
        detailPath: presentation.detailPath
      };
      if (isControlledTestApplicationProjection(item)) {
        emitCacheEvent('app-record-quarantined', {
          ...syncTaskScope.getStore(),
          resource: fingerprint({ recordId: record?.record_id || '', appId: item.appId }),
          errorCode: 'CONTROLLED_TEST_RECORD',
          transition: 'quarantined'
        });
        return null;
      }
      return item;
    }).filter(item => item?.id && item.name);
    if (projectionCandidates.length > 0 && items.length === 0) {
      throw new FeishuProxyError('NAME_PROJECTION_INCOMPLETE', '全部正式应用记录的人员或部门名称均未完成投影', 422, {
        quarantinedCount: quarantined.length,
        fields: [...new Set(quarantined.flatMap(item => item.fields))],
        retryable: false
      });
    }
    return { items, typeRows, typeLookup, domainLookup, sceneLookup };
  }

  async function getAppProjection() {
    ['应用索引', '应用类型配置', '用户字典', '部门字典', '业务域字典', '场景字典'].forEach(noteTableDependency);
    if (strongReadScope.getStore() === true) return readAppProjection();
    const timestamp = Date.now();
    if (appProjectionCache && timestamp < appProjectionExpiresAt) return appProjectionCache;
    if (appProjectionPending && appProjectionPendingEpoch === cacheInvalidationEpoch) return appProjectionPending;
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    const projection = readAppProjection().then(result => {
      if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
        appProjectionCache = result;
        appProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      }
      return result;
    }).finally(() => {
      if (appProjectionPending === projection) {
        appProjectionPending = null;
        appProjectionPendingEpoch = -1;
      }
    });
    appProjectionPending = projection;
    appProjectionPendingEpoch = startedInvalidationEpoch;
    return projection;
  }

  async function getAppDetailCounts() {
    APP_DETAIL_COUNT_SOURCES.forEach(source => noteTableDependency(source.tableName));
    const readCount = async source => {
      const result = await readPage(source.tableName, { page: 1, pageSize: 10, fieldNames: [] });
      const total = Number(result?.total);
      return { ...source, count: Number.isFinite(total) && total >= 0 ? Math.trunc(total) : (result?.items || []).length };
    };
    if (strongReadScope.getStore() === true) return Promise.all(APP_DETAIL_COUNT_SOURCES.map(readCount));
    const readCountCached = source => {
      const key = source.tableName;
      const timestamp = Date.now();
      const cached = appDetailCountSourceCache.get(key);
      if (cached && timestamp < cached.expiresAt) return Promise.resolve(cached.value);
      const pending = appDetailCountSourcePending.get(key);
      if (pending && appDetailCountSourcePendingEpoch.get(key) === cacheInvalidationEpoch) return pending;
      const startedInvalidationEpoch = cacheInvalidationEpoch;
      const request = readCount(source).then(value => {
        if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
          appDetailCountSourceCache.set(key, { value, expiresAt: Date.now() + appProjectionCacheMs });
        }
        return value;
      }).finally(() => {
        if (appDetailCountSourcePending.get(key) === request) {
          appDetailCountSourcePending.delete(key);
          appDetailCountSourcePendingEpoch.delete(key);
        }
      });
      appDetailCountSourcePending.set(key, request);
      appDetailCountSourcePendingEpoch.set(key, startedInvalidationEpoch);
      return request;
    };
    const timestamp = Date.now();
    if (appDetailCountCache && timestamp < appDetailCountExpiresAt) return appDetailCountCache;
    if (appDetailCountPending && appDetailCountPendingEpoch === cacheInvalidationEpoch) return appDetailCountPending;
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    const projection = (async () => {
      const result = [];
      let firstError = null;
      // Do not enqueue all nine detail tables ahead of homepage/application
      // projection work. One count read at a time leaves the second ordinary
      // slot available to another operation while the third slot remains
      // reserved for real-time authorization.
      for (const source of APP_DETAIL_COUNT_SOURCES) {
        try {
          result.push(await readCountCached(source));
        } catch (error) {
          firstError ||= error;
        }
      }
      if (firstError) throw firstError;
      return result;
    })().then(result => {
      if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
        appDetailCountCache = result;
        appDetailCountExpiresAt = Date.now() + appProjectionCacheMs;
      }
      return result;
    }).finally(() => {
      if (appDetailCountPending === projection) {
        appDetailCountPending = null;
        appDetailCountPendingEpoch = -1;
      }
    });
    appDetailCountPending = projection;
    appDetailCountPendingEpoch = startedInvalidationEpoch;
    return projection;
  }

  async function readAnnouncementProjection() {
    const rows = await readAll('公告通知');
    const items = rows.map(record => {
      const fields = record?.fields || {};
      const recordId = String(record?.record_id || '');
      const announcementId = valueToText(fields['公告ID']) || recordId;
      return {
        id: recordId || announcementId,
        announcementId,
        title: valueToText(fields['公告标题']),
        category: valueToText(fields['分类']),
        summary: valueToText(fields['公告正文']).slice(0, 2048),
        status: valueToText(fields['状态']),
        pinned: valueToBoolean(fields['是否置顶']),
        publishedAt: valueToText(fields['发布时间'])
      };
    }).filter(item => item.id && item.title);
    return { items };
  }

  async function getAnnouncementProjection() {
    noteTableDependency('公告通知');
    if (strongReadScope.getStore() === true) return readAnnouncementProjection();
    const timestamp = Date.now();
    if (announcementProjectionCache && timestamp < announcementProjectionExpiresAt) return announcementProjectionCache;
    if (announcementProjectionPending && announcementProjectionPendingEpoch === cacheInvalidationEpoch) return announcementProjectionPending;
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    const projection = readAnnouncementProjection().then(result => {
      if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
        announcementProjectionCache = result;
        announcementProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      }
      return result;
    }).finally(() => {
      if (announcementProjectionPending === projection) {
        announcementProjectionPending = null;
        announcementProjectionPendingEpoch = -1;
      }
    });
    announcementProjectionPending = projection;
    announcementProjectionPendingEpoch = startedInvalidationEpoch;
    return projection;
  }

  function getTalentProjection(kind, reader) {
    const dependencies = {
      people: ['人才库', '用户字典', '部门字典'],
      projects: ['人才项目', '用户字典'],
      progress: ['项目进度', '人才项目', '用户字典']
    }[kind] || [];
    dependencies.forEach(noteTableDependency);
    if (strongReadScope.getStore() === true) return reader();
    const timestamp = Date.now();
    const cached = talentProjectionCache.get(kind);
    if (cached && timestamp < cached.expiresAt) return Promise.resolve(cached.value);
    const pending = talentProjectionPending.get(kind);
    if (pending && talentProjectionPendingEpoch.get(kind) === cacheInvalidationEpoch) return pending;
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    const projection = reader().then(value => {
      if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
        talentProjectionCache.set(kind, { value, expiresAt: Date.now() + appProjectionCacheMs });
      }
      return value;
    }).finally(() => {
      if (talentProjectionPending.get(kind) === projection) {
        talentProjectionPending.delete(kind);
        talentProjectionPendingEpoch.delete(kind);
      }
    });
    talentProjectionPending.set(kind, projection);
    talentProjectionPendingEpoch.set(kind, startedInvalidationEpoch);
    return projection;
  }

  async function readTalentPeopleProjection() {
    const [personRows, userRows, departmentRows] = await Promise.all([
      readAll('人才库'), getDictionaryProjection('用户字典'), getDictionaryProjection('部门字典')
    ]);
    const userLookup = createUserDictionaryLookup(userRows, '姓名');
    const employeeLookup = createUserDictionaryLookup(userRows, '工号', { fallbackToKey: false });
    const userDepartmentLookup = createUserDictionaryLookup(userRows, '所属部门ID');
    const departmentLookup = createLookup(departmentRows, ['部门ID', '部门名称'], '部门名称');
    const people = personRows.map(record => {
      const fields = record?.fields || {};
      const userId = valueToText(fields['用户ID']);
      const departmentId = userDepartmentLookup.get(userId) || '';
      const talentId = valueToText(fields['主键']) || String(record?.record_id || '');
      return {
        id: String(record?.record_id || talentId), talentId, userId,
        name: resolvePersonDisplayName(userLookup, userId, 'talent.person'), employeeNo: employeeLookup.get(userId) || '',
        type: valueToText(fields['人才类型']), level: valueToText(fields['人才等级']),
        specialties: valueToList(fields['擅长领域']), status: valueToText(fields['状态']),
        departmentId, departmentName: departmentLookup.get(departmentId) || departmentId
      };
    }).filter(item => item.id && item.userId);
    return { people };
  }

  function getTalentPeopleProjection() {
    return getTalentProjection('people', readTalentPeopleProjection);
  }

  async function readTalentProjectsProjection() {
    const [projectRows, userRows] = await Promise.all([
      readAll('人才项目'), getDictionaryProjection('用户字典')
    ]);
    const userLookup = createUserDictionaryLookup(userRows, '姓名');
    const projects = projectRows.map(record => {
      const fields = record?.fields || {};
      const ownerId = valueToText(fields['负责人ID']);
      const projectId = valueToText(fields['主键']) || String(record?.record_id || '');
      return {
        id: String(record?.record_id || projectId), projectId, name: valueToText(fields['项目名称']),
        type: valueToText(fields['项目类型']), ownerId, ownerName: resolvePersonDisplayName(userLookup, ownerId, 'talent.project.owner'),
        status: valueToText(fields['状态']), startDate: valueToText(fields['开始日期']), endDate: valueToText(fields['结束日期'])
      };
    }).filter(item => item.id && item.name);
    return { projects };
  }

  function getTalentProjectsProjection() {
    return getTalentProjection('projects', readTalentProjectsProjection);
  }

  async function readTalentProgressProjection() {
    const [progressRows, projectProjection] = await Promise.all([
      readAll('项目进度'), getTalentProjectsProjection()
    ]);
    const projectLookup = new Map(projectProjection.projects.map(project => [project.projectId, project.name]));
    const progress = progressRows.map(record => {
      const fields = record?.fields || {};
      const projectId = valueToText(fields['项目ID']);
      const progressId = valueToText(fields['主键']) || String(record?.record_id || '');
      return {
        id: String(record?.record_id || progressId), progressId, projectId,
        projectName: projectLookup.get(projectId) || projectId, phaseName: valueToText(fields['阶段名称']),
        status: valueToText(fields['状态']), updatedAt: valueToText(fields['更新时间'])
      };
    }).filter(item => item.id && item.projectId);
    return { progress };
  }

  function getTalentProgressProjection() {
    return getTalentProjection('progress', readTalentProgressProjection);
  }

  async function readContactPage(readPage) {
    const items = [];
    let pageToken = '';
    for (let page = 1; page <= 100; page += 1) {
      assertSyncTaskActive();
      const result = await runWithSyncSlot(() => readPage(pageToken, syncRequestOptions()));
      assertSyncTaskActive();
      items.push(...result.items);
      if (!result.hasMore || !result.nextPageToken) break;
      pageToken = result.nextPageToken;
      if (page === 100) throw new FeishuProxyError('CONTACT_PAGINATION_LIMIT', '通讯录分页超过安全上限', 502);
    }
    return items;
  }

  async function readContactProjection() {
    if (!client.listDepartmentChildren || !client.listUsersByDepartment) {
      throw new FeishuProxyError('CONTACT_CLIENT_UNAVAILABLE', '飞书通讯录客户端未配置', 503);
    }
    const departments = [];
    let frontier = [{ id: '0', depth: 0 }];
    const seenDepartments = new Set(['0']);
    while (frontier.length) {
      assertSyncTaskActive();
      const levels = await Promise.all(frontier.map(async parent => ({
        parent,
        children: await readContactPage((pageToken, requestOptions) => client.listDepartmentChildren(parent.id, {
          pageSize: 50, pageToken, userIdType: 'user_id', departmentIdType: 'open_department_id'
        }, requestOptions))
      })));
      const nextFrontier = [];
      for (const { parent, children } of levels) {
        for (const item of children) {
          const id = valueToText(item.open_department_id || item.department_id);
          if (!id || seenDepartments.has(id)) continue;
          seenDepartments.add(id);
          const department = {
            id, code: valueToText(item.department_id), name: valueToText(item.name), parentId: valueToText(item.parent_department_id) || parent.id,
            depth: parent.depth + 1, memberCount: valueToNumber(item.member_count),
            enabled: item.status?.is_deleted !== true
          };
          departments.push(department);
          nextFrontier.push({ id, depth: department.depth });
        }
      }
      frontier = nextFrontier;
    }
    const departmentNameById = new Map(departments.map(item => [item.id, item.name]));
    const departmentById = new Map(departments.map(item => [item.id, item]));
    const departmentPath = departmentId => {
      const path = [];
      const seen = new Set();
      let current = departmentById.get(departmentId);
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        path.unshift(current);
        current = departmentById.get(current.parentId);
      }
      return path;
    };
    const usersById = new Map();
    const usersByDepartment = await Promise.all(['0', ...departments.map(item => item.id)].map(async departmentId => ({
      departmentId,
      users: await readContactPage((pageToken, requestOptions) => client.listUsersByDepartment(departmentId, {
        pageSize: 50, pageToken, userIdType: 'user_id', departmentIdType: 'open_department_id'
      }, requestOptions))
    })));
    for (const { departmentId, users } of usersByDepartment) {
      assertSyncTaskActive();
      for (const item of users) {
        const userId = valueToText(item.user_id || item.open_id);
        if (!userId) continue;
        const departmentIds = Array.isArray(item.department_ids) ? item.department_ids.map(valueToText).filter(Boolean) : [];
        const primaryDepartmentId = departmentIds[0] || departmentId;
        const path = departmentPath(primaryDepartmentId);
        const organization = path[0] || departmentById.get(primaryDepartmentId);
        usersById.set(userId, {
          userId, employeeNo: valueToText(item.employee_no), displayName: valueToText(item.name),
          avatarUrl: valueToText(item.avatar?.avatar_72 || item.avatar?.avatar_240), orgId: organization?.id || primaryDepartmentId,
          orgName: organization?.name || departmentNameById.get(primaryDepartmentId) || '', departmentId: primaryDepartmentId,
          departmentName: departmentNameById.get(primaryDepartmentId) || '', officeId: '', officeName: '',
          title: valueToText(item.job_title),
          mobile: valueToText(item.mobile), email: valueToText(item.enterprise_email || item.email),
          mobileMasked: '', emailMasked: '',
          enabled: item.status?.is_resigned !== true && item.status?.is_exited !== true && item.status?.is_frozen !== true
        });
      }
    }
    return { departments, users: [...usersById.values()] };
  }

  async function getContactProjection() {
    if (strongReadScope.getStore() === true) return readContactProjection();
    const timestamp = Date.now();
    if (contactProjectionCache && timestamp < contactProjectionExpiresAt) return contactProjectionCache;
    if (contactProjectionPending && contactProjectionPendingEpoch === cacheInvalidationEpoch) return contactProjectionPending;
    const startedInvalidationEpoch = cacheInvalidationEpoch;
    const projection = readContactProjection().then(result => {
      if (startedInvalidationEpoch === cacheInvalidationEpoch && !syncTaskCancelled()) {
        contactProjectionCache = result;
        contactProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      }
      return result;
    }).finally(() => {
      if (contactProjectionPending === projection) {
        contactProjectionPending = null;
        contactProjectionPendingEpoch = -1;
      }
    });
    contactProjectionPending = projection;
    contactProjectionPendingEpoch = startedInvalidationEpoch;
    return projection;
  }

  function buildOrganizationTree(departments, rootId = '0', maxDepth = 20) {
    const byParent = new Map();
    const byId = new Map(departments.map(item => [item.id, item]));
    for (const item of departments) {
      if (!byParent.has(item.parentId)) byParent.set(item.parentId, []);
      byParent.get(item.parentId).push(item);
    }
    const resolvePath = item => {
      const path = [];
      const seen = new Set();
      let current = item;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        path.unshift(current);
        current = byId.get(current.parentId);
      }
      return path;
    };
    const visit = (parentId, depth) => (byParent.get(parentId) || [])
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
      .map((item, index) => {
        const path = resolvePath(item);
        const children = depth < maxDepth ? visit(item.id, depth + 1) : [];
        return {
          orgId: item.id, orgCode: item.code, orgName: item.name, orgType: 'DEPARTMENT', parentId: item.parentId,
          pathIds: path.map(node => node.id), pathNames: path.map(node => node.name), level: item.depth,
          sortOrder: index, enabled: item.enabled, hasChildren: children.length > 0,
          userCount: item.memberCount, children
        };
      });
    return visit(rootId, 1);
  }

  async function readAuthorizedDirectoryProjection(requestContext) {
    const { identity } = requireIdentity(requestContext);
    if (typeof client.getContactUser !== 'function'
        || typeof client.listUsersByDepartment !== 'function'
        || typeof client.getContactDepartment !== 'function') {
      throw new FeishuProxyError('CONTACT_CLIENT_UNAVAILABLE', '飞书通讯录客户端未配置', 503);
    }
    const lookupUserId = valueToText(identity.userId || identity.adAccount);
    const current = await runWithSyncSlot(() => client.getContactUser(lookupUserId, syncRequestOptions()));
    assertSyncTaskActive();
    const departmentIds = [...new Set((current.departmentIds || []).map(valueToText).filter(Boolean))].slice(0, 8);
    if (!departmentIds.length) {
      throw new FeishuProxyError('CONTACT_DEPARTMENT_UNAVAILABLE', '当前飞书用户未关联可读取部门', 422, { retryable: false });
    }
    const departments = [];
    const departmentNames = new Map();
    for (const departmentId of departmentIds) {
      assertSyncTaskActive();
      const department = await runWithSyncSlot(() => client.getContactDepartment(departmentId, syncRequestOptions()));
      const item = {
        id: valueToText(department.id) || departmentId,
        code: valueToText(department.code),
        name: valueToText(department.name),
        parentId: valueToText(department.parentId) || '0',
        depth: 1,
        memberCount: valueToNumber(department.memberCount),
        enabled: department.enabled !== false
      };
      if (!item.enabled || !isFormalDisplayName(item.name, [item.id, item.code])
          || isControlledTestDepartmentReference(item.id, item.name)) continue;
      departments.push(item);
      departmentNames.set(item.id, item.name);
      departmentNames.set(departmentId, item.name);
    }
    if (!departments.length) {
      throw new FeishuProxyError('NAME_PROJECTION_INCOMPLETE', '当前飞书部门名称未完成投影', 422, { retryable: false });
    }
    const usersById = new Map();
    for (const department of departments) {
      let pageToken = '';
      for (let pageNumber = 0; pageNumber < 4 && usersById.size < 400; pageNumber += 1) {
        assertSyncTaskActive();
        const response = await runWithSyncSlot(() => client.listUsersByDepartment(department.id, {
          pageSize: 50,
          pageToken,
          userIdType: 'user_id',
          departmentIdType: 'open_department_id'
        }, syncRequestOptions()));
        for (const source of response.items || []) {
          const userId = valueToText(source.user_id || source.userId || source.open_id);
          const sourceDepartmentIds = (source.department_ids || source.departmentIds || []).map(valueToText).filter(Boolean);
          const departmentId = sourceDepartmentIds.find(id => departmentNames.has(id)) || department.id;
          const item = {
            userId,
            employeeNo: valueToText(source.employee_no || source.employeeNo),
            displayName: valueToText(source.name || source.displayName),
            avatarUrl: valueToText(source.avatar?.avatar_72 || source.avatarUrl),
            orgId: departmentId,
            orgName: departmentNames.get(departmentId) || department.name,
            departmentId,
            departmentName: departmentNames.get(departmentId) || department.name,
            officeId: '',
            officeName: '',
            title: valueToText(source.job_title || source.title),
            mobile: null,
            email: null,
            mobileMasked: null,
            emailMasked: null,
            enabled: source.status?.is_resigned !== true && source.status?.is_exited !== true && source.status?.is_frozen !== true
          };
          if (item.userId && item.enabled && !isControlledTestPersonRecord(item)
              && isFormalDisplayName(item.displayName, [item.userId, item.employeeNo])) {
            usersById.set(item.userId, item);
          }
        }
        if (!response.hasMore || !response.nextPageToken) break;
        pageToken = response.nextPageToken;
      }
    }
    const primaryDepartment = departments[0];
    const currentItem = {
      userId: valueToText(current.userId) || lookupUserId,
      employeeNo: valueToText(current.employeeNo),
      displayName: valueToText(current.displayName),
      avatarUrl: valueToText(current.avatarUrl),
      orgId: primaryDepartment.id,
      orgName: primaryDepartment.name,
      departmentId: primaryDepartment.id,
      departmentName: primaryDepartment.name,
      officeId: '',
      officeName: '',
      title: valueToText(current.title),
      mobile: null,
      email: null,
      mobileMasked: null,
      emailMasked: null,
      enabled: current.enabled !== false
    };
    if (currentItem.enabled && !isControlledTestPersonRecord(currentItem)
        && isFormalDisplayName(currentItem.displayName, [currentItem.userId, currentItem.employeeNo])) {
      usersById.set(currentItem.userId, currentItem);
    }
    const users = [...usersById.values()];
    for (const department of departments) {
      department.memberCount = users.filter(item => item.departmentId === department.id).length;
    }
    return { departments, users };
  }

  async function executeContact(operationId, input, requestContext) {
    if (operationId === 'COM-004' && input.includeContact === true) {
      assertAllowedInput(input, ['userId', 'includeContact', 'page', 'pageSize', 'sort']);
      const { identity, userId } = requireIdentity(requestContext);
      const targetUserId = valueToText(input.userId).trim();
      if (!targetUserId || input.includeContact !== true) {
        throw new FeishuProxyError('INVALID_OPERATION_INPUT', '当前用户联系方式查询必须提供 userId 且 includeContact=true', 400);
      }
      if (targetUserId !== userId) {
        throw new FeishuProxyError('CONTACT_SELF_ONLY', '只能查询当前授权用户的联系方式', 403);
      }
      const page = input.page == null ? 1 : Number(input.page);
      const pageSize = input.pageSize == null ? 10 : Number(input.pageSize);
      const sort = input.sort || 'name,asc';
      if (!Number.isInteger(page) || page < 1 || page > 100 || ![10, 20, 50, 100].includes(pageSize) || sort !== 'name,asc') {
        throw new FeishuProxyError('INVALID_OPERATION_INPUT', '当前用户联系方式查询分页或排序参数不受支持', 400);
      }
      if (typeof client.getContactUser !== 'function') {
        throw new FeishuProxyError('CONTACT_PERMISSION_REQUIRED', '飞书应用缺少当前用户联系方式权限', 403);
      }
      let contact;
      try {
        contact = await runWithSyncSlot(() => client.getContactUser(valueToText(identity.userId) || userId, syncRequestOptions()));
      } catch (error) {
        if ([401, 403].includes(Number(error?.status || 0))) {
          throw new FeishuProxyError('CONTACT_PERMISSION_REQUIRED', '飞书应用缺少当前用户联系方式权限', 403);
        }
        throw error;
      }
      if (contact?.contactFieldsVisible !== true) {
        throw new FeishuProxyError('CONTACT_PERMISSION_REQUIRED', '飞书应用缺少当前用户联系方式权限', 403);
      }
      const userFilter = identityFilter('用户字典', ['AD账号', '用户ID'], userId);
      const userRows = await readAll('用户字典', PROFILE_FIELDS.user, { filter: userFilter });
      const userFields = userRows.find(record => userDictionaryAccount(record?.fields || {}) === userId)?.fields || {};
      const departmentId = valueToText(userFields['所属部门ID']) || valueToText(identity.departmentId) || valueToText(contact.departmentIds?.[0]);
      const existingDepartmentName = valueToText(userFields['所属部门名称']) || valueToText(identity.departmentName);
      const departmentRows = departmentId && !existingDepartmentName
        ? await readAll('部门字典', [], { filter: identityFilter('部门字典', ['部门ID', '主键'], departmentId) })
        : [];
      const departmentFields = departmentRows.find(record => {
        const fields = record?.fields || {};
        return [valueToText(fields['部门ID']), valueToText(fields['主键'])].includes(departmentId);
      })?.fields || {};
      const departmentName = valueToText(userFields['所属部门名称']) || valueToText(departmentFields['部门名称']) || valueToText(identity.departmentName);
      const orgId = valueToText(userFields['组织ID']) || valueToText(identity.orgId) || departmentId;
      const orgName = valueToText(userFields['组织名称']) || valueToText(identity.orgName) || departmentName;
      const item = {
        userId,
        employeeNo: valueToText(contact.employeeNo) || valueToText(userFields['工号']) || valueToText(identity.employeeNo),
        displayName: valueToText(contact.displayName) || valueToText(userFields['姓名']) || valueToText(identity.displayName),
        avatarUrl: valueToText(contact.avatarUrl) || valueToText(identity.avatarUrl),
        orgId,
        orgName,
        departmentId,
        departmentName,
        officeId: '',
        officeName: '',
        title: valueToText(contact.title),
        mobile: contact.mobile == null || contact.mobile === '' ? null : valueToText(contact.mobile),
        email: contact.email == null || contact.email === '' ? null : valueToText(contact.email),
        mobileMasked: valueToText(userFields['手机号脱敏值']),
        emailMasked: valueToText(userFields['邮箱脱敏值']),
        enabled: contact.enabled !== false
      };
      if (!isFormalDisplayName(item.displayName, [userId, identity.userId, identity.openId, identity.adAccount])) {
        throw new FeishuProxyError('NAME_PROJECTION_INCOMPLETE', '当前用户正式姓名未完成投影', 422, { retryable: false });
      }
      if (departmentId && !isFormalDisplayName(departmentName, [departmentId])) {
        throw new FeishuProxyError('NAME_PROJECTION_INCOMPLETE', '当前用户部门名称未完成投影', 422, { retryable: false });
      }
      return {
        items: [item], total: 1, page: 1, pageSize: 10, totalPages: 1,
        hasPrevious: false, hasNext: false, hasMore: false, sort: 'name,asc',
        filtersApplied: { userId }, source: 'FEISHU_CONTACT_V3_SELF'
      };
    }
    const projection = operationId === 'COM-004'
      ? await readAuthorizedDirectoryProjection(requestContext)
      : await getContactProjection();
    if (operationId === 'COM-003') {
      const allowedKeys = ['rootId', 'keyword', 'orgType', 'enabled', 'includeUsers', 'maxDepth'];
      if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
      const maxDepth = input.maxDepth == null ? 20 : Number(input.maxDepth);
      if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 20) throw new FeishuProxyError('INVALID_MAX_DEPTH', '组织树深度必须是 1 至 20', 400);
      const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      const filtered = projection.departments.filter(item =>
        (input.enabled == null || item.enabled === input.enabled) && (!keyword || item.name.toLocaleLowerCase('zh-CN').includes(keyword))
      );
      if (input.orgType && input.orgType !== 'DEPARTMENT') {
        return { items: [], includeUsers: Boolean(input.includeUsers), userCount: 0, total: 0, source: 'FEISHU_CONTACT_V3' };
      }
      return {
        items: buildOrganizationTree(filtered, valueToText(input.rootId) || '0', maxDepth),
        includeUsers: Boolean(input.includeUsers),
        userCount: input.includeUsers ? projection.users.filter(item => item.enabled).length : 0,
        total: filtered.length, source: 'FEISHU_CONTACT_V3'
      };
    }
    const allowedKeys = ['keyword', 'userId', 'employeeNo', 'orgId', 'departmentId', 'enabled', 'includeContact', 'page', 'pageSize', 'sort'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const pageSize = input.pageSize == null ? 10 : Number(input.pageSize);
    const page = input.page == null ? 1 : Number(input.page);
    if (![10, 20, 50, 100].includes(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    if (!Number.isInteger(page) || page < 1 || page > 100) throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    const selectedUserId = valueToText(input.userId);
    const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
    let rows = projection.users.filter(item =>
      (!keyword || [item.displayName, item.employeeNo, item.departmentName, item.title].join(' ').toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!selectedUserId || item.userId === selectedUserId) &&
      (!input.employeeNo || item.employeeNo === input.employeeNo) &&
      (!input.orgId || item.orgId === input.orgId) && (!input.departmentId || item.departmentId === input.departmentId) &&
      (input.enabled == null || item.enabled === input.enabled)
    );
    rows = [...rows].sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize).map(item => {
      return { ...item, mobile: null, email: null, mobileMasked: null, emailMasked: null };
    });
    return {
      items: pageRows, total, page: safePage, pageSize,
      totalPages, hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort: 'name,asc',
      filtersApplied: {
        keyword: valueToText(input.keyword), userId: selectedUserId, employeeNo: valueToText(input.employeeNo), orgId: valueToText(input.orgId),
        departmentId: valueToText(input.departmentId), enabled: input.enabled == null ? true : input.enabled
      },
      source: 'FEISHU_CONTACT_V3'
    };
  }

  function createFacet(values, sortOrder = 0) {
    const counts = new Map();
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()].map(([name, count], index) => ({
      code: name, name, count, sortOrder: sortOrder + index, enabled: true
    }));
  }

  async function executeApp(operationId, input) {
    const allowedKeys = operationId === 'APP-002' ? ['page', 'pageSize', 'query', 'filters', 'sort'] : ['page', 'pageSize'];
    const extraInputKeys = Object.keys(input).filter(key => !allowedKeys.includes(key));
    if (extraInputKeys.length) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    if (operationId === 'APP-001') {
      const [projection, typeDetailCounts] = await Promise.all([getAppProjection(), getAppDetailCounts()]);
      const { items } = projection;
      return {
        total: items.length,
        types: createFacet(items.map(item => item.typeName)),
        categories: createFacet(items.map(item => item.categoryName)),
        tags: createFacet(items.flatMap(item => item.keywords)),
        domains: createFacet(items.map(item => item.domainName)),
        scenes: createFacet(items.flatMap(item => item.sceneNames)),
        typeDetailCounts,
        facetsVersion: 'feishu-app-facets.v1'
      };
    }
    const projection = await getAppProjection();
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(pageSize) || ![10, 20, 50, 100].includes(pageSize)) {
      throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    if (input.filters != null && (typeof input.filters !== 'object' || Array.isArray(input.filters))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '筛选条件必须是对象', 400);
    }
    const filters = input.filters || {};
    const allowedFilterKeys = ['type', 'category', 'domain', 'scene', 'status', 'owner'];
    if (Object.keys(filters).some(key => !allowedFilterKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的筛选字段', 400);
    }
    const query = valueToText(input.query).toLocaleLowerCase('zh-CN');
    let rows = projection.items.filter(item =>
      (!query || [item.name, item.summary, item.ownerName, item.responsibleOrgName, ...item.keywords].join(' ').toLocaleLowerCase('zh-CN').includes(query)) &&
      (!filters.type || item.typeCode === filters.type || item.typeName === filters.type) &&
      (!filters.category || item.categoryCode === filters.category || item.categoryName === filters.category) &&
      (!filters.domain || item.domainId === filters.domain || item.domainName === filters.domain) &&
      (!filters.scene || item.sceneIds.includes(filters.scene) || item.sceneNames.includes(filters.scene)) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.owner || item.ownerId === filters.owner || item.ownerName === filters.owner)
    );
    const sort = input.sort || 'default';
    if (!['default', 'usage-desc', 'favorites-desc', 'name'].includes(sort)) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '排序方式不受支持', 400);
    }
    if (sort === 'default') {
      rows = [...rows].sort((a, b) => valueToTimestamp(b.updatedAt) - valueToTimestamp(a.updatedAt));
    }
    if (sort === 'usage-desc') rows = [...rows].sort((a, b) => b.usageCount - a.usageCount || a.appId.localeCompare(b.appId));
    if (sort === 'favorites-desc') rows = [...rows].sort((a, b) => b.favoriteCount - a.favoriteCount || a.appId.localeCompare(b.appId));
    if (sort === 'name') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages,
      hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort, filtersApplied: filters, facetsVersion: 'feishu-app-facets.v1'
    };
  }

  async function executeAnnouncement(operationId, input) {
    const allowedKeys = operationId === 'ANN-002' ? ['page', 'pageSize', 'query', 'filters', 'sort'] : ['page', 'pageSize'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    }
    const projection = await getAnnouncementProjection();
    if (operationId === 'ANN-001') {
      const cutoff = now().getTime() - 7 * 24 * 60 * 60 * 1000;
      return {
        total: projection.items.length,
        weekNew: projection.items.filter(item => {
          const timestamp = Date.parse(item.publishedAt);
          return Number.isFinite(timestamp) && timestamp >= cutoff;
        }).length,
        categories: createFacet(projection.items.map(item => item.category)),
        statuses: createFacet(projection.items.map(item => item.status)),
        readStateAvailable: false,
        facetsVersion: 'feishu-announcement-facets.v1'
      };
    }
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(pageSize) || ![10, 20, 50, 100].includes(pageSize)) {
      throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    if (input.filters != null && (typeof input.filters !== 'object' || Array.isArray(input.filters))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '筛选条件必须是对象', 400);
    }
    const filters = input.filters || {};
    const allowedFilterKeys = ['category', 'status', 'startDate', 'endDate'];
    if (Object.keys(filters).some(key => !allowedFilterKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的筛选字段', 400);
    }
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new FeishuProxyError('INVALID_DATE_RANGE', '开始日期不能晚于结束日期', 400);
    }
    const query = valueToText(input.query).toLocaleLowerCase('zh-CN');
    let rows = projection.items.filter(item => {
      const publishedDate = item.publishedAt.slice(0, 10);
      return (!query || [item.title, item.summary, item.category].join(' ').toLocaleLowerCase('zh-CN').includes(query))
        && (!filters.category || item.category === filters.category)
        && (!filters.status || item.status === filters.status)
        && (!filters.startDate || publishedDate >= filters.startDate)
        && (!filters.endDate || publishedDate <= filters.endDate);
    });
    const sort = input.sort || 'published-desc';
    if (!['default', 'published-desc', 'published-asc'].includes(sort)) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '排序方式不受支持', 400);
    }
    rows = [...rows].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      const compared = left.publishedAt.localeCompare(right.publishedAt, 'zh-CN');
      return sort === 'published-asc' ? compared : -compared;
    });
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages,
      hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort, filtersApplied: filters, facetsVersion: 'feishu-announcement-facets.v1'
    };
  }

  async function executeTalent(operationId, input) {
    const allowedKeys = operationId === 'TAL-005' ? ['page', 'pageSize'] : ['page', 'pageSize', 'query', 'filters', 'sort'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    }
    const projection = operationId === 'TAL-001' || operationId === 'TAL-005'
      ? await getTalentPeopleProjection()
      : operationId === 'TAL-002' ? await getTalentProjectsProjection()
        : await getTalentProgressProjection();
    if (operationId === 'TAL-005') {
      return {
        types: createFacet(projection.people.map(item => item.type)),
        levels: createFacet(projection.people.map(item => item.level)),
        specialties: createFacet(projection.people.flatMap(item => item.specialties)),
        statuses: createFacet(projection.people.map(item => item.status)),
        departments: createFacet(projection.people.map(item => item.departmentName)),
        facetsVersion: 'feishu-talent.v1'
      };
    }
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(pageSize) || ![10, 20, 50, 100].includes(pageSize)) {
      throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    if (input.filters != null && (typeof input.filters !== 'object' || Array.isArray(input.filters))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '筛选条件必须是对象', 400);
    }
    const filters = input.filters || {};
    const allowedFilters = operationId === 'TAL-001'
      ? ['type', 'level', 'specialty', 'status', 'department']
      : operationId === 'TAL-002' ? ['type', 'status', 'owner'] : ['project', 'status', 'phase'];
    if (Object.keys(filters).some(key => !allowedFilters.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的筛选字段', 400);
    }
    const source = operationId === 'TAL-001' ? projection.people : operationId === 'TAL-002' ? projection.projects : projection.progress;
    const query = valueToText(input.query).toLocaleLowerCase('zh-CN');
    let rows = source.filter(item => {
      const searchable = Object.values(item).flatMap(value => Array.isArray(value) ? value : [value]).join(' ').toLocaleLowerCase('zh-CN');
      if (query && !searchable.includes(query)) return false;
      if (operationId === 'TAL-001') return (!filters.type || item.type === filters.type)
        && (!filters.level || item.level === filters.level)
        && (!filters.specialty || item.specialties.includes(filters.specialty))
        && (!filters.status || item.status === filters.status)
        && (!filters.department || item.departmentId === filters.department || item.departmentName === filters.department);
      if (operationId === 'TAL-002') return (!filters.type || item.type === filters.type)
        && (!filters.status || item.status === filters.status)
        && (!filters.owner || item.ownerId === filters.owner || item.ownerName === filters.owner);
      return (!filters.project || item.projectId === filters.project || item.projectName === filters.project)
        && (!filters.status || item.status === filters.status)
        && (!filters.phase || item.phaseName === filters.phase);
    });
    const sort = input.sort || 'default';
    if (!['default', 'name'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '排序方式不受支持', 400);
    if (sort === 'name') rows = [...rows].sort((left, right) => String(left.name || left.projectName).localeCompare(String(right.name || right.projectName), 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages,
      hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      filtersApplied: filters, facetsVersion: 'feishu-talent.v1'
    };
  }

  function assertAllowedInput(input, allowedKeys) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求参数必须是对象', 400);
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
  }

  function publicPage(input, defaultPageSize = 10) {
    const page = input.page == null ? 1 : Number(input.page);
    const pageSize = input.pageSize == null ? defaultPageSize : Number(input.pageSize);
    if (!Number.isInteger(page) || page < 1 || page > 100) throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    if (![10, 20, 50, 100].includes(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    return { page, pageSize };
  }

  function paginatePublic(items, page, pageSize) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    return {
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize,
      totalPages, hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages
    };
  }

  function safeFileSummary(value, fallbackName = '') {
    const file = Array.isArray(value) ? value[0] : value;
    const object = file && typeof file === 'object' ? file : {};
    return {
      fileId: '', fileName: valueToText(object.name) || fallbackName || 'download', extension: '', mimeType: valueToText(object.mime_type || object.mimeType) || 'application/octet-stream',
      sizeBytes: valueToNumber(object.size), sha256: '', downloadUrl: '', previewUrl: '', thumbnailUrl: '',
      uploadedBy: '', uploadedAt: '', scanStatus: 'UNAVAILABLE', businessType: '', businessId: '', expiresAt: '', version: 0
    };
  }

  function attachmentValue(value, fallbackName = '') {
    const file = Array.isArray(value) ? value[0] : value;
    const object = file && typeof file === 'object' ? file : {};
    return {
      fileToken: typeof file === 'string' ? file : valueToText(object.file_token || object.fileToken || object.token),
      fileName: valueToText(object.name) || fallbackName || 'download',
      mimeType: valueToText(object.mime_type || object.mimeType) || 'application/octet-stream',
      sizeBytes: valueToNumber(object.size)
    };
  }

  function materialFromRecord(record) {
    const fields = record?.fields || {};
    const materialId = valueToText(fields['素材ID']) || String(record?.record_id || '');
    const relatedAppIds = valueToList(fields['关联应用ID']);
    const primaryFile = safeFileSummary(fields['素材文件'], valueToText(fields['素材名称']));
    const hasPrimaryFile = Boolean(attachmentValue(fields['素材文件']).fileToken);
    return {
      materialId, materialCode: valueToText(fields['素材编码']), name: valueToText(fields['素材名称']),
      summary: valueToText(fields['素材摘要']), materialType: valueToText(fields['素材类型']),
      categoryIds: valueToList(fields['分类ID']), appTypeCodes: valueToList(fields['适用应用类型']), domainIds: valueToList(fields['业务域ID'] || fields['所属业务域']), relatedAppIds,
      status: valueToText(fields['状态']),
      coverFileId: '', coverUrl: '', primaryFile: hasPrimaryFile ? {
        fileId: materialId,
        fileName: primaryFile.fileName,
        mimeType: primaryFile.mimeType,
        sizeBytes: primaryFile.sizeBytes
      } : null, versionName: valueToText(fields['版本名称']),
      publisherId: valueToText(fields['发布人ID']), publisherName: valueToText(fields['发布人姓名']), publishedAt: valueToText(fields['发布时间']),
      viewCount: valueToNumber(fields['浏览量']), downloadCount: valueToNumber(fields['下载次数']), isFavorite: false,
      permissions: { canView: true, canDownload: hasPrimaryFile, canMaintain: false },
      descriptionHtml: valueToText(fields['素材描述']), files: [], relatedApps: [], tags: valueToList(fields['标签编码'] || fields['标签']),
      createdAt: valueToText(fields['创建时间']), updatedAt: valueToText(fields['更新时间']), version: valueToNumber(fields['版本'])
    };
  }

  async function executeFirstBatchDetail(operationId, input) {
    if (operationId === 'MAT-002') {
      assertAllowedInput(input, ['query', 'keyword', 'materialType', 'categoryId', 'appTypeCode', 'domainId', 'relatedAppId', 'status', 'page', 'pageSize', 'sort']);
      const { page, pageSize } = publicPage(input);
      const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
      let items = (await readAll('素材中心')).map(materialFromRecord).filter(item => item.materialId && item.name);
      items = items.filter(item => (!keyword || `${item.name} ${item.summary}`.toLocaleLowerCase('zh-CN').includes(keyword))
        && (!input.materialType || item.materialType === input.materialType)
        && (!input.categoryId || item.categoryIds.includes(input.categoryId))
        && (!input.appTypeCode || item.appTypeCodes.includes(input.appTypeCode))
        && (!input.domainId || item.domainIds.includes(input.domainId))
        && (!input.relatedAppId || item.relatedAppIds.includes(input.relatedAppId))
        && (!input.status || item.status === input.status));
      const sort = input.sort || 'updatedAt,desc';
      if (!['updatedAt,desc', 'updatedAt,asc', 'name,asc', 'name,desc'].includes(sort)) {
        throw new FeishuProxyError('INVALID_OPERATION_INPUT', '素材排序方式不受支持', 400);
      }
      const [sortField, sortDirection] = sort.split(',');
      items.sort((left, right) => {
        const compared = valueToText(left[sortField]).localeCompare(valueToText(right[sortField]), 'zh-CN');
        return sortDirection === 'asc' ? compared : -compared;
      });
      return { ...paginatePublic(items, page, pageSize), sort, filtersApplied: {
        keyword: valueToText(input.query || input.keyword), materialType: valueToText(input.materialType), categoryId: valueToText(input.categoryId),
        appTypeCode: valueToText(input.appTypeCode), domainId: valueToText(input.domainId), relatedAppId: valueToText(input.relatedAppId), status: valueToText(input.status)
      } };
    }

    if (operationId.startsWith('APP-')) {
      assertAllowedInput(input, operationId === 'APP-003'
        ? ['appId', 'include']
        : ['appId', 'relationType', 'page', 'pageSize', 'sort']);
      const appId = valueToText(input.appId).trim();
      if (!appId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '应用接口必须提供 appId', 400);
      const projection = await getAppProjection();
      const app = projection.items.find(item => item.appId === appId);
      if (!app) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '应用不存在或不可见', 404);
      const [attachmentRows, previewRows, trainingRows, materialRelationRows, materialRows, relationRows] = await Promise.all([
        readAll('附件资料'), readAll('演示截图录屏'), readAll('相关培训'), readAll('应用素材关联'), readAll('素材中心'), readAll('应用关联')
      ]);
      const materials = materialRows.map(materialFromRecord);
      if (operationId === 'APP-003') {
        const relatedMaterialIds = new Set(materialRelationRows.filter(record => valueToText(record?.fields?.['应用ID']) === appId).map(record => valueToText(record?.fields?.['素材ID'])));
        return {
          appId: app.appId, appCode: app.appId, name: app.name, shortName: app.name, logoFileId: '', logoUrl: '', coverFileId: '', coverUrl: '',
          typeCode: app.typeCode, typeName: app.typeName, summary: app.summary, description: app.summary, versionName: app.versionName, accessMode: '',
          ownerId: app.ownerId, ownerName: app.ownerName, developerId: app.developerId, developerName: app.developerName,
          responsibleOrgId: app.responsibleOrgId, responsibleOrgName: app.responsibleOrgName,
          developerOrgId: app.developerOrgId, developerOrgName: app.developerOrgName,
          externalSystemCode: '', externalUrl: '', openMode: '', applicableUsers: '', businessScope: '', features: [], metrics: [], fieldDefinitions: [], processSteps: [],
          previews: previewRows.filter(record => valueToText(record?.fields?.['应用ID']) === appId).map(record => ({
            previewId: valueToText(record?.fields?.['主键']) || String(record?.record_id || ''), mediaType: valueToText(record?.fields?.['媒体类型']),
            title: valueToText(record?.fields?.['说明文字']), url: '', thumbnailUrl: ''
          })),
          videos: [],
          attachments: attachmentRows.filter(record => valueToText(record?.fields?.['应用ID']) === appId).map(record => ({
            attachmentId: valueToText(record?.fields?.['主键']) || String(record?.record_id || ''), name: valueToText(record?.fields?.['文件名称']),
            sizeBytes: valueToNumber(record?.fields?.['文件大小']), uploadedAt: valueToText(record?.fields?.['上传时间']), uploadedBy: valueToText(record?.fields?.['上传人ID']), downloadUrl: ''
          })),
          guides: [],
          trainings: trainingRows.filter(record => valueToText(record?.fields?.['应用ID']) === appId).map(record => ({
            trainingId: valueToText(record?.fields?.['主键']) || String(record?.record_id || ''), title: valueToText(record?.fields?.['培训标题']),
            category: valueToText(record?.fields?.['培训分类']), lecturerName: valueToText(record?.fields?.['讲师姓名']), durationMinutes: valueToNumber(record?.fields?.['时长(分钟)']), targetPath: ''
          })),
          relatedApps: [], relatedMaterials: materials.filter(item => relatedMaterialIds.has(item.materialId)), latestNotice: null, typeExtension: {}, dataSourceSummary: '',
          createdAt: app.createdAt || '', updatedAt: app.updatedAt || '', version: 0
        };
      }
      const { page, pageSize } = publicPage(input);
      let relations = relationRows.filter(record => valueToText(record?.fields?.['应用ID']) === appId).map(record => {
        const fields = record?.fields || {};
        const relationType = valueToText(fields['关联类型']).toLocaleUpperCase('zh-CN');
        const resourceId = valueToText(fields['关联资源ID']);
        const material = materials.find(item => item.materialId === resourceId);
        return {
          relationId: valueToText(fields['关联编码']) || String(record?.record_id || ''), relationType, resourceId,
          title: material?.name || resourceId, summary: material?.summary || '', logoUrl: '', coverUrl: material?.coverUrl || '',
          typeCode: material?.materialType || '', typeName: material?.materialType || '', durationMinutes: null,
          fileSizeBytes: material?.primaryFile?.sizeBytes || null, downloadCount: material?.downloadCount || null,
          viewCount: material?.viewCount || null, targetPath: material ? `/materials/${encodeURIComponent(resourceId)}` : '', sortOrder: valueToNumber(fields['排序'])
        };
      }).filter(item => item.relationId && item.resourceId);
      if (input.relationType) relations = relations.filter(item => item.relationType === String(input.relationType).toLocaleUpperCase('zh-CN'));
      return { ...paginatePublic(relations, page, pageSize), sort: input.sort || 'sortOrder,asc', filtersApplied: { appId, relationType: valueToText(input.relationType) } };
    }

    assertAllowedInput(input, operationId === 'ANN-003'
      ? ['announcementId', 'markRead']
      : ['announcementId', 'relationType', 'page', 'pageSize']);
    const announcementId = valueToText(input.announcementId);
    if (!announcementId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '公告接口必须提供 announcementId', 400);
    if (operationId === 'ANN-003' && input.markRead === true) {
      throw new FeishuProxyError('READ_SIDE_EFFECT_FORBIDDEN', '只读详情接口不会自动写入已读状态', 403);
    }
    const [announcementRows, relationRows, appProjection, userRows, departmentRows] = await Promise.all([
      readAll('公告通知'), readAll('公告关联对象'), getAppProjection(), readAll('用户字典'), readAll('部门字典')
    ]);
    const announcementRecord = announcementRows.find(record => valueToText(record?.fields?.['公告ID']) === announcementId);
    if (!announcementRecord) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '公告不存在或不可见', 404);
    const relations = relationRows.filter(record => valueToText(record?.fields?.['公告ID']) === announcementId);
    const userLookup = createUserDictionaryLookup(userRows, '姓名');
    const departmentLookup = createLookup(departmentRows, ['部门ID'], '部门名称');
    const relationItems = relations.map(record => {
      const fields = record?.fields || {};
      const relationType = valueToText(fields['关联类型']).toLocaleUpperCase('zh-CN');
      const resourceId = valueToText(fields['资源ID']);
      const relatedApp = appProjection.items.find(item => item.appId === resourceId);
      return {
        relationId: valueToText(fields['关联编码']) || String(record?.record_id || ''), relationType, resourceId,
        title: relatedApp?.name || resourceId, summary: relatedApp?.summary || '', logoUrl: '', startAt: null, endAt: null,
        usageCount: relatedApp?.usageCount ?? null, registeredCount: null, statusCode: relatedApp?.status || '', statusName: relatedApp?.status || '',
        targetPath: relatedApp?.detailPath || '', actionLabel: relatedApp ? '查看详情' : ''
      };
    }).filter(item => item.relationId && item.resourceId);
    if (operationId === 'ANN-005') {
      const { page, pageSize } = publicPage(input);
      const filtered = input.relationType ? relationItems.filter(item => item.relationType === String(input.relationType).toLocaleUpperCase('zh-CN')) : relationItems;
      return { ...paginatePublic(filtered, page, pageSize), sort: 'sortOrder,asc', filtersApplied: { announcementId, relationType: valueToText(input.relationType) } };
    }
    const fields = announcementRecord.fields || {};
    const publisherId = valueToText(fields['发布人ID']);
    const publisherOrgId = valueToText(fields['发布部门ID']);
    const textContent = valueToText(fields['公告正文']).replace(/<[^>]*>/g, '').trim();
    return {
      announcementId, title: valueToText(fields['公告标题']), typeCode: valueToText(fields['分类']), typeName: valueToText(fields['分类']),
      summary: valueToText(fields['公告摘要']), contentHtml: '', contentText: textContent, publisherId, publisherName: resolvePersonDisplayName(userLookup, publisherId, 'announcement.publisher'),
      publisherOrgId, publisherOrgName: departmentLookup.get(publisherOrgId) || '', publishAt: valueToText(fields['发布时间']), validFrom: valueToText(fields['有效期开始']),
      validTo: valueToText(fields['有效期结束']), status: valueToText(fields['状态']), scopeType: valueToText(fields['范围类型']), scopeUserIds: [], scopeOrgIds: [],
      isTop: valueToBoolean(fields['是否置顶']), topUntil: valueToText(fields['置顶结束时间']), viewCount: valueToNumber(fields['浏览量']), readCount: 0, isRead: false,
      attachments: [], relatedApps: relationItems.filter(item => item.relationType === 'APP').map(item => appProjection.items.find(app => app.appId === item.resourceId)).filter(Boolean),
      createdAt: valueToText(fields['创建时间']), updatedAt: valueToText(fields['更新时间']), version: valueToNumber(fields['版本']), previous: null, next: null, associatedActivities: []
    };
  }

  function courseFromRecord(record) {
    const fields = record?.fields || {};
    return {
      courseId: valueToText(fields['课程ID']) || String(record?.record_id || ''),
      title: valueToText(fields['培训标题']), categoryCode: valueToText(fields['分类']), categoryName: valueToText(fields['分类']),
      lecturerName: valueToText(fields['讲师姓名']), startAt: valueToText(fields['开始时间']), deliveryMode: valueToText(fields['格式']),
      summary: valueToText(fields['培训简介']), statusCode: valueToText(fields['状态']), statusName: valueToText(fields['状态']),
      registeredCount: valueToNumber(fields['已报名人数']), detailPath: `/training/${encodeURIComponent(valueToText(fields['课程ID']) || String(record?.record_id || ''))}`
    };
  }

  function certificationFromRecord(record) {
    const fields = record?.fields || {};
    const certificationId = valueToText(fields['认证编码']) || String(record?.record_id || '');
    const enabled = valueToBoolean(fields['启用']);
    return {
      certificationId, code: certificationId, name: valueToText(fields['认证名称']),
      directionCode: valueToText(fields['认证类型']), directionName: valueToText(fields['认证类型']), sceneCodes: [],
      level: '', provider: valueToText(fields['主办单位']), coverUrl: '', summary: valueToText(fields['认证说明']),
      registrationStartAt: '', registrationEndAt: '', examAt: '', statusCode: enabled ? 'ENABLED' : 'DISABLED',
      statusName: enabled ? '启用' : '停用', certifiedCount: 0, detailPath: `/certifications/${encodeURIComponent(certificationId)}`
    };
  }

  function dictionaryEnabled(fields, fieldName = '启用') {
    const value = valueToText(fields[fieldName] ?? fields['状态']).trim().toLocaleLowerCase('zh-CN');
    if (!value) return true;
    return !['否', 'false', '0', 'no', '停用', '禁用', 'disabled', 'offline'].includes(value);
  }

  async function executeDictionaryBatch(input) {
    assertAllowedInput(input, ['dictTypes', 'parentValues', 'includeDisabled']);
    if (!Array.isArray(input.dictTypes) || input.dictTypes.length < 1 || input.dictTypes.length > 50
      || input.dictTypes.some(type => typeof type !== 'string' || !type.trim() || type.length > 128)) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'dictTypes 必须是 1 至 50 个非空字典编码', 400);
    }
    if (input.parentValues != null && (typeof input.parentValues !== 'object' || Array.isArray(input.parentValues))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'parentValues 必须是字典编码到父值的对象', 400);
    }
    if (input.includeDisabled === true) {
      throw new FeishuProxyError('DISABLED_DICTIONARY_ITEMS_FORBIDDEN', '正式字典不允许返回停用项', 400);
    }
    const definitions = Object.freeze({
      APPLICATION_TYPE: { table: '应用类型配置', value: ['类型编码', '类型ID'], label: '类型名称', description: '类型描述', color: '颜色令牌', icon: '类型图标', sort: '排序', enabled: '状态', parent: '' },
      BUSINESS_DOMAIN: { table: '业务域字典', value: ['业务域编码', '业务域ID'], label: '业务域名称', description: '描述', color: '颜色令牌', icon: '图标', sort: '排序', enabled: '启用', parent: '父级ID' },
      SCENE: { table: '场景字典', value: ['场景ID'], label: '场景名称', description: '', color: '', icon: '', sort: '', enabled: '', parent: '' },
      MATERIAL_CATEGORY: { table: '素材分类', value: ['分类编码'], label: '分类名称', description: '', color: '', icon: '', sort: '排序', enabled: '启用', parent: '父级ID' }
    });
    const uniqueTypes = [...new Set(input.dictTypes.map(type => type.trim()))];
    const baselineHash = formalDictionaryBaseline ? canonicalDictionaryBaselineHash(formalDictionaryBaseline) : '';
    const baselineValid = Boolean(
      formalDictionaryBaseline
      && valueToText(formalDictionaryBaseline.baselineVersion)
      && valueToText(formalDictionaryBaseline.effectiveAt)
      && valueToText(formalDictionaryBaseline.approvedAt)
      && valueToText(formalDictionaryBaseline.approvedBy) === '闫瑾'
      && valueToText(formalDictionaryBaseline.sha256)
      && baselineHash === valueToText(formalDictionaryBaseline.sha256).toLocaleLowerCase('en-US')
      && formalDictionaryBaseline.dictTypes
      && typeof formalDictionaryBaseline.dictTypes === 'object'
    );
    if (formalDictionaryBaselineRequired && !baselineValid) {
      throw new FeishuProxyError('FORMAL_DICTIONARY_BASELINE_MISSING', '正式业务字典基线缺失或校验失败', 503, { retryable: false });
    }
    const itemsByType = Object.fromEntries(uniqueTypes.map(type => [type, []]));
    let latestUpdatedAt = '';
    let highestVersion = 0;
    await Promise.all(uniqueTypes.map(async dictType => {
      const definition = definitions[dictType];
      if (!definition) return;
      const baselineDefinition = baselineValid ? formalDictionaryBaseline.dictTypes[dictType] : null;
      const baselineValueFields = Array.isArray(baselineDefinition?.valueFields)
        ? baselineDefinition.valueFields.map(value => valueToText(value).trim()).filter(Boolean)
        : [valueToText(baselineDefinition?.valueField).trim()].filter(Boolean);
      if (baselineValid && (
        !baselineDefinition
        || baselineDefinition.tableName !== definition.table
        || JSON.stringify(baselineValueFields) !== JSON.stringify(definition.value)
        || valueToText(baselineDefinition.labelField).trim() !== definition.label
        || !Array.isArray(baselineDefinition.options)
      )) {
        throw new FeishuProxyError('FORMAL_DICTIONARY_BASELINE_MISSING', '正式业务字典基线字段映射不完整', 503, { retryable: false, dictType });
      }
      const rows = await getDictionaryProjection(definition.table);
      const initializationMarkers = new Set((baselineDefinition?.initializationMarkers || []).map(value => valueToText(value).trim()).filter(Boolean));
      const candidates = rows.map(record => {
        const fields = record?.fields || {};
        const value = definition.value.map(name => valueToText(fields[name])).find(Boolean) || String(record?.record_id || '');
        const updatedAt = valueToText(fields['更新时间']);
        latestUpdatedAt = latestUpdatedAt > updatedAt ? latestUpdatedAt : updatedAt;
        highestVersion = Math.max(highestVersion, valueToNumber(fields['版本']));
        return {
          dictType, value, label: valueToText(fields[definition.label]),
          description: definition.description ? valueToText(fields[definition.description]) || null : null,
          colorToken: definition.color ? valueToText(fields[definition.color]) || null : null,
          iconFileId: null, sortOrder: definition.sort ? valueToNumber(fields[definition.sort]) : 0,
          enabled: definition.enabled ? dictionaryEnabled(fields, definition.enabled) : true,
          parentValue: definition.parent ? valueToText(fields[definition.parent]) || null : null, extra: null
        };
      }).filter(item => item.value && item.label)
        .filter(item => ![item.value, item.label].some(value => /^TEST_/i.test(valueToText(value).trim())))
        .filter(item => !/(?:^|[_\-\s])INIT(?:IAL(?:IZATION)?)?(?:$|[_\-\s])/i.test(item.value))
        .filter(item => !/(测试初始化|初始化测试|测试初始数据)/u.test(item.label))
        .filter(item => !initializationMarkers.has(item.value) && !initializationMarkers.has(item.label))
        .filter(item => item.enabled)
        .filter(item => !input.parentValues?.[dictType] || item.parentValue === input.parentValues[dictType])
        .sort((left, right) => left.sortOrder - right.sortOrder || left.value.localeCompare(right.value, 'zh-CN'));
      if (!baselineDefinition) {
        itemsByType[dictType] = candidates;
        return;
      }
      const normalizedExpected = baselineDefinition.options.map(option => ({
        dictType,
        value: valueToText(option.value).trim(),
        label: valueToText(option.label).trim(),
        enabled: option.enabled !== false,
        parentValue: valueToText(option.parentValue).trim() || null,
        sortOrder: Number(option.sortOrder || 0)
      })).filter(item => item.value && item.label && item.enabled)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.value.localeCompare(right.value, 'zh-CN'));
      const sourceComparable = candidates.map(({ value, label, enabled, parentValue, sortOrder }) => ({ value, label, enabled, parentValue, sortOrder }));
      const expectedComparable = normalizedExpected.map(({ value, label, enabled, parentValue, sortOrder }) => ({ value, label, enabled, parentValue, sortOrder }));
      if (JSON.stringify(sourceComparable) !== JSON.stringify(expectedComparable)) {
        throw new FeishuProxyError('FORMAL_DICTIONARY_BASELINE_MISSING', '飞书正式字典与批准基线不一致', 503, { retryable: false, dictType });
      }
      const candidateByValue = new Map(candidates.map(item => [item.value, item]));
      itemsByType[dictType] = normalizedExpected.map(expected => ({ ...candidateByValue.get(expected.value), ...expected }));
    }));
    const liveSourceHash = createHash('sha256')
      .update(JSON.stringify(stableCacheValue(itemsByType)))
      .digest('hex');
    return {
      itemsByType,
      version: baselineValid ? valueToText(formalDictionaryBaseline.baselineVersion) : `feishu-live.v${highestVersion || 1}`,
      baselineHash: baselineValid ? baselineHash : liveSourceHash,
      updatedAt: latestUpdatedAt || now().toISOString()
    };
  }

  async function executeAppComments(input) {
    assertAllowedInput(input, ['appId', 'rating', 'hasReply', 'page', 'pageSize', 'sort']);
    const appId = valueToText(input.appId);
    if (!appId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '评论列表必须提供 appId', 400);
    if (input.rating != null && (!Number.isInteger(Number(input.rating)) || Number(input.rating) < 1 || Number(input.rating) > 5)) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'rating 必须是 1 至 5 的整数', 400);
    }
    if (input.hasReply != null && typeof input.hasReply !== 'boolean') throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'hasReply 必须是布尔值', 400);
    const sort = input.sort || 'createdAt,desc';
    if (!['createdAt,desc', 'createdAt,asc'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '评论排序方式不受支持', 400);
    const { page, pageSize } = publicPage(input);
    const [commentRows, userRows] = await Promise.all([readAll('应用评论'), readAll('用户字典')]);
    const users = new Map(userRows.map(record => [userDictionaryAccount(record?.fields), record?.fields || {}]).filter(([account]) => account));
    const userNameLookup = createUserDictionaryLookup(userRows, '姓名');
    let items = commentRows.map(record => {
      const fields = record?.fields || {};
      const commentAppId = valueToText(fields['应用ID']);
      const userId = valueToText(fields['评论人ID']);
      const user = users.get(userId) || {};
      const replyContent = valueToText(fields['回复内容脱敏值']);
      const replyUserId = valueToText(fields['回复人ID']);
      const ratingValue = valueToNumber(fields['评分']);
      const rawStatus = valueToText(fields['状态']).toLocaleUpperCase('zh-CN');
      const status = /BLOCK|屏蔽|驳回/.test(rawStatus) ? 'BLOCKED' : /PEND|待审/.test(rawStatus) ? 'PENDING' : 'PUBLISHED';
      return {
        commentId: valueToText(fields['主键']) || String(record?.record_id || ''), appId: commentAppId,
        user: { userId, displayName: resolvePersonDisplayName(userNameLookup, userId, 'comment.author'), avatarUrl: '', departmentName: valueToText(user['所属部门名称']) },
        content: valueToText(fields['评论内容']), rating: ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null,
        likeCount: 0, isLiked: false, status, createdAt: valueToText(fields['评论时间']), updatedAt: valueToText(fields['更新时间']),
        reply: replyContent ? { replyId: `${valueToText(fields['主键']) || record?.record_id || ''}:reply`, content: replyContent, repliedBy: resolvePersonDisplayName(userNameLookup, replyUserId, 'comment.reply-author'), repliedAt: valueToText(fields['回复时间']) } : null
      };
    }).filter(item => item.commentId && item.appId === appId);
    if (input.rating != null) items = items.filter(item => item.rating === Number(input.rating));
    if (input.hasReply != null) items = items.filter(item => Boolean(item.reply) === input.hasReply);
    items.sort((left, right) => sort.endsWith('asc') ? left.createdAt.localeCompare(right.createdAt) : right.createdAt.localeCompare(left.createdAt));
    return { ...paginatePublic(items, page, pageSize), sort, filtersApplied: { appId, rating: input.rating ?? null, hasReply: input.hasReply ?? null } };
  }

  async function executeWorkbenchSearch(input) {
    assertAllowedInput(input, ['keyword', 'scene', 'typeCode', 'page', 'pageSize', 'sort']);
    const { page, pageSize } = publicPage(input);
    const sort = input.sort || 'RELEVANCE';
    if (!['RELEVANCE', 'USAGE_DESC', 'NAME_ASC'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '工作台搜索排序方式不受支持', 400);
    const projection = await getAppProjection();
    const normalizedKeyword = valueToText(input.keyword).trim().toLocaleLowerCase('zh-CN');
    let items = projection.items.filter(item => (!normalizedKeyword || `${item.name} ${item.summary} ${item.keywords.join(' ')}`.toLocaleLowerCase('zh-CN').includes(normalizedKeyword))
      && (!input.scene || item.sceneIds.includes(input.scene) || item.sceneNames.includes(input.scene))
      && (!input.typeCode || item.typeCode === input.typeCode));
    if (sort === 'USAGE_DESC') items = [...items].sort((left, right) => right.usageCount - left.usageCount);
    if (sort === 'NAME_ASC') items = [...items].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
    const sceneCounts = new Map(); const typeCounts = new Map();
    for (const item of items) {
      item.sceneIds.forEach((value, index) => sceneCounts.set(value, { value, label: item.sceneNames[index] || value, count: (sceneCounts.get(value)?.count || 0) + 1 }));
      typeCounts.set(item.typeCode, { value: item.typeCode, label: item.typeName, count: (typeCounts.get(item.typeCode)?.count || 0) + 1 });
    }
    return {
      ...paginatePublic(items, page, pageSize), sort,
      filtersApplied: { keyword: normalizedKeyword, scene: valueToText(input.scene), typeCode: valueToText(input.typeCode) },
      facets: { scenes: [...sceneCounts.values()], types: [...typeCounts.values()] }, normalizedKeyword
    };
  }

  function requireIdentity(requestContext) {
    const identity = requestContext?.identity;
    const userId = valueToText(identity?.adAccount || identity?.userId);
    if (!userId) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
    return { identity, userId };
  }

  function permissionRecordActive(fields) {
    if (!dictionaryEnabled(fields, '启用')) return false;
    if (/^(?:禁用|失效|REVOKED|DISABLED)$/i.test(valueToText(fields['状态']))) return false;
    const timestamp = now().toISOString();
    const starts = valueToText(fields['生效时间']);
    const ends = valueToText(fields['失效时间']);
    return (!starts || starts <= timestamp) && (!ends || ends >= timestamp);
  }

  function requiredPermissionForOperation(operationId) {
    if (operationId.startsWith('TAL-')) return 'talent.view';
    if (operationId === 'OPS-001') return 'operations.dashboard.view';
    if (operationId.startsWith('OAN-')) return 'operations.announcements.manage';
    if (operationId.startsWith('OAP-')) return 'operations.apps.manage';
    if (operationId === 'ADM-006') return 'admin.health.view';
    if (operationId === 'ADM-007') return 'admin.permissions.view';
    if (operationId.startsWith('ADM-')) return 'admin.audit.view';
    if (operationId.startsWith('ARC-')) return 'admin.archive.view';
    if (operationId.startsWith('INT-')) return 'admin.integrations.view';
    return '';
  }

  function permissionAllowsCode(permissions, permissionCode) {
    if (!permissionCode) return true;
    const values = new Set(Array.isArray(permissions) ? permissions.map(String) : []);
    return values.has('*') || values.has('admin.*') || values.has(permissionCode)
      || [...values].some(item => item.endsWith('.*') && permissionCode.startsWith(item.slice(0, -1)));
  }

  async function readCurrentAuthorization(requestContext) {
    const { identity, userId } = requireIdentity(requestContext);
    const permissionFilter = identityFilter('用户权限', ['AD账号', '主体ID'], userId);
    let permissionRows;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const taskState = syncTaskScope.getStore();
      const claimedAttempt = taskState ? claimTaskAttempt(taskState) : attempt;
      emitCacheEvent('sync-attempt', {
        ...taskState,
        operationId: taskState?.operationId || 'AUTHORIZATION',
        attempt: claimedAttempt,
        transition: 'authorization'
      });
      try {
        permissionRows = await authorizationReadScope.run(true, () => (
          strongReadScope.run(true, () => readAll('用户权限', PROFILE_FIELDS.permissions, { filter: permissionFilter }))
        ));
        break;
      } catch (error) {
        lastError = error;
        const budget = taskAttemptBudget(taskState);
        const backoffMs = attempt === 1 ? 500 : 1_000;
        if (attempt === 3 || (budget && budget.used >= budget.max) || !retryableRefreshError(error)
            || !hasSyncRetryRunway(taskState, backoffMs)) throw error;
        await sleepWithinSync(backoffMs);
      }
    }
    if (!permissionRows) throw lastError;
    const activeRows = permissionRows.filter(record => {
      const fields = record?.fields || {};
      return permissionSubjectIdentifier(fields) === userId && permissionRecordActive(fields);
    });
    const permissions = [...new Set(activeRows.map(record => valueToText(record?.fields?.['权限编码'])).filter(Boolean))].sort();
    const dataScope = [...new Set(activeRows.flatMap(record => valueToList(record?.fields?.['数据范围'])).filter(Boolean))].sort();
    return { identity, userId, permissions, dataScope };
  }

  function authorizationIdentityKey(context = {}) {
    const identity = context.identity || {};
    return fingerprintReadIsolation({
      tenant: valueToText(identity.tenantKey || identity.tenantId || 'default-tenant'),
      principalId: normalizeReadPrincipal(context)
    });
  }

  function verifiedContextFromAccess(context, access) {
    const authorizedContext = {
      ...context,
      verifiedAuthorization: {
        userId: access.userId,
        permissions: [...access.permissions],
        dataScope: [...access.dataScope]
      },
      identity: {
        ...(context.identity || {}),
        permissions: [...access.permissions],
        dataScope: access.dataScope.join(',')
      }
    };
    verifiedAuthorizationContexts.add(authorizedContext);
    return authorizedContext;
  }

  function rebindVerifiedContext(context, authorizedContext) {
    const access = authorizedContext?.verifiedAuthorization;
    if (!access) return authorizedContext;
    return verifiedContextFromAccess(context, {
      userId: access.userId,
      permissions: Array.isArray(access.permissions) ? access.permissions : [],
      dataScope: Array.isArray(access.dataScope) ? access.dataScope : valueToList(access.dataScope)
    });
  }

  function taskStatusAuthorizationKey(operationId, context, taskId = '') {
    return `${valueToText(operationId)}\u0000${valueToText(taskId)}\u0000${authorizationIdentityKey(context)}`;
  }

  function cleanupTaskStatusAuthorizationContinuations() {
    const timestamp = Date.now();
    for (const [key, continuation] of taskStatusAuthorizationContinuations) {
      if (continuation.expiresAt <= timestamp) taskStatusAuthorizationContinuations.delete(key);
    }
  }

  function retainTaskStatusAuthorization(key, outcome) {
    cleanupTaskStatusAuthorizationContinuations();
    while (taskStatusAuthorizationContinuations.size >= 1_000) {
      taskStatusAuthorizationContinuations.delete(taskStatusAuthorizationContinuations.keys().next().value);
    }
    taskStatusAuthorizationContinuations.set(key, {
      ...outcome,
      expiresAt: Date.now() + taskStatusAuthorizationContinuationMs
    });
  }

  function consumeTaskStatusAuthorization(key, context) {
    cleanupTaskStatusAuthorizationContinuations();
    const continuation = taskStatusAuthorizationContinuations.get(key);
    if (!continuation) return null;
    taskStatusAuthorizationContinuations.delete(key);
    if (continuation.error) throw continuation.error;
    if (continuation.failure) return { context: null, deferred: false, error: continuation.failure };
    return {
      context: rebindVerifiedContext(context, continuation.context),
      deferred: false
    };
  }

  function waitForAuthorization(accessRequest, authorizationState) {
    if (!authorizationState) return accessRequest;
    assertSyncTaskActive(authorizationState);
    const deadlineAt = Number(authorizationState.deadlineAt);
    const signal = authorizationState.signal;
    if (!Number.isFinite(deadlineAt) && !signal) return accessRequest;
    let timer;
    let abortHandler;
    const deadline = new Promise((_, reject) => {
      if (Number.isFinite(deadlineAt)) {
        timer = setTimeout(() => reject(syncDeadlineError()), Math.max(0, deadlineAt - readNow()));
      }
      if (signal) {
        abortHandler = () => reject(syncDeadlineError());
        if (signal.aborted) abortHandler();
        else signal.addEventListener('abort', abortHandler, { once: true });
      }
    });
    return Promise.race([accessRequest, deadline]).finally(() => {
      clearTimeout(timer);
      if (abortHandler) signal?.removeEventListener?.('abort', abortHandler);
    });
  }

  async function authorizeRequestContext(requestContext = {}) {
    const context = requestContext && typeof requestContext === 'object' ? requestContext : {};
    if (!realtimeAuthorization || trustedSystemContexts.has(context) || verifiedAuthorizationContexts.has(context)) return context;
    const current = authorizationRequests.get(context);
    if (current) return current;
    const inheritedState = syncTaskScope.getStore();
    const externalDeadlineAt = Number(context.syncDeadlineAtMs);
    const externalSignal = context.syncAbortSignal;
    const authorizationState = inheritedState || (
      Number.isFinite(externalDeadlineAt) || externalSignal
        ? {
            cancelled: externalSignal?.aborted === true,
            signal: externalSignal,
            deadlineAt: Number.isFinite(externalDeadlineAt) ? externalDeadlineAt : undefined
          }
        : null
    );
    const authorizationRequestKey = authorizationIdentityKey(context);
    let shared = authorizationRequestsByIdentity.get(authorizationRequestKey);
    if (shared && (shared.settled || shared.state?.cancelled || shared.state?.signal?.aborted)) {
      if (authorizationRequestsByIdentity.get(authorizationRequestKey) === shared) {
        authorizationRequestsByIdentity.delete(authorizationRequestKey);
      }
      shared = null;
    }
    if (!shared) {
      const controller = createSyncAbortController();
      const candidateDeadlines = [
        inheritedState?.deadlineAt,
        externalDeadlineAt,
        readNow() + syncTaskTimeoutMs
      ].filter(Number.isFinite);
      const sharedState = {
        cancelled: false,
        controller,
        signal: controller.signal,
        deadlineAt: Math.min(...candidateDeadlines),
        traceId: inheritedState?.traceId || traceIdFactory(),
        syncId: inheritedState?.syncId || `auth-${randomUUID()}`,
        operationId: inheritedState?.operationId || 'AUTHORIZATION',
        keyDigest: inheritedState?.keyDigest || fingerprint(authorizationRequestKey),
        budgetMs: Math.max(0, Math.min(syncTaskTimeoutMs, Math.min(...candidateDeadlines) - readNow())),
        attemptBudget: taskAttemptBudget(inheritedState) || { used: 0, max: syncRetryAttempts }
      };
      const parentSignals = [inheritedState?.signal, externalSignal].filter(Boolean);
      const abortBindings = parentSignals.map(signal => {
        const handler = () => {
          sharedState.cancelled = true;
          controller.abort(syncDeadlineError());
        };
        if (signal.aborted) handler();
        else signal.addEventListener('abort', handler, { once: true });
        return { signal, handler };
      });
      const deadlineTimer = setTimeout(() => {
        sharedState.cancelled = true;
        controller.abort(syncDeadlineError());
      }, Math.max(0, sharedState.deadlineAt - readNow()));
      deadlineTimer.unref?.();
      shared = { controller, state: sharedState, waiters: 0, settled: false, promise: null };
      shared.promise = syncTaskScope.run(sharedState, () => (
        Promise.resolve().then(() => readCurrentAuthorization(context))
      )).finally(() => {
        shared.settled = true;
        clearTimeout(deadlineTimer);
        for (const binding of abortBindings) binding.signal.removeEventListener('abort', binding.handler);
        if (authorizationRequestsByIdentity.get(authorizationRequestKey) === shared) {
          authorizationRequestsByIdentity.delete(authorizationRequestKey);
        }
      });
      shared.promise.catch(() => {});
      authorizationRequestsByIdentity.set(authorizationRequestKey, shared);
    }
    shared.waiters += 1;
    const request = waitForAuthorization(shared.promise, authorizationState).then(access => {
      assertSyncTaskActive(authorizationState);
      return verifiedContextFromAccess(context, access);
    }).finally(() => {
      shared.waiters = Math.max(0, shared.waiters - 1);
      if (!shared.settled && shared.waiters === 0) {
        shared.state.cancelled = true;
        shared.controller.abort(syncDeadlineError());
      }
      if (authorizationRequests.get(context) === request) authorizationRequests.delete(context);
    });
    authorizationRequests.set(context, request);
    return request;
  }

  function isTransientAuthorizationFailure(error) {
    const code = String(error?.code || error?.cause?.code || '');
    const status = Number(error?.status || 0);
    if ([401, 403].includes(status)) return false;
    return status === 429
      || [
        'FEISHU_UPSTREAM_TIMEOUT',
        'FEISHU_UPSTREAM_UNAVAILABLE',
        'FEISHU_READ_BUDGET_EXCEEDED',
        'READ_SYNC_DEADLINE_EXCEEDED',
        'ECONNABORTED',
        'ECONNRESET',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'ETIMEDOUT',
        'UND_ERR_CONNECT_TIMEOUT',
        'UND_ERR_HEADERS_TIMEOUT',
        'UND_ERR_SOCKET'
      ].includes(code);
  }

  function statusAuthorizationFailure(error) {
    return Object.freeze({
      code: 'STATUS_AUTHORIZATION_FAILED',
      message: '任务状态权限校验失败',
      status: 500,
      retryable: false,
      causeCode: String(error?.code || error?.cause?.code || 'AUTHORIZATION_CHECK_FAILED')
    });
  }

  async function authorizeTaskStatus(operationId, requestContext = {}, taskId = '') {
    requireIdentity(requestContext);
    const continuationKey = taskStatusAuthorizationKey(operationId, requestContext, taskId);
    const continuation = consumeTaskStatusAuthorization(continuationKey, requestContext);
    if (continuation) return continuation;
    const authorization = (async () => {
      const currentAuthorization = await authorizeRequestContext(requestContext);
      const policy = operationId ? operationCachePolicies[operationId] : null;
      const authorizedContext = policy
        ? await authorizeCacheRequest(operationId, currentAuthorization, policy)
        : currentAuthorization;
      return { context: authorizedContext, deferred: false };
    })();
    let timer;
    try {
      const result = await Promise.race([
        authorization,
        new Promise(resolve => {
          timer = setTimeout(() => resolve({ context: null, deferred: true }), taskStatusAuthorizationBudgetMs);
        })
      ]);
      if (result.deferred) {
        authorization.then(
          completed => retainTaskStatusAuthorization(continuationKey, { context: completed.context }),
          error => {
            if ([401, 403].includes(Number(error?.status || 0))) retainTaskStatusAuthorization(continuationKey, { error });
            else if (!isTransientAuthorizationFailure(error)) retainTaskStatusAuthorization(continuationKey, { failure: statusAuthorizationFailure(error) });
          }
        );
      }
      return result;
    } catch (error) {
      if ([401, 403].includes(Number(error?.status || 0))) throw error;
      if (isTransientAuthorizationFailure(error)) return { context: null, deferred: true };
      return { context: null, deferred: false, error: statusAuthorizationFailure(error) };
    } finally {
      clearTimeout(timer);
      // A timed-out real-time check remains active and is shared by the next
      // poll. It never re-runs the original business operation.
      authorization.catch(() => {});
    }
  }

  function operationNeedsLiveAuthorization(operationId, input = {}) {
    if (requiredPermissionForOperation(operationId)) return true;
    // The selectable-person directory is filtered by the caller's current
    // authorization data scope. Self-contact mode is separately protected by
    // an exact current-user check and is not cacheable.
    return operationId === 'COM-004' && input?.includeContact !== true;
  }

  async function authorizeCacheRequest(operationId, requestContext, policy, input = {}) {
    if (!realtimeAuthorization || !policy || trustedSystemContexts.has(requestContext)) return requestContext;
    // Every cached read still requires a live authenticated session identity.
    // A permission-table round trip is only required when the operation's
    // authorization decision or result projection actually depends on it.
    // This lets identity-isolated ordinary reads inspect committed fresh/stale
    // data immediately instead of spending most of the 25-second task budget
    // before the cache lookup. Permission-gated/admin reads and COM-004's
    // scoped directory retain the real-time authorization path below.
    requireIdentity(requestContext);
    if (!operationNeedsLiveAuthorization(operationId, input)) return requestContext;
    const authorizedContext = await authorizeRequestContext(requestContext);
    const access = authorizedContext.verifiedAuthorization;
    const requiredPermission = requiredPermissionForOperation(operationId);
    if (!permissionAllowsCode(access.permissions, requiredPermission)) {
      throw new FeishuProxyError('PERMISSION_DENIED', '当前用户无权访问该接口', 403);
    }
    return authorizedContext;
  }

  async function readCurrentContactProjection(requestContext) {
    const { identity, userId } = requireIdentity(requestContext);
    const projection = await getContactProjection();
    const contact = projection.users.find(item => item.userId === userId) || {};
    return {
      userId,
      employeeNo: valueToText(contact.employeeNo) || valueToText(identity.employeeNo),
      displayName: valueToText(identity.displayName) || valueToText(contact.displayName),
      avatarUrl: valueToText(identity.avatarUrl) || valueToText(contact.avatarUrl) || null,
      tenantId: valueToText(identity.tenantKey),
      tenantName: valueToText(contact.orgName),
      orgId: valueToText(contact.orgId),
      orgName: valueToText(contact.orgName),
      departmentId: valueToText(contact.departmentId),
      departmentName: valueToText(contact.departmentName)
    };
  }

  async function readCurrentContactSummary(requestContext) {
    const { identity, userId } = requireIdentity(requestContext);
    const localSummary = {
      userId,
      employeeNo: valueToText(identity.employeeNo),
      displayName: valueToText(identity.displayName),
      avatarUrl: valueToText(identity.avatarUrl) || null,
      tenantId: valueToText(identity.tenantKey),
      tenantName: '',
      orgId: '',
      orgName: '',
      departmentId: '',
      departmentName: ''
    };
    const contactUserId = valueToText(identity.userId);
    if (typeof client.getContactUser !== 'function' || !contactUserId) return localSummary;
    const contact = await runWithSyncSlot(() => client.getContactUser(contactUserId, syncRequestOptions()));
    return {
      ...localSummary,
      displayName: localSummary.displayName || valueToText(contact?.displayName)
    };
  }

  async function readCurrentUserProjectionUnshared(requestContext) {
    const { identity, userId } = requireIdentity(requestContext);
    const userFilter = identityFilter('用户字典', ['AD账号', '用户ID'], userId);
    const permissionFilter = identityFilter('用户权限', ['AD账号', '主体ID'], userId);
    const verifiedAuthorization = requestContext?.verifiedAuthorization?.userId === userId
      ? requestContext.verifiedAuthorization
      : null;
    const [userRows, permissionRows] = await Promise.all([
      readAll('用户字典', PROFILE_FIELDS.user, { filter: userFilter }),
      verifiedAuthorization
        ? Promise.resolve([])
        : authorizationReadScope.run(true, () => readAll('用户权限', PROFILE_FIELDS.permissions, { filter: permissionFilter }))
    ]);
    const user = userRows.find(record => {
      const fields = record?.fields || {};
      return userDictionaryAccount(fields) === userId;
    })?.fields || {};
    const permissions = permissionRows.filter(record => {
      const fields = record?.fields || {};
      return permissionSubjectIdentifier(fields) === userId && permissionRecordActive(fields);
    });
    const permissionCodes = verifiedAuthorization
      ? [...new Set((verifiedAuthorization.permissions || []).map(String).filter(Boolean))]
      : [...new Set(permissions.map(record => valueToText(record?.fields?.['权限编码'])).filter(Boolean))];
    const availableOrgIds = [...new Set([
      valueToText(user['组织ID']),
      ...(verifiedAuthorization?.dataScope || []),
      ...permissions.flatMap(record => valueToList(record?.fields?.['数据范围']))
    ].filter(Boolean))];
    const displayName = valueToText(user['姓名']) || valueToText(identity.displayName);
    if (!trustedSystemContexts.has(requestContext)
        && !isFormalDisplayName(displayName, [userId, identity.userId, identity.openId, identity.adAccount])) {
      throw new FeishuProxyError('NAME_PROJECTION_INCOMPLETE', '当前用户正式姓名未完成投影', 422, { retryable: false });
    }
    return {
      userId, employeeNo: valueToText(user['工号']) || valueToText(identity.employeeNo), displayName,
      avatarFileId: null, avatarUrl: valueToText(identity.avatarUrl) || null,
      mobileMasked: valueToText(user['手机号脱敏值']) || null, emailMasked: valueToText(user['邮箱脱敏值']) || null,
      tenantId: valueToText(identity.tenantKey), tenantName: valueToText(user['组织名称']), orgId: valueToText(user['组织ID']), orgName: valueToText(user['组织名称']),
      departmentId: valueToText(user['所属部门ID']), departmentName: valueToText(user['所属部门名称']), roles: [], permissions: permissionCodes,
      availableOrgIds, unreadMessageCount: 0,
      favoriteCount: 0, pointBalance: 0, lastLoginAt: '', locale: 'zh-CN', timezone: 'Asia/Shanghai'
    };
  }

  function readCurrentUserProjection(requestContext) {
    const identity = requestContext?.identity || {};
    const sharedBatch = sharedReadBatchScope.getStore();
    const key = fingerprintReadIsolation({
      projection: 'current-user',
      tenantKey: valueToText(identity.tenantKey || identity.tenantId),
      userId: valueToText(identity.adAccount || identity.userId || identity.openId),
      authorization: syncAuthorizationFingerprint(requestContext)
    });
    // The final COM-001/WB-001 cache remains identity and authorization scoped.
    // Forcing the lower filtered table reads to be strong here made every
    // homepage request bypass safe per-user table snapshots, causing seven or
    // more reads to contend for the three global Feishu slots. Shared batches
    // still deduplicate this projection across COM-001, COM-002 and WB-001.
    return sharedBatchPromise(key, () => readCurrentUserProjectionUnshared(requestContext));
  }

  async function requirePermission(requestContext, permissionCode) {
    const currentUserId = valueToText(requestContext?.identity?.adAccount || requestContext?.identity?.userId);
    const verified = requestContext?.verifiedAuthorization;
    const user = verified?.userId === currentUserId ? verified : await readCurrentAuthorization(requestContext);
    if (!permissionAllowsCode(user.permissions, permissionCode)) {
      throw new FeishuProxyError('PERMISSION_DENIED', '当前用户无权访问该管理接口', 403);
    }
    return user;
  }

  const navigationCatalog = Object.freeze([
    { menuId: 'workbench', parentId: '', code: 'workbench', name: '首页工作台', path: '/workbench', permissionCode: '' },
    { menuId: 'materials', parentId: '', code: 'materials', name: '素材中心', path: '/materials', permissionCode: 'materials.view' },
    { menuId: 'talent', parentId: '', code: 'talent', name: '人才管理', path: '/talent/people', permissionCode: 'talent.view' },
    { menuId: 'apps', parentId: '', code: 'apps', name: '应用中心', path: '/apps', permissionCode: 'apps.view' },
    { menuId: 'training', parentId: '', code: 'training', name: '培训课堂', path: '/training', permissionCode: 'training.view' },
    { menuId: 'points', parentId: '', code: 'points', name: '积分中心', path: '/points', permissionCode: 'points.view' },
    { menuId: 'certification', parentId: '', code: 'certification', name: '数字化认证', path: '/certification', permissionCode: 'certification.view' },
    { menuId: 'operations', parentId: '', code: 'operations', name: '运营管理', path: '/operations', permissionCode: 'operations.dashboard.view' },
    { menuId: 'announcements', parentId: '', code: 'announcements', name: '公告通知', path: '/announcements', permissionCode: 'announcements.view' },
    { menuId: 'admin', parentId: '', code: 'admin', name: '后台管理', path: '/admin', permissionCode: 'admin.view' },
    { menuId: 'profile', parentId: '', code: 'profile', name: '个人中心', path: '/profile', permissionCode: '' }
  ]);

  async function executeCurrentNavigation(input, requestContext) {
    assertAllowedInput(input, ['platform']);
    if (input.platform != null && input.platform !== 'WEB') throw new FeishuProxyError('INVALID_OPERATION_INPUT', '当前导航接口仅支持 WEB', 400);
    const user = await readCurrentUserProjection(requestContext);
    const permissions = new Set(user.permissions);
    const wildcard = permissions.has('*') || permissions.has('admin.*');
    const allowed = code => !code || wildcard || permissions.has(code) || [...permissions].some(item => item.endsWith('.*') && code.startsWith(item.slice(0, -1)));
    const menus = navigationCatalog.filter(item => allowed(item.permissionCode)).map((item, index) => ({
      menuId: item.menuId, parentId: item.parentId, code: item.code, name: item.name, path: item.path,
      iconFileId: '', iconUrl: '', sortOrder: index + 1, visible: true, enabled: true, children: []
    }));
    const actions = user.permissions.map(permissionCode => ({ permissionCode, resourceType: 'ACTION', resourceId: null, allowed: true, reason: null }));
    return { menus, actions, defaultPath: menus[0]?.path || '/workbench' };
  }

  function todoFromRecord(record, businessType, userLookup, appLookup) {
    const fields = record?.fields || {};
    const applicantId = valueToText(fields['申请人ID']);
    const businessId = valueToText(fields['主键'] || fields['申请单号'] || fields['申请编号']) || String(record?.record_id || '');
    const appId = valueToText(fields['应用ID'] || fields['关联应用ID']);
    const statusCode = valueToText(fields['本地状态'] || fields['状态']);
    return {
      todoId: `${businessType}:${businessId}`, businessType, businessId,
      title: `${appLookup.get(appId)?.name || appId || '应用'}${businessType === 'APP_ONBOARDING' ? '上架申请' : businessType === 'APP_REUSE' ? '复用申请' : '使用申请'}`,
      applicantId, applicantName: resolvePersonDisplayName(userLookup, applicantId, 'todo.applicant'),
      submittedAt: valueToText(fields['提交时间'] || fields['申请时间']), statusCode, statusName: statusCode,
      currentNode: valueToText(fields['当前审批节点']), currentAssigneeNames: [], completedAt: valueToText(fields['完成时间']) || null,
      resultMessage: valueToText(fields['退回原因']) || null, detailPath: `/applications/${encodeURIComponent(businessId)}`
    };
  }

  async function readCurrentTodos(userId) {
    const useFilter = equalityFilter('使用申请', '申请人ID', userId);
    const onboardingFilter = equalityFilter('上架申请', '申请人ID', userId);
    const reuseFilter = equalityFilter('应用复用申请', '申请人ID', userId);
    const [useRows, onboardingRows, reuseRows, userRows, appRows] = await Promise.all([
      readAll('使用申请', PROFILE_FIELDS.useApplications, { filter: useFilter }),
      readAll('上架申请', PROFILE_FIELDS.onboardingApplications, { filter: onboardingFilter }),
      readAll('应用复用申请', PROFILE_FIELDS.reuseApplications, { filter: reuseFilter }),
      readAll('用户字典', PROFILE_FIELDS.user), readAll('应用索引', PROFILE_FIELDS.apps)
    ]);
    const users = createUserDictionaryLookup(userRows, '姓名');
    const apps = new Map(appRows.map(record => {
      const fields = record?.fields || {};
      return [valueToText(fields['应用ID']), { name: valueToText(fields['应用名称']) }];
    }).filter(([appId]) => appId));
    return [
      ...useRows.map(record => todoFromRecord(record, 'APP_USE', users, apps)),
      ...onboardingRows.map(record => todoFromRecord(record, 'APP_ONBOARDING', users, apps)),
      ...reuseRows.map(record => todoFromRecord(record, 'APP_REUSE', users, apps))
    ].filter(item => item.businessId && item.applicantId === userId);
  }

  async function executeWorkbenchPersonal(operationId, input, requestContext) {
    const { userId } = requireIdentity(requestContext);
    if (operationId === 'WB-004') {
      assertAllowedInput(input, ['keyword', 'businessType', 'status', 'startAt', 'endAt', 'page', 'pageSize', 'sort']);
      const { page, pageSize } = publicPage(input);
      const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      const sort = input.sort || 'submittedAt,desc';
      if (!['submittedAt,desc', 'submittedAt,asc'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '待办排序方式不受支持', 400);
      let items = (await readCurrentTodos(userId)).filter(item => (!keyword || item.title.toLocaleLowerCase('zh-CN').includes(keyword))
        && (!input.businessType || item.businessType === input.businessType) && (!input.status || item.statusCode === input.status)
        && (!input.startAt || item.submittedAt >= input.startAt) && (!input.endAt || item.submittedAt <= input.endAt));
      items.sort((left, right) => sort.endsWith('asc') ? left.submittedAt.localeCompare(right.submittedAt) : right.submittedAt.localeCompare(left.submittedAt));
      return { ...paginatePublic(items, page, pageSize), sort, filtersApplied: { keyword: valueToText(input.keyword), businessType: valueToText(input.businessType), status: valueToText(input.status), startAt: valueToText(input.startAt), endAt: valueToText(input.endAt) } };
    }

    if (operationId === 'WB-003') {
      assertAllowedInput(input, ['recentMessageLimit', 'todoLimit']);
      const recentMessageLimit = input.recentMessageLimit == null ? 5 : Number(input.recentMessageLimit);
      const todoLimit = input.todoLimit == null ? 5 : Number(input.todoLimit);
      if (![recentMessageLimit, todoLimit].every(value => Number.isInteger(value) && value >= 1 && value <= 20)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '聚合条数必须是 1 至 20 的整数', 400);
      const statsFilter = equalityFilter('用户累计统计', '用户ID', userId);
      const monthFilter = equalityFilter('用户月度统计', '用户ID', userId);
      const messageFilter = equalityFilter('消息通知', '接收人ID', userId);
      const [user, statsRows, monthRows, messageRows, userRows, todos] = await Promise.all([
        readCurrentUserProjection(requestContext),
        readAll('用户累计统计', PROFILE_FIELDS.cumulativeStats, { filter: statsFilter }),
        readAll('用户月度统计', PROFILE_FIELDS.monthlyStats, { filter: monthFilter }),
        readAll('消息通知', PROFILE_FIELDS.messages, { filter: messageFilter }),
        readAll('用户字典', PROFILE_FIELDS.user), readCurrentTodos(userId)
      ]);
      const stats = statsRows.find(record => valueToText(record?.fields?.['用户ID']) === userId)?.fields || {};
      const latestMonth = monthRows.filter(record => valueToText(record?.fields?.['用户ID']) === userId).sort((a, b) => valueToText(b?.fields?.['年月']).localeCompare(valueToText(a?.fields?.['年月'])))[0]?.fields || {};
      const users = createUserDictionaryLookup(userRows, '姓名');
      const recentMessages = messageRows.filter(record => valueToText(record?.fields?.['接收人ID']) === userId).map(record => messageFromRecord(record, users))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, recentMessageLimit)
        .map(item => ({ messageId: item.messageId, typeName: item.typeName, title: item.title, occurredAt: item.occurredAt, isRead: item.isRead, targetType: item.targetType, targetId: item.targetId, targetPath: item.targetPath }));
      const quickEntries = [
        ['favorites', '我的收藏', '查看已收藏应用', '/favorites', 'favorites.view'], ['points', '我的积分', '查看积分余额与明细', '/points', 'points.view'],
        ['messages', '消息中心', '查看消息通知', '/messages', 'messages.view'], ['todos', '我的申请', '查看申请进度', '/apps/onboarding/status', 'applications.view']
      ].map(([code, name, description, path, permissionCode]) => ({ code, name, description, path, iconUrl: '', permissionCode, enabled: code === 'todos' || user.permissions.includes(permissionCode) || user.permissions.includes('*') }));
      return {
        user, stats: { pointBalance: user.pointBalance, favoriteCount: user.favoriteCount, appVisitCount: valueToNumber(stats['累计访问应用次数']), appUseCount: valueToNumber(stats['累计使用应用次数']), pointMonthIncrease: valueToNumber(latestMonth['当月使用次数']) },
        quickEntries, recentMessages,
        todos: todos.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, todoLimit).map(item => ({ todoId: item.todoId, businessType: item.businessType, businessId: item.businessId, title: item.title, submittedAt: item.submittedAt, statusCode: item.statusCode, statusName: item.statusName, detailPath: item.detailPath }))
      };
    }

    assertAllowedInput(input, ['statDate', 'scene', 'keyword', 'hotLimit', 'courseLimit', 'noticeLimit']);
    const hotLimit = input.hotLimit == null ? 4 : Number(input.hotLimit);
    const courseLimit = input.courseLimit == null ? 3 : Number(input.courseLimit);
    const noticeLimit = input.noticeLimit == null ? 4 : Number(input.noticeLimit);
    if (![hotLimit, courseLimit, noticeLimit].every(value => Number.isInteger(value) && value >= 1 && value <= 20)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '工作台聚合条数必须是 1 至 20 的整数', 400);
    const statsFilter = equalityFilter('用户累计统计', '用户ID', userId);
    const monthFilter = equalityFilter('用户月度统计', '用户ID', userId);
    const [user, appProjection, courseRows, announcementProjection, statRows, monthRows] = await Promise.all([
      readCurrentUserProjection(requestContext), getAppProjection(), readAll('培训课程'), getAnnouncementProjection(),
      readAll('用户累计统计', PROFILE_FIELDS.cumulativeStats, { filter: statsFilter }),
      readAll('用户月度统计', PROFILE_FIELDS.monthlyStats, { filter: monthFilter })
    ]);
    const stats = statRows.find(record => valueToText(record?.fields?.['用户ID']) === userId)?.fields || {};
    const months = monthRows.filter(record => valueToText(record?.fields?.['用户ID']) === userId).sort((a, b) => valueToText(b?.fields?.['年月']).localeCompare(valueToText(a?.fields?.['年月'])));
    const currentMonth = months[0]?.fields || {}; const previousMonth = months[1]?.fields || {};
    const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
    const apps = appProjection.items.filter(item => (!input.scene || item.sceneIds.includes(input.scene) || item.sceneNames.includes(input.scene))
      && (!keyword || `${item.name} ${item.summary}`.toLocaleLowerCase('zh-CN').includes(keyword)));
    const typeCounts = new Map();
    for (const app of apps) typeCounts.set(app.typeCode, { typeCode: app.typeCode, typeName: app.typeName, iconUrl: '', count: (typeCounts.get(app.typeCode)?.count || 0) + 1, detailQuery: { typeCode: app.typeCode } });
    const nowDate = now(); const hour = nowDate.getHours(); const period = hour < 6 ? '凌晨' : hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
    const dataAsOf = valueToText(input.statDate) || nowDate.toISOString();
    const announcements = announcementProjection.items.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, noticeLimit).map(item => ({ announcementId: item.announcementId, typeName: item.category, title: item.title, publishedAt: item.publishedAt, isRead: false, detailPath: `/announcements/${encodeURIComponent(item.announcementId)}` }));
    return {
      greeting: { period, name: user.displayName, text: `${period}好，${user.displayName}` },
      profile: { userId, displayName: user.displayName, avatarUrl: user.avatarUrl, departmentName: user.departmentName },
      dataAsOf, lastUpdatedAt: nowDate.toISOString(), hero: { title: '数智产品展厅', subtitle: '探索更卓越的应用，助力业务高效运营', imageUrl: '' },
      appTypeOverview: [...typeCounts.values()], hotApps: [...apps].sort((a, b) => b.usageCount - a.usageCount).slice(0, hotLimit),
      courses: courseRows.map(courseFromRecord).filter(item => item.courseId && item.title).slice(0, courseLimit), announcements,
      usage: {
        appVisitCount: valueToNumber(stats['累计访问应用次数']), appUseCount: valueToNumber(stats['累计使用应用次数']), favoriteAppCount: user.favoriteCount,
        visitChange: valueToNumber(currentMonth['当月访问次数']) - valueToNumber(previousMonth['当月访问次数']),
        useChange: valueToNumber(currentMonth['当月使用次数']) - valueToNumber(previousMonth['当月使用次数']),
        favoriteChange: valueToNumber(currentMonth['当月收藏次数']) - valueToNumber(previousMonth['当月收藏次数']), comparisonPeriod: 'PREVIOUS_MONTH'
      }
    };
  }

  function normalizedApplicationStatus(fields) {
    return valueToText(fields['本地状态'] || fields['状态']).toLocaleUpperCase('zh-CN') || 'UNKNOWN';
  }

  async function executeIdentityDetail(operationId, input, requestContext) {
    const { userId } = requireIdentity(requestContext);
    if (operationId === 'APP-010') {
      assertAllowedInput(input, ['applicationId', 'includeHistory']);
      const applicationId = valueToText(input.applicationId);
      if (!applicationId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '申请进度必须提供 applicationId', 400);
      const [useRows, onboardingRows, reuseRows, submissionRows, userRows, projection] = await Promise.all([
        readAll('使用申请'), readAll('上架申请'), readAll('应用复用申请'), readAll('外部成果提交记录'), readAll('用户字典'), getAppProjection()
      ]);
      const candidates = [
        ...useRows.map(record => ({ record, businessType: 'APP_USE' })),
        ...onboardingRows.map(record => ({ record, businessType: 'APP_ONBOARDING' })),
        ...reuseRows.map(record => ({ record, businessType: 'APP_REUSE' }))
      ];
      const found = candidates.find(({ record }) => {
        const fields = record?.fields || {};
        return [fields['主键'], fields['申请编号'], fields['申请单号'], record?.record_id].map(valueToText).includes(applicationId);
      });
      if (!found || valueToText(found.record?.fields?.['申请人ID']) !== userId) {
        throw new FeishuProxyError('RESOURCE_NOT_FOUND', '申请不存在或不属于当前用户', 404);
      }
      const fields = found.record.fields || {};
      const appId = valueToText(fields['应用ID'] || fields['关联应用ID']);
      const app = projection.items.find(item => item.appId === appId);
      const applicantName = valueToText(userRows.find(record => userDictionaryAccount(record?.fields) === userId)?.fields?.['姓名']);
      const applicationNo = valueToText(fields['申请编号'] || fields['申请单号'] || fields['主键']) || applicationId;
      const status = normalizedApplicationStatus(fields);
      const submission = submissionRows.find(record => {
        const current = record?.fields || {};
        return valueToText(current['上架申请ID']) === applicationId || (found.businessType === 'APP_ONBOARDING' && valueToText(current['应用ID']) === appId);
      })?.fields || {};
      const externalStatus = valueToText(submission['外部提交状态']).toLocaleUpperCase('zh-CN') || 'NOT_SUBMITTED';
      const submittedAt = valueToText(fields['提交时间'] || fields['申请时间']);
      const completedAt = valueToText(fields['完成时间']) || null;
      const steps = input.includeHistory === false ? [] : [
        { stepCode: 'SUBMITTED', stepName: '提交申请', statusCode: submittedAt ? 'COMPLETED' : 'PENDING', statusName: submittedAt ? '已完成' : '待提交', startedAt: submittedAt || null, completedAt: submittedAt || null },
        { stepCode: 'LOCAL_PROCESSING', stepName: '本地处理', statusCode: ['COMPLETED', 'APPROVED'].includes(status) ? 'COMPLETED' : ['REJECTED', 'CANCELLED'].includes(status) ? status : 'PROCESSING', statusName: status, startedAt: submittedAt || null, completedAt },
        { stepCode: 'EXTERNAL_SUBMISSION', stepName: '外部提交', statusCode: externalStatus, statusName: externalStatus, startedAt: valueToText(submission['最后尝试时间']) || null, completedAt: valueToText(submission['外部提交时间']) || null }
      ];
      return {
        applicationId, applicationNo, businessType: found.businessType, resourceId: appId, resourceName: app?.name || appId,
        applicantId: userId, applicantName, submissionChannel: valueToText(submission['渠道']) || 'INTERNAL', submittedAt,
        localStatusCode: status, localStatusName: status, externalSubmissionStatus: externalStatus,
        externalReferenceNo: valueToText(submission['外部引用编号']) || null, externalSubmittedAt: valueToText(submission['外部提交时间']) || null,
        failureCode: valueToText(submission['失败编码']) || null, failureMessage: valueToText(submission['失败信息']) || null,
        steps, canWithdraw: ['DRAFT', 'SUBMITTED', 'PENDING'].includes(status), canResubmit: ['REJECTED', 'FAILED'].includes(status),
        updatedAt: valueToText(fields['更新时间'] || fields['完成时间'] || fields['提交时间'] || fields['申请时间'])
      };
    }

    if (operationId === 'COM-010') {
      assertAllowedInput(input, ['exportId']);
      const exportId = valueToText(input.exportId);
      if (!exportId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '导出任务必须提供 exportId', 400);
      const record = (await readAll('导出任务')).find(item => valueToText(item?.fields?.['导出任务ID']) === exportId);
      const fields = record?.fields || {};
      if (!record || valueToText(fields['创建用户ID']) !== userId) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '导出任务不存在或不属于当前用户', 404);
      const fileId = valueToText(fields['文件ID']);
      return {
        exportId, exportType: valueToText(fields['导出类型']), status: valueToText(fields['状态']), progress: valueToNumber(fields['进度']),
        totalRows: valueToNumber(fields['总行数']), processedRows: valueToNumber(fields['已处理行数']),
        file: fileId ? { fileId, fileName: '', mimeType: '', sizeBytes: 0, downloadPath: `/api/v1/files/${encodeURIComponent(fileId)}/access-url` } : null,
        failureCode: valueToText(fields['失败编码']) || null, failureMessage: valueToText(fields['失败信息']) || null,
        createdAt: valueToText(fields['创建时间']), finishedAt: valueToText(fields['完成时间']) || null, expiresAt: valueToText(fields['过期时间']) || null
      };
    }

    if (operationId === 'TRN-006') {
      assertAllowedInput(input, ['courseId', 'sourcePage', 'deviceId']);
      const courseId = valueToText(input.courseId);
      if (!courseId || !valueToText(input.sourcePage)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '学习入口必须提供 courseId 和 sourcePage', 400);
      const [courseRows, registrationRows] = await Promise.all([readAll('培训课程'), readAll('培训报名')]);
      const course = courseRows.find(record => valueToText(record?.fields?.['课程ID']) === courseId);
      if (!course) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '课程不存在或不可见', 404);
      const fields = course.fields || {};
      const registration = registrationRows.find(record => valueToText(record?.fields?.['课程ID']) === courseId && valueToText(record?.fields?.['用户ID']) === userId)?.fields || {};
      const registrationStatus = valueToText(registration['状态']).toLocaleUpperCase('zh-CN');
      const launchUrl = valueToText(fields['学习入口URL']);
      const expiresAt = valueToText(fields['入口过期时间']) || null;
      const liveStatus = valueToText(fields['直播状态']).toLocaleUpperCase('zh-CN') || valueToText(fields['状态']) || 'UNKNOWN';
      let reasonCode = null;
      if (!['REGISTERED', 'ATTENDED', 'COMPLETED'].includes(registrationStatus)) reasonCode = 'NOT_REGISTERED';
      else if (!launchUrl) reasonCode = 'LAUNCH_URL_NOT_CONFIGURED';
      else if (expiresAt && expiresAt <= now().toISOString()) reasonCode = 'LAUNCH_URL_EXPIRED';
      else if (['ENDED', 'CANCELLED', 'CLOSED'].includes(liveStatus)) reasonCode = 'COURSE_NOT_AVAILABLE';
      return { allowed: !reasonCode, reasonCode, launchUrl: reasonCode ? null : launchUrl, expiresAt: reasonCode ? null : expiresAt, liveStatus, attendanceToken: null };
    }

    assertAllowedInput(input, ['certificationId']);
    const certificationId = valueToText(input.certificationId);
    if (!certificationId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '认证详情必须提供 certificationId', 400);
    const [projectRows, sessionRows, bookingRows] = await Promise.all([readAll('认证项目'), readAll('考试场次'), readAll('考试预约')]);
    const record = projectRows.find(item => valueToText(item?.fields?.['认证编码']) === certificationId);
    if (!record) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '认证项目不存在或不可见', 404);
    const fields = record.fields || {};
    const base = certificationFromRecord(record);
    const sessions = sessionRows.filter(item => valueToText(item?.fields?.['认证项目ID']) === certificationId).map(item => {
      const current = item.fields || {}; const capacity = valueToNumber(current['容量']); const reserved = valueToNumber(current['已预约人数']);
      return { sessionId: valueToText(current['场次编码']) || String(item.record_id || ''), siteName: valueToText(current['考试地点']) || valueToText(current['场次名称']), startAt: valueToText(current['考试开始']), endAt: valueToText(current['考试结束']), capacity, remaining: Math.max(0, capacity - reserved), statusCode: valueToText(current['状态']) };
    });
    const sites = new Map();
    for (const session of sessions) {
      const siteId = session.siteName || 'UNASSIGNED'; const site = sites.get(siteId) || { siteId, name: session.siteName, address: session.siteName, capacity: 0, remaining: 0, examSessions: [] };
      site.capacity += session.capacity; site.remaining += session.remaining;
      site.examSessions.push({ sessionId: session.sessionId, startAt: session.startAt, endAt: session.endAt, remaining: session.remaining }); sites.set(siteId, site);
    }
    const booking = bookingRows.find(item => valueToText(item?.fields?.['认证项目ID']) === certificationId && valueToText(item?.fields?.['用户ID']) === userId)?.fields || {};
    const bookingStatus = valueToText(booking['状态']) || null;
    return {
      ...base, descriptionHtml: valueToText(fields['认证说明']), requirements: valueToList(fields['适用人群']),
      syllabus: [valueToText(fields['考试规则']), valueToText(fields['通过规则'])].filter(Boolean), trainingCourseIds: [], examSites: [...sites.values()], attachments: [],
      myStatus: { registered: Boolean(valueToText(booking['预约编号'])) && bookingStatus !== 'CANCELLED', bookingId: valueToText(booking['预约编号']) || null, result: bookingStatus, certificateNo: null }
    };
  }

  async function executeAdminRead(operationId, input, requestContext) {
    await requirePermission(requestContext, requiredPermissionForOperation(operationId));
    if (operationId === 'INT-003') {
      assertAllowedInput(input, ['domainCodes', 'connectionCodes', 'checkTables', 'checkFields', 'checkViews', 'checkPermissions', 'createMissingFields', 'dryRun', 'reason']);
      if (input.createMissingFields === true || input.dryRun === false) throw new FeishuProxyError('SCHEMA_WRITE_NOT_ALLOWED', '结构核验读接口只允许 dryRun，不能创建字段', 403);
      const expectedTables = [...identifierContract.byName.values()];
      return { taskId: `SCHEMA_AUDIT_${traceIdFactory()}`, status: 'SUCCEEDED', checkedTables: expectedTables.length, missingTables: [], missingFields: [], typeMismatchFields: [], renamedFields: [], orphanFields: [], permissionFailures: [], viewFailures: [], changePlan: [] };
    }

    if (operationId === 'INT-005') {
      assertAllowedInput(input, ['connectionCode', 'viewId', 'pageToken', 'startModifiedAt', 'endModifiedAt', 'sampleLimit', 'checkRequiredFields', 'checkBusinessKeyDuplicate', 'checkBrokenLinks', 'idempotencyKey']);
      const connectionCode = valueToText(input.connectionCode); const idempotencyKey = valueToText(input.idempotencyKey);
      if (!connectionCode || !idempotencyKey) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '完整性预检必须提供 connectionCode 和 idempotencyKey', 400);
      const sampleLimit = input.sampleLimit == null ? 100 : Number(input.sampleLimit); if (!Number.isInteger(sampleLimit) || sampleLimit < 1 || sampleLimit > 1000) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'sampleLimit 必须是 1 至 1000 的整数', 400);
      const connection = (await readAll('多维表连接配置')).find(record => valueToText(record?.fields?.['连接编码']) === connectionCode);
      if (!connection) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '连接配置不存在或不可见', 404);
      const differences = (await readAll('完整性差异记录')).filter(record => valueToText(record?.fields?.['执行ID']) === idempotencyKey).slice(0, sampleLimit);
      const counts = code => differences.filter(record => valueToText(record?.fields?.['差异类型']) === code).length;
      return { taskId: `DIFF_${idempotencyKey}`, status: 'SUCCEEDED', readCount: 0, emptyRequiredCount: counts('MISSING'), duplicateBusinessKeyCount: counts('DUPLICATE'), brokenLinkCount: counts('BROKEN_LINK'), invalidOptionCount: counts('INVALID_OPTION'), typeMismatchCount: counts('TYPE_MISMATCH'), samples: differences.map(record => ({ recordIdMasked: `${String(record.record_id || '').slice(0, 4)}***`, businessKeyMasked: `${valueToText(record?.fields?.['资源ID']).slice(0, 4)}***`, problemCode: valueToText(record?.fields?.['差异类型']), fieldIdMasked: `${valueToText(record?.fields?.['字段编码']).slice(0, 4)}***`, currentValueMasked: valueToText(record?.fields?.['差异摘要']) })), lastPageToken: valueToText(input.pageToken) };
    }

    if (operationId === 'ADM-006') {
      assertAllowedInput(input, ['period', 'startAt', 'endAt']);
      const [connections, logs, jobs, incidents, archives] = await Promise.all([readAll('多维表连接配置'), readAll('接口调用日志'), readAll('后台任务执行记录'), readAll('异常处理记录'), readAll('归档任务')]);
      const integrations = connections.map(record => { const fields = record?.fields || {}; const code = valueToText(fields['连接编码']); const related = logs.filter(log => valueToText(log?.fields?.['集成ID']) === code); const success = related.filter(log => /SUCCESS|SUCCEEDED|OK/i.test(valueToText(log?.fields?.['状态']))); const lastSuccess = success.sort((a, b) => valueToText(b?.fields?.['结束时间']).localeCompare(valueToText(a?.fields?.['结束时间'])))[0]?.fields || {}; const failure = related.filter(log => /FAIL|ERROR/i.test(valueToText(log?.fields?.['状态']))).sort((a, b) => valueToText(b?.fields?.['结束时间']).localeCompare(valueToText(a?.fields?.['结束时间'])))[0]?.fields || {}; return { integrationCode: code, name: valueToText(fields['连接名称']), status: valueToText(fields['最后健康状态']) || 'DEGRADED', successRate: related.length ? Number((success.length * 100 / related.length).toFixed(2)) : 0, avgDurationMs: related.length ? Math.round(related.reduce((sum, log) => sum + valueToNumber(log?.fields?.['耗时毫秒']), 0) / related.length) : 0, lastSuccessAt: valueToText(lastSuccess['结束时间']), lastFailureAt: valueToText(failure['结束时间']) }; });
      const jobStatus = status => jobs.filter(record => valueToText(record?.fields?.['状态']) === status).length;
      return { integrations, jobs: { running: jobStatus('RUNNING'), failed: jobStatus('FAILED'), retrying: jobStatus('RETRYING'), success: jobStatus('SUCCEEDED') }, incidents: { open: incidents.filter(record => valueToText(record?.fields?.['状态']) === 'OPEN').length, critical: incidents.filter(record => valueToText(record?.fields?.['严重级别']) === 'CRITICAL').length, resolved: incidents.filter(record => valueToText(record?.fields?.['状态']) === 'RESOLVED').length }, archives: { running: archives.filter(record => valueToText(record?.fields?.['状态']) === 'RUNNING').length, failed: archives.filter(record => valueToText(record?.fields?.['状态']) === 'FAILED').length, lastSuccessAt: valueToText(archives.filter(record => valueToText(record?.fields?.['状态']) === 'SUCCEEDED').sort((a, b) => valueToText(b?.fields?.['更新时间']).localeCompare(valueToText(a?.fields?.['更新时间'])))[0]?.fields?.['更新时间']) }, storage: { usedBytes: 0, archiveBytes: 0, tempBytes: 0 }, generatedAt: now().toISOString() };
    }

    if (operationId === 'ADM-007') {
      assertAllowedInput(input, ['subjectType', 'subjectId', 'resourceType', 'resourceId', 'permissionCode', 'evaluationAt', 'context']);
      const subjectType = valueToText(input.subjectType); const subjectId = valueToText(input.subjectId); const permissionCode = valueToText(input.permissionCode);
      if (!['USER', 'ROLE', 'ORG'].includes(subjectType) || !subjectId || !permissionCode) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '权限预览主体和权限编码无效', 400);
      const evaluationAt = valueToText(input.evaluationAt) || now().toISOString();
      const matchedRules = (await readAll('用户权限')).filter(record => { const fields = record?.fields || {}; return valueToText(fields['主体类型'] || 'USER') === subjectType && permissionSubjectIdentifier(fields) === subjectId && valueToText(fields['权限编码']) === permissionCode && permissionRecordActive(fields); }).map(record => { const fields = record?.fields || {}; return { permissionId: valueToText(fields['主键']) || String(record?.record_id || ''), subjectType, subjectId, permissionCode, dataScope: valueToText(fields['数据范围']), effectiveFrom: valueToText(fields['生效时间']), effectiveTo: valueToText(fields['失效时间']) || null, decision: 'ALLOW' }; });
      return { allowed: matchedRules.length > 0, matchedRules, finalDataScope: matchedRules.map(item => item.dataScope).filter(Boolean).join(','), deniedReasonCode: matchedRules.length ? null : 'NO_MATCHED_RULE', evaluatedAt: evaluationAt };
    }
    if (operationId === 'OPS-001') {
      assertAllowedInput(input, ['period', 'startDate', 'endDate', 'orgId', 'timezone', 'topN']);
      const period = input.period || 'WEEK'; const timezone = valueToText(input.timezone) || 'Asia/Shanghai';
      if (!['DAY', 'WEEK', 'MONTH', 'QUARTER', 'CUSTOM'].includes(period)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '运营周期不受支持', 400);
      const end = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : now();
      let start;
      if (period === 'CUSTOM') {
        if (!input.startDate || !input.endDate) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'CUSTOM 周期必须提供 startDate 和 endDate', 400);
        start = new Date(`${input.startDate}T00:00:00.000Z`);
      } else {
        const days = period === 'DAY' ? 1 : period === 'WEEK' ? 7 : period === 'MONTH' ? 30 : 90;
        start = new Date(end.getTime() - (days - 1) * 86400000); start.setUTCHours(0, 0, 0, 0);
      }
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start || end - start > 366 * 86400000) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '运营统计日期范围无效或超过 366 天', 400);
      const rangeMs = end - start + 1; const previousEnd = new Date(start.getTime() - 1); const previousStart = new Date(previousEnd.getTime() - rangeMs + 1);
      const topN = input.topN == null ? 10 : Number(input.topN); if (!Number.isInteger(topN) || topN < 1 || topN > 50) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'topN 必须是 1 至 50 的整数', 400);
      const [dailyRows, definitions, projection, announcementProjection, userRows] = await Promise.all([readAll('日统计汇总'), readAll('统计指标定义'), getAppProjection(), getAnnouncementProjection(), readAll('用户字典')]);
      const startDate = start.toISOString().slice(0, 10); const endDate = end.toISOString().slice(0, 10);
      const points = dailyRows.map(record => record?.fields || {}).filter(fields => {
        const date = valueToText(fields['统计日期']).slice(0, 10); return date >= startDate && date <= endDate && (!input.orgId || valueToText(fields['维度ID']) === input.orgId);
      });
      const byMetric = new Map();
      for (const fields of points) byMetric.set(valueToText(fields['指标编码']), (byMetric.get(valueToText(fields['指标编码'])) || 0) + valueToNumber(fields['指标值']));
      const metricDefinitions = new Map(definitions.map(record => [valueToText(record?.fields?.['指标编码']), record?.fields || {}]));
      const metricCodes = ['VISIT_COUNT', 'APP_USE_COUNT', 'ACTIVE_USER_COUNT', 'HOT_APP_COUNT', 'APPROVED_USER_COUNT'];
      const metrics = metricCodes.map(code => {
        const definition = metricDefinitions.get(code) || {}; const value = byMetric.get(code) || 0;
        return { code, label: valueToText(definition['指标名称']) || code, value, unit: valueToText(definition['单位']), previousValue: 0, changeValue: value, changeRate: 0, direction: value > 0 ? 'UP' : 'FLAT', iconUrl: '' };
      });
      const visitTrend = [...new Set(points.map(fields => valueToText(fields['统计日期']).slice(0, 10)).filter(Boolean))].sort().map(date => ({ bucketStart: date, bucketEnd: date, label: date, visitCount: points.filter(fields => valueToText(fields['统计日期']).startsWith(date) && valueToText(fields['指标编码']) === 'VISIT_COUNT').reduce((sum, fields) => sum + valueToNumber(fields['指标值']), 0), uniqueUserCount: points.filter(fields => valueToText(fields['统计日期']).startsWith(date) && valueToText(fields['指标编码']) === 'ACTIVE_USER_COUNT').reduce((sum, fields) => sum + valueToNumber(fields['指标值']), 0), appUseCount: points.filter(fields => valueToText(fields['统计日期']).startsWith(date) && valueToText(fields['指标编码']) === 'APP_USE_COUNT').reduce((sum, fields) => sum + valueToNumber(fields['指标值']), 0) }));
      const topApps = [...projection.items].sort((a, b) => b.usageCount - a.usageCount).slice(0, topN).map((app, index) => ({ rank: index + 1, appId: app.appId, appName: app.name, typeName: app.typeName, usageCount: app.usageCount, uniqueUserCount: 0, changeRate: 0 }));
      const typeCounts = new Map(); for (const app of projection.items) typeCounts.set(app.typeCode, { typeCode: app.typeCode, typeName: app.typeName, count: (typeCounts.get(app.typeCode)?.count || 0) + 1 });
      const totalApps = projection.items.length;
      return {
        period: { period, startDate, endDate, previousStartDate: previousStart.toISOString().slice(0, 10), previousEndDate: previousEnd.toISOString().slice(0, 10), timezone },
        generatedAt: now().toISOString(), dataAsOf: now().toISOString(), sourceNames: ['日统计汇总', '应用索引', '公告通知'], metrics, visitTrend, topApps,
        announcements: announcementProjection.items.slice(0, topN).map(item => ({ announcementId: item.announcementId, title: item.title, publisherOrgName: '', publishAt: item.publishedAt, viewCount: 0 })),
        userActivity: { activeUserCount: byMetric.get('ACTIVE_USER_COUNT') || 0, totalUserCount: userRows.length, activeRate: userRows.length ? Number((((byMetric.get('ACTIVE_USER_COUNT') || 0) * 100) / userRows.length).toFixed(2)) : 0, visitsPerUser: 0, appsPerUser: 0 },
        appUsageTrend: visitTrend.map(item => ({ bucketStart: item.bucketStart, label: item.label, usageCount: item.appUseCount, uniqueUserCount: item.uniqueUserCount })),
        appTypeDistribution: [...typeCounts.values()].map(item => ({ ...item, percentage: totalApps ? Number((item.count * 100 / totalApps).toFixed(2)) : 0, colorToken: '' })),
        accessSourceDistribution: [], metricDefinitionsVersion: Math.max(0, ...definitions.map(record => valueToNumber(record?.fields?.['口径版本'] || record?.fields?.['版本'])))
      };
    }

    if (operationId === 'OAN-003') {
      assertAllowedInput(input, ['announcementId']);
      const detail = await executeFirstBatchDetail('ANN-003', { announcementId: input.announcementId });
      return { ...detail, selectedScopes: [], editable: true, validationWarnings: [] };
    }
    if (operationId === 'OAN-008') {
      assertAllowedInput(input, ['announcementId', 'title', 'typeCode', 'summary', 'contentHtml', 'contentText', 'publishMode', 'publishAt', 'validFrom', 'validTo', 'scopeType', 'scopeOrgIds', 'scopeUserIds', 'scopeRoleCodes', 'isTop', 'topUntil', 'attachmentFileIds', 'relatedAppIds', 'status', 'previewMode']);
      const contentHtml = valueToText(input.contentHtml); const sanitizedContentHtml = contentHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
      const previewId = `PREVIEW_${traceIdFactory()}`; return { previewId, previewUrl: `/api/v1/operations/announcements/previews/${encodeURIComponent(previewId)}`, expiresAt: new Date(now().getTime() + 300000).toISOString(), sanitizedContentHtml, warnings: contentHtml === sanitizedContentHtml ? [] : [{ code: 'UNSAFE_CONTENT_REMOVED', message: '已移除不安全内容' }] };
    }
    if (operationId === 'OAN-001' || operationId === 'OAN-002') {
      const rows = await readAll('公告通知');
      if (operationId === 'OAN-001') {
        assertAllowedInput(input, ['startAt', 'endAt']); const today = now().toISOString().slice(0, 10); const yesterday = new Date(now().getTime() - 86400000).toISOString().slice(0, 10);
        const filtered = rows.map(record => record?.fields || {}).filter(fields => (!input.startAt || valueToText(fields['发布时间']) >= input.startAt) && (!input.endAt || valueToText(fields['发布时间']) <= input.endAt));
        const statusCount = status => filtered.filter(fields => valueToText(fields['状态']).toLocaleUpperCase('zh-CN') === status).length;
        const todayCount = filtered.filter(fields => valueToText(fields['发布时间']).startsWith(today)).length; const yesterdayCount = filtered.filter(fields => valueToText(fields['发布时间']).startsWith(yesterday)).length;
        return { totalCount: filtered.length, publishedCount: statusCount('PUBLISHED'), draftCount: statusCount('DRAFT'), scheduledCount: statusCount('SCHEDULED'), offlineCount: statusCount('OFFLINE'), expiredCount: statusCount('EXPIRED'), todayPublishedCount: todayCount, yesterdayComparison: todayCount - yesterdayCount };
      }
      assertAllowedInput(input, ['keyword', 'typeCode', 'statusCode', 'scopeType', 'scopeOrgId', 'publishStart', 'publishEnd', 'isTop', 'publisherId', 'page', 'pageSize', 'sort']);
      const { page, pageSize } = publicPage(input); const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      let items = rows.map(record => { const fields = record?.fields || {}; const statusCode = valueToText(fields['状态']); return {
        announcementId: valueToText(fields['公告ID']) || String(record?.record_id || ''), title: valueToText(fields['公告标题']), typeCode: valueToText(fields['分类']), typeName: valueToText(fields['分类']), publishAt: valueToText(fields['发布时间']), validFrom: valueToText(fields['有效期开始']), validTo: valueToText(fields['有效期结束']), scopeType: valueToText(fields['范围类型']), scopeSummary: '', statusCode, statusName: statusCode, viewCount: valueToNumber(fields['浏览量']), readCount: 0, isTop: valueToBoolean(fields['是否置顶']), publisherId: valueToText(fields['发布人ID']), publisherName: valueToText(fields['发布人ID']), updatedAt: valueToText(fields['更新时间']), version: valueToNumber(fields['版本']), permissions: { canEdit: true, canPreview: true, canPublish: true, canOffline: true, canDelete: true, canTop: true }
      }; }).filter(item => item.announcementId && (!keyword || item.title.toLocaleLowerCase('zh-CN').includes(keyword)) && (!input.typeCode || item.typeCode === input.typeCode) && (!input.statusCode || item.statusCode === input.statusCode) && (!input.scopeType || item.scopeType === input.scopeType) && (!input.publisherId || item.publisherId === input.publisherId) && (input.isTop === undefined || item.isTop === input.isTop));
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); return paginatePublic(items, page, pageSize);
    }

    if (operationId === 'OAP-003') {
      assertAllowedInput(input, ['appId', 'include']); const detail = await executeFirstBatchDetail('APP-003', { appId: input.appId, include: input.include });
      return { ...detail, media: [], owners: [{ userId: detail.ownerId, userName: detail.ownerName, orgId: detail.responsibleOrgId, orgName: detail.responsibleOrgName, ownerRole: 'OWNER' }].filter(item => item.userId), resourcePermissions: [], submission: null, validationWarnings: [], editable: true };
    }
    if (operationId === 'OAP-006') {
      assertAllowedInput(input, ['appId', 'typeCode', 'schemaVersion', 'publicData', 'typeExtension', 'submissionChannel', 'resourcePermissions']);
      const errors = []; if (!valueToText(input.typeCode)) errors.push({ fieldPath: 'typeCode', code: 'REQUIRED', message: '应用类型不能为空', rejectedValue: input.typeCode ?? null });
      if (!input.publicData || typeof input.publicData !== 'object' || Array.isArray(input.publicData)) errors.push({ fieldPath: 'publicData', code: 'INVALID_OBJECT', message: '公共数据必须是对象', rejectedValue: input.publicData ?? null });
      return { valid: errors.length === 0, errors, warnings: [], normalizedData: { publicData: input.publicData || {}, typeExtension: input.typeExtension || {}, resourcePermissions: input.resourcePermissions || [] }, schemaVersion: valueToNumber(input.schemaVersion) };
    }
    if (operationId === 'OAP-008') {
      assertAllowedInput(input, ['appId', 'channel', 'status', 'startAt', 'endAt', 'page', 'pageSize', 'sort']); const appId = valueToText(input.appId); if (!appId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '提交记录必须提供 appId', 400);
      const { page, pageSize } = publicPage(input); let items = (await readAll('外部成果提交记录')).map(record => { const fields = record?.fields || {}; return { submissionId: valueToText(fields['提交编号']) || String(record?.record_id || ''), submissionNo: valueToText(fields['提交编号']), appId: valueToText(fields['应用ID']), channel: valueToText(fields['渠道']), formVersion: valueToText(fields['表单版本']), localStatus: valueToText(fields['本地状态']), externalSubmissionStatus: valueToText(fields['外部提交状态']), externalReferenceNo: valueToText(fields['外部引用编号']) || null, attemptCount: valueToNumber(fields['尝试次数']), lastAttemptAt: valueToText(fields['最后尝试时间']) || null, submittedAt: valueToText(fields['外部提交时间']) || null, failureCode: valueToText(fields['失败编码']) || null, failureMessage: valueToText(fields['失败信息']) || null, createdBy: valueToText(fields['创建人']), createdAt: valueToText(fields['创建时间']), updatedAt: valueToText(fields['更新时间']), version: valueToNumber(fields['版本']) }; }).filter(item => item.appId === appId && (!input.channel || item.channel === input.channel) && (!input.status || item.externalSubmissionStatus === input.status) && (!input.startAt || item.createdAt >= input.startAt) && (!input.endAt || item.createdAt <= input.endAt));
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return paginatePublic(items, page, pageSize);
    }
    if (operationId === 'OAP-011') {
      assertAllowedInput(input, ['typeCode', 'usage', 'schemaVersion']); const typeCode = valueToText(input.typeCode); if (!typeCode) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '表单定义必须提供 typeCode', 400);
      const record = (await readAll('应用类型配置')).find(item => [item?.fields?.['类型编码'], item?.fields?.['类型ID']].map(valueToText).includes(typeCode));
      if (!record) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '应用类型不存在或不可见', 404); const fields = record.fields || {};
      return { typeCode, schemaVersion: valueToNumber(input.schemaVersion || fields['已发布结构版本'] || fields['版本']), status: valueToText(fields['状态']), sections: [], publishedAt: valueToText(fields['更新时间']) };
    }
    if (operationId === 'OAP-001' || operationId === 'OAP-002') {
      const projection = await getAppProjection();
      if (operationId === 'OAP-001') {
        assertAllowedInput(input, ['typeCode', 'domainId', 'responsibleOrgId', 'statusCode', 'startAt', 'endAt']);
        const apps = projection.items.filter(item => (!input.typeCode || item.typeCode === input.typeCode) && (!input.domainId || item.domainId === input.domainId) && (!input.responsibleOrgId || item.responsibleOrgId === input.responsibleOrgId) && (!input.statusCode || item.status === input.statusCode));
        const byType = new Map(); for (const app of apps) { const current = byType.get(app.typeCode) || { typeCode: app.typeCode, typeName: app.typeName, count: 0, onlineCount: 0 }; current.count += 1; if (app.status === 'ONLINE') current.onlineCount += 1; byType.set(app.typeCode, current); }
        return { totalCount: apps.length, draftCount: apps.filter(item => item.status === 'DRAFT').length, submittedCount: apps.filter(item => item.status === 'SUBMITTED').length, onlineCount: apps.filter(item => item.status === 'ONLINE').length, offlineCount: apps.filter(item => item.status === 'OFFLINE').length, monthNewCount: 0, totalViews: apps.reduce((sum, item) => sum + item.usageCount, 0), totalUses: apps.reduce((sum, item) => sum + item.usageCount, 0), totalUniqueUsers: 0, totalFavorites: apps.reduce((sum, item) => sum + item.favoriteCount, 0), byType: [...byType.values()], generatedAt: now().toISOString() };
      }
      assertAllowedInput(input, ['keyword', 'appCode', 'typeCode', 'categoryCode', 'domainId', 'sceneCode', 'responsibleOrgId', 'ownerId', 'statusCode', 'isRecommended', 'isHot', 'onlineStart', 'onlineEnd', 'page', 'pageSize', 'sort']);
      const { page, pageSize } = publicPage(input); const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      const onboardingRows = await readAll('上架申请');
      let items = projection.items.filter(item => (!keyword || `${item.name} ${item.summary}`.toLocaleLowerCase('zh-CN').includes(keyword)) && (!input.appCode || item.appCode === input.appCode) && (!input.typeCode || item.typeCode === input.typeCode) && (!input.categoryCode || item.categoryCode === input.categoryCode) && (!input.domainId || item.domainId === input.domainId) && (!input.sceneCode || item.sceneIds.includes(input.sceneCode)) && (!input.responsibleOrgId || item.responsibleOrgId === input.responsibleOrgId) && (!input.ownerId || item.ownerId === input.ownerId) && (!input.statusCode || item.status === input.statusCode)).map(item => {
        const submission = onboardingRows.find(record => valueToText(record?.fields?.['关联应用ID']) === item.appId)?.fields || {};
        return { ...item, submissionStatus: valueToText(submission['状态']) || 'NOT_SUBMITTED', schemaVersion: 0, lastPublishedAt: null, lastPublishedBy: null, dataQualityStatus: item.name && item.typeCode ? 'VALID' : 'INVALID', permissions: { canView: true, canEdit: true, canSubmit: true, canPublish: true, canOffline: true, canConfigurePermission: true, canArchive: true } };
      });
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); return paginatePublic(items, page, pageSize);
    }
    if (operationId === 'INT-001') {
      assertAllowedInput(input, ['environment', 'enabled', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input);
      let items = (await readAll('多维表连接配置')).map(record => {
        const fields = record?.fields || {};
        return {
          connectionCode: valueToText(fields['连接编码']) || String(record?.record_id || ''), domainCode: valueToText(fields['环境']),
          appTokenMasked: valueToText(fields['Base Token掩码']), tableIdMasked: '', defaultViewIdMasked: '', primaryFieldIdMasked: '',
          fieldSchemaVersion: String(valueToNumber(fields['版本号'])), readEnabled: valueToBoolean(fields['启用']), writeEnabled: false,
          enabled: valueToBoolean(fields['启用']), lastVerifiedAt: valueToText(fields['最后健康检查时间']), lastVerifiedStatus: valueToText(fields['最后健康状态'])
        };
      }).filter(item => item.connectionCode);
      if (input.environment) items = items.filter(item => item.domainCode === input.environment);
      if (input.enabled !== undefined) items = items.filter(item => item.enabled === input.enabled);
      return paginatePublic(items, page, pageSize);
    }

    if (operationId === 'ADM-003') {
      assertAllowedInput(input, ['keyword', 'operatorId', 'operatorOrgId', 'moduleCode', 'resourceType', 'resourceId', 'actionCode', 'resultCode', 'requestId', 'ip', 'startAt', 'endAt', 'page', 'pageSize', 'sort']);
      const { page, pageSize } = publicPage(input); const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      const [rows, users, departments] = await Promise.all([readAll('后台操作日志'), readAll('用户字典'), readAll('部门字典')]);
      const userLookup = createUserDictionaryLookup(users, '姓名'); const departmentLookup = createLookup(departments, ['部门ID'], '部门名称');
      let items = rows.map(record => {
        const fields = record?.fields || {}; const operatorId = valueToText(fields['操作人ID']); const operatorOrgId = valueToText(fields['操作部门ID']);
        return {
          auditId: valueToText(fields['审计ID']) || String(record?.record_id || ''), requestId: valueToText(fields['请求ID']), operatorId,
          operatorName: resolvePersonDisplayName(userLookup, operatorId, 'audit.operator'), operatorOrgId, operatorOrgName: departmentLookup.get(operatorOrgId) || operatorOrgId,
          moduleCode: valueToText(fields['模块编码']), actionCode: valueToText(fields['动作编码']), actionName: valueToText(fields['动作编码']),
          resourceType: valueToText(fields['资源类型']), resourceId: valueToText(fields['资源ID']), resourceName: '', httpMethod: valueToText(fields['HTTP方法']),
          path: valueToText(fields['路径']), ip: valueToText(fields['IP掩码']), userAgent: valueToText(fields['User Agent']), resultCode: valueToText(fields['结果编码']),
          resultMessage: valueToText(fields['结果信息']), changedFields: valueToList(fields['变更字段']), beforeSnapshotMasked: valueToText(fields['变更前脱敏快照']) || null,
          afterSnapshotMasked: valueToText(fields['变更后脱敏快照']) || null, occurredAt: valueToText(fields['发生时间']), durationMs: valueToNumber(fields['耗时毫秒'])
        };
      }).filter(item => item.auditId)
        .filter(item => (!keyword || `${item.requestId} ${item.resourceId} ${item.resultMessage}`.toLocaleLowerCase('zh-CN').includes(keyword))
          && (!input.operatorId || item.operatorId === input.operatorId) && (!input.operatorOrgId || item.operatorOrgId === input.operatorOrgId)
          && (!input.moduleCode || item.moduleCode === input.moduleCode) && (!input.resourceType || item.resourceType === input.resourceType)
          && (!input.resourceId || item.resourceId === input.resourceId) && (!input.actionCode || item.actionCode === input.actionCode)
          && (!input.resultCode || item.resultCode === input.resultCode) && (!input.requestId || item.requestId === input.requestId)
          && (!input.startAt || item.occurredAt >= input.startAt) && (!input.endAt || item.occurredAt <= input.endAt));
      items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)); return paginatePublic(items, page, pageSize);
    }

    if (operationId === 'ADM-004') {
      assertAllowedInput(input, ['integrationCode', 'direction', 'operationCode', 'businessType', 'businessId', 'status', 'requestId', 'externalRequestId', 'startAt', 'endAt', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input);
      let items = (await readAll('接口调用日志')).map(record => {
        const fields = record?.fields || {};
        return {
          logId: valueToText(fields['日志ID']) || String(record?.record_id || ''), requestId: valueToText(fields['请求ID']), integrationCode: valueToText(fields['集成ID']),
          integrationName: valueToText(fields['集成ID']), direction: valueToText(fields['方向']), operationCode: valueToText(fields['操作编码']), httpMethod: valueToText(fields['HTTP方法']),
          endpointMasked: valueToText(fields['端点掩码']), businessType: valueToText(fields['业务类型']), businessId: valueToText(fields['业务ID']), status: valueToText(fields['状态']),
          httpStatus: valueToNumber(fields['HTTP状态']), errorCode: valueToText(fields['错误编码']) || null, errorMessageMasked: valueToText(fields['错误信息掩码']) || null,
          requestSize: valueToNumber(fields['请求大小']), responseSize: valueToNumber(fields['响应大小']), startedAt: valueToText(fields['开始时间']), finishedAt: valueToText(fields['结束时间']),
          durationMs: valueToNumber(fields['耗时毫秒']), retryCount: valueToNumber(fields['重试次数']), nextRetryAt: valueToText(fields['下次重试时间']) || null,
          taskExecutionId: valueToText(fields['任务执行ID']) || null
        };
      }).filter(item => item.logId)
        .filter(item => (!input.integrationCode || item.integrationCode === input.integrationCode) && (!input.direction || item.direction === input.direction)
          && (!input.operationCode || item.operationCode === input.operationCode) && (!input.businessType || item.businessType === input.businessType)
          && (!input.businessId || item.businessId === input.businessId) && (!input.status || item.status === input.status)
          && (!input.requestId || item.requestId === input.requestId) && (!input.startAt || item.startedAt >= input.startAt) && (!input.endAt || item.startedAt <= input.endAt));
      items.sort((a, b) => b.startedAt.localeCompare(a.startedAt)); return paginatePublic(items, page, pageSize);
    }

    if (operationId === 'INT-004') {
      assertAllowedInput(input, ['view', 'jobId', 'jobType', 'enabled', 'status', 'triggerType', 'startAt', 'endAt', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input); const view = input.view || 'EXECUTIONS';
      if (!['JOBS', 'EXECUTIONS'].includes(view)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'view 仅支持 JOBS 或 EXECUTIONS', 400);
      let executions = (await readAll('后台任务执行记录')).map(record => {
        const fields = record?.fields || {};
        return {
          executionId: valueToText(fields['执行ID']) || String(record?.record_id || ''), jobId: valueToText(fields['任务ID']), jobName: valueToText(fields['任务ID']),
          triggerType: valueToText(fields['触发类型']), triggeredBy: valueToText(fields['触发人ID']), startedAt: valueToText(fields['开始时间']), finishedAt: valueToText(fields['结束时间']) || null,
          status: valueToText(fields['状态']), progress: valueToNumber(fields['进度']), totalCount: valueToNumber(fields['总数']), successCount: valueToNumber(fields['成功数']),
          failedCount: valueToNumber(fields['失败数']), skippedCount: valueToNumber(fields['跳过数']), retryOfExecutionId: valueToText(fields['重试来源执行ID']) || null,
          errorCode: valueToText(fields['错误编码']) || null, errorMessage: valueToText(fields['错误信息']) || null
        };
      }).filter(item => item.executionId && (!input.jobId || item.jobId === input.jobId) && (!input.status || item.status === input.status) && (!input.triggerType || item.triggerType === input.triggerType));
      if (view === 'EXECUTIONS') return { view, ...paginatePublic(executions, page, pageSize) };
      const jobs = [...new Set(executions.map(item => item.jobId).filter(Boolean))].map(jobId => {
        const recent = executions.filter(item => item.jobId === jobId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
        return { jobId, jobCode: jobId, jobName: jobId, jobType: '', scheduleType: 'MANUAL', cronExpression: null, timezone: 'Asia/Shanghai', enabled: true, concurrencyPolicy: 'FORBID', timeoutSeconds: 0, lastExecutionAt: recent?.startedAt || '', lastExecutionStatus: recent?.status || '', nextExecutionAt: null, version: 0 };
      });
      return { view, ...paginatePublic(jobs, page, pageSize) };
    }

    assertAllowedInput(input, ['archiveTaskId']);
    const archiveTaskId = valueToText(input.archiveTaskId);
    if (!archiveTaskId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '归档详情必须提供 archiveTaskId', 400);
    const [taskRows, executionRows] = await Promise.all([readAll('归档任务'), readAll('归档执行记录')]);
    const record = taskRows.find(item => valueToText(item?.fields?.['归档任务ID']) === archiveTaskId);
    if (!record) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '归档任务不存在或不可见', 404);
    const fields = record.fields || {};
    const executions = executionRows.filter(item => valueToText(item?.fields?.['归档任务ID']) === archiveTaskId).map(item => ({
      executionRecordId: valueToText(item?.fields?.['执行记录ID']) || String(item?.record_id || ''), action: valueToText(item?.fields?.['动作']), status: valueToText(item?.fields?.['状态']),
      sourceRecordId: valueToText(item?.fields?.['源记录ID']), archiveRecordId: valueToText(item?.fields?.['归档记录ID']), startedAt: valueToText(item?.fields?.['开始时间']), finishedAt: valueToText(item?.fields?.['结束时间']) || null,
      errorCode: valueToText(item?.fields?.['错误编码']) || null, errorMessage: valueToText(item?.fields?.['错误信息']) || null
    }));
    return {
      archiveTaskId, status: valueToText(fields['状态']), stage: valueToText(fields['阶段']), sourceCount: valueToNumber(fields['源记录数']), archivedCount: valueToNumber(fields['已归档数']),
      deletedCount: valueToNumber(fields['已删除数']), failedCount: valueToNumber(fields['失败数']), sourceChecksum: valueToText(fields['源校验和']), archiveChecksum: valueToText(fields['归档校验和']),
      archiveLocationMasked: valueToText(fields['归档位置掩码']), verifiedAt: valueToText(fields['校验完成时间']) || null, deletedAt: valueToText(fields['删除完成时间']) || null,
      failureCode: valueToText(fields['失败编码']) || null, failureMessage: valueToText(fields['失败信息']) || null, executions
    };
  }

  function messageRead(fields) {
    return /^(?:已读|true|1|yes)$/i.test(valueToText(fields['已读状态']).trim());
  }

  function messageFromRecord(record, users) {
    const fields = record?.fields || {};
    const senderId = valueToText(fields['发送人ID']) || null;
    const targetRaw = valueToText(fields['目标类型']).toLocaleUpperCase('zh-CN');
    const targetType = ['ANNOUNCEMENT', 'APP', 'APPLICATION', 'COURSE', 'EXPORT', 'URL'].includes(targetRaw) ? targetRaw : 'NONE';
    const priorityRaw = valueToText(fields['优先级']).toLocaleUpperCase('zh-CN');
    const priority = ['HIGH', 'URGENT'].includes(priorityRaw) ? priorityRaw : 'NORMAL';
    const occurredAt = valueToText(fields['消息时间']);
    const isRead = messageRead(fields);
    return {
      messageId: valueToText(fields['消息ID']) || String(record?.record_id || ''), typeCode: valueToText(fields['消息类型编码'] || fields['分类']),
      typeName: valueToText(fields['分类'] || fields['消息类型编码']), title: valueToText(fields['消息标题']), summary: valueToText(fields['消息摘要'] || fields['消息内容']),
      occurredAt, isRead, readAt: isRead ? valueToText(fields['阅读时间']) || null : null,
      isToday: occurredAt.slice(0, 10) === now().toISOString().slice(0, 10), priority,
      senderId, senderName: senderId ? resolvePersonDisplayName(users, senderId, 'message.sender') || null : null,
      targetType, targetId: valueToText(fields['目标ID']) || null, targetPath: valueToText(fields['目标路径']) || null,
      actionLabel: targetType === 'NONE' ? '' : '查看详情', downloadFileId: null, expiresAt: valueToText(fields['过期时间']) || null
    };
  }

  function ledgerFromRecord(record) {
    const fields = record?.fields || {};
    const changed = valueToNumber(fields['变动积分']);
    const directionRaw = valueToText(fields['方向']).toLocaleUpperCase('zh-CN');
    const direction = /EXPENSE|支出|扣减/.test(directionRaw) || changed < 0 ? 'EXPENSE' : 'INCOME';
    return {
      ledgerId: valueToText(fields['流水ID']) || String(record?.record_id || ''), serialNo: valueToText(fields['流水号']),
      pointTypeCode: valueToText(fields['积分类型编码']), pointTypeName: valueToText(fields['积分类型编码']), sourceCode: valueToText(fields['来源编码']),
      sourceName: valueToText(fields['来源编码']), businessType: valueToText(fields['业务类型']), businessId: valueToText(fields['业务ID']) || null,
      businessName: null, changePoints: direction === 'EXPENSE' ? -Math.abs(changed) : Math.abs(changed), balanceAfter: valueToNumber(fields['变动后余额']),
      statusCode: valueToText(fields['状态']), statusName: valueToText(fields['状态']), occurredAt: valueToText(fields['发生时间']),
      effectiveAt: valueToText(fields['生效时间']) || null, expiresAt: valueToText(fields['过期时间']) || null, remark: valueToText(fields['备注']),
      ruleId: valueToText(fields['规则ID']) || null, ruleName: null, idempotencyKey: valueToText(fields['幂等键']) || null, direction
    };
  }

  async function executePersonalRead(operationId, input, requestContext) {
    const { userId } = requireIdentity(requestContext);
    if (operationId.startsWith('MSG-')) {
      const allowed = operationId === 'MSG-001' ? ['timezone'] : ['keyword', 'typeCode', 'readStatus', 'startAt', 'endAt', 'page', 'pageSize', 'sort'];
      assertAllowedInput(input, allowed);
      const messageFilter = equalityFilter('消息通知', '接收人ID', userId);
      const [messageRows, userRows] = await Promise.all([
        readAll('消息通知', PROFILE_FIELDS.messages, { filter: messageFilter }),
        readAll('用户字典', PROFILE_FIELDS.user)
      ]);
      const users = createUserDictionaryLookup(userRows, '姓名');
      let items = messageRows.filter(record => valueToText(record?.fields?.['接收人ID']) === userId).map(record => messageFromRecord(record, users)).filter(item => item.messageId);
      if (operationId === 'MSG-001') {
        const byType = new Map();
        for (const item of items) {
          const current = byType.get(item.typeCode) || { typeCode: item.typeCode, typeName: item.typeName, total: 0, unread: 0 };
          current.total += 1; if (!item.isRead) current.unread += 1; byType.set(item.typeCode, current);
        }
        const unreadCount = items.filter(item => !item.isRead).length;
        return { totalCount: items.length, unreadCount, readCount: items.length - unreadCount, todayCount: items.filter(item => item.isToday).length, byType: [...byType.values()], generatedAt: now().toISOString() };
      }
      const { page, pageSize } = publicPage(input);
      const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      const readStatus = input.readStatus || 'ALL';
      if (!['ALL', 'READ', 'UNREAD'].includes(readStatus)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'readStatus 不受支持', 400);
      items = items.filter(item => (!keyword || `${item.title} ${item.summary}`.toLocaleLowerCase('zh-CN').includes(keyword))
        && (!input.typeCode || item.typeCode === input.typeCode) && (readStatus === 'ALL' || item.isRead === (readStatus === 'READ'))
        && (!input.startAt || item.occurredAt >= input.startAt) && (!input.endAt || item.occurredAt <= input.endAt));
      const sort = input.sort || 'occurredAt,desc';
      if (!['occurredAt,desc', 'occurredAt,asc'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '消息排序方式不受支持', 400);
      items.sort((left, right) => sort.endsWith('asc') ? left.occurredAt.localeCompare(right.occurredAt) : right.occurredAt.localeCompare(left.occurredAt));
      return { ...paginatePublic(items, page, pageSize), sort, filtersApplied: { keyword: valueToText(input.keyword), typeCode: valueToText(input.typeCode), readStatus, startAt: valueToText(input.startAt), endAt: valueToText(input.endAt) } };
    }

    if (operationId.startsWith('FAV-')) {
      const allowed = operationId === 'FAV-001' ? ['resourceType'] : ['resourceType', 'keyword', 'typeCode', 'domainId', 'tagCode', 'recentlyUsed', 'page', 'pageSize', 'sort'];
      assertAllowedInput(input, allowed);
      const resourceType = valueToText(input.resourceType);
      if (!resourceType) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '收藏读取必须提供 resourceType', 400);
      if (resourceType !== 'APP') throw new FeishuProxyError('INVALID_OPERATION_INPUT', '当前收藏读接口仅支持 APP', 400);
      const favoriteFilter = equalityFilter('应用收藏', '用户ID', userId);
      const [favoriteRows, projection] = await Promise.all([
        readAll('应用收藏', [], { filter: favoriteFilter }),
        getAppProjection()
      ]);
      let items = favoriteRows.filter(record => valueToText(record?.fields?.['用户ID']) === userId && dictionaryEnabled(record?.fields || {}, '有效')).map(record => {
        const fields = record?.fields || {};
        const resourceId = valueToText(fields['资源ID'] || fields['应用ID']);
        const resource = projection.items.find(app => app.appId === resourceId);
        return {
          favoriteId: valueToText(fields['主键']) || String(record?.record_id || ''),
          favoriteVersion: Math.max(1, valueToNumber(fields['版本']) || 1),
          resourceType: valueToText(fields['资源类型']) || 'APP',
          resourceId,
          favoritedAt: valueToText(fields['收藏时间']),
          lastUsedAt: null,
          resource
        };
      }).filter(item => item.favoriteId && item.resource);
      if (operationId === 'FAV-001') {
        const weekStart = new Date(now().getTime() - 7 * 86400000).toISOString();
        const byType = new Map(); const byDomain = new Map();
        for (const item of items) {
          const type = item.resource.typeCode; const domain = item.resource.domainId;
          byType.set(type, { typeCode: type, typeName: item.resource.typeName, count: (byType.get(type)?.count || 0) + 1 });
          if (domain) byDomain.set(domain, { domainId: domain, domainName: item.resource.domainName, count: (byDomain.get(domain)?.count || 0) + 1 });
        }
        return { totalCount: items.length, weekAddedCount: items.filter(item => item.favoritedAt >= weekStart).length, recentUsedCount: items.filter(item => item.lastUsedAt).length, byType: [...byType.values()], byDomain: [...byDomain.values()] };
      }
      const { page, pageSize } = publicPage(input);
      const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      items = items.filter(item => (!keyword || `${item.resource.name} ${item.resource.summary}`.toLocaleLowerCase('zh-CN').includes(keyword))
        && (!input.typeCode || item.resource.typeCode === input.typeCode) && (!input.domainId || item.resource.domainId === input.domainId)
        && (!input.tagCode || item.resource.keywords?.includes(input.tagCode))
        && (!input.recentlyUsed || Boolean(item.lastUsedAt)));
      const sort = input.sort || 'favoritedAt,desc';
      if (!['favoritedAt,desc', 'favoritedAt,asc'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '收藏排序方式不受支持', 400);
      items.sort((left, right) => sort.endsWith('asc') ? left.favoritedAt.localeCompare(right.favoritedAt) : right.favoritedAt.localeCompare(left.favoritedAt));
      return { ...paginatePublic(items, page, pageSize), sort, filtersApplied: { resourceType, keyword: valueToText(input.keyword), typeCode: valueToText(input.typeCode), domainId: valueToText(input.domainId), tagCode: valueToText(input.tagCode), recentlyUsed: input.recentlyUsed ?? false } };
    }

    const allowed = operationId === 'PTS-001' ? ['month'] : operationId === 'PTS-002'
      ? ['pointTypeCode', 'sourceCode', 'direction', 'statusCode', 'keyword', 'startAt', 'endAt', 'page', 'pageSize', 'sort']
      : ['startAt', 'endAt', 'groupBy'];
    assertAllowedInput(input, allowed);
    const balanceFilter = equalityFilter('积分余额', '用户ID', userId);
    const ledgerFilter = equalityFilter('积分流水', '用户ID', userId);
    const monthFilter = equalityFilter('积分月度汇总', '用户ID', userId);
    const [balanceRows, ledgerRows, monthRows, ruleRows] = await Promise.all([
      readAll('积分余额', [], { filter: balanceFilter }),
      readAll('积分流水', [], { filter: ledgerFilter }),
      readAll('积分月度汇总', [], { filter: monthFilter }),
      readAll('积分规则')
    ]);
    const balanceFields = balanceRows.find(record => valueToText(record?.fields?.['用户ID']) === userId)?.fields || {};
    let ledgers = ledgerRows.filter(record => valueToText(record?.fields?.['用户ID']) === userId).map(ledgerFromRecord).filter(item => item.ledgerId);
    if (operationId === 'PTS-001') {
      const month = input.month || now().toISOString().slice(0, 7);
      const monthly = monthRows.find(record => valueToText(record?.fields?.['用户ID']) === userId && valueToText(record?.fields?.['年月']) === month)?.fields || {};
      const monthLedgers = ledgers.filter(item => item.occurredAt.startsWith(month));
      const earned = monthLedgers.filter(item => item.direction === 'INCOME').reduce((sum, item) => sum + item.changePoints, 0);
      const spent = monthLedgers.filter(item => item.direction === 'EXPENSE').reduce((sum, item) => sum + Math.abs(item.changePoints), 0);
      const sourceTotals = new Map();
      for (const item of monthLedgers) if (item.direction === 'INCOME') sourceTotals.set(item.sourceCode, (sourceTotals.get(item.sourceCode) || 0) + item.changePoints);
      const sourceTotal = [...sourceTotals.values()].reduce((sum, value) => sum + value, 0);
      const totalEarned = ledgers.filter(item => item.direction === 'INCOME').reduce((sum, item) => sum + item.changePoints, 0);
      const totalSpent = ledgers.filter(item => item.direction === 'EXPENSE').reduce((sum, item) => sum + Math.abs(item.changePoints), 0);
      return {
        account: { accountId: valueToText(balanceFields['主键']) || `POINTS:${userId}`, userId, balance: valueToNumber(balanceFields['当前总积分']), totalEarned, totalSpent, totalExpired: 0, availableBalance: valueToNumber(balanceFields['当前总积分']), pendingBalance: 0, updatedAt: valueToText(balanceFields['最后更新时间']) },
        month: { month, earned: valueToNumber(monthly['月度总积分']) || earned, spent, appUsePoints: valueToNumber(monthly['应用使用月度合计']) },
        sources: [...sourceTotals].map(([sourceCode, points]) => ({ sourceCode, sourceName: sourceCode, points, percentage: sourceTotal ? Number((points * 100 / sourceTotal).toFixed(2)) : 0, colorToken: '', iconUrl: '' })),
        recentLedgers: [...ledgers].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 10).map(({ direction, ...item }) => item),
        rulesVersion: Math.max(0, ...ruleRows.map(record => valueToNumber(record?.fields?.['当前版本'] || record?.fields?.['版本'])))
      };
    }
    ledgers = ledgers.filter(item => (!input.pointTypeCode || item.pointTypeCode === input.pointTypeCode) && (!input.sourceCode || item.sourceCode === input.sourceCode)
      && (!input.statusCode || item.statusCode === input.statusCode) && (!input.startAt || item.occurredAt >= input.startAt) && (!input.endAt || item.occurredAt <= input.endAt));
    if (operationId === 'PTS-002') {
      const direction = input.direction || 'ALL';
      if (!['ALL', 'INCOME', 'EXPENSE'].includes(direction)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '积分方向不受支持', 400);
      const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      ledgers = ledgers.filter(item => (direction === 'ALL' || item.direction === direction) && (!keyword || `${item.serialNo} ${item.remark}`.toLocaleLowerCase('zh-CN').includes(keyword)));
      const income = ledgers.filter(item => item.direction === 'INCOME').reduce((sum, item) => sum + item.changePoints, 0);
      const expense = ledgers.filter(item => item.direction === 'EXPENSE').reduce((sum, item) => sum + Math.abs(item.changePoints), 0);
      const { page, pageSize } = publicPage(input);
      const sort = input.sort || 'occurredAt,desc';
      if (!['occurredAt,desc', 'occurredAt,asc'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '积分排序方式不受支持', 400);
      ledgers.sort((left, right) => sort.endsWith('asc') ? left.occurredAt.localeCompare(right.occurredAt) : right.occurredAt.localeCompare(left.occurredAt));
      const pageData = paginatePublic(ledgers.map(({ direction: ignored, ...item }) => item), page, pageSize);
      return { ...pageData, sort, filtersApplied: { pointTypeCode: valueToText(input.pointTypeCode), sourceCode: valueToText(input.sourceCode), direction, statusCode: valueToText(input.statusCode), keyword: valueToText(input.keyword), startAt: valueToText(input.startAt), endAt: valueToText(input.endAt) }, summary: { income, expense, netChange: income - expense } };
    }
    const groupBy = input.groupBy || 'SOURCE';
    if (!['TYPE', 'SOURCE', 'DAY', 'MONTH'].includes(groupBy)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '积分分组方式不受支持', 400);
    const groups = new Map();
    for (const item of ledgers) {
      const key = groupBy === 'TYPE' ? item.pointTypeCode : groupBy === 'SOURCE' ? item.sourceCode : groupBy === 'DAY' ? item.occurredAt.slice(0, 10) : item.occurredAt.slice(0, 7);
      const group = groups.get(key) || { key, label: key, income: 0, expense: 0, netChange: 0, count: 0, percentage: 0 };
      if (item.direction === 'INCOME') group.income += item.changePoints; else group.expense += Math.abs(item.changePoints);
      group.netChange = group.income - group.expense; group.count += 1; groups.set(key, group);
    }
    const totalIncome = ledgers.filter(item => item.direction === 'INCOME').reduce((sum, item) => sum + item.changePoints, 0);
    const totalExpense = ledgers.filter(item => item.direction === 'EXPENSE').reduce((sum, item) => sum + Math.abs(item.changePoints), 0);
    const totalMagnitude = totalIncome + totalExpense;
    const groupItems = [...groups.values()].map(group => ({ ...group, percentage: totalMagnitude ? Number(((group.income + group.expense) * 100 / totalMagnitude).toFixed(2)) : 0 }));
    return { totalIncome, totalExpense, groups: groupItems, period: { startAt: valueToText(input.startAt), endAt: valueToText(input.endAt) } };
  }

  async function executePublicRead(operationId, input) {
    if (operationId === 'PTS-004') {
      assertAllowedInput(input, ['sourceCode', 'enabled', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input, 50);
      const ruleFieldNames = ['规则ID', '规则编码', '规则名称', '来源编码', '触发事件', '方向', '积分值', '频率类型', '频率上限', '周期上限', '条件JSON', '有效期开始', '有效期结束', '启用', '当前版本'];
      const projectRule = record => {
        const fields = record?.fields || {};
        return {
          ruleId: valueToText(fields['规则ID']) || String(record?.record_id || ''), ruleCode: valueToText(fields['规则编码']),
          ruleName: valueToText(fields['规则名称']), sourceCode: valueToText(fields['来源编码']), sourceName: valueToText(fields['来源编码']),
          triggerEvent: valueToText(fields['触发事件']), points: valueToNumber(fields['积分值']), direction: valueToText(fields['方向']),
          frequencyType: valueToText(fields['频率类型']), frequencyLimit: valueToNumber(fields['频率上限']), cycleLimit: valueToNumber(fields['周期上限']),
          validFrom: valueToText(fields['有效期开始']), validTo: valueToText(fields['有效期结束']), enabled: valueToBoolean(fields['启用']),
          description: '', conditions: valueToJsonObject(fields['条件JSON']), version: valueToNumber(fields['当前版本'])
        };
      };
      if (!input.sourceCode && input.enabled === undefined) {
        const result = await readPage('积分规则', { page, pageSize, fieldNames: ruleFieldNames });
        const total = Number.isFinite(result.total) ? result.total : result.items.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        return {
          items: result.items.map(projectRule).filter(item => item.ruleId), total, page: safePage, pageSize,
          totalPages, hasPrevious: safePage > 1, hasNext: Boolean(result.hasMore), hasMore: Boolean(result.hasMore)
        };
      }
      let rows = (await readAll('积分规则')).map(projectRule).filter(item => item.ruleId);
      if (input.sourceCode) rows = rows.filter(item => item.sourceCode === input.sourceCode);
      if (input.enabled !== undefined) rows = rows.filter(item => item.enabled === input.enabled);
      return paginatePublic(rows, page, pageSize);
    }

    if (operationId.startsWith('TRN-')) {
      const rows = (await readAll('培训课程')).map(courseFromRecord).filter(item => item.courseId && item.title);
      if (operationId === 'TRN-001') {
        assertAllowedInput(input, ['month', 'categoryCode', 'limit']);
        const limit = input.limit == null ? 6 : Number(input.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'limit 必须是 1 至 20 的整数', 400);
        const filtered = input.categoryCode ? rows.filter(item => item.categoryCode === input.categoryCode) : rows;
        const counts = new Map();
        for (const item of filtered) counts.set(item.categoryCode, (counts.get(item.categoryCode) || 0) + 1);
        return {
          stats: { courseCount: filtered.length, learnerCount: 0, monthNewCount: 0, registeredCount: filtered.reduce((sum, item) => sum + item.registeredCount, 0), completedCount: filtered.filter(item => /完成|结束/.test(item.statusCode)).length },
          featuredCourses: filtered.slice(0, limit), categories: [...counts].map(([code, count]) => ({ code, name: code, count, iconUrl: '' })),
          upcomingCourses: filtered.slice(0, limit)
        };
      }
      if (operationId === 'TRN-002') {
        assertAllowedInput(input, ['query', 'keyword', 'categoryCode', 'deliveryMode', 'lecturerId', 'registrationStatus', 'liveStatus', 'startAt', 'endAt', 'page', 'pageSize', 'sort']);
        const { page, pageSize } = publicPage(input);
        const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
        const filtered = rows.filter(item => (!keyword || `${item.title} ${item.summary} ${item.lecturerName}`.toLocaleLowerCase('zh-CN').includes(keyword))
          && (!input.categoryCode || item.categoryCode === input.categoryCode)
          && (!input.deliveryMode || item.deliveryMode === input.deliveryMode));
        return paginatePublic(filtered, page, pageSize);
      }
      assertAllowedInput(input, ['courseId']);
      const courseId = valueToText(input.courseId);
      if (!courseId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '课程详情必须提供 courseId', 400);
      const course = rows.find(item => item.courseId === courseId);
      if (!course) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '课程不存在或不可见', 404);
      return { ...course, descriptionHtml: course.summary, agenda: [], materials: [], relatedApps: [], registrationStartAt: '', registrationEndAt: '', attendanceRule: '', pointRule: { enabled: false, points: 0, trigger: '' }, permissions: { canRegister: false, canCancel: false, canEnterLive: false, canDownload: false } };
    }

    if (operationId.startsWith('CER-')) {
      const rows = (await readAll('认证项目')).map(certificationFromRecord).filter(item => item.certificationId && item.name);
      if (operationId === 'CER-001') {
        assertAllowedInput(input, ['newsLimit', 'projectLimit']);
        const projectLimit = input.projectLimit == null ? 12 : Number(input.projectLimit);
        if (!Number.isInteger(projectLimit) || projectLimit < 1 || projectLimit > 50) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'projectLimit 必须是 1 至 50 的整数', 400);
        const counts = new Map();
        for (const item of rows) counts.set(item.directionCode, (counts.get(item.directionCode) || 0) + 1);
        return {
          hero: { title: '数字化认证', subtitle: '', imageUrl: '', primaryAction: '', secondaryAction: '' },
          stats: { projectCount: rows.length, certifiedCount: 0, lecturerCount: 0 },
          directions: [...counts].map(([code, count]) => ({ code, name: code, iconUrl: '', count })), sceneTags: [], news: [],
          projects: rows.slice(0, projectLimit), contact: { email: '', phone: '', serviceHours: '' }
        };
      }
      assertAllowedInput(input, ['query', 'keyword', 'directionCode', 'sceneCode', 'level', 'status', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input);
      const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
      const filtered = rows.filter(item => (!keyword || `${item.name} ${item.summary}`.toLocaleLowerCase('zh-CN').includes(keyword))
        && (!input.directionCode || item.directionCode === input.directionCode)
        && (!input.status || item.statusCode === input.status));
      return paginatePublic(filtered, page, pageSize);
    }

    if (operationId === 'OPS-003') {
      assertAllowedInput(input, ['domain', 'enabled', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input);
      let rows = (await readAll('统计指标定义')).map(record => {
        const fields = record?.fields || {};
        return {
          metricCode: valueToText(fields['指标编码']) || String(record?.record_id || ''), metricName: valueToText(fields['指标名称']),
          description: valueToText(fields['指标说明']), domain: valueToText(fields['指标域']), aggregation: valueToText(fields['聚合方式']),
          expression: valueToText(fields['计算表达式']), unit: valueToText(fields['单位']), dimensions: valueToList(fields['支持维度']),
          definitionVersion: valueToText(fields['口径版本']), enabled: valueToBoolean(fields['启用']), effectiveAt: valueToText(fields['生效时间'])
        };
      }).filter(item => item.metricCode);
      if (input.domain) rows = rows.filter(item => item.domain === input.domain);
      if (input.enabled !== undefined) rows = rows.filter(item => item.enabled === input.enabled);
      return paginatePublic(rows, page, pageSize);
    }

    assertAllowedInput(input, ['query', 'keyword', 'materialType', 'appTypeCode', 'domainId', 'categoryId']);
    const [categoryRows, materialRows] = await Promise.all([readAll('素材分类'), readAll('素材中心')]);
    const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
    const visibleMaterials = materialRows.map(record => record?.fields || {}).filter(fields => (!keyword || `${valueToText(fields['素材名称'])} ${valueToText(fields['素材摘要'])}`.toLocaleLowerCase('zh-CN').includes(keyword))
      && (!input.materialType || valueToText(fields['素材类型']) === input.materialType)
      && (!input.categoryId || valueToText(fields['分类ID']) === input.categoryId));
    const typeCounts = new Map();
    for (const fields of visibleMaterials) {
      const type = valueToText(fields['素材类型']);
      if (type) typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
    const categoryCounts = new Map();
    for (const fields of visibleMaterials) {
      const categoryId = valueToText(fields['分类ID']);
      if (categoryId) categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    }
    return {
      materialTypes: [...typeCounts].map(([code, count]) => ({ code, name: code, count })),
      categories: categoryRows.map(record => {
        const fields = record?.fields || {};
        const categoryId = valueToText(fields['分类编码']) || String(record?.record_id || '');
        return { categoryId, categoryCode: categoryId, categoryName: valueToText(fields['分类名称']), parentId: valueToText(fields['父级ID']), sortOrder: valueToNumber(fields['排序']), count: categoryCounts.get(categoryId) || 0 };
      }).filter(item => item.categoryId),
      appTypes: [], domains: [], total: visibleMaterials.length
    };
  }

  async function executeSecureResourceRead(operationId, input, requestContext) {
    const { identity, userId } = requireIdentity(requestContext);
    if (operationId === 'APP-004') {
      assertAllowedInput(input, ['appId', 'launchMode', 'sourcePage', 'requestedAt']);
      const appId = valueToText(input.appId);
      if (!appId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '应用启动必须提供 appId', 400);
      const [appRows, permissionRows] = await Promise.all([readAll('应用索引'), readAll('用户权限')]);
      const app = appRows.find(record => valueToText(record?.fields?.['应用ID']) === appId)?.fields;
      if (!app) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '应用不存在或不可见', 404);
      const appPermissions = permissionRows.filter(record => valueToText(record?.fields?.['应用ID']) === appId && permissionRecordActive(record?.fields || {}));
      const allowedByPermission = !appPermissions.length || appPermissions.some(record => permissionSubjectIdentifier(record?.fields || {}) === userId);
      const status = valueToText(app['状态']);
      const online = /^(?:ONLINE|已上架|启用|正常)$/i.test(status);
      const rawUrl = Array.isArray(app['应用URL地址']) ? app['应用URL地址'][0]?.link || app['应用URL地址'][0]?.text : app['应用URL地址'];
      let launchUrl;
      try { launchUrl = new URL(String(rawUrl || '')); } catch { launchUrl = null; }
      const hostAllowed = Boolean(launchUrl && launchUrl.protocol === 'https:' && allowedAppLaunchHosts.has(launchUrl.hostname.toLocaleLowerCase('en-US')));
      const allowed = online && allowedByPermission && hostAllowed;
      const reasonCode = !online ? 'APP_NOT_ONLINE' : !allowedByPermission ? 'APP_PERMISSION_DENIED' : !hostAllowed ? 'APP_HOST_NOT_ALLOWED' : null;
      return {
        appId, allowed, reasonCode,
        reasonMessage: reasonCode === 'APP_NOT_ONLINE' ? '应用当前未上架' : reasonCode === 'APP_PERMISSION_DENIED' ? '当前用户没有应用访问权限' : reasonCode === 'APP_HOST_NOT_ALLOWED' ? '应用地址未进入服务端允许域名清单' : null,
        launchUrl: allowed ? launchUrl.toString() : null,
        openMode: input.launchMode === 'CURRENT_TAB' ? 'CURRENT_TAB' : valueToText(app['打开方式']) === 'CURRENT_TAB' ? 'CURRENT_TAB' : 'NEW_TAB',
        expiresAt: null, ssoMode: valueToText(app['SSO模式']) || 'NONE', auditId: traceIdFactory()
      };
    }

    if (!fileAccessService?.createGrant) throw new FeishuProxyError('FILE_ACCESS_SERVICE_UNAVAILABLE', '文件访问服务尚未配置', 503);
    if (operationId === 'COM-008') {
      assertAllowedInput(input, ['fileId', 'mode', 'disposition', 'fileNameOverride']);
      const fileId = valueToText(input.fileId);
      if (!fileId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '文件访问必须提供 fileId', 400);
      const [uploadRows, attachmentRows, materialRows] = await Promise.all([readAll('文件上传会话'), readAll('附件资料'), readAll('素材中心')]);
      let file;
      const upload = uploadRows.find(record => valueToText(record?.fields?.['文件ID']) === fileId)?.fields;
      if (upload) file = { fileToken: valueToText(upload['飞书文件令牌']), fileName: valueToText(upload['文件名']), mimeType: valueToText(upload['MIME类型']), sizeBytes: valueToNumber(upload['大小字节']) };
      if (!file?.fileToken) {
        const row = attachmentRows.find(record => valueToText(record?.fields?.['主键']) === fileId);
        if (row) file = attachmentValue(row.fields?.['附件文件'], valueToText(row.fields?.['文件名称']));
      }
      if (!file?.fileToken) {
        const row = materialRows.find(record => valueToText(record?.fields?.['素材ID']) === fileId);
        if (row) file = attachmentValue(row.fields?.['素材文件'], valueToText(row.fields?.['素材名称']));
      }
      if (!file?.fileToken) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '文件不存在或不可访问', 404);
      const mode = input.mode === 'PREVIEW' ? 'PREVIEW' : 'DOWNLOAD';
      const disposition = input.disposition === 'INLINE' ? 'INLINE' : 'ATTACHMENT';
      const grant = fileAccessService.createGrant({ ...file, fileName: valueToText(input.fileNameOverride) || file.fileName, mode, disposition, identity });
      return { fileId, url: grant.url, expiresAt: grant.expiresAt, fileName: valueToText(input.fileNameOverride) || file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, watermarkApplied: false };
    }

    assertAllowedInput(input, ['materialId', 'fileId', 'purpose', 'sourcePage', 'clientOccurredAt']);
    const materialId = valueToText(input.materialId);
    const fileId = valueToText(input.fileId);
    const purpose = valueToText(input.purpose);
    const sourcePage = valueToText(input.sourcePage);
    const clientOccurredAt = valueToText(input.clientOccurredAt);
    if (!materialId || !fileId || !purpose || !sourcePage || !clientOccurredAt) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '素材下载必须提供 materialId、fileId、purpose、sourcePage 和 clientOccurredAt', 400);
    }
    const material = (await readAll('素材中心')).find(record => valueToText(record?.fields?.['素材ID']) === materialId)?.fields;
    if (!material || /^(?:OFFLINE|下架|禁用|删除)$/i.test(valueToText(material['状态']))) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '素材不存在或不可下载', 404);
    const file = attachmentValue(material['素材文件'], valueToText(material['素材名称']));
    if (!file.fileToken) throw new FeishuProxyError('MATERIAL_FILE_NOT_AVAILABLE', '素材当前没有可下载文件', 404);
    if (fileId !== materialId) throw new FeishuProxyError('MATERIAL_FILE_MISMATCH', '文件不属于指定素材', 404);
    const grant = fileAccessService.createGrant({ ...file, mode: 'DOWNLOAD', disposition: 'ATTACHMENT', identity });
    return { downloadId: traceIdFactory(), fileId, accessUrl: grant.url, expiresAt: grant.expiresAt, downloadCount: valueToNumber(material['下载次数']), pointAward: null };
  }

  async function executeUncached(operationId, input = {}, requestContext = {}) {
    const operation = getOperation(operationId);
    if (!operation) throw new FeishuProxyError('UNKNOWN_OPERATION', '接口不在受控操作清单中', 404);
    if (operation.access === 'write') {
      throw new FeishuProxyError('WRITE_OPERATION_DISABLED', '当前仅允许飞书只读联调', 403);
    }
    const plan = READ_PLANS[operationId];
    if (!plan) throw new FeishuProxyError('READ_OPERATION_NOT_ENABLED', '该只读接口尚未完成字段合同核验', 503);
    if (plan.kind === 'current-user') {
      if (Object.keys(input).length) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '当前用户接口不接受浏览器提供的身份字段', 400);
      const data = await readCurrentUserProjection(requestContext);
      return {
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-user-context.v2',
        sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false
      };
    }
    if (plan.kind === 'current-navigation') {
      const data = await executeCurrentNavigation(input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-navigation.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'dictionary-batch' || plan.kind === 'app-comments') {
      const data = plan.kind === 'dictionary-batch' ? await executeDictionaryBatch(input) : await executeAppComments(input);
      return {
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: plan.kind === 'dictionary-batch' ? 'feishu-dictionaries.v2' : 'feishu-app-comments.v1',
        sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false
      };
    }
    if (plan.kind === 'workbench-search') {
      const data = await executeWorkbenchSearch(input);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-workbench-search.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'workbench-personal') {
      const data = await executeWorkbenchPersonal(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-workbench-personal.v2', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'personal-read') {
      const data = await executePersonalRead(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-personal-read.v2', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'identity-detail') {
      const data = await executeIdentityDetail(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-identity-detail.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'admin-read') {
      const data = await executeAdminRead(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-admin-read.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'secure-resource') {
      const data = await executeSecureResourceRead(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: operationId === 'MAT-003' ? 'feishu-secure-resource.v2' : 'feishu-secure-resource.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'app-facets' || plan.kind === 'app-list' || plan.kind?.startsWith('announcement') || plan.kind?.startsWith('talent') || plan.kind?.startsWith('contact') || plan.kind === 'public-read' || plan.kind === 'first-batch-detail') {
      const data = plan.kind.startsWith('announcement')
        ? await executeAnnouncement(operationId, input)
        : plan.kind.startsWith('talent') ? await executeTalent(operationId, input)
        : plan.kind.startsWith('contact') ? await executeContact(operationId, input, requestContext)
        : plan.kind === 'public-read' ? await executePublicRead(operationId, input)
        : plan.kind === 'first-batch-detail' ? await executeFirstBatchDetail(operationId, input)
        : await executeApp(operationId, input);
      return {
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: plan.kind.startsWith('contact') ? 'feishu-contact.v3' : ['APP-001', 'APP-002', 'APP-003'].includes(operationId) ? 'feishu-app-read.v2' : plan.kind === 'public-read' ? 'feishu-public-read.v1' : operationId === 'MAT-002' ? 'feishu-first-batch-detail.v2' : plan.kind === 'first-batch-detail' ? 'feishu-first-batch-detail.v1' : 'feishu-read-only.v1',
        sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false
      };
    }
    const extraInputKeys = Object.keys(input).filter(key => !['page', 'pageSize'].includes(key));
    if (extraInputKeys.length) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const table = identifierContract.byName.get(plan.tableName);
    if (!table) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', '飞书表标识契约缺失', 503);
    noteTableDependency(plan.tableName);
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    if (!Number.isInteger(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是整数', 400);
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    let pageToken = '';
    let result;
    for (let currentPage = 1; currentPage <= page; currentPage += 1) {
      assertSyncTaskActive();
      result = await runWithSyncSlot(() => client.listRecords(table.tableId, {
        viewId: table.views[0]?.viewId,
        pageSize,
        pageToken,
        fieldNames: table.fields.map(field => field.name)
      }, syncRequestOptions()));
      assertSyncTaskActive();
      if (currentPage === page) break;
      if (!result.hasMore || !result.nextPageToken) {
        result = { items: [], total: result.total, hasMore: false, nextPageToken: '' };
        break;
      }
      pageToken = result.nextPageToken;
    }
    const items = result.items.map(record => safeRecord(record, plan)).filter(record => record.id);
    return {
      code: 'OK',
      data: { items, total: result.total, page, pageSize, hasMore: result.hasMore },
      traceId: traceIdFactory(),
      schemaVersion: 'feishu-read-only.v1',
      sourceUpdatedAt: now().toISOString(),
      isComplete: !result.hasMore,
      dataStale: false
    };
  }

  function operationCacheKey(operationId, input, requestContext, policy = null) {
    if (policy?.scope !== 'tenant') return createReadIsolationKey(operationId, input, requestContext);
    const identity = requestContext?.identity || {};
    // Tenant-wide projections must use the same key for startup prewarm and
    // authenticated traffic. User/admin projections continue to include the
    // complete identity, permission and data-scope descriptor.
    return createReadIsolationKey(operationId, input, {
      identity: {
        tenantKey: valueToText(identity.tenantKey || identity.tenantId || 'default-tenant')
      }
    });
  }

  function operationCacheEntryForRequest(operationId, input, requestContext, policy, key) {
    const exact = getOperationCacheEntry(key);
    if (exact || policy?.scope !== 'tenant') return exact;
    const identity = requestContext?.identity || {};
    const tenantKey = valueToText(identity.tenantKey || identity.tenantId || 'default-tenant');
    if (tenantKey === startupPrewarmTenantKey) return null;
    if (!boundPrewarmTenantKey) boundPrewarmTenantKey = tenantKey;
    if (boundPrewarmTenantKey !== tenantKey) return null;
    const seedKey = operationCacheKey(operationId, input, {
      identity: { tenantKey: startupPrewarmTenantKey }
    }, policy);
    const seed = getOperationCacheEntry(seedKey);
    if (!seed) return null;
    if (cacheNow() >= Number(seed.staleUntil)) {
      deleteOperationCacheEntry(seedKey);
      return null;
    }
    // Bind the startup-only snapshot to the first authenticated tenant served
    // by this fixed-base process. Subsequent tenants cannot consume that seed.
    setOperationCacheEntry(key, {
      ...seed,
      lastAccessedAt: cacheNow(),
      refreshSpec: {
        operationId,
        input: stableCacheValue(input || {}),
        requestContext: refreshContext(requestContext)
      }
    });
    return getOperationCacheEntry(key) || seed;
  }

  function splitReferenceValues(value) {
    return valueToText(value).split(/[、,，;；|\n]+/).map(item => item.trim()).filter(Boolean);
  }

  function dateText(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
    const text = valueToText(value);
    if (/^\d{13}$/.test(text)) return new Date(Number(text)).toISOString();
    return text;
  }

  function onboardingStatus(value) {
    const status = valueToText(value).trim().toLocaleUpperCase('zh-CN');
    if (['PENDING', 'RUNNING', 'PROCESSING', 'SUBMITTED'].includes(status) || /审批中|审核中|待审批|处理中/.test(status)) return 'PENDING';
    if (['APPROVED', 'COMPLETED', 'PASSED'].includes(status) || /通过|已上架|已发布/.test(status)) return 'APPROVED';
    if (['REJECTED', 'REFUSED', 'FAILED'].includes(status) || /拒绝|驳回|退回/.test(status)) return 'REJECTED';
    if (['CANCELLED', 'CANCELED', 'WITHDRAWN'].includes(status) || /取消|撤回/.test(status)) return 'CANCELLED';
    return status || 'UNKNOWN';
  }

  function parseOnboardingFormData(value) {
    const text = valueToText(value).trim();
    if (!text || (!text.startsWith('{') && !text.startsWith('['))) return {};
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  async function listCurrentOnboardingApplications(requestContext) {
    const { userId } = requireIdentity(requestContext);
    const filter = equalityFilter('上架申请', '申请人ID', userId);
    const [rows, userRows, departmentRows, typeRows, domainRows] = await Promise.all([
      readAll('上架申请', PROFILE_FIELDS.onboardingApplications, { filter }),
      readAll('用户字典', PROFILE_FIELDS.user),
      readAll('部门字典'),
      readAll('应用类型配置'),
      readAll('业务域字典')
    ]);
    const users = createUserDictionaryLookup(userRows, '姓名');
    const departments = new Map(departmentRows.map(record => [valueToText(record?.fields?.['部门ID']), valueToText(record?.fields?.['部门名称'])]).filter(([id]) => id));
    const types = new Map(typeRows.map(record => {
      const fields = record?.fields || {};
      return [valueToText(fields['类型ID'] || fields['类型编码']), valueToText(fields['类型名称'])];
    }).filter(([id]) => id));
    const domains = new Map(domainRows.map(record => [valueToText(record?.fields?.['业务域ID']), valueToText(record?.fields?.['业务域名称'])]).filter(([id]) => id));
    return rows.filter(record => valueToText(record?.fields?.['申请人ID']) === userId).map(record => {
      const fields = record?.fields || {};
      const form = parseOnboardingFormData(fields['表单数据']);
      const applicationId = valueToText(fields['申请单号']) || String(record?.record_id || '');
      const applicationType = valueToText(fields['应用类型ID'] || form.applicationType || form.type);
      const businessDomain = valueToText(fields['所属业务域ID'] || form.businessDomain || form.domain);
      const authorizedUserIds = splitReferenceValues(fields['授权用户'] || form.authorizedUsers || form.users);
      const authorizedDepartmentIds = splitReferenceValues(fields['授权部门'] || form.authorizedDepartments || form.accessDepartment);
      const status = onboardingStatus(fields['状态']);
      return Object.freeze({
        type: 'APP_ONBOARDING',
        businessId: applicationId,
        applicationId,
        resourceId: valueToText(fields['关联应用ID']),
        uniqueIdentifier: valueToText(fields['唯一标识']),
        instanceId: valueToText(fields['审批实例ID']),
        applicationName: valueToText(fields['应用名称'] || form.applicationName || form.name),
        applicationCode: valueToText(fields['应用编码'] || form.applicationCode || form.code),
        applicationType,
        applicationTypeName: types.get(applicationType) || valueToText(form.applicationTypeName) || applicationType,
        businessDomain,
        businessDomainName: domains.get(businessDomain) || valueToText(form.businessDomainName) || businessDomain,
        applicant: userId,
        applicantName: resolvePersonDisplayName(users, userId, 'onboarding.applicant'),
        authorizedUsers: authorizedUserIds,
        authorizedUserNames: authorizedUserIds.map(id => resolvePersonDisplayName(users, id, 'onboarding.authorized-user')).filter(Boolean),
        authorizedDepartments: authorizedDepartmentIds.map(id => departments.get(id) || id),
        submittedAt: dateText(fields['提交时间']),
        status,
        currentNode: valueToText(fields['当前审批节点']) || status,
        completedAt: dateText(fields['完成时间']),
        rejectionReason: valueToText(fields['退回原因']),
        lastSyncedAt: dateText(fields['最近同步时间'] || fields['完成时间'] || fields['提交时间']),
        approvalSource: valueToText(fields['审批来源']),
        icon: null,
        attachments: [],
        detailFields: form
      });
    }).filter(item => item.applicationId).sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  }

  async function getCurrentOnboardingApplication(applicationId, requestContext) {
    const normalizedId = valueToText(applicationId);
    if (!normalizedId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '申请详情必须提供 applicationId', 400);
    const record = (await listCurrentOnboardingApplications(requestContext)).find(item => item.applicationId === normalizedId);
    if (!record) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '申请不存在或不属于当前用户', 404);
    return record;
  }

  function cacheEntrySize(entry) {
    try {
      return Buffer.byteLength(JSON.stringify(entry?.value || null), 'utf8');
    } catch {
      return 1_024;
    }
  }

  function persistentEntries(committedStagingKey = '') {
    const serialize = (key, entry, committed) => ({
      key,
      operationId: entry.operationId,
      value: entry.value,
      committed,
      createdAt: entry.createdAt,
      lastAccessedAt: entry.lastAccessedAt,
      freshUntil: entry.freshUntil,
      staleUntil: entry.staleUntil,
      dependencies: entry.dependencies || []
    });
    return [
      ...[...operationCache.entries()]
        .filter(([key]) => key !== committedStagingKey)
        .map(([key, entry]) => serialize(key, entry, true)),
      ...[...operationCacheStaging.entries()]
        .map(([key, entry]) => serialize(key, entry, key === committedStagingKey))
    ];
  }

  function validateHomepageCacheSuccess(value) {
    if (!value || value.code !== 'OK' || value.isComplete !== true || value.aggregateState !== 'fresh') {
      throw new FeishuProxyError('READ_RESULT_INCOMPLETE', '首页聚合结果尚未完整，禁止写入缓存', 502, {
        operationId: HOMEPAGE_CACHE_OPERATION_ID
      });
    }
    for (const operationId of HOMEPAGE_CACHE_SECTION_IDS) {
      const section = value.sections?.[operationId];
      if (!Object.hasOwn(value.data || {}, operationId)
          || section?.available !== true
          || section?.isComplete !== true
          || section?.data === undefined) {
        throw new FeishuProxyError('READ_SUCCESS_SCHEMA_INVALID', '首页聚合结果缺少完整子段', 502, {
          operationId,
          aggregateOperationId: HOMEPAGE_CACHE_OPERATION_ID
        });
      }
    }
    return value;
  }

  function validateOperationSuccess(operationId, value) {
    if (operationId === HOMEPAGE_CACHE_OPERATION_ID) return validateHomepageCacheSuccess(value);
    const contract = VERIFIED_READ_OPERATION_CONTRACTS[operationId];
    if (!contract?.successSchema) {
      throw new FeishuProxyError('READ_SUCCESS_SCHEMA_MISSING', '读取结果缺少受控成功合同', 502, { operationId });
    }
    if (!value || value.code !== 'OK' || value.isComplete !== true) {
      throw new FeishuProxyError('READ_RESULT_INCOMPLETE', '读取结果尚未完整，禁止写入缓存', 502, { operationId });
    }
    try {
      validateContractSchema(value, contract.successSchema, `${operationId} success`);
    } catch (error) {
      throw new FeishuProxyError('READ_SUCCESS_SCHEMA_INVALID', '读取结果未通过成功数据合同校验', 502, {
        operationId,
        schemaError: String(error?.message || error)
      });
    }
    if (operationId === 'COM-004' && (value.data?.items || []).some(isControlledTestPersonRecord)) {
      throw new FeishuProxyError('CONTROLLED_TEST_RECORD', '人员目录包含初始化测试人员，禁止写入或恢复缓存', 502, {
        operationId,
        retryable: false
      });
    }
    if (['APP-002', 'APP-003'].includes(operationId)) {
      const applications = operationId === 'APP-002' ? (value.data?.items || []) : [value.data].filter(Boolean);
      if (applications.some(isControlledTestApplicationProjection)) {
        throw new FeishuProxyError('CONTROLLED_TEST_RECORD', '应用结果引用初始化测试人员或部门，禁止写入或恢复缓存', 502, {
          operationId,
          retryable: false
        });
      }
    }
    return value;
  }

  function cacheRuntimeError(error) {
    return new FeishuProxyError('CACHE_RUNTIME_UNAVAILABLE', '服务器缓存快照写入失败', 503, {
      cacheError: String(error?.code || error?.message || error || 'SNAPSHOT_WRITE_FAILED')
    });
  }

  function schedulePersistentSnapshot() {
    persistentCache?.enqueue?.(persistentEntries);
  }

  async function commitPersistentSnapshot(requiredVersion, requiredKey, requiredGeneration = 'any', committedStagingKey = '') {
    const health = persistentCache?.metrics?.();
    if (!health?.enabled || typeof persistentCache?.flush !== 'function') return true;
    const callerTaskState = syncTaskScope.getStore();
    const persistedRequiredKey = () => {
      if (!requiredKey) return true;
      if (requiredGeneration === 'candidate') return persistedCandidateOperationCacheKeys.has(requiredKey);
      if (requiredGeneration === 'committed') return persistedCommittedOperationCacheKeys.has(requiredKey);
      return persistedOperationCacheKeys.has(requiredKey);
    };
    while (persistedOperationCacheVersion < requiredVersion || !persistedRequiredKey()) {
      assertSyncTaskActive();
      if (requiredKey && !operationCache.has(requiredKey) && !operationCacheStaging.has(requiredKey)) {
        throw Object.assign(new Error('缓存条目在快照提交前已失效'), { code: 'CACHE_ENTRY_INVALIDATED_BEFORE_COMMIT' });
      }
      if (!persistentCommit) {
        persistentCommit = (async () => {
          if (persistentCommitCoalesceMs > 0) {
            await new Promise(resolve => setTimeout(resolve, persistentCommitCoalesceMs));
          }
          const targetVersion = operationCacheVersion;
          const snapshot = persistentEntries(committedStagingKey);
          attemptedCommittedOperationCacheKeys = new Set(
            snapshot.filter(entry => entry.committed !== false).map(entry => entry.key)
          );
          attemptedCandidateOperationCacheKeys = new Set(
            snapshot.filter(entry => entry.committed === false).map(entry => entry.key)
          );
          const result = await persistentCache.flush(() => snapshot, { signal: syncTaskScope.getStore()?.signal });
          const currentHealth = persistentCache.metrics?.();
          const keys = Array.isArray(result?.keys) ? result.keys : snapshot.map(entry => entry.key);
          const keySet = new Set(keys);
          if (result === false || currentHealth?.lastError || currentHealth?.writeSuspended) {
            throw Object.assign(new Error(currentHealth?.lastError || 'SNAPSHOT_WRITE_FAILED'), {
              code: currentHealth?.lastError || 'SNAPSHOT_WRITE_FAILED'
            });
          }
          persistedOperationCacheVersion = targetVersion;
          persistedOperationCacheKeys = new Set(keys);
          persistedCommittedOperationCacheKeys = new Set(
            snapshot.filter(entry => entry.committed !== false && keySet.has(entry.key)).map(entry => entry.key)
          );
          persistedCandidateOperationCacheKeys = new Set(
            snapshot.filter(entry => entry.committed === false && keySet.has(entry.key)).map(entry => entry.key)
          );
          return result;
        })().finally(() => { persistentCommit = null; });
      }
      try {
        await persistentCommit;
      } catch (error) {
        if (error?.code === 'READ_SYNC_DEADLINE_EXCEEDED' && !syncStateExpired(callerTaskState)) continue;
        throw error;
      }
      assertSyncTaskActive();
      const attemptedRequiredKey = requiredGeneration === 'candidate'
        ? attemptedCandidateOperationCacheKeys.has(requiredKey)
        : requiredGeneration === 'committed'
          ? attemptedCommittedOperationCacheKeys.has(requiredKey)
          : attemptedCommittedOperationCacheKeys.has(requiredKey) || attemptedCandidateOperationCacheKeys.has(requiredKey);
      if (requiredKey
        && persistedOperationCacheVersion >= requiredVersion
        && attemptedRequiredKey
        && !persistedRequiredKey()) {
        throw Object.assign(new Error('缓存条目被持久快照容量策略裁剪'), { code: 'CACHE_PERSISTED_ENTRY_PRUNED' });
      }
    }
    return Object.freeze({
      written: true,
      keys: Object.freeze([...persistedOperationCacheKeys]),
      committedKeys: Object.freeze([...persistedCommittedOperationCacheKeys]),
      candidateKeys: Object.freeze([...persistedCandidateOperationCacheKeys])
    });
  }

  function deleteOperationCacheEntry(key, { persist = true } = {}) {
    const staged = operationCacheStaging.get(key);
    if (staged) {
      operationCacheStagingBytes = Math.max(0, operationCacheStagingBytes - Number(staged.byteSize || 0));
      operationCacheStaging.delete(key);
    }
    const entry = operationCache.get(key);
    if (entry) operationCacheBytes = Math.max(0, operationCacheBytes - Number(entry.byteSize || 0));
    const deleted = entry ? operationCache.delete(key) : false;
    const changed = Boolean(staged || deleted);
    if (changed) operationCacheVersion += 1;
    if (changed && persist) schedulePersistentSnapshot();
    return changed;
  }

  function clearOperationCache() {
    if (operationCache.size || operationCacheStaging.size) operationCacheVersion += 1;
    operationCache.clear();
    operationCacheStaging.clear();
    operationCacheBytes = 0;
    operationCacheStagingBytes = 0;
    schedulePersistentSnapshot();
  }

  function getOperationCacheEntry(key) {
    const entry = operationCache.get(key);
    if (!entry || entry.committed === false) return null;
    entry.lastAccessedAt = cacheNow();
    operationCache.delete(key);
    operationCache.set(key, entry);
    return entry;
  }

  function setOperationCacheEntry(key, entry, { persist = true } = {}) {
    deleteOperationCacheEntry(key, { persist: false });
    const sizedEntry = {
      ...entry,
      committed: entry.committed !== false,
      lastAccessedAt: Number(entry.lastAccessedAt) || cacheNow(),
      byteSize: cacheEntrySize(entry)
    };
    operationCache.set(key, sizedEntry);
    operationCacheVersion += 1;
    operationCacheBytes += sizedEntry.byteSize;
    while (operationCache.size > operationCacheMaxEntries || operationCacheBytes > operationCacheMaxBytes) {
      const oldestNonRepresentative = [...operationCache.entries()]
        .find(([, candidate]) => !REPRESENTATIVE_CACHE_OPERATION_SET.has(candidate.operationId))?.[0];
      if (oldestNonRepresentative != null) {
        deleteOperationCacheEntry(oldestNonRepresentative, { persist: false });
        continue;
      }
      // Every remaining entry is protected. Reject the just-inserted entry so
      // an already completed representative cache is never displaced.
      if (operationCache.has(key)) deleteOperationCacheEntry(key, { persist: false });
      break;
    }
    if (persist) schedulePersistentSnapshot();
  }

  function removeStagedOperationCacheEntry(key) {
    const entry = operationCacheStaging.get(key);
    if (!entry) return null;
    operationCacheStaging.delete(key);
    operationCacheStagingBytes = Math.max(0, operationCacheStagingBytes - Number(entry.byteSize || 0));
    return entry;
  }

  function stageOperationCacheEntry(key, entry) {
    removeStagedOperationCacheEntry(key);
    const sizedEntry = {
      ...entry,
      committed: false,
      lastAccessedAt: Number(entry.lastAccessedAt) || cacheNow(),
      byteSize: cacheEntrySize(entry)
    };
    const prospectiveEntries = () => new Set([
      ...operationCache.keys(),
      ...operationCacheStaging.keys(),
      key
    ]).size;
    const prospectiveBytes = () => operationCacheBytes + operationCacheStagingBytes + sizedEntry.byteSize;
    while (prospectiveEntries() > operationCacheMaxEntries || prospectiveBytes() > operationCacheMaxBytes) {
      const oldestNonRepresentative = [...operationCache.entries()].find(([candidateKey, candidate]) => (
        candidateKey !== key
        && !operationCacheStaging.has(candidateKey)
        && !REPRESENTATIVE_CACHE_OPERATION_SET.has(candidate.operationId)
      ))?.[0];
      if (oldestNonRepresentative == null) {
        throw Object.assign(new Error('缓存候选超过进程内缓存容量'), { code: 'CACHE_MEMORY_CAPACITY_EXCEEDED' });
      }
      deleteOperationCacheEntry(oldestNonRepresentative, { persist: false });
    }
    operationCacheStaging.set(key, sizedEntry);
    operationCacheStagingBytes += sizedEntry.byteSize;
    operationCacheVersion += 1;
    return sizedEntry;
  }

  function publishStagedOperationCacheEntry(key, expectedValue) {
    const stagedEntry = operationCacheStaging.get(key);
    if (!stagedEntry || stagedEntry.value !== expectedValue) {
      throw Object.assign(new Error('缓存候选在持久提交期间被失效'), { code: 'CACHE_MEMORY_ENTRY_EVICTED' });
    }
    removeStagedOperationCacheEntry(key);
    const previous = operationCache.get(key);
    if (previous) operationCacheBytes = Math.max(0, operationCacheBytes - Number(previous.byteSize || 0));
    const published = { ...stagedEntry, committed: true };
    operationCache.delete(key);
    operationCache.set(key, published);
    operationCacheBytes += published.byteSize;
    return published;
  }

  async function commitOperationCacheEntry(key, operationId, value, policy, dependencies, input, requestContext) {
    assertSyncTaskActive();
    validateOperationSuccess(operationId, value);
    if (dependenciesChanged(dependencies)) {
      throw new FeishuProxyError('CACHE_INVALIDATED_DURING_SYNC', '同步期间数据已更新，正在重新读取', 409, { operationId });
    }
    const timestamp = cacheNow();
    const cachedValue = { ...value, dataStale: false, refreshing: false, cacheStatus: 'fresh' };
    let requiredCacheVersion = operationCacheVersion;
    const previousCommitted = operationCache.get(key) || null;
    let publishedCandidate = false;
    try {
      stageOperationCacheEntry(key, {
        operationId,
        value: cachedValue,
        createdAt: timestamp,
        lastAccessedAt: timestamp,
        freshUntil: timestamp + policy.freshMs,
        staleUntil: timestamp + policy.staleMs,
        dependencies: [...dependencies.names].filter(Boolean),
        refreshSpec: { operationId, input: stableCacheValue(input || {}), requestContext: refreshContext(requestContext) },
        committed: false
      });
      requiredCacheVersion = operationCacheVersion;
      emitCacheEvent('cache-commit', { ...syncTaskScope.getStore(), keyDigest: fingerprint(key), operationId, commit: 'staged', transition: 'running' });
      if (operationCacheStaging.get(key)?.value !== cachedValue) {
        throw Object.assign(new Error('缓存条目超过进程内缓存容量'), { code: 'CACHE_MEMORY_CAPACITY_EXCEEDED' });
      }
      const persisted = await commitPersistentSnapshot(requiredCacheVersion, key, 'candidate');
      emitCacheEvent('cache-commit', { ...syncTaskScope.getStore(), keyDigest: fingerprint(key), operationId, commit: 'persisted', transition: 'running' });
      assertSyncTaskActive();
      const health = persistentCache?.metrics?.();
      const persistedCurrentKey = !health?.enabled || !Array.isArray(persisted?.keys) || persisted.keys.includes(key);
      if (health?.enabled && (persisted === false || !persistedCurrentKey || health.lastError || health.writeSuspended)) {
        throw Object.assign(new Error(health.lastError || 'SNAPSHOT_WRITE_FAILED'), { code: health.lastError || 'SNAPSHOT_WRITE_FAILED' });
      }
      if (operationCacheStaging.get(key)?.value !== cachedValue) {
        throw Object.assign(new Error('缓存条目在快照提交期间被容量淘汰'), { code: 'CACHE_MEMORY_ENTRY_EVICTED' });
      }
      if (dependenciesChanged(dependencies)) {
        removeStagedOperationCacheEntry(key);
        await persistentCache?.flush?.(persistentEntries);
        throw new FeishuProxyError('CACHE_INVALIDATED_DURING_SYNC', '同步期间数据已更新，正在重新读取', 409, { operationId });
      }
      operationCacheVersion += 1;
      requiredCacheVersion = operationCacheVersion;
      const committedPersistence = await commitPersistentSnapshot(requiredCacheVersion, key, 'committed', key);
      const committedHealth = persistentCache?.metrics?.();
      if (committedHealth?.enabled
          && (committedPersistence === false
            || !committedPersistence.committedKeys?.includes?.(key)
            || committedHealth.lastError
            || committedHealth.writeSuspended)) {
        throw Object.assign(new Error(committedHealth.lastError || 'SNAPSHOT_WRITE_FAILED'), {
          code: committedHealth.lastError || 'SNAPSHOT_WRITE_FAILED'
        });
      }
      assertSyncTaskActive();
      if (dependenciesChanged(dependencies)) {
        throw new FeishuProxyError('CACHE_INVALIDATED_DURING_SYNC', '同步期间数据已更新，正在重新读取', 409, { operationId });
      }
      publishStagedOperationCacheEntry(key, cachedValue);
      publishedCandidate = true;
      const published = getOperationCacheEntry(key);
      if (!published || published.value !== cachedValue) {
        throw Object.assign(new Error('缓存同键回读校验失败'), { code: 'CACHE_READBACK_FAILED' });
      }
      emitCacheEvent('cache-commit', { ...syncTaskScope.getStore(), keyDigest: fingerprint(key), operationId, commit: 'published-readback-ok', transition: 'completed' });
      return cachedValue;
    } catch (error) {
      if (operationCacheStaging.get(key)?.value === cachedValue) removeStagedOperationCacheEntry(key);
      const current = operationCache.get(key);
      if (publishedCandidate && current?.value === cachedValue) {
        operationCache.delete(key);
        operationCacheBytes = Math.max(0, operationCacheBytes - Number(current.byteSize || 0));
        if (previousCommitted) {
          operationCache.set(key, previousCommitted);
          operationCacheBytes += Number(previousCommitted.byteSize || 0);
        }
        operationCacheVersion += 1;
      }
      if (persistentCache?.metrics?.()?.enabled && typeof persistentCache?.flush === 'function') {
        try {
          const rollbackSnapshot = persistentEntries();
          const rollback = await persistentCache.flush(() => rollbackSnapshot);
          const rollbackHealth = persistentCache.metrics?.();
          if (rollback === false || rollbackHealth?.lastError || rollbackHealth?.writeSuspended) {
            throw Object.assign(new Error(rollbackHealth?.lastError || 'SNAPSHOT_ROLLBACK_FAILED'), {
              code: rollbackHealth?.lastError || 'SNAPSHOT_ROLLBACK_FAILED'
            });
          }
          persistedOperationCacheVersion = operationCacheVersion;
          persistedOperationCacheKeys = new Set(rollbackSnapshot.map(entry => entry.key));
          persistedCommittedOperationCacheKeys = new Set(
            rollbackSnapshot.filter(entry => entry.committed !== false).map(entry => entry.key)
          );
          persistedCandidateOperationCacheKeys = new Set();
        } catch (rollbackError) {
          throw cacheRuntimeError(rollbackError);
        }
      }
      if (['CACHE_INVALIDATED_DURING_SYNC', 'READ_SYNC_DEADLINE_EXCEEDED'].includes(String(error?.code || ''))) throw error;
      throw cacheRuntimeError(error);
    }
  }

  const persistentRestoreState = { completed: false, restoredEntries: 0, usableEntries: 0, errorCode: null };
  const persistentRestore = persistentCache?.restore?.().then(entries => {
    const ordered = [...(entries || [])]
      .filter(entry => entry?.committed !== false)
      .sort((left, right) => Number(left.lastAccessedAt || left.createdAt) - Number(right.lastAccessedAt || right.createdAt));
    for (const entry of ordered) {
      try {
        validateOperationSuccess(entry.operationId, entry.value);
      } catch {
        continue;
      }
      setOperationCacheEntry(entry.key, {
        operationId: entry.operationId,
        value: entry.value,
        createdAt: entry.createdAt,
        lastAccessedAt: entry.lastAccessedAt,
        freshUntil: entry.freshUntil,
        staleUntil: entry.staleUntil,
        dependencies: entry.dependencies || [],
        committed: true
      }, { persist: false });
      persistentRestoreState.restoredEntries += 1;
    }
    persistentRestoreState.usableEntries = operationCache.size;
    persistentRestoreState.completed = true;
  }).catch(error => {
    persistentRestoreState.completed = true;
    persistentRestoreState.errorCode = String(error?.code || error?.message || 'SNAPSHOT_RESTORE_FAILED');
  }) || Promise.resolve().then(() => { persistentRestoreState.completed = true; });

  const backgroundRefreshTimer = setInterval(() => {
    cleanupSyncJobs();
    const timestamp = cacheNow();
    for (const [key, entry] of operationCache) {
      if (!entry.refreshSpec || timestamp < entry.freshUntil || timestamp >= entry.staleUntil || operationPending.has(key)) continue;
      const { operationId, input, requestContext } = entry.refreshSpec;
      const policy = operationPolicy(operationId, input);
      // User/admin scopes are refreshed only by a live request after real-time
      // authorization. The timer may refresh tenant-wide data without a session.
      if (!policy || policy.scope !== 'tenant') continue;
      startOperationRefresh(key, operationId, input, requestContext, policy).catch(() => {});
    }
  }, backgroundRefreshIntervalMs);
  backgroundRefreshTimer.unref?.();

  function cachedEnvelope(entry, state, refreshing = false) {
    return {
      ...entry.value,
      traceId: traceIdFactory(),
      sourceUpdatedAt: entry.value.sourceUpdatedAt,
      dataStale: state === 'stale',
      refreshing,
      cacheStatus: state
    };
  }

  function refreshContext(requestContext = {}) {
    const identity = requestContext.identity || {};
    return {
      identity: {
        tenantKey: valueToText(identity.tenantKey || identity.tenantId),
        userId: valueToText(identity.userId),
        openId: valueToText(identity.openId),
        adAccount: valueToText(identity.adAccount),
        departmentId: valueToText(identity.departmentId),
        dataScope: valueToText(identity.dataScope),
        permissions: Array.isArray(identity.permissions) ? identity.permissions.map(String) : []
      }
    };
  }

  function rememberRefresh(entry, operationId, input, requestContext) {
    if (!entry) return;
    entry.refreshSpec = {
      operationId,
      input: stableCacheValue(input || {}),
      requestContext: refreshContext(requestContext)
    };
  }

  function retryableRefreshError(error) {
    if (['READ_SUCCESS_SCHEMA_INVALID', 'READ_SUCCESS_SCHEMA_MISSING', 'READ_RESULT_INCOMPLETE', 'CACHE_RUNTIME_UNAVAILABLE'].includes(String(error?.code || ''))) {
      return false;
    }
    const status = Number(error?.status || 0);
    if (status === 429) return true;
    return [
      'FEISHU_READ_BUDGET_EXCEEDED',
      'FEISHU_UPSTREAM_TIMEOUT',
      'FEISHU_UPSTREAM_UNAVAILABLE',
      'UPSTREAM_DOWN',
      'ECONNABORTED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ETIMEDOUT',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_SOCKET',
      'CACHE_INVALIDATED_DURING_SYNC'
    ].includes(String(error?.code || error?.cause?.code || ''));
  }

  async function executeRefreshWithRetry(key, operationId, input, requestContext, policy, strong) {
    let lastError;
    for (let attempt = 1; attempt <= syncRetryAttempts; attempt += 1) {
      assertSyncTaskActive();
      const taskState = syncTaskScope.getStore();
      const claimedAttempt = taskState ? claimTaskAttempt(taskState) : attempt;
      emitCacheEvent('sync-attempt', { ...taskState, keyDigest: fingerprint(key), operationId, attempt: claimedAttempt, transition: 'running' });
      const dependencies = dependencyTracker();
      const attemptScope = createAttemptState(taskState);
      try {
        const execute = () => tableDependencyScope.run(dependencies, () => executeUncached(operationId, input, requestContext));
        const executeAttempt = () => (strong ? strongReadScope.run(true, execute) : execute());
        const value = await (attemptScope ? syncTaskScope.run(attemptScope.state, executeAttempt) : executeAttempt());
        assertSyncTaskActive();
        const committed = await commitOperationCacheEntry(key, operationId, value, policy, dependencies, input, requestContext);
        await settleAttempt(attemptScope);
        return committed;
      } catch (error) {
        error.attempt ??= claimedAttempt;
        await settleAttempt(attemptScope, error);
        lastError = error;
        if (syncStateExpired() || error?.code === 'READ_SYNC_DEADLINE_EXCEEDED') throw syncDeadlineError();
        const budget = taskAttemptBudget(taskState);
        const backoffMs = Math.min(1_000, syncRetryBackoffMs * (2 ** (attempt - 1)));
        if (attempt >= syncRetryAttempts || (budget && budget.used >= budget.max) || !retryableRefreshError(error)
            || !hasSyncRetryRunway(taskState, backoffMs)) throw error;
        performanceMetrics.refreshRetries += 1;
        await sleepWithinSync(backoffMs);
      }
    }
    throw lastError;
  }

  function startOperationRefresh(key, operationId, input, requestContext, policy) {
    const current = operationPending.get(key);
    if (current) {
      performanceMetrics.inflightDedupeHits += 1;
      return current;
    }
    performanceMetrics.refreshes += 1;
    let deadlineTimer;
    const abortBindings = [];
    // User/admin projections remain isolated from lower caches. WB-001 is the
    // homepage exception: its identity/permission/current-user projection is
    // forced through the shared live read batch, while public catalogue source
    // tables may reuse startup snapshots. The final WB-001 key still contains
    // all six isolation dimensions.
    // Lower source projections are shared only when the final operation applies
    // identity/data-scope filtering itself. Permission-gated admin operations
    // keep strong source reads; ordinary user reads remain isolated by their
    // final six-dimensional operation key without discarding safe table reuse.
    const isolatedSourceRead = realtimeAuthorization
      && Boolean(requiredPermissionForOperation(operationId))
      && !trustedSystemContexts.has(requestContext);
    const parentState = syncTaskScope.getStore();
    const contextDeadlineAt = Number(requestContext?.syncDeadlineAtMs);
    const controller = createSyncAbortController();
    const ownDeadlineAt = readNow() + syncTaskTimeoutMs;
    const candidateDeadlines = [ownDeadlineAt, parentState?.deadlineAt, contextDeadlineAt].filter(Number.isFinite);
    const taskState = {
      cancelled: false,
      controller,
      signal: controller.signal,
      deadlineAt: Math.min(...candidateDeadlines),
      traceId: parentState?.traceId || requestContext?.syncTraceId || traceIdFactory(),
      syncId: parentState?.syncId || requestContext?.syncId || `read-${randomUUID()}`,
      keyDigest: fingerprint(key),
      operationId,
      budgetMs: syncTaskTimeoutMs,
      attemptBudget: taskAttemptBudget(parentState) || requestContext?.syncAttemptBudget || { used: 0, max: syncRetryAttempts }
    };
    for (const signal of [parentState?.signal, requestContext?.syncAbortSignal].filter(Boolean)) {
      if (abortBindings.some(binding => binding.signal === signal)) continue;
      const handler = () => {
        taskState.cancelled = true;
        controller.abort(syncDeadlineError());
      };
      abortBindings.push({ signal, handler });
      if (signal.aborted) handler();
      else signal.addEventListener('abort', handler, { once: true });
    }
    const execution = syncTaskScope.run(taskState, () => executeRefreshWithRetry(
      key,
      operationId,
      input,
      requestContext,
      policy,
      isolatedSourceRead
    ));
    const deadline = new Promise((_, reject) => {
      deadlineTimer = setTimeout(() => {
        taskState.cancelled = true;
        const error = syncDeadlineError();
        controller.abort(error);
        reject(error);
      }, Math.max(0, taskState.deadlineAt - readNow()));
    });
    const request = Promise.race([execution, deadline]).catch(error => {
      taskState.cancelled = true;
      if (!controller.signal.aborted) controller.abort(error);
      void Promise.allSettled([execution]).then(() => drainSyncWork(taskState)).catch(() => {});
      performanceMetrics.refreshFailures += 1;
      if (error?.code === 'READ_SYNC_DEADLINE_EXCEEDED') performanceMetrics.deadlineFailures += 1;
      throw error;
    }).finally(() => {
      clearTimeout(deadlineTimer);
      for (const binding of abortBindings) binding.signal.removeEventListener('abort', binding.handler);
      if (operationPending.get(key) === request) operationPending.delete(key);
    });
    operationPending.set(key, request);
    syncPromiseStates.set(request, taskState);
    return request;
  }

  function peekOperation(operationId, input = {}, requestContext = {}) {
    const policy = operationPolicy(operationId, input);
    if (!policy || policy.freshMs <= 0 || policy.staleMs <= 0) return null;
    if (realtimeAuthorization && policy.scope === 'tenant') requireIdentity(requestContext);
    if (realtimeAuthorization && policy.scope !== 'tenant' && !verifiedAuthorizationContexts.has(requestContext)) return null;
    const key = operationCacheKey(operationId, input, requestContext, policy);
    const entry = operationCacheEntryForRequest(operationId, input, requestContext, policy, key);
    if (!entry) return null;
    const timestamp = cacheNow();
    if (timestamp < entry.freshUntil) return cachedEnvelope(entry, 'fresh');
    if (timestamp < entry.staleUntil) return cachedEnvelope(entry, 'stale', operationPending.has(key));
    deleteOperationCacheEntry(key);
    return null;
  }

  function peekCompositeCache(operationId, input = {}, requestContext = {}) {
    if (operationId !== HOMEPAGE_CACHE_OPERATION_ID) return null;
    if (realtimeAuthorization && !verifiedAuthorizationContexts.has(requestContext)) return null;
    const key = operationCacheKey(operationId, input, requestContext);
    const entry = getOperationCacheEntry(key);
    if (!entry) return null;
    const timestamp = cacheNow();
    if (timestamp < entry.freshUntil) return cachedEnvelope(entry, 'fresh');
    if (timestamp < entry.staleUntil) return cachedEnvelope(entry, 'stale', operationPending.has(key));
    deleteOperationCacheEntry(key);
    return null;
  }

  async function commitCompositeCache(operationId, input = {}, requestContext = {}, value, {
    freshMs = 30_000,
    staleMs = 300_000,
    dependencies = []
  } = {}) {
    if (operationId !== HOMEPAGE_CACHE_OPERATION_ID) {
      throw new FeishuProxyError('CACHE_POLICY_NOT_ALLOWED', '未批准的聚合缓存 operation', 400, { operationId });
    }
    if (realtimeAuthorization && !verifiedAuthorizationContexts.has(requestContext)) {
      throw new FeishuProxyError('PERMISSION_DENIED', '聚合缓存提交缺少实时授权上下文', 403);
    }
    const tracker = dependencyTracker();
    for (const tableName of dependencies.length ? dependencies : ['*']) {
      tracker.names.add(String(tableName));
      tracker.versions.set(String(tableName), tableInvalidationVersions.get(String(tableName)) || 0);
    }
    const commit = () => commitOperationCacheEntry(
        operationCacheKey(operationId, input, requestContext),
        operationId,
        value,
        { freshMs, staleMs },
        tracker,
        input,
        requestContext
      );
    if (syncTaskScope.getStore()) return commit();
    return runBoundedReadTask(commit, requestStartedAt(requestContext), requestContext).promise;
  }

  function executeUncachedDeduped(operationId, input = {}, requestContext = {}, { strong = false } = {}) {
    const plan = READ_PLANS[operationId];
    const scope = plan?.kind === 'admin-read' ? 'admin' : 'user';
    const key = `${strong ? 'consistent' : 'default'}\u0000${operationCacheKey(operationId, input, requestContext, { code: `S-${scope === 'admin' ? 'A' : 'U'}0`, scope })}`;
    const current = uncachedOperationPending.get(key);
    if (current) {
      performanceMetrics.inflightDedupeHits += 1;
      return current;
    }
    const execution = () => executeUncached(operationId, input, requestContext);
    const request = (strong ? strongReadScope.run(true, execution) : execution()).finally(() => {
      if (uncachedOperationPending.get(key) === request) uncachedOperationPending.delete(key);
    });
    uncachedOperationPending.set(key, request);
    return request;
  }

  async function executeUncachedWithRetry(operationId, input, requestContext, { strong = false } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= syncRetryAttempts; attempt += 1) {
      assertSyncTaskActive();
      const taskState = syncTaskScope.getStore();
      const claimedAttempt = taskState ? claimTaskAttempt(taskState) : attempt;
      emitCacheEvent('sync-attempt', { ...taskState, operationId, attempt: claimedAttempt, transition: 'running' });
      const attemptScope = createAttemptState(taskState);
      try {
        const executeAttempt = () => executeUncachedDeduped(operationId, input, requestContext, { strong });
        const value = await (attemptScope ? syncTaskScope.run(attemptScope.state, executeAttempt) : executeAttempt());
        validateOperationSuccess(operationId, value);
        await settleAttempt(attemptScope);
        return value;
      } catch (error) {
        error.attempt ??= claimedAttempt;
        await settleAttempt(attemptScope, error);
        lastError = error;
        if (syncStateExpired() || error?.code === 'READ_SYNC_DEADLINE_EXCEEDED') throw syncDeadlineError();
        const budget = taskAttemptBudget(taskState);
        const backoffMs = attempt === 1 ? 500 : 1_000;
        if (attempt >= syncRetryAttempts || (budget && budget.used >= budget.max) || !retryableRefreshError(error)
            || !hasSyncRetryRunway(taskState, backoffMs)) throw error;
        performanceMetrics.refreshRetries += 1;
        await sleepWithinSync(backoffMs);
      }
    }
    throw lastError;
  }

  async function executeFreshInternal(operationId, input = {}, requestContext = {}, waitForCompletion = false) {
    await persistentRestore;
    performanceMetrics.requests += 1;
    const policy = operationPolicy(operationId, input);
    if (!policy || policy.freshMs <= 0 || policy.staleMs <= 0) {
      performanceMetrics.misses += 1;
      if (STRONG_CONSISTENCY_OPERATION_SET.has(operationId)) {
        return executeUncachedWithRetry(operationId, input, requestContext, { strong: true });
      }
      return executeUncachedWithRetry(operationId, input, requestContext);
    }
    const authorizedContext = await authorizeCacheRequest(operationId, requestContext, policy, input);
    const key = operationCacheKey(operationId, input, authorizedContext, policy);
    const entry = operationCacheEntryForRequest(operationId, input, authorizedContext, policy, key);
    rememberRefresh(entry, operationId, input, authorizedContext);
    const timestamp = cacheNow();
    if (entry && timestamp < entry.freshUntil) {
      performanceMetrics.freshHits += 1;
      return cachedEnvelope(entry, 'fresh');
    }
    if (entry && timestamp >= entry.staleUntil) deleteOperationCacheEntry(key);
    performanceMetrics.misses += 1;
    const refresh = startOperationRefresh(key, operationId, input, authorizedContext, policy);
    const job = !waitForCompletion && coldMissBudgetMs > 0
      ? trackSync(key, operationId, authorizedContext, refresh)
      : null;
    try {
      let timer;
      const value = !waitForCompletion && coldMissBudgetMs > 0
        ? await Promise.race([
            refresh,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new FeishuProxyError(
                'FEISHU_INITIAL_SYNCING',
                '请求处理中',
                202,
                { retryAfterSeconds: 2, syncId: job.id, pollAfterMs: 2_000 }
              )), coldMissBudgetMs);
            })
          ]).finally(() => { if (timer) clearTimeout(timer); })
        : await refresh;
      return { ...value, traceId: value.traceId || traceIdFactory() };
    } catch (error) {
      if (error?.code === 'FEISHU_INITIAL_SYNCING') throw error;
      if (entry && timestamp < entry.staleUntil) {
        performanceMetrics.staleFallbacks += 1;
        return cachedEnvelope(entry, 'stale', false);
      }
      throw error;
    }
  }

  function executeFresh(operationId, input = {}, requestContext = {}) {
    return executeFreshInternal(operationId, validatedBusinessInput(operationId, input), requestContext, false);
  }

  // Aggregate tasks already expose their own sync job. They must await the
  // shared underlying refresh instead of turning the nested 5-second budget
  // into a terminal 503 response.
  function executeBackground(operationId, input = {}, requestContext = {}) {
    input = validatedBusinessInput(operationId, input);
    const policy = operationPolicy(operationId, input);
    if (!policy || policy.freshMs <= 0 || policy.staleMs <= 0) {
      const startedAt = requestStartedAt(requestContext);
      return runBoundedReadTask(async () => {
        await persistentRestore;
        performanceMetrics.requests += 1;
        performanceMetrics.misses += 1;
        if (STRONG_CONSISTENCY_OPERATION_SET.has(operationId)) {
          return executeUncachedWithRetry(operationId, input, requestContext, { strong: true });
        }
        return executeUncachedWithRetry(operationId, input, requestContext);
      }, startedAt, requestContext).promise;
    }
    return executeFreshInternal(operationId, input, requestContext, true);
  }

  function requestStartedAt(requestContext = {}) {
    const current = Number(readNow());
    const supplied = Number(requestContext.requestReceivedAtMs);
    return Number.isFinite(supplied) && supplied >= 0 && supplied <= current + 1_000
      ? supplied
      : current;
  }

  function runBoundedReadTask(factory, startedAt, requestContext = {}) {
    const controller = createSyncAbortController();
    const contextDeadlineAt = Number(requestContext?.syncDeadlineAtMs);
    const taskState = {
      cancelled: false,
      controller,
      signal: controller.signal,
      traceId: requestContext.syncTraceId || traceIdFactory(),
      syncId: requestContext.syncId || `read-${randomUUID()}`,
      operationId: requestContext.syncOperationId || null,
      keyDigest: requestContext.syncKeyDigest || null,
      budgetMs: syncTaskTimeoutMs,
      attemptBudget: requestContext.syncAttemptBudget || { used: 0, max: syncRetryAttempts },
      deadlineAt: Math.min(
        startedAt + syncTaskTimeoutMs,
        Number.isFinite(contextDeadlineAt) ? contextDeadlineAt : Number.POSITIVE_INFINITY
      )
    };
    const externalSignal = requestContext?.syncAbortSignal;
    const externalAbort = () => {
      taskState.cancelled = true;
      controller.abort(syncDeadlineError());
    };
    if (externalSignal?.aborted) externalAbort();
    else externalSignal?.addEventListener?.('abort', externalAbort, { once: true });
    let timer;
    const execution = syncTaskScope.run(taskState, factory);
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        taskState.cancelled = true;
        const error = syncDeadlineError();
        controller.abort(error);
        reject(error);
      }, Math.max(0, taskState.deadlineAt - readNow()));
    });
    const promise = Promise.race([execution, deadline]).catch(error => {
      taskState.cancelled = true;
      if (!controller.signal.aborted) controller.abort(error);
      void Promise.allSettled([execution]).then(() => drainSyncWork(taskState)).catch(() => {});
      if (error?.code === 'READ_SYNC_DEADLINE_EXCEEDED') performanceMetrics.deadlineFailures += 1;
      throw error;
    }).finally(() => {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', externalAbort);
    });
    syncPromiseStates.set(promise, taskState);
    return { promise, taskState };
  }

  async function executeCacheable(operationId, input, requestContext, policy, onAuthorized) {
    assertSyncTaskActive();
    await persistentRestore;
    assertSyncTaskActive();
    performanceMetrics.requests += 1;
    const authorizedContext = await authorizeCacheRequest(operationId, requestContext, policy, input);
    assertSyncTaskActive();
    onAuthorized?.(authorizedContext);
    const key = operationCacheKey(operationId, input, authorizedContext, policy);
    const entry = operationCacheEntryForRequest(operationId, input, authorizedContext, policy, key);
    rememberRefresh(entry, operationId, input, authorizedContext);
    const timestamp = cacheNow();
    if (entry && timestamp < entry.freshUntil) {
      performanceMetrics.freshHits += 1;
      return cachedEnvelope(entry, 'fresh');
    }
    if (entry && timestamp < entry.staleUntil) {
      performanceMetrics.staleHits += 1;
      startOperationRefresh(key, operationId, input, authorizedContext, policy).catch(() => {});
      return cachedEnvelope(entry, 'stale', true);
    }
    if (entry) deleteOperationCacheEntry(key);
    performanceMetrics.misses += 1;
    const value = await startOperationRefresh(key, operationId, input, authorizedContext, policy);
    assertSyncTaskActive();
    return { ...value, traceId: value.traceId || traceIdFactory() };
  }

  async function awaitOrHandoff(operationId, input, requestContext, startedAt, bounded, authorizationState, taskState) {
    if (coldMissBudgetMs <= 0) return bounded;
    const remaining = Math.max(0, startedAt + coldMissBudgetMs - readNow());
    let timer;
    const outcome = await Promise.race([
      bounded.then(value => ({ completed: true, value })),
      new Promise(resolve => { timer = setTimeout(() => resolve({ completed: false }), remaining); })
    ]).finally(() => clearTimeout(timer));
    if (outcome.completed) return outcome.value;

    const job = trackEndToEndSync(
      operationId,
      input,
      requestContext,
      bounded,
      () => authorizationState.fingerprint,
      () => authorizationState.context,
      taskState
    );
    throw new FeishuProxyError(
      'FEISHU_INITIAL_SYNCING',
      '请求处理中',
      202,
      {
        retryAfterSeconds: 2,
        syncId: job.id,
        pollAfterMs: 2_000,
        operationId,
        state: 'running',
        traceId: job.traceId,
        retryable: true
      }
    );
  }

  function executeRealtimeWithHandoff(operationId, input = {}, requestContext = {}) {
    input = validatedBusinessInput(operationId, input);
    const startedAt = requestStartedAt(requestContext);
    const authorizationState = { fingerprint: '', context: null };
    const boundedTask = runBoundedReadTask(async () => {
      performanceMetrics.requests += 1;
      performanceMetrics.misses += 1;
      const policy = operationPolicy(operationId, input);
      const authorizedContext = policy
        ? await authorizeCacheRequest(operationId, requestContext, policy, input)
        : await authorizeRequestContext(requestContext);
      assertSyncTaskActive();
      authorizationState.context = authorizedContext;
      authorizationState.fingerprint = canonicalSyncAuthorizationFingerprint(authorizedContext);
      return executeUncachedWithRetry(operationId, input, authorizedContext, { strong: true });
    }, startedAt, { ...requestContext, syncOperationId: operationId });
    return awaitOrHandoff(operationId, input, requestContext, startedAt, boundedTask.promise, authorizationState, boundedTask.taskState);
  }

  async function execute(operationId, input = {}, requestContext = {}) {
    input = validatedBusinessInput(operationId, input);
    const policy = operationPolicy(operationId, input);
    if (!policy || policy.freshMs <= 0 || policy.staleMs <= 0) {
      return executeRealtimeWithHandoff(operationId, input, requestContext);
    }
    const startedAt = requestStartedAt(requestContext);
    let authorizationFingerprint = '';
    let authorizedContextForTask = null;
    const boundedTask = runBoundedReadTask(
      () => executeCacheable(operationId, input, requestContext, policy, authorizedContext => {
        authorizedContextForTask = authorizedContext;
        authorizationFingerprint = canonicalSyncAuthorizationFingerprint(authorizedContext);
      }),
      startedAt,
      { ...requestContext, syncOperationId: operationId }
    );
    return awaitOrHandoff(operationId, input, requestContext, startedAt, boundedTask.promise, {
      get fingerprint() { return authorizationFingerprint; },
      get context() { return authorizedContextForTask; }
    }, boundedTask.taskState);
  }

  async function executeConsistent(operationId, input = {}, requestContext = {}) {
    input = validatedBusinessInput(operationId, input);
    await persistentRestore;
    performanceMetrics.requests += 1;
    performanceMetrics.misses += 1;
    return strongReadScope.run(true, () => executeUncached(operationId, input, requestContext));
  }

  function invalidateAppProjection() {
    cacheInvalidationEpoch += 1;
    appProjectionCache = null;
    appProjectionExpiresAt = 0;
    appDetailCountCache = null;
    appDetailCountExpiresAt = 0;
    appDetailCountSourceCache.clear();
    appDetailCountSourcePendingEpoch.clear();
    dictionaryProjectionCache.clear();
    for (const tableName of ['应用索引', '应用类型配置', '用户字典', '部门字典', '业务域字典', '场景字典']) {
      tableInvalidationVersions.set(tableName, (tableInvalidationVersions.get(tableName) || 0) + 1);
      invalidateTableSnapshots(tableName);
    }
    invalidateOperationEntries(['应用索引', '应用类型配置', '用户字典', '部门字典', '业务域字典', '场景字典']);
  }

  function invalidateOperationEntries(tableNames = []) {
    const targets = new Set(tableNames.map(valueToText).filter(Boolean));
    if (!targets.size) return 0;
    let invalidated = 0;
    for (const [key, entry] of operationCache) {
      const dependencies = Array.isArray(entry.dependencies) ? entry.dependencies : [];
      if (!dependencies.some(tableName => tableName === '*' || targets.has(tableName))) continue;
      if (deleteOperationCacheEntry(key, { persist: false })) invalidated += 1;
    }
    if (invalidated) schedulePersistentSnapshot();
    return invalidated;
  }

  function invalidateTables(tableNames = []) {
    const normalized = [...new Set(tableNames.map(valueToText).filter(Boolean))];
    if (normalized.length) cacheInvalidationEpoch += 1;
    for (const tableName of normalized) {
      tableInvalidationVersions.set(tableName, (tableInvalidationVersions.get(tableName) || 0) + 1);
      invalidateTableSnapshots(tableName);
    }
    const targetSet = new Set(normalized);
    const appTables = new Set(['应用索引', '应用类型配置', '用户字典', '部门字典', '业务域字典', '场景字典', ...APP_DETAIL_COUNT_SOURCES.map(item => item.tableName)]);
    if (normalized.some(tableName => appTables.has(tableName))) {
      appProjectionCache = null;
      appProjectionExpiresAt = 0;
      appDetailCountCache = null;
      appDetailCountExpiresAt = 0;
      appDetailCountSourceCache.clear();
      appDetailCountSourcePendingEpoch.clear();
    }
    if (targetSet.has('公告通知') || targetSet.has('公告已读明细')) {
      announcementProjectionCache = null;
      announcementProjectionExpiresAt = 0;
    }
    if (normalized.some(tableName => /人才|项目进度/.test(tableName))) talentProjectionCache.clear();
    if (targetSet.has('用户字典') || targetSet.has('部门字典')) {
      contactProjectionCache = null;
      contactProjectionExpiresAt = 0;
    }
    if (normalized.some(tableName => /字典|配置|分类/.test(tableName))) dictionaryProjectionCache.clear();
    invalidateOperationEntries(normalized);
  }

  function invalidateTableSnapshots(tableName) {
    for (const key of tableReadCache.keys()) {
      if (key === tableName || key.startsWith(`${tableName}\u0000`)) deleteTableReadCacheEntry(key);
    }
  }

  async function prewarm({ identities = [] } = {}) {
    await persistentRestore;
    const systemContext = { identity: { tenantKey: startupPrewarmTenantKey, userId: 'system-prewarm' } };
    trustedSystemContexts.add(systemContext);
    const startupInputs = Object.freeze({
      'COM-005': { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false },
      'WB-002': { page: 1, pageSize: 20, sort: 'RELEVANCE' }
    });
    const restoredHits = Object.entries(startupInputs).filter(([operationId, input]) => peekOperation(operationId, input, systemContext));
    if (restoredHits.length === Object.keys(startupInputs).length) {
      const persistentHealth = await checkPersistentCacheHealth();
      if (persistentHealth?.enabled && (persistentHealth.healthy === false || persistentHealth.lastError || persistentHealth.writeSuspended)) {
        throw new FeishuProxyError('CACHE_RUNTIME_UNAVAILABLE', '服务器缓存运行目录不可用', 503, {
          cacheError: String(persistentHealth.lastError || 'CACHE_WRITES_SUSPENDED')
        });
      }
      persistentRestoreState.usableEntries = operationCache.size;
      return Object.freeze({
        restoredEntries: persistentRestoreState.restoredEntries,
        verifiedHits: restoredHits.map(([operationId]) => operationId),
        source: 'persistent-snapshot'
      });
    }
    const prewarmOperation = async ([operationId, input]) => {
      const startedAt = readNow();
      const traceId = traceIdFactory();
      const syncId = `startup-${randomUUID()}`;
      const attemptBudget = { used: 0, max: syncRetryAttempts };
      const policy = operationPolicy(operationId, input);
      const prewarmContext = {
        ...systemContext,
        syncTraceId: traceId,
        syncId,
        syncOperationId: operationId,
        syncAttemptBudget: attemptBudget,
        requestReceivedAtMs: startedAt
      };
      trustedSystemContexts.add(prewarmContext);
      const keyDigest = fingerprint(operationCacheKey(operationId, input, prewarmContext, policy));
      prewarmContext.syncKeyDigest = keyDigest;
      emitCacheEvent('startup-prewarm', { traceId, syncId, keyDigest, operationId, transition: 'running' });
      try {
        const result = await executeBackground(operationId, input, prewarmContext);
        emitCacheEvent('startup-prewarm', {
          traceId, syncId, keyDigest, operationId,
          attempt: attemptBudget.used,
          elapsedMs: readNow() - startedAt,
          transition: 'completed'
        });
        return result;
      } catch (error) {
        error.prewarmOperationId = operationId;
        emitCacheEvent('startup-prewarm', {
          traceId,
          syncId,
          keyDigest,
          operationId,
          attempt: Number(error?.attempt || attemptBudget.used),
          resource: error?.prewarmResource,
          errorCode: error?.code || error?.cause?.code || 'PREWARM_FAILED',
          upstreamPath: error?.upstreamPath,
          elapsedMs: readNow() - startedAt,
          transition: 'failed'
        });
        throw error;
      }
    };
    // Prewarm through the same operation tasks used by live traffic. This
    // keeps the approved 25-second deadline, three-attempt budget, 500/1000ms
    // retry schedule, global concurrency limiter and correlation context. Raw
    // eager table reads bypassed all five controls and made one transient table
    // timeout permanently fail readiness.
    const readinessResults = await Promise.allSettled(Object.entries(startupInputs).map(prewarmOperation));
    const readinessFailure = readinessResults.find(result => result.status === 'rejected');
    if (readinessFailure) throw readinessFailure.reason;
    for (const requestContext of identities) {
      await Promise.all([
        execute('COM-001', {}, requestContext),
        execute('COM-002', { platform: 'WEB' }, requestContext),
        execute('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, requestContext)
      ]);
    }
    try {
      await flushPersistentCache();
    } catch (error) {
      throw new FeishuProxyError('CACHE_RUNTIME_UNAVAILABLE', '服务器缓存运行目录不可用', 503, {
        cacheError: String(error?.code || error?.message || 'SNAPSHOT_WRITE_FAILED')
      });
    }
    const persistentHealth = persistentCache?.metrics?.();
    if (persistentHealth?.enabled && persistentHealth.lastError) {
      throw new FeishuProxyError('CACHE_RUNTIME_UNAVAILABLE', '服务器缓存运行目录不可用', 503, { cacheError: persistentHealth.lastError });
    }
    const verifiedHits = Object.entries(startupInputs).filter(([operationId, input]) => peekOperation(operationId, input, systemContext));
    if (verifiedHits.length !== 2) {
      throw new FeishuProxyError('CACHE_STARTUP_HIT_FAILED', '服务器缓存恢复后无法实际命中', 503);
    }
    persistentRestoreState.usableEntries = operationCache.size;
    // WB-001 contains a user projection. Running it with the synthetic startup
    // identity cannot form a reusable final entry for a real user and competes
    // with the first authorized request for Feishu slots, so it is deliberately
    // excluded from startup prewarm. Real-user requests still use the normal
    // five-second handoff, deduplication, cache commit and persistent snapshot.
    return Object.freeze({ restoredEntries: persistentRestoreState.restoredEntries, verifiedHits: verifiedHits.map(([operationId]) => operationId) });
  }

  async function waitForIdle() {
    while (operationPending.size || uncachedOperationPending.size || tableReadPending.size) {
      const pending = [
        ...operationPending.values(),
        ...uncachedOperationPending.values(),
        ...[...tableReadPending.values()].map(batch => batch.promise)
      ];
      await Promise.allSettled(pending);
    }
  }

  function getPerformanceSnapshot() {
    return Object.freeze({
      cache: Object.freeze({
        ...performanceMetrics,
        entries: operationCache.size,
        bytes: operationCacheBytes,
        maxEntries: operationCacheMaxEntries,
        maxBytes: operationCacheMaxBytes,
        tableEntries: tableReadCache.size,
        tableBytes: tableReadCacheBytes,
        tableMaxEntries: tableReadCacheMaxEntries,
        tableMaxBytes: tableReadCacheMaxBytes
      }),
      inflight: Object.freeze({
        cacheableOperations: operationPending.size,
        strongOperations: uncachedOperationPending.size,
        tableReads: tableReadPending.size,
        feishuSyncs: activeSyncs,
        queuedFeishuSyncs: syncQueue.length + prioritySyncQueue.length + authorizationSyncQueue.length,
        queuedAuthorizationSyncs: authorizationSyncQueue.length,
        maxFeishuSyncs: maxSyncConcurrency,
        syncTaskTimeoutMs
      }),
      persistent: persistentCache?.metrics?.() || Object.freeze({ enabled: false }),
      restore: Object.freeze({ ...persistentRestoreState })
    });
  }

  async function checkPersistentCacheHealth() {
    await persistentRestore;
    if (typeof persistentCache?.checkHealth === 'function') return persistentCache.checkHealth();
    const current = persistentCache?.metrics?.() || Object.freeze({ enabled: false, lastError: null, writeSuspended: false });
    return Object.freeze({ ...current, healthy: !current.enabled || (!current.lastError && !current.writeSuspended) });
  }

  async function flushPersistentCache({ discardOnFailure = false } = {}) {
    await persistentRestore;
    if (typeof persistentCache?.flush !== 'function') return true;
    let result;
    let failure;
    try {
      result = await persistentCache.flush(persistentEntries);
    } catch (error) {
      failure = error;
    }
    let health = persistentCache.metrics?.();
    const healthyCommit = !health?.enabled
      || (result !== false && !health.lastError && !health.writeSuspended);
    if (!failure && healthyCommit) return result;
    if (!discardOnFailure) throw cacheRuntimeError(failure || health?.lastError || 'SNAPSHOT_WRITE_FAILED');

    try {
      if (typeof persistentCache.discardSnapshot !== 'function') {
        throw Object.assign(new Error('持久缓存不支持隔离旧快照'), { code: 'CACHE_SNAPSHOT_DISCARD_UNAVAILABLE' });
      }
      await persistentCache.discardSnapshot();
    } catch (discardError) {
      throw new FeishuProxyError('CACHE_INVALIDATION_PERSIST_FAILED', '业务写入已成功，但旧缓存快照无法安全隔离', 503, {
        cacheError: String(discardError?.code || discardError?.message || discardError),
        writeCommitted: true,
        retryable: false
      });
    }

    try {
      result = await persistentCache.flush(persistentEntries);
      health = persistentCache.metrics?.();
      if (result !== false && (!health?.enabled || (!health.lastError && !health.writeSuspended))) return result;
    } catch (retryError) {
      failure = retryError;
    }
    return Object.freeze({
      written: false,
      discarded: true,
      errorCode: String(failure?.code || health?.lastError || 'SNAPSHOT_WRITE_FAILED')
    });
  }

  async function getStartupCacheState() {
    await persistentRestore;
    const timestamp = cacheNow();
    const usableEntries = [...operationCache.values()].filter(entry => entry.committed !== false && timestamp < Number(entry.staleUntil)).length;
    persistentRestoreState.usableEntries = usableEntries;
    return Object.freeze({ ...persistentRestoreState, usableEntries });
  }

  function close() {
    clearInterval(backgroundRefreshTimer);
    taskStatusAuthorizationContinuations.clear();
  }

  return Object.freeze({
    execute,
    executeRealtimeWithHandoff,
    executeConsistent,
    authorizeRequestContext,
    authorizeTaskStatus,
    runWithSharedReadBatch,
    validateOperationSuccess,
    executeFresh,
    executeBackground,
    getReadSyncStatus,
    peekOperation,
    peekCompositeCache,
    commitCompositeCache,
    prewarm,
    waitForIdle,
    flushPersistentCache,
    close,
    getPerformanceSnapshot,
    getStartupCacheState,
    checkPersistentCacheHealth,
    invalidateAppProjection,
    invalidateTables,
    resolveCurrentUserProfile: readCurrentContactProjection,
    listCurrentOnboardingApplications,
    getCurrentOnboardingApplication
  });
}
