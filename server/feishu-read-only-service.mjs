import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { getOperation } from '../src/integration/operation-registry.js';

const READ_PLANS = Object.freeze({
  'APP-001': Object.freeze({ kind: 'app-facets' }),
  'ANN-001': Object.freeze({ kind: 'announcement-facets' }),
  'COM-004': Object.freeze({ tableName: '用户字典', labelField: '姓名', typeField: '岗位' }),
  'ANN-002': Object.freeze({ kind: 'announcement-list' }),
  'APP-002': Object.freeze({ kind: 'app-list' }),
  'TAL-002': Object.freeze({ tableName: '人才项目', labelField: '项目名称', typeField: '项目类型' }),
  'TAL-003': Object.freeze({ tableName: '项目进度', labelField: '阶段名称', typeField: '状态' }),
  'MAT-002': Object.freeze({ tableName: '素材中心', labelField: '素材名称', typeField: '素材文件' })
});

function valueToText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('、');
  if (typeof value === 'object') return value.text || value.name || value.value || '';
  return String(value);
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

function createLookup(records, idFields, labelField) {
  const lookup = new Map();
  for (const record of records) {
    const fields = record?.fields || {};
    const label = valueToText(fields[labelField]);
    for (const field of idFields) {
      const key = valueToText(fields[field]);
      if (key) lookup.set(key, label || key);
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
  let appProjectionCache = null;
  let appProjectionExpiresAt = 0;
  let appProjectionPending = null;
  let announcementProjectionCache = null;
  let announcementProjectionExpiresAt = 0;
  let announcementProjectionPending = null;

  function resolveTable(tableName) {
    const table = identifierContract.byName.get(tableName);
    if (!table) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', `飞书表标识契约缺失：${tableName}`, 503);
    return table;
  }

  async function readAll(tableName) {
    const table = resolveTable(tableName);
    const items = [];
    let pageToken = '';
    for (let page = 1; page <= 100; page += 1) {
      let result;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          result = await client.listRecords(table.tableId, {
            viewId: table.views[0]?.viewId,
            pageSize: 100,
            pageToken,
            fieldNames: table.fields.map(field => field.name)
          });
          break;
        } catch (error) {
          if (![429, 502].includes(error?.status) || attempt === 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
        }
      }
      items.push(...result.items);
      if (!result.hasMore || !result.nextPageToken) return items;
      pageToken = result.nextPageToken;
    }
    throw new FeishuProxyError('REMOTE_PAGINATION_LIMIT', `飞书表记录超过受控读取上限：${tableName}`, 503);
  }

  async function readAppProjection() {
    const [typeRows, userRows, departmentRows, domainRows, sceneRows] = await Promise.all([
      readAll('应用类型配置'), readAll('用户字典'), readAll('部门字典'),
      readAll('业务域字典'), readAll('场景字典')
    ]);
    const appRows = await readAll('应用索引');
    const typeLookup = createLookup(typeRows, ['类型ID', '类型编码', '类型名称'], '类型名称');
    const userLookup = createLookup(userRows, ['用户ID', '工号', '姓名'], '姓名');
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
      const ownerId = valueToText(fields['负责人ID']);
      const developerId = valueToText(fields['开发者ID']);
      const responsibleOrgId = valueToText(fields['所属部门ID']);
      const developerOrgId = valueToText(fields['开发部门ID']);
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
    const projection = await getAppProjection();
    if (operationId === 'APP-001') {
      const { items } = projection;
      return {
        total: items.length,
        types: createFacet(items.map(item => item.typeName)),
        categories: createFacet(items.map(item => item.categoryName)),
        tags: createFacet(items.flatMap(item => item.keywords)),
        domains: createFacet(items.map(item => item.domainName)),
        scenes: createFacet(items.flatMap(item => item.sceneNames)),
        facetsVersion: 'feishu-app-facets.v1'
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

  async function execute(operationId, input = {}) {
    const operation = getOperation(operationId);
    if (!operation) throw new FeishuProxyError('UNKNOWN_OPERATION', '接口不在受控操作清单中', 404);
    if (operation.access === 'write') {
      throw new FeishuProxyError('WRITE_OPERATION_DISABLED', '当前仅允许飞书只读联调', 403);
    }
    const plan = READ_PLANS[operationId];
    if (!plan) throw new FeishuProxyError('READ_OPERATION_NOT_ENABLED', '该只读接口尚未完成字段合同核验', 503);
    if (plan.kind === 'app-facets' || plan.kind === 'app-list' || plan.kind === 'announcement-facets' || plan.kind === 'announcement-list') {
      const data = plan.kind.startsWith('announcement')
        ? await executeAnnouncement(operationId, input)
        : await executeApp(operationId, input);
      return {
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: 'feishu-read-only.v1',
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

  return Object.freeze({ execute });
}
