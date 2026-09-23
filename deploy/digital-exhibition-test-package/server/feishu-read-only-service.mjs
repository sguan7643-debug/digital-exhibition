import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { getOperation } from '../src/integration/operation-registry.js';
import { createHash } from 'node:crypto';

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

const PROFILE_FIELDS = Object.freeze({
  user: Object.freeze(['AD账号', '工号', '姓名', '手机号脱敏值', '邮箱脱敏值', '组织ID', '组织名称', '所属部门ID', '所属部门名称']),
  permissions: Object.freeze(['AD账号', '主体ID', '状态', '权限编码', '数据范围', '生效时间', '失效时间', '启用']),
  messages: Object.freeze(['消息ID', '接收人ID', '消息标题', '消息内容', '分类', '已读状态', '消息时间', '消息类型编码', '消息摘要', '优先级', '发送人ID', '目标类型', '目标ID', '目标路径', '过期时间', '阅读时间']),
  favorites: Object.freeze(['用户ID', '有效']),
  balance: Object.freeze(['用户ID', '当前总积分']),
  cumulativeStats: Object.freeze(['用户ID', '累计访问应用次数', '累计使用应用次数']),
  monthlyStats: Object.freeze(['用户ID', '年月', '当月使用次数']),
  useApplications: Object.freeze(['主键', '应用ID', '申请人ID', '状态', '申请时间', '申请编号', '提交时间', '完成时间']),
  onboardingApplications: Object.freeze(['申请单号', '关联应用ID', '申请人ID', '状态', '当前审批节点', '提交时间', '退回原因']),
  reuseApplications: Object.freeze(['申请编号', '应用ID', '申请人ID', '本地状态', '提交时间', '完成时间']),
  apps: Object.freeze(['应用ID', '应用名称'])
});

const DEFAULT_P0_CACHE_POLICIES = Object.freeze({
  'COM-001': Object.freeze({ freshMs: 30_000, staleMs: 300_000, scope: 'user' }),
  'COM-002': Object.freeze({ freshMs: 30_000, staleMs: 300_000, scope: 'user' }),
  'COM-005': Object.freeze({ freshMs: 60_000, staleMs: 900_000, scope: 'tenant' }),
  'WB-001': Object.freeze({ freshMs: 30_000, staleMs: 300_000, scope: 'user' }),
  'WB-002': Object.freeze({ freshMs: 60_000, staleMs: 900_000, scope: 'tenant' })
});

function stableCacheValue(value) {
  if (Array.isArray(value)) return value.map(stableCacheValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableCacheValue(value[key])]));
}

function fingerprint(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
}

function valueToText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('、');
  if (typeof value === 'object') return value.text || value.name || value.value || '';
  return String(value);
}

// 用户字典以 AD账号 为唯一业务主键。用户ID仅用于兼容迁移前的历史记录；
// 其他业务表仍可保留“用户ID”等字段名，但其中的值必须是这个 AD 账号。
function userDictionaryAccount(fields = {}) {
  return valueToText(fields['AD账号']) || valueToText(fields['用户ID']);
}

function permissionSubjectIdentifier(fields = {}) {
  return valueToText(fields['AD账号']) || valueToText(fields['主体ID']) || valueToText(fields['用户ID']);
}

function createUserDictionaryLookup(records, valueField, { fallbackToKey = true } = {}) {
  const result = new Map();
  for (const record of records || []) {
    const fields = record?.fields || {};
    const account = userDictionaryAccount(fields);
    const value = valueToText(fields[valueField]);
    if (account && (value || fallbackToKey)) result.set(account, value || account);
  }
  return result;
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

export function createFeishuReadOnlyService(options) {
  const { client, identifierContract } = options || {};
  if (!client || !identifierContract?.byName) throw new Error('只读服务缺少飞书客户端或标识契约');
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  const now = options.now || (() => new Date());
  const appProjectionCacheMs = options.appProjectionCacheMs ?? 30_000;
  const tableReadCacheMs = options.tableReadCacheMs ?? 60_000;
  const configuredReadBudgetMs = Number(options.readBudgetMs ?? process.env.FEISHU_READ_BUDGET_MS ?? 15_000);
  const readBudgetMs = Number.isFinite(configuredReadBudgetMs) && configuredReadBudgetMs > 0 ? Math.min(configuredReadBudgetMs, 15_000) : 15_000;
  const configuredColdMissBudgetMs = Number(options.coldMissBudgetMs ?? 0);
  const coldMissBudgetMs = Number.isFinite(configuredColdMissBudgetMs) && configuredColdMissBudgetMs > 0
    ? Math.min(configuredColdMissBudgetMs, 2_000)
    : 0;
  const readNow = options.readNow || Date.now;
  const cacheNow = options.cacheNow || Date.now;
  const readSleep = options.readSleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const fileAccessService = options.fileAccessService;
  const allowedAppLaunchHosts = new Set((Array.isArray(options.allowedAppLaunchHosts)
    ? options.allowedAppLaunchHosts
    : String(options.allowedAppLaunchHosts || '').split(','))
    .map(item => String(item).trim().toLocaleLowerCase('en-US')).filter(Boolean));
  let appProjectionCache = null;
  let appProjectionExpiresAt = 0;
  let appProjectionPending = null;
  let appDetailCountCache = null;
  let appDetailCountExpiresAt = 0;
  let appDetailCountPending = null;
  let announcementProjectionCache = null;
  let announcementProjectionExpiresAt = 0;
  let announcementProjectionPending = null;
  const talentProjectionCache = new Map();
  const talentProjectionPending = new Map();
  let contactProjectionCache = null;
  let contactProjectionExpiresAt = 0;
  let contactProjectionPending = null;
  const dictionaryProjectionCache = new Map();
  const dictionaryProjectionPending = new Map();
  const tableReadCache = new Map();
  const tableReadPending = new Map();
  const operationCache = new Map();
  const operationPending = new Map();
  const operationCachePolicies = Object.freeze({ ...DEFAULT_P0_CACHE_POLICIES, ...(options.operationCachePolicies || {}) });

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

  function equalityFilter(tableName, fieldName, value) {
    const table = resolveTable(tableName);
    if (!table.fields.some(field => field.name === fieldName)) {
      throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', `飞书筛选字段契约缺失：${tableName}.${fieldName}`, 503);
    }
    const escaped = valueToText(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    return `CurrentValue.[${fieldName}] = "${escaped}"`;
  }

  function identityFilter(tableName, fieldNames, value) {
    const clauses = fieldNames.map(fieldName => equalityFilter(tableName, fieldName, value));
    return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`;
  }

  function isFieldContractDrift(error) {
    return error?.code === 'FEISHU_RECORDS_FAILED' && Number(error?.upstreamCode) === 1254045;
  }

  async function readAllUncached(tableName, fieldNames = [], { filter = '' } = {}) {
    const table = resolveTable(tableName);
    const requestedFields = normalizedFieldNames(fieldNames);
    const items = [];
    let pageToken = '';
    let retried = false;
    let readWithoutProjection = false;
    const readPageWithinBudget = async (query, startedAt) => {
      const deadline = startedAt + readBudgetMs;
      const remaining = deadline - readNow();
      if (remaining <= 0) throw readBudgetError(startedAt);
      let timer;
      try {
        return await Promise.race([
          client.listRecords(table.tableId, query),
          new Promise((_, reject) => { timer = setTimeout(() => reject(readBudgetError(startedAt)), remaining); })
        ]);
      } finally {
        clearTimeout(timer);
      }
    };
    for (let page = 1; page <= 100; page += 1) {
      let result;
      for (let attempt = 0; attempt < 2; attempt += 1) {
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
          const retryable = [429, 502, 504].includes(error?.status) && error?.code !== 'FEISHU_READ_BUDGET_EXCEEDED';
          if (!retryable || retried || attempt === 1) throw error;
          retried = true;
          await readSleep(300);
        }
      }
      items.push(...result.items);
      if (!result.hasMore || !result.nextPageToken) return items;
      pageToken = result.nextPageToken;
    }
    throw new FeishuProxyError('REMOTE_PAGINATION_LIMIT', `飞书表记录超过受控读取上限：${tableName}`, 503);
  }

  function createTableReadBatch(tableName, requestedFields, filter = '') {
    const resourceKey = tableReadResourceKey(tableName, filter);
    let resolveRequest;
    let rejectRequest;
    const batch = {
      started: false,
      fields: new Set(requestedFields),
      promise: new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      })
    };
    tableReadPending.set(resourceKey, batch);
    queueMicrotask(async () => {
      batch.started = true;
      const cached = tableReadCache.get(resourceKey);
      if (cached && readNow() < cached.expiresAt) {
        for (const fieldName of cached.fields) batch.fields.add(fieldName);
      }
      const mergedFields = [...batch.fields];
      try {
        const rows = await readAllUncached(tableName, mergedFields, { filter });
        if (tableReadCacheMs > 0) {
          tableReadCache.set(resourceKey, {
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
    const requestedFields = tableRequestedFields(tableName, fieldNames);
    const resourceKey = tableReadResourceKey(tableName, filter);
    const cached = tableReadCache.get(resourceKey);
    if (cached && readNow() < cached.expiresAt && fieldsCover(cached.fields, requestedFields)) {
      return Promise.resolve(cached.rows);
    }
    const pending = tableReadPending.get(resourceKey);
    if (pending) {
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
    const table = resolveTable(tableName);
    const startedAt = readNow();
    const deadline = startedAt + readBudgetMs;
    let pageToken = '';
    let result;
    let readWithoutProjection = false;
    for (let currentPage = 1; currentPage <= page; currentPage += 1) {
      const remaining = deadline - readNow();
      if (remaining <= 0) throw readBudgetError(startedAt);
      let timer;
      try {
        const query = { viewId: table.views[0]?.viewId, pageSize, pageToken, fieldNames: readWithoutProjection ? [] : fieldNames };
        try {
          result = await Promise.race([
            client.listRecords(table.tableId, query),
            new Promise((_, reject) => { timer = setTimeout(() => reject(readBudgetError(startedAt)), remaining); })
          ]);
        } catch (error) {
          if (!isFieldContractDrift(error) || readWithoutProjection) throw error;
          readWithoutProjection = true;
          result = await Promise.race([
            client.listRecords(table.tableId, { ...query, fieldNames: [] }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(readBudgetError(startedAt)), Math.max(0, deadline - readNow())); })
          ]);
        }
      } finally {
        clearTimeout(timer);
      }
      if (currentPage < page) {
        if (!result.hasMore || !result.nextPageToken) break;
        pageToken = result.nextPageToken;
      }
    }
    return result || { items: [], total: 0, hasMore: false, nextPageToken: '' };
  }

  function getDictionaryProjection(tableName, fieldNames = []) {
    const timestamp = Date.now();
    const key = tableReadKey(tableName, fieldNames);
    const cached = dictionaryProjectionCache.get(key);
    if (cached && timestamp < cached.expiresAt) return Promise.resolve(cached.rows);
    const pending = dictionaryProjectionPending.get(key);
    if (pending) return pending;
    const projection = readAll(tableName, fieldNames).then(rows => {
      dictionaryProjectionCache.set(key, { rows, expiresAt: Date.now() + appProjectionCacheMs });
      return rows;
    }).finally(() => { dictionaryProjectionPending.delete(key); });
    dictionaryProjectionPending.set(key, projection);
    return projection;
  }

  async function readAppProjection() {
    const [typeRows, userRows, departmentRows, domainRows, sceneRows] = await Promise.all([
      getDictionaryProjection('应用类型配置'), getDictionaryProjection('用户字典', PROFILE_FIELDS.user), getDictionaryProjection('部门字典'),
      getDictionaryProjection('业务域字典'), getDictionaryProjection('场景字典')
    ]);
    const appRows = await readAll('应用索引');
    const typeLookup = createLookup(typeRows, ['类型ID', '类型编码', '类型名称'], '类型名称');
    const userLookup = createUserDictionaryLookup(userRows, '姓名');
    const departmentLookup = createLookup(departmentRows, ['部门ID', '部门名称'], '部门名称');
    const domainLookup = createLookup(domainRows, ['业务域ID', '业务域名称'], '业务域名称');
    const sceneLookup = createLookup(sceneRows, ['场景ID', '场景名称'], '场景名称');
    const items = appRows.map(record => {
      const fields = record?.fields || {};
      const typeCode = valueToText(fields['应用类型']);
      const typeName = typeLookup.get(typeCode) || typeCode || '其他应用';
      const subtype = valueToText(fields['子类型']);
      const domainId = valueToText(fields['所属业务域ID']);
      const sceneIds = valueToList(fields['所属场景ID']);
      const ownerId = valueToText(fields['负责人ID']) || valueToText(fields['申请人AD账号']);
      const developerId = valueToText(fields['开发者ID']) || valueToText(fields['接入人AD账号']);
      const responsibleOrgId = valueToText(fields['所属部门ID']);
      const developerOrgId = valueToText(fields['开发部门ID']) || valueToText(fields['接入人所属部门ID']);
      const presentation = resolveAppPresentation(typeCode, typeName);
      return {
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
        ownerName: userLookup.get(ownerId) || ownerId,
        developerId,
        developerName: userLookup.get(developerId) || developerId,
        responsibleOrgId,
        responsibleOrgName: departmentLookup.get(responsibleOrgId) || responsibleOrgId,
        developerOrgId,
        developerOrgName: departmentLookup.get(developerOrgId) || developerOrgId,
        versionName: valueToText(fields['当前结构版本']),
        updatedAt: valueToText(fields['最近更新日期']),
        iconName: presentation.iconName,
        detailPath: presentation.detailPath
      };
    }).filter(item => item.id && item.name);
    return { items, typeRows, typeLookup, domainLookup, sceneLookup };
  }

  async function getAppProjection() {
    const timestamp = Date.now();
    if (appProjectionCache && timestamp < appProjectionExpiresAt) return appProjectionCache;
    if (appProjectionPending) return appProjectionPending;
    appProjectionPending = readAppProjection().then(result => {
      appProjectionCache = result;
      appProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { appProjectionPending = null; });
    return appProjectionPending;
  }

  async function getAppDetailCounts() {
    const timestamp = Date.now();
    if (appDetailCountCache && timestamp < appDetailCountExpiresAt) return appDetailCountCache;
    if (appDetailCountPending) return appDetailCountPending;
    appDetailCountPending = Promise.all(APP_DETAIL_COUNT_SOURCES.map(async source => ({
      ...source,
      count: (await readAll(source.tableName)).length
    }))).then(result => {
      appDetailCountCache = result;
      appDetailCountExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { appDetailCountPending = null; });
    return appDetailCountPending;
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
    const timestamp = Date.now();
    if (announcementProjectionCache && timestamp < announcementProjectionExpiresAt) return announcementProjectionCache;
    if (announcementProjectionPending) return announcementProjectionPending;
    announcementProjectionPending = readAnnouncementProjection().then(result => {
      announcementProjectionCache = result;
      announcementProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { announcementProjectionPending = null; });
    return announcementProjectionPending;
  }

  function getTalentProjection(kind, reader) {
    const timestamp = Date.now();
    const cached = talentProjectionCache.get(kind);
    if (cached && timestamp < cached.expiresAt) return Promise.resolve(cached.value);
    const pending = talentProjectionPending.get(kind);
    if (pending) return pending;
    const projection = reader().then(value => {
      talentProjectionCache.set(kind, { value, expiresAt: Date.now() + appProjectionCacheMs });
      return value;
    }).finally(() => { talentProjectionPending.delete(kind); });
    talentProjectionPending.set(kind, projection);
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
        name: userLookup.get(userId) || userId, employeeNo: employeeLookup.get(userId) || '',
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
        type: valueToText(fields['项目类型']), ownerId, ownerName: userLookup.get(ownerId) || ownerId,
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
      const result = await readPage(pageToken);
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
    const queue = [{ id: '0', depth: 0 }];
    const seenDepartments = new Set(['0']);
    while (queue.length) {
      const parent = queue.shift();
      const children = await readContactPage(pageToken => client.listDepartmentChildren(parent.id, {
        pageSize: 50, pageToken, userIdType: 'user_id', departmentIdType: 'open_department_id'
      }));
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
        queue.push({ id, depth: department.depth });
      }
    }
    const departmentNameById = new Map(departments.map(item => [item.id, item.name]));
    const usersById = new Map();
    for (const departmentId of ['0', ...departments.map(item => item.id)]) {
      const users = await readContactPage(pageToken => client.listUsersByDepartment(departmentId, {
        pageSize: 50, pageToken, userIdType: 'user_id', departmentIdType: 'open_department_id'
      }));
      for (const item of users) {
        const userId = valueToText(item.user_id || item.open_id);
        if (!userId) continue;
        const departmentIds = Array.isArray(item.department_ids) ? item.department_ids.map(valueToText).filter(Boolean) : [];
        const primaryDepartmentId = departmentIds[0] || departmentId;
        usersById.set(userId, {
          userId, employeeNo: valueToText(item.employee_no), displayName: valueToText(item.name),
          avatarUrl: valueToText(item.avatar?.avatar_72 || item.avatar?.avatar_240), orgId: primaryDepartmentId,
          orgName: departmentNameById.get(primaryDepartmentId) || '', departmentId: primaryDepartmentId,
          departmentName: departmentNameById.get(primaryDepartmentId) || '', officeId: '', officeName: '',
          title: valueToText(item.job_title), mobileMasked: '', emailMasked: '',
          enabled: item.status?.is_resigned !== true && item.status?.is_exited !== true && item.status?.is_frozen !== true
        });
      }
    }
    return { departments, users: [...usersById.values()] };
  }

  async function getContactProjection() {
    const timestamp = Date.now();
    if (contactProjectionCache && timestamp < contactProjectionExpiresAt) return contactProjectionCache;
    if (contactProjectionPending) return contactProjectionPending;
    contactProjectionPending = readContactProjection().then(result => {
      contactProjectionCache = result;
      contactProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { contactProjectionPending = null; });
    return contactProjectionPending;
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

  async function executeContact(operationId, input) {
    const projection = await getContactProjection();
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
    const allowedKeys = ['keyword', 'employeeNo', 'orgId', 'departmentId', 'enabled', 'page', 'pageSize', 'sort'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const pageSize = input.pageSize == null ? 10 : Number(input.pageSize);
    const page = input.page == null ? 1 : Number(input.page);
    if (![10, 20, 50, 100].includes(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    if (!Number.isInteger(page) || page < 1 || page > 100) throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
    let rows = projection.users.filter(item =>
      (!keyword || [item.displayName, item.employeeNo, item.departmentName, item.title].join(' ').toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!input.employeeNo || item.employeeNo === input.employeeNo) &&
      (!input.orgId || item.orgId === input.orgId) && (!input.departmentId || item.departmentId === input.departmentId) &&
      (input.enabled == null || item.enabled === input.enabled)
    );
    rows = [...rows].sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    return {
      items: rows.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize,
      totalPages, hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort: 'name,asc',
      filtersApplied: {
        keyword: valueToText(input.keyword), employeeNo: valueToText(input.employeeNo), orgId: valueToText(input.orgId),
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
      fileId: '', fileName: valueToText(object.name) || fallbackName, extension: '', mimeType: '',
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
    return {
      materialId, materialCode: valueToText(fields['素材编码']), name: valueToText(fields['素材名称']),
      summary: valueToText(fields['素材摘要']), materialType: valueToText(fields['素材类型']),
      categoryIds: valueToList(fields['分类ID']), appTypeCodes: [], domainIds: [], relatedAppIds,
      coverFileId: '', coverUrl: '', primaryFile: safeFileSummary(fields['素材文件']), versionName: valueToText(fields['版本名称']),
      publisherId: valueToText(fields['发布人ID']), publisherName: valueToText(fields['发布人姓名']), publishedAt: valueToText(fields['发布时间']),
      viewCount: valueToNumber(fields['浏览量']), downloadCount: valueToNumber(fields['下载次数']), isFavorite: false,
      permissions: { canView: true, canDownload: false, canMaintain: false },
      descriptionHtml: valueToText(fields['素材描述']), files: [], relatedApps: [], tags: [],
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
        && (!input.relatedAppId || item.relatedAppIds.includes(input.relatedAppId)));
      return { ...paginatePublic(items, page, pageSize), sort: input.sort || 'updatedAt,desc', filtersApplied: {
        keyword: valueToText(input.query || input.keyword), materialType: valueToText(input.materialType), categoryId: valueToText(input.categoryId),
        appTypeCode: valueToText(input.appTypeCode), domainId: valueToText(input.domainId), relatedAppId: valueToText(input.relatedAppId), status: valueToText(input.status || 'ONLINE')
      } };
    }

    if (operationId.startsWith('APP-')) {
      assertAllowedInput(input, operationId === 'APP-003'
        ? ['appId', 'include']
        : ['appId', 'relationType', 'page', 'pageSize', 'sort']);
      const appId = valueToText(input.appId);
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
      summary: valueToText(fields['公告摘要']), contentHtml: '', contentText: textContent, publisherId, publisherName: userLookup.get(publisherId) || '',
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
    const definitions = Object.freeze({
      APPLICATION_TYPE: { table: '应用类型配置', value: ['类型编码', '类型ID'], label: '类型名称', description: '类型描述', color: '颜色令牌', icon: '类型图标', sort: '排序', enabled: '状态', parent: '' },
      BUSINESS_DOMAIN: { table: '业务域字典', value: ['业务域编码', '业务域ID'], label: '业务域名称', description: '描述', color: '颜色令牌', icon: '图标', sort: '排序', enabled: '启用', parent: '父级ID' },
      SCENE: { table: '场景字典', value: ['场景ID'], label: '场景名称', description: '', color: '', icon: '', sort: '', enabled: '', parent: '' },
      MATERIAL_CATEGORY: { table: '素材分类', value: ['分类编码'], label: '分类名称', description: '', color: '', icon: '', sort: '排序', enabled: '启用', parent: '父级ID' }
    });
    const uniqueTypes = [...new Set(input.dictTypes.map(type => type.trim()))];
    const itemsByType = Object.fromEntries(uniqueTypes.map(type => [type, []]));
    let latestUpdatedAt = '';
    let highestVersion = 0;
    await Promise.all(uniqueTypes.map(async dictType => {
      const definition = definitions[dictType];
      if (!definition) return;
      const rows = await getDictionaryProjection(definition.table);
      itemsByType[dictType] = rows.map(record => {
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
        .filter(item => input.includeDisabled === true || item.enabled)
        .filter(item => !input.parentValues?.[dictType] || item.parentValue === input.parentValues[dictType])
        .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, 'zh-CN'));
    }));
    return { itemsByType, version: `feishu-dictionaries.v${highestVersion}`, updatedAt: latestUpdatedAt || now().toISOString() };
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
        user: { userId, displayName: valueToText(user['姓名']), avatarUrl: '', departmentName: valueToText(user['所属部门名称']) },
        content: valueToText(fields['评论内容']), rating: ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null,
        likeCount: 0, isLiked: false, status, createdAt: valueToText(fields['评论时间']), updatedAt: valueToText(fields['更新时间']),
        reply: replyContent ? { replyId: `${valueToText(fields['主键']) || record?.record_id || ''}:reply`, content: replyContent, repliedBy: valueToText(users.get(replyUserId)?.['姓名']) || replyUserId, repliedAt: valueToText(fields['回复时间']) } : null
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
      filtersApplied: { keyword: valueToText(input.keyword).trim(), scene: valueToText(input.scene), typeCode: valueToText(input.typeCode) },
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

  async function readCurrentUserProjection(requestContext) {
    const { identity, userId } = requireIdentity(requestContext);
    const permissionFilter = identityFilter('用户权限', ['AD账号', '主体ID'], userId);
    const messageFilter = equalityFilter('消息通知', '接收人ID', userId);
    const favoriteFilter = equalityFilter('应用收藏', '用户ID', userId);
    const balanceFilter = equalityFilter('积分余额', '用户ID', userId);
    const [userRows, permissionRows, messageRows, favoriteRows, balanceRows] = await Promise.all([
      getDictionaryProjection('用户字典', PROFILE_FIELDS.user),
      readAll('用户权限', PROFILE_FIELDS.permissions, { filter: permissionFilter }),
      readAll('消息通知', PROFILE_FIELDS.messages, { filter: messageFilter }),
      readAll('应用收藏', PROFILE_FIELDS.favorites, { filter: favoriteFilter }),
      readAll('积分余额', PROFILE_FIELDS.balance, { filter: balanceFilter })
    ]);
    const user = userRows.find(record => {
      const fields = record?.fields || {};
      return userDictionaryAccount(fields) === userId;
    })?.fields || {};
    const permissions = permissionRows.filter(record => {
      const fields = record?.fields || {};
      return permissionSubjectIdentifier(fields) === userId && permissionRecordActive(fields);
    });
    const permissionCodes = [...new Set(permissions.map(record => valueToText(record?.fields?.['权限编码'])).filter(Boolean))];
    const availableOrgIds = [...new Set([
      valueToText(user['组织ID']),
      ...permissions.flatMap(record => valueToList(record?.fields?.['数据范围']))
    ].filter(Boolean))];
    const messageItems = messageRows.filter(record => valueToText(record?.fields?.['接收人ID']) === userId);
    const favorites = favoriteRows.filter(record => valueToText(record?.fields?.['用户ID']) === userId && dictionaryEnabled(record?.fields || {}, '有效'));
    const balance = balanceRows.find(record => valueToText(record?.fields?.['用户ID']) === userId)?.fields || {};
    return {
      userId, employeeNo: valueToText(user['工号']) || valueToText(identity.employeeNo), displayName: valueToText(user['姓名']) || valueToText(identity.displayName),
      avatarFileId: null, avatarUrl: valueToText(identity.avatarUrl) || null,
      mobileMasked: valueToText(user['手机号脱敏值']) || null, emailMasked: valueToText(user['邮箱脱敏值']) || null,
      tenantId: valueToText(identity.tenantKey), tenantName: valueToText(user['组织名称']), orgId: valueToText(user['组织ID']), orgName: valueToText(user['组织名称']),
      departmentId: valueToText(user['所属部门ID']), departmentName: valueToText(user['所属部门名称']), roles: [], permissions: permissionCodes,
      availableOrgIds, unreadMessageCount: messageItems.filter(record => !messageRead(record?.fields || {})).length,
      favoriteCount: favorites.length, pointBalance: valueToNumber(balance['当前总积分']), lastLoginAt: '', locale: 'zh-CN', timezone: 'Asia/Shanghai'
    };
  }

  async function requirePermission(requestContext, permissionCode) {
    const user = await readCurrentUserProjection(requestContext);
    if (!user.permissions.includes('*') && !user.permissions.includes(permissionCode)) {
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
      applicantId, applicantName: userLookup.get(applicantId) || applicantId,
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
      const users = new Map(userRows.map(record => [userDictionaryAccount(record?.fields), record?.fields || {}]).filter(([account]) => account));
      const recentMessages = messageRows.filter(record => valueToText(record?.fields?.['接收人ID']) === userId).map(record => messageFromRecord(record, users))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, recentMessageLimit)
        .map(item => ({ messageId: item.messageId, typeName: item.typeName, title: item.title, occurredAt: item.occurredAt, isRead: item.isRead, targetType: item.targetType, targetId: item.targetId, targetPath: item.targetPath }));
      const quickEntries = [
        ['favorites', '我的收藏', '查看已收藏应用', '/favorites', 'favorites.view'], ['points', '我的积分', '查看积分余额与明细', '/points', 'points.view'],
        ['messages', '消息中心', '查看消息通知', '/messages', 'messages.view'], ['todos', '我的申请', '查看申请进度', '/profile/todos', 'applications.view']
      ].map(([code, name, description, path, permissionCode]) => ({ code, name, description, path, iconUrl: '', permissionCode, enabled: user.permissions.includes(permissionCode) || user.permissions.includes('*') }));
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
    const requiredPermission = operationId === 'OPS-001' ? 'operations.dashboard.view'
      : operationId.startsWith('OAN-') ? 'operations.announcements.manage'
      : operationId.startsWith('OAP-') ? 'operations.apps.manage'
      : operationId === 'ADM-006' ? 'admin.health.view'
      : operationId === 'ADM-007' ? 'admin.permissions.view'
      : operationId.startsWith('ADM-') ? 'admin.audit.view'
      : operationId.startsWith('ARC-') ? 'admin.archive.view' : 'admin.integrations.view';
    await requirePermission(requestContext, requiredPermission);
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
          operatorName: userLookup.get(operatorId) || operatorId, operatorOrgId, operatorOrgName: departmentLookup.get(operatorOrgId) || operatorOrgId,
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
      senderId, senderName: senderId ? valueToText(users.get(senderId)?.['姓名']) || null : null,
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
      const [messageRows, userRows] = await Promise.all([readAll('消息通知'), readAll('用户字典')]);
      const users = new Map(userRows.map(record => [userDictionaryAccount(record?.fields), record?.fields || {}]).filter(([account]) => account));
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
      const resourceType = input.resourceType || 'APP';
      if (resourceType !== 'APP') throw new FeishuProxyError('INVALID_OPERATION_INPUT', '当前收藏读接口仅支持 APP', 400);
      const [favoriteRows, projection] = await Promise.all([readAll('应用收藏'), getAppProjection()]);
      let items = favoriteRows.filter(record => valueToText(record?.fields?.['用户ID']) === userId && dictionaryEnabled(record?.fields || {}, '有效')).map(record => {
        const fields = record?.fields || {};
        const resourceId = valueToText(fields['资源ID'] || fields['应用ID']);
        const resource = projection.items.find(app => app.appId === resourceId);
        return { favoriteId: valueToText(fields['主键']) || String(record?.record_id || ''), resourceType: valueToText(fields['资源类型']) || 'APP', resourceId, favoritedAt: valueToText(fields['收藏时间']), lastUsedAt: null, resource };
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
    const [balanceRows, ledgerRows, monthRows, ruleRows] = await Promise.all([readAll('积分余额'), readAll('积分流水'), readAll('积分月度汇总'), readAll('积分规则')]);
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
    if (!materialId || !fileId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '素材下载必须提供 materialId 和 fileId', 400);
    const material = (await readAll('素材中心')).find(record => valueToText(record?.fields?.['素材ID']) === materialId)?.fields;
    if (!material || /^(?:OFFLINE|下架|禁用|删除)$/i.test(valueToText(material['状态']))) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '素材不存在或不可下载', 404);
    const file = attachmentValue(material['素材文件'], valueToText(material['素材名称']));
    if (!file.fileToken || ![materialId, file.fileToken].includes(fileId)) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '素材文件不存在或不匹配', 404);
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
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: plan.kind === 'dictionary-batch' ? 'feishu-dictionaries.v1' : 'feishu-app-comments.v1',
        sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false
      };
    }
    if (plan.kind === 'workbench-search') {
      const data = await executeWorkbenchSearch(input);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-workbench-search.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'workbench-personal') {
      const data = await executeWorkbenchPersonal(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-workbench-personal.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'personal-read') {
      const data = await executePersonalRead(operationId, input, requestContext);
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-personal-read.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
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
      return { code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-secure-resource.v1', sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false };
    }
    if (plan.kind === 'app-facets' || plan.kind === 'app-list' || plan.kind?.startsWith('announcement') || plan.kind?.startsWith('talent') || plan.kind?.startsWith('contact') || plan.kind === 'public-read' || plan.kind === 'first-batch-detail') {
      const data = plan.kind.startsWith('announcement')
        ? await executeAnnouncement(operationId, input)
        : plan.kind.startsWith('talent') ? await executeTalent(operationId, input)
        : plan.kind.startsWith('contact') ? await executeContact(operationId, input)
        : plan.kind === 'public-read' ? await executePublicRead(operationId, input)
        : plan.kind === 'first-batch-detail' ? await executeFirstBatchDetail(operationId, input)
        : await executeApp(operationId, input);
      return {
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: plan.kind === 'public-read' ? 'feishu-public-read.v1' : plan.kind === 'first-batch-detail' ? 'feishu-first-batch-detail.v1' : 'feishu-read-only.v1',
        sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false
      };
    }
    const extraInputKeys = Object.keys(input).filter(key => !['page', 'pageSize'].includes(key));
    if (extraInputKeys.length) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const table = identifierContract.byName.get(plan.tableName);
    if (!table) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', '飞书表标识契约缺失', 503);
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    if (!Number.isInteger(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是整数', 400);
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    let pageToken = '';
    let result;
    for (let currentPage = 1; currentPage <= page; currentPage += 1) {
      result = await client.listRecords(table.tableId, {
        viewId: table.views[0]?.viewId,
        pageSize,
        pageToken,
        fieldNames: table.fields.map(field => field.name)
      });
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

  function operationCacheKey(operationId, input, requestContext, policy) {
    const identity = requestContext?.identity || {};
    const tenant = valueToText(identity.tenantKey || identity.tenantId || 'default-tenant');
    const user = valueToText(identity.adAccount || identity.userId || identity.openId || 'anonymous');
    const permissions = Array.isArray(identity.permissions) ? [...identity.permissions].map(String).sort().join(',') : '';
    const scopeValue = policy.scope === 'user' ? `${tenant}\u0000${user}\u0000${permissions}` : tenant;
    return `${operationId}\u0000${fingerprint(scopeValue)}\u0000${JSON.stringify(stableCacheValue(input || {}))}`;
  }

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

  function startOperationRefresh(key, operationId, input, requestContext, policy) {
    const current = operationPending.get(key);
    if (current) return current;
    const request = executeUncached(operationId, input, requestContext).then(value => {
      const timestamp = cacheNow();
      const cachedValue = { ...value, dataStale: false, refreshing: false, cacheStatus: 'fresh' };
      operationCache.set(key, {
        value: cachedValue,
        createdAt: timestamp,
        freshUntil: timestamp + policy.freshMs,
        staleUntil: timestamp + policy.staleMs
      });
      return cachedValue;
    }).finally(() => {
      if (operationPending.get(key) === request) operationPending.delete(key);
    });
    operationPending.set(key, request);
    return request;
  }

  async function execute(operationId, input = {}, requestContext = {}) {
    const policy = operationCachePolicies[operationId];
    if (!policy || policy.freshMs <= 0 || policy.staleMs <= 0) return executeUncached(operationId, input, requestContext);
    const key = operationCacheKey(operationId, input, requestContext, policy);
    const entry = operationCache.get(key);
    const timestamp = cacheNow();
    if (entry && timestamp < entry.freshUntil) return cachedEnvelope(entry, 'fresh');
    if (entry && timestamp < entry.staleUntil) {
      startOperationRefresh(key, operationId, input, requestContext, policy).catch(() => {});
      return cachedEnvelope(entry, 'stale', true);
    }
    if (entry) operationCache.delete(key);
    const refresh = startOperationRefresh(key, operationId, input, requestContext, policy);
    if (coldMissBudgetMs > 0) {
      let timer;
      try {
        const value = await Promise.race([
          refresh,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new FeishuProxyError(
              'FEISHU_INITIAL_SYNCING',
              '正式飞书数据正在首次同步，请稍后重试',
              202,
              { retryAfterSeconds: 2 }
            )), coldMissBudgetMs);
          })
        ]);
        return { ...value, traceId: value.traceId || traceIdFactory() };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    const value = await refresh;
    return { ...value, traceId: value.traceId || traceIdFactory() };
  }

  function invalidateAppProjection() {
    appProjectionCache = null;
    appProjectionExpiresAt = 0;
    appDetailCountCache = null;
    appDetailCountExpiresAt = 0;
    dictionaryProjectionCache.clear();
    for (const tableName of ['应用索引', '应用类型配置', '用户字典', '部门字典', '业务域字典', '场景字典']) {
      invalidateTableSnapshots(tableName);
    }
    operationCache.clear();
  }

  function invalidateTables(tableNames = []) {
    for (const tableName of tableNames) invalidateTableSnapshots(valueToText(tableName));
    appProjectionCache = null;
    appProjectionExpiresAt = 0;
    appDetailCountCache = null;
    appDetailCountExpiresAt = 0;
    announcementProjectionCache = null;
    announcementProjectionExpiresAt = 0;
    dictionaryProjectionCache.clear();
    talentProjectionCache.clear();
    contactProjectionCache = null;
    contactProjectionExpiresAt = 0;
    operationCache.clear();
  }

  function invalidateTableSnapshots(tableName) {
    for (const key of tableReadCache.keys()) {
      if (key === tableName || key.startsWith(`${tableName}\u0000`)) tableReadCache.delete(key);
    }
  }

  async function prewarm({ identities = [] } = {}) {
    const p0Tables = [
      ['应用类型配置', []], ['部门字典', []], ['业务域字典', []], ['场景字典', []], ['应用索引', []], ['素材分类', []],
      ['用户字典', PROFILE_FIELDS.user], ['培训课程', []], ['公告通知', []]
    ];
    const prewarmConcurrency = 4;
    const prewarmTable = async ([tableName, fields]) => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          return await readAll(tableName, fields);
        } catch (error) {
          if (error?.code !== 'FEISHU_READ_BUDGET_EXCEEDED' || attempt === 3) {
            error.prewarmResource = tableName;
            throw error;
          }
          await readSleep(250 * attempt);
        }
      }
    };
    for (let offset = 0; offset < p0Tables.length; offset += prewarmConcurrency) {
      await Promise.all(p0Tables.slice(offset, offset + prewarmConcurrency).map(prewarmTable));
    }
    await Promise.all([
      execute('COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE', 'MATERIAL_CATEGORY'], includeDisabled: false }, {}),
      execute('WB-002', { page: 1, pageSize: 20 }, {})
    ]);
    for (const requestContext of identities) {
      await Promise.all([
        execute('COM-001', {}, requestContext),
        execute('COM-002', { platform: 'WEB' }, requestContext),
        execute('WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, requestContext)
      ]);
    }
  }

  async function waitForIdle() {
    while (operationPending.size || tableReadPending.size) {
      const pending = [
        ...operationPending.values(),
        ...[...tableReadPending.values()].map(batch => batch.promise)
      ];
      await Promise.allSettled(pending);
    }
  }

  return Object.freeze({ execute, prewarm, waitForIdle, invalidateAppProjection, invalidateTables });
}
