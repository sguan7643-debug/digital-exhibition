import { createVerifiedReadOperationContracts } from '../src/integration/operation-contract-schemas.js';

const contracts = createVerifiedReadOperationContracts();

const STATIC_INPUTS = Object.freeze({
  'COM-001': {},
  'COM-002': { platform: 'WEB' },
  'COM-003': { rootId: '0', includeUsers: false, maxDepth: 5 },
  'COM-004': { page: 1, pageSize: 20, sort: 'name,asc' },
  'COM-005': { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false },
  'WB-001': { hotLimit: 4, courseLimit: 3, noticeLimit: 4 },
  'WB-002': { keyword: '', scene: '', typeCode: '', page: 1, pageSize: 20, sort: 'RELEVANCE' },
  'WB-003': { recentMessageLimit: 5, todoLimit: 5 },
  'ANN-001': { page: 1, pageSize: 10 },
  'ANN-002': { page: 1, pageSize: 20, sort: 'published-desc' },
  'APP-001': { page: 1, pageSize: 10 },
  'APP-002': { query: '', filters: {}, page: 1, pageSize: 20, sort: 'default' },
  'APP-004': { launchMode: 'CURRENT_TAB', sourcePage: '/live-approval-runner.html', requestedAt: '2026-09-15T00:00:00.000Z' },
  'APP-007': { page: 1, pageSize: 20, sort: 'createdAt,desc' },
  'TAL-001': { query: '', filters: {}, page: 1, pageSize: 20, sort: 'default' },
  'TAL-002': { query: '', filters: {}, page: 1, pageSize: 20, sort: 'default' },
  'TAL-003': { query: '', filters: {}, page: 1, pageSize: 20, sort: 'default' },
  'TAL-005': { page: 1, pageSize: 10 },
  'MSG-001': { timezone: 'Asia/Shanghai' },
  'MSG-002': { keyword: '', typeCode: '', readStatus: 'ALL', startAt: '', endAt: '', page: 1, pageSize: 20, sort: 'occurredAt,desc' },
  'FAV-001': { resourceType: 'APP' },
  'FAV-002': { resourceType: 'APP', keyword: '', typeCode: '', domainId: '', tagCode: '', recentlyUsed: false, page: 1, pageSize: 20, sort: 'favoritedAt,desc' },
  'PTS-001': { month: '' },
  'PTS-002': { page: 1, pageSize: 20, sort: 'occurredAt,desc' },
  'PTS-003': { groupBy: 'SOURCE' },
  'PTS-004': { page: 1, pageSize: 20 },
  'TRN-001': { month: '', categoryCode: '', limit: 10 },
  'TRN-002': { page: 1, pageSize: 20 },
  'CER-001': { newsLimit: 5, projectLimit: 10 },
  'CER-002': { page: 1, pageSize: 20 },
  'OPS-003': { page: 1, pageSize: 20 },
  // MAT-001 is the material facet projection. Its approved contract exposes
  // filters only; pagination belongs to MAT-002, not this operation.
  'MAT-001': {},
  'INT-001': { environment: 'TEST', page: 1, pageSize: 10 },
  'ADM-003': { page: 1, pageSize: 10 },
  'ADM-004': { page: 1, pageSize: 10 },
  'INT-004': { view: 'EXECUTIONS', page: 1, pageSize: 10 },
  'OPS-001': { period: 'WEEK', timezone: 'Asia/Shanghai', topN: 10 },
  'OAN-001': {},
  'OAN-002': { page: 1, pageSize: 10 },
  'OAN-008': { title: 'TEST_公告预览', contentHtml: '<p>TEST_安全内容</p>', previewMode: 'DESKTOP' },
  'OAP-001': {},
  'OAP-002': { page: 1, pageSize: 10 },
  'OAP-006': { schemaVersion: 1, publicData: {}, typeExtension: {}, submissionChannel: 'INTERNAL', resourcePermissions: [] },
  'OAP-008': { page: 1, pageSize: 10 },
  'OAP-011': { usage: 'DETAIL', schemaVersion: 1 },
  'ADM-006': { period: 'DAY' },
  'ADM-007': { subjectType: 'USER', resourceType: 'ADMIN', resourceId: 'GLOBAL', permissionCode: 'admin.integrations.view' },
  'INT-003': { dryRun: true, reason: 'TEST_结构核验' },
  'INT-005': { idempotencyKey: 'TEST_READ_INTEGRITY', sampleLimit: 100 },
});

const CONTEXT_REQUIREMENTS = Object.freeze({
  'ANN-003': ['announcementId'],
  'ANN-005': ['announcementId'],
  'APP-003': ['appId'],
  'APP-004': ['appId'],
  'APP-007': ['appId'],
  'APP-009': ['appId'],
  'MAT-002': ['relatedAppId'],
  'COM-008': ['fileId'],
  'MAT-003': ['materialId', 'fileId'],
  'TRN-003': ['courseId'],
  'TRN-006': ['courseId'],
  'CER-003': ['certificationId'],
  'APP-010': ['applicationId'],
  'COM-010': ['exportId'],
  'ARC-002': ['archiveTaskId'],
  'OAN-003': ['announcementId'],
  'OAP-003': ['appId'],
  'OAP-008': ['appId'],
  'OAP-011': ['typeCode'],
  'INT-005': ['connectionCode'],
});

const CONTEXT_OVERRIDE_ALLOWLIST = Object.freeze(new Set(['applicationId', 'certificationId', 'exportId']));

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('、');
  if (typeof value === 'object') return text(value.text ?? value.name ?? value.value ?? value.id);
  return String(value);
}

function usableIdentifier(value) {
  const normalized = text(value).trim();
  if (!normalized || /^\[[^\]]+\]$/.test(normalized) || /^(?:附件|文件|file)$/i.test(normalized)) return '';
  return normalized;
}

function firstField(fields, names) {
  for (const name of names) {
    const value = text(fields?.[name]);
    if (value) return value;
  }
  return '';
}

function firstFileToken(value) {
  const file = Array.isArray(value) ? value[0] : value;
  return typeof file === 'string'
    ? usableIdentifier(file)
    : usableIdentifier(firstField(file, ['file_token', 'fileToken', 'token']));
}

function isFieldContractDrift(error) {
  return error?.code === 'FEISHU_RECORDS_FAILED' && Number(error?.upstreamCode) === 1254045;
}

function validateAgainstSchema(operationId, input) {
  const schema = contracts[operationId]?.requestSchema;
  if (!schema) return;
  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties || {}));
    const extra = Object.keys(input).filter(key => !allowed.has(key));
    if (extra.length) throw new Error(`${operationId} resolver generated unsupported input: ${extra.join(',')}`);
  }
  const missing = (schema.required || []).filter(key => input[key] == null || input[key] === '');
  if (missing.length) {
    const error = new Error(`${operationId} requires context: ${missing.join(',')}`);
    error.code = 'REQUIRED_INPUT_UNAVAILABLE';
    error.requiredInput = missing;
    throw error;
  }
}

export function createLiveReadInputResolver({ client, identifierContract, identity = {}, contextOverrides = {} } = {}) {
  if (!client?.listRecords || !identifierContract?.byName) throw new Error('读取输入解析器缺少客户端或标识契约');
  const cache = new Map();
  const listTableRecords = async table => {
    const query = {
      viewId: table.views[0]?.viewId,
      pageSize: 100,
      pageToken: '',
      fieldNames: table.fields.map(field => field.name)
    };
    try {
      return await client.listRecords(table.tableId, query);
    } catch (error) {
      if (!isFieldContractDrift(error)) throw error;
      // A stale identifier contract must not prevent a read-only input resolver
      // from locating a safe existing record.  Fetch the full current row once;
      // do not guess/rename fields and do not write to the source table.
      return client.listRecords(table.tableId, { ...query, fieldNames: [] });
    }
  };
  const readAll = async tableName => {
    if (cache.has(tableName)) return cache.get(tableName);
    const table = identifierContract.byName.get(tableName);
    if (!table) return [];
    const result = await listTableRecords(table);
    const items = result.items || [];
    cache.set(tableName, items);
    return items;
  };
  const readFirst = async tableName => (await readAll(tableName))[0] || null;

  const readFirstForIdentity = async (tableName, identityFields) => {
    const table = identifierContract.byName.get(tableName);
    if (!table) return null;
    const result = await listTableRecords(table);
    const account = text(identity.adAccount || identity.userId);
    if (!account) return null;
    return (result.items || []).find(record => identityFields.some(field => text(record?.fields?.[field]) === account)) || null;
  };

  const context = {};
  const ensureContext = async () => {
    if (context.loaded) return context;
    const [app, announcement, course, certification, materials, uploadSessions, attachments, exportTask, archiveTask, connection, type, application] = await Promise.all([
      readFirst('应用索引'), readFirst('公告通知'), readFirst('培训课程'), readFirst('认证项目'),
      readAll('素材中心'), readAll('文件上传会话'), readAll('附件资料'), readFirst('导出任务'), readFirst('归档任务'), readFirst('多维表连接配置'),
      readFirst('应用类型配置'), readFirstForIdentity('使用申请', ['申请人ID'])
    ]);
    const appFields = app?.fields || {};
    const announcementFields = announcement?.fields || {};
    const courseFields = course?.fields || {};
    const certificationFields = certification?.fields || {};
    const applicationFields = application?.fields || {};
    const compatibleMaterial = materials.map(record => {
      const fields = record?.fields || {};
      return {
        logicalId: usableIdentifier(firstField(fields, ['素材ID', '主键']) || record?.record_id),
        fileToken: firstFileToken(fields['素材文件']) || usableIdentifier(firstField(fields, ['文件ID', '附件ID']))
      };
    }).find(candidate => candidate.logicalId && candidate.fileToken);
    const compatibleUpload = uploadSessions.map(record => {
      const fields = record?.fields || {};
      return {
        logicalId: usableIdentifier(firstField(fields, ['文件ID']) || record?.record_id),
        fileToken: usableIdentifier(firstField(fields, ['飞书文件令牌']))
      };
    }).find(candidate => candidate.logicalId && candidate.fileToken);
    const compatibleAttachment = attachments.map(record => {
      const fields = record?.fields || {};
      return {
        logicalId: usableIdentifier(firstField(fields, ['主键']) || record?.record_id),
        fileToken: firstFileToken(fields['附件文件']) || firstFileToken(fields['附件']) || firstFileToken(fields['资源压缩包'])
      };
    }).find(candidate => candidate.logicalId && candidate.fileToken);
    const compatibleCommonFile = compatibleUpload || compatibleAttachment || compatibleMaterial;
    context.appId = firstField(appFields, ['应用ID', '主键']) || text(app?.record_id);
    context.relatedAppId = context.appId;
    context.appTypeCode = firstField(appFields, ['应用类型', '类型编码']);
    context.announcementId = firstField(announcementFields, ['公告ID', '主键']) || text(announcement?.record_id);
    context.courseId = firstField(courseFields, ['课程ID', '主键']) || text(course?.record_id);
    context.certificationId = firstField(certificationFields, ['认证编码', '认证ID', '主键']) || text(certification?.record_id);
    context.comFileId = compatibleCommonFile?.logicalId || '';
    context.materialId = compatibleMaterial?.logicalId || '';
    context.materialFileId = compatibleMaterial?.fileToken || '';
    context.exportId = firstField(exportTask?.fields, ['导出任务ID', '主键']) || text(exportTask?.record_id);
    context.archiveTaskId = firstField(archiveTask?.fields, ['归档任务ID', '主键']) || text(archiveTask?.record_id);
    context.connectionCode = firstField(connection?.fields, ['连接编码', '主键']) || text(connection?.record_id);
    context.appTypeCode = context.appTypeCode || firstField(type?.fields, ['类型编码', '类型ID']);
    context.applicationId = firstField(applicationFields, ['申请编号', '申请单号', '主键']) || text(application?.record_id);
    for (const [key, value] of Object.entries(contextOverrides || {})) {
      if (CONTEXT_OVERRIDE_ALLOWLIST.has(key) && usableIdentifier(value)) context[key] = usableIdentifier(value);
    }
    context.identity = text(identity.adAccount || identity.userId);
    context.loaded = true;
    return context;
  };

  return Object.freeze({
    async resolve(operation) {
      const operationId = operation.id || operation.operationId;
      const input = { ...(STATIC_INPUTS[operationId] || {}) };
      const needsContext = CONTEXT_REQUIREMENTS[operationId] || [];
      let contextValues = null;
      if (needsContext.length) {
        contextValues = await ensureContext();
        for (const key of needsContext) {
          const value = operationId === 'COM-008' && key === 'fileId'
            ? contextValues.comFileId
            : operationId === 'MAT-003' && key === 'fileId'
              ? contextValues.materialFileId
              : operationId === 'OAP-011' && key === 'typeCode'
                ? contextValues.appTypeCode
                : contextValues[key];
          if (value) input[key] = value;
        }
      }
      if (operationId === 'APP-004') input.sourcePage = '/live-approval-runner.html';
      if (operationId === 'APP-007') input.sort = 'createdAt,desc';
      if (operationId === 'ANN-005') Object.assign(input, { page: 1, pageSize: 20 });
      if (operationId === 'MAT-003') Object.assign(input, { purpose: 'TEST_READ', sourcePage: '/live-approval-runner.html', clientOccurredAt: new Date().toISOString() });
      if (operationId === 'COM-008') Object.assign(input, { mode: 'DOWNLOAD' });
      if (operationId === 'TRN-006') input.sourcePage = '/training';
      if (operationId === 'APP-010') input.includeHistory = true;
      if (operationId === 'ADM-007') input.subjectId = text(identity.adAccount || identity.userId);
      if (operationId === 'INT-005') input.idempotencyKey = input.idempotencyKey || 'TEST_READ_INTEGRITY';
      validateAgainstSchema(operationId, input);
      return input;
    },
    requiredFor(operationId) {
      return CONTEXT_REQUIREMENTS[operationId] || [];
    }
  });
}

export { CONTEXT_OVERRIDE_ALLOWLIST, CONTEXT_REQUIREMENTS, STATIC_INPUTS };
