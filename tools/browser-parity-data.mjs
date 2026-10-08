import { createVerifiedReadOperationContracts } from '../src/integration/operation-contract-schemas.js';

const contracts = createVerifiedReadOperationContracts();
const jsonHeaders = { 'Content-Type': 'application/json' };
const now = '2026-10-08T08:00:00.000Z';

const appCatalog = Object.freeze([
  ['T004', '其他工具', '智能数据处理工具', '/apps/tool-001'],
  ['T005', '海能work应用', '海能work应用', '/apps/haineng-work-001'],
  ['T006', '报表', '经营分析可视化报表', '/apps/report-001'],
  ['T007', '可视化', '经营管理驾驶舱', '/apps/dashboard-001'],
  ['T008', '数据集', '供应商基础信息数据集', '/apps/dataset-001'],
  ['T009', '指标', '物资供应链域指标库', '/apps/metric-001'],
  ['T001', 'AI', '长文总结智能体', '/apps/ai-001'],
  ['T002', 'EAD', 'EAD应用', '/apps/ead-001'],
  ['T003', 'RPA', '招投标发票查验机器人', '/apps/rpa-001'],
].map(([typeCode, typeName, name, detailPath], index) => Object.freeze({
  typeCode, typeName, name, detailPath, appId: `VISUAL-APP-${String(index + 1).padStart(3, '0')}`,
})));

const detailByRoute = Object.freeze(Object.fromEntries(appCatalog.map(item => [item.detailPath, item])));

function stringSample(key = '') {
  const lower = key.toLowerCase();
  if (lower.includes('masked')) return '***';
  if (lower.includes('url')) return '';
  if (lower.includes('path')) return '/apps';
  if (lower.includes('email')) return 'user@example.com';
  if (lower.includes('phone') || lower.includes('mobile')) return '138****5678';
  if (lower.includes('date') || lower.endsWith('at') || lower.includes('time')) return now;
  if (lower.includes('status')) return 'ACTIVE';
  if (lower.includes('version')) return 'V1.0';
  if (lower.endsWith('id') || lower.includes('identifier')) return `VISUAL-${key || 'ID'}`.slice(0, 120);
  if (lower.includes('name') || lower.includes('title')) return '视觉验收数据';
  if (lower.includes('summary') || lower.includes('description') || lower.includes('content')) return '用于验证真实数据结构下的页面视觉与响应式布局。';
  return '视觉验收';
}

function schemaSample(schema = {}, key = '', depth = 0) {
  if (depth > 16) return null;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (Array.isArray(schema.const)) return schema.const[0];
  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    const branch = schema.anyOf.find(candidate => candidate.type !== 'null') || schema.anyOf[0];
    return schemaSample(branch, key, depth + 1);
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length) return schemaSample(schema.oneOf[0], key, depth + 1);
  if (Array.isArray(schema.allOf) && schema.allOf.length) return Object.assign({}, ...schema.allOf.map(item => schemaSample(item, key, depth + 1)));
  switch (schema.type) {
    case 'null': return null;
    case 'boolean': return true;
    case 'integer':
    case 'number': return Math.max(Number(schema.minimum ?? 1), 1);
    case 'string': {
      let value = stringSample(key);
      if (value.length < Number(schema.minLength || 0)) {
        value = key.toLowerCase().includes('url') ? '/assets/visual-placeholder.png' : `${value || '视觉验收'}${'x'.repeat(Number(schema.minLength || 0))}`;
      }
      return value.slice(0, schema.maxLength || 256);
    }
    case 'array': {
      if (schema.maxItems === 0 || ['permissions', 'availableOrgIds'].includes(key)) return [];
      return [schemaSample(schema.items || {}, key.replace(/s$/, ''), depth + 1)];
    }
    case 'object': {
      const value = {};
      for (const property of schema.required || []) value[property] = schemaSample(schema.properties?.[property] || {}, property, depth + 1);
      return value;
    }
    default: return schema.properties ? schemaSample({ ...schema, type: 'object' }, key, depth + 1) : {};
  }
}

function appRecord(schema, item, index = 0) {
  const value = schemaSample(schema, 'item');
  return {
    ...value,
    id: item.appId,
    appId: item.appId,
    name: item.name,
    typeCode: item.typeCode,
    typeName: item.typeName,
    categoryCode: item.typeCode,
    categoryName: item.typeName,
    domainId: 'DOMAIN-001',
    domainName: '经营分析',
    sceneIds: ['SCENE-001'],
    sceneNames: ['经营管理'],
    keywords: ['经营分析', '数字化办公'],
    summary: '汇聚真实业务数据，支持企业经营分析与协同决策。',
    status: 'PUBLISHED',
    usageCount: 1286 + index,
    favoriteCount: 86 + index,
    ownerId: `OWNER-${index + 1}`,
    ownerName: index % 2 ? '关胜' : '宋全跃',
    developerId: `DEVELOPER-${index + 1}`,
    developerName: index % 2 ? '李四强' : '王海峰',
    responsibleOrgId: 'ORG-001',
    responsibleOrgName: '数字智能部',
    developerOrgId: 'ORG-002',
    developerOrgName: '信息化部门',
    versionName: 'V2.0.0',
    updatedAt: now,
    iconName: item.typeCode,
    detailPath: item.detailPath,
  };
}

function enrichApplicationFacets(data, schema) {
  const facetSchema = schema.properties.typeDetailCounts.items;
  data.total = appCatalog.length;
  data.typeDetailCounts = appCatalog.map((item, index) => ({
    ...schemaSample(facetSchema, 'typeDetailCount'), tableName: `${item.typeName}应用详情`, category: item.typeName, count: 10 + index,
  }));
  data.facetsVersion = 'visual-parity-v1';
  return data;
}

function enrichApplicationList(data, schema) {
  data.items = appCatalog.map((item, index) => appRecord(schema.properties.items.items, item, index));
  data.total = data.items.length;
  data.page = 1;
  data.pageSize = 20;
  data.totalPages = 1;
  data.hasPrevious = false;
  data.hasNext = false;
  data.hasMore = false;
  data.sort = 'default';
  data.facetsVersion = 'visual-parity-v1';
  return data;
}

function enrichApplicationDetail(data, activeRoute, input) {
  const item = detailByRoute[activeRoute] || appCatalog.find(candidate => candidate.appId === input?.appId) || appCatalog[0];
  return Object.assign(data, {
    appId: input?.appId || item.appId,
    appCode: item.appId,
    name: item.name,
    shortName: item.name,
    typeCode: item.typeCode,
    typeName: item.typeName,
    summary: '汇聚企业经营核心数据，通过丰富的业务组件直观呈现关键指标。',
    description: '面向业务用户提供真实、可追溯的数字化应用能力。',
    versionName: 'V2.0.0',
    accessMode: 'apply',
    externalSystemCode: 'VISUAL-SYSTEM',
    externalUrl: '',
    openMode: 'CURRENT_TAB',
    applicableUsers: '集团公司、专业分公司、直属单位',
    businessScope: '经营管理',
    ownerId: 'OWNER-001',
    ownerName: '宋全跃',
    developerId: 'DEVELOPER-001',
    developerName: '王海峰',
    responsibleOrgId: 'ORG-001',
    responsibleOrgName: '数字智能部',
    developerOrgId: 'ORG-002',
    developerOrgName: '信息化部门',
    features: [
      { id: 'FEATURE-1', title: '指标可视化', description: '支持柱状图、折线图、饼图等多种图表。' },
      { id: 'FEATURE-2', title: '趋势分析', description: '展示指标变化趋势及同比环比分析。' },
      { id: 'FEATURE-3', title: '多维筛选', description: '支持单位、时间、业务板块等条件筛选。' },
      { id: 'FEATURE-4', title: '报表导出', description: '支持导出为 PDF、Excel 及图片。' },
    ],
    metrics: [{ id: 'METRIC-1', name: '采购金额', definition: '采购业务累计金额', formula: '已完成采购金额合计' }],
    fieldDefinitions: [
      { id: 'FIELD-1', fieldName: '供应商名称', fieldType: '文本', definition: '供应商工商登记名称' },
      { id: 'FIELD-2', fieldName: '统一社会信用代码', fieldType: '文本', definition: '供应商唯一信用代码' },
    ],
    processSteps: [
      { id: 'STEP-1', stepName: '提交业务数据', description: '选择数据源并完成校验。' },
      { id: 'STEP-2', stepName: '执行处理流程', description: '系统按已配置规则处理。' },
      { id: 'STEP-3', stepName: '查看处理结果', description: '结果可在应用内查看和下载。' },
    ],
    previews: [{ id: 'PREVIEW-1', title: '应用演示截图', description: '正式数据区域在验收中仅比较结构与尺寸。' }],
    videos: [{ id: 'VIDEO-1', title: '应用演示视频', description: '受控媒体内容' }],
    attachments: [{ fileId: 'FILE-1', fileName: '用户操作手册.pdf', mimeType: 'application/pdf', sizeBytes: 2048, uploadedAt: now, previewable: true, downloadable: true }],
    guides: [{ id: 'GUIDE-1', title: '用户操作手册', description: '应用完整使用说明' }, { id: 'GUIDE-2', title: '快速使用指南', description: '常用操作说明' }],
    trainings: [{ trainingId: 'TRAINING-1', title: '应用操作培训', description: '掌握核心业务功能' }],
    relatedApps: [{ appId: 'RELATED-1', name: '经营分析驾驶舱', summary: '相关业务应用' }],
    relatedMaterials: [{ materialId: 'MATERIAL-1', name: '指标体系说明', summary: '相关业务素材' }],
    latestNotice: { title: '应用更新通知', content: '当前版本已完成发布。' },
    typeExtension: { platform: item.typeCode === 'T003' ? 'UiBot' : '' },
    dataSourceSummary: '财务数据、预算数据、生产数据、采购数据',
    createdAt: now,
    updatedAt: now,
    version: 2,
  });
}

function enrichCurrentUser(data) {
  return Object.assign(data, {
    userId: 'VISUAL-USER-001', employeeNo: 'EMP-001', displayName: '关胜', tenantId: 'TENANT-001', tenantName: 'Bowen的组织',
    orgId: 'ORG-001', orgName: 'Bowen的组织', departmentId: 'DEPT-001', departmentName: '董事长办公室',
    roles: [], permissions: [], availableOrgIds: ['ORG-001'], unreadMessageCount: 8, favoriteCount: 12, pointBalance: 10,
    lastLoginAt: now, locale: 'zh-CN', timezone: 'Asia/Shanghai',
  });
}

function enrichWorkbench(data, schema) {
  data.greeting = { period: '上午', name: '关胜', text: '欢迎使用数智产品展厅' };
  data.profile = { userId: 'VISUAL-USER-001', displayName: '关胜', avatarUrl: null, departmentName: '董事长办公室' };
  data.dataAsOf = now;
  data.lastUpdatedAt = now;
  data.hero = { title: '欢迎使用数智产品展厅', subtitle: '汇聚优质应用资源，助力业务高效协同与智能决策', imageUrl: '' };
  const appSchema = schema.properties.hotApps.items;
  data.hotApps = appCatalog.slice(0, 4).map((item, index) => appRecord(appSchema, item, index));
  data.appTypeOverview = appCatalog.map((item, index) => ({
    ...schemaSample(schema.properties.appTypeOverview.items, 'appType'), typeCode: item.typeCode, typeName: item.typeName,
    iconUrl: '', count: 10 + index, detailQuery: { typeCode: item.typeCode },
  }));
  data.courses = [schemaSample(schema.properties.courses.items, 'course')];
  data.announcements = [schemaSample(schema.properties.announcements.items, 'announcement')];
  data.usage = { appVisitCount: 128, appUseCount: 32, favoriteAppCount: 12, visitChange: 8, useChange: 3, favoriteChange: 2, comparisonPeriod: '本月' };
  return data;
}

function enrichOperationsDashboard(data) {
  return Object.assign(data, {
    period: { period: 'month', startDate: '2026-09-01', endDate: '2026-09-30' },
    metrics: [
      { code: 'VISITS', label: '总访问量', value: 42860, changeRate: 8.6, direction: 'UP' },
      { code: 'USERS', label: '访问用户数', value: 8620, changeRate: 5.2, direction: 'UP' },
      { code: 'APPLICATIONS', label: '应用总数', value: 88, changeRate: 2.3, direction: 'UP' },
      { code: 'USES', label: '应用使用次数', value: 12680, changeRate: 4.1, direction: 'UP' },
      { code: 'FAVORITES', label: '应用收藏量', value: 2360, changeRate: 1.8, direction: 'UP' },
    ],
    visitTrend: [3120, 4280, 3860, 5120, 4760, 5980, 6420].map((visitCount, index) => ({ date: `2026-09-${String(index + 1).padStart(2, '0')}`, visitCount })),
    appUsageTrend: [980, 1260, 1180, 1450, 1390, 1680, 1860].map((usageCount, index) => ({ date: `2026-09-${String(index + 1).padStart(2, '0')}`, usageCount })),
    topApps: appCatalog.slice(0, 6).map((item, index) => ({ rank: index + 1, appId: item.appId, appName: item.name, usageCount: 2680 - index * 230 })),
    announcements: [
      { title: '数智展厅应用服务更新', publisherOrgName: '数字智能部', publishAt: now },
      { title: '应用上架流程优化通知', publisherOrgName: '运营管理部', publishAt: '2026-10-07T08:00:00.000Z' },
    ],
    userActivity: { activeRate: 72.6, activeUserCount: 8620, visitsPerUser: 4.97, appsPerUser: 2.38 },
    appTypeDistribution: appCatalog.slice(0, 4).map((item, index) => ({ typeCode: item.typeCode, typeName: item.typeName, count: 25 - index * 4, percentage: 32 - index * 5 })),
    sourceNames: ['飞书多维表格'],
    updatedAt: now,
  });
}

function enrichAnnouncementDraft(data) {
  return Object.assign(data, {
    announcementId: 'NOTICE-001',
    title: '数智展厅应用服务更新通知',
    typeCode: 'SYSTEM',
    typeName: '系统公告',
    publishAt: now,
    validFrom: '2026-10-08',
    validTo: '2026-12-31',
    contentText: '本次更新完成应用详情样式统一与移动端适配。',
    attachments: [{ fileId: 'NOTICE-FILE-001', fileName: '更新说明.pdf' }],
    relatedApps: [{ appId: appCatalog[0].appId, name: appCatalog[0].name }],
    status: 'DRAFT',
  });
}

function operationEnvelope(operationId, input = {}, activeRoute = '') {
  const contract = contracts[operationId];
  if (!contract) return { code: 'OK', data: {} };
  const envelope = schemaSample(contract.successSchema, operationId);
  const schema = contract.successSchema.properties.data;
  if (operationId === 'APP-001') enrichApplicationFacets(envelope.data, schema);
  if (operationId === 'APP-002') enrichApplicationList(envelope.data, schema);
  if (operationId === 'APP-003') enrichApplicationDetail(envelope.data, activeRoute, input);
  if (operationId === 'COM-001') enrichCurrentUser(envelope.data);
  if (operationId === 'WB-001') enrichWorkbench(envelope.data, schema);
  if (operationId === 'OPS-001') enrichOperationsDashboard(envelope.data);
  if (operationId === 'OAN-003') enrichAnnouncementDraft(envelope.data);
  if (operationId === 'OAP-003') enrichApplicationDetail(envelope.data, '/apps/tool-001', input);
  if (operationId === 'WB-002' && schema.properties?.items?.items) {
    envelope.data.items = appCatalog.slice(0, 4).map((item, index) => appRecord(schema.properties.items.items, item, index));
    envelope.data.total = envelope.data.items.length;
    envelope.data.page = 1;
    envelope.data.pageSize = 20;
    envelope.data.totalPages = 1;
    envelope.data.hasPrevious = false;
    envelope.data.hasNext = false;
    envelope.data.hasMore = false;
  }
  envelope.traceId = `visual-${operationId.toLowerCase()}`;
  envelope.sourceUpdatedAt = now;
  envelope.dataStale = false;
  envelope.isComplete = true;
  return envelope;
}

function homepageBody(activeRoute) {
  const operationIds = ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002'];
  const data = Object.fromEntries(operationIds.map(operationId => [operationId, operationEnvelope(operationId, {}, activeRoute).data]));
  return {
    code: 'OK', aggregateState: 'fresh', data,
    sections: Object.fromEntries(operationIds.map(operationId => [operationId, {
      state: 'fresh', available: true, data: data[operationId], dataStale: false, isComplete: true,
      retryable: false, sourceUpdatedAt: now, traceId: `visual-${operationId.toLowerCase()}`,
    }])),
    dataStale: false, refreshing: false, syncId: null, sourceUpdatedAt: now, traceId: 'visual-homepage',
  };
}

function onboardingList() {
  return { items: [{
    applicationId: 'VISUAL-APPLICATION-001', applicationName: '经营分析应用', applicationCode: 'APP-VISUAL-001',
    applicationType: 'T005', applicationTypeName: '海能Work应用', status: 'APPROVED', submittedAt: now,
    currentNode: '审批完成', applicantName: '关胜',
  }] };
}

export async function installBrowserParityData(context, getActiveRoute = () => '') {
  await context.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const activeRoute = getActiveRoute();
    if (pathname.endsWith('/auth/feishu/session')) {
      const routeKey = activeRoute.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
      return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({
        code: 'OK', authenticated: true,
        identity: { userId: `visual-${routeKey}`, displayName: '关胜', departmentName: '董事长办公室' },
      }) });
    }
    if (pathname.endsWith('/homepage')) {
      return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(homepageBody(activeRoute)) });
    }
    if (pathname.endsWith('/operations/batch')) {
      const requestBody = request.postDataJSON();
      const results = (requestBody.requests || []).map(({ operationId, input }) => ({
        operationId, status: 200, body: operationEnvelope(operationId, input, activeRoute),
      }));
      return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ code: 'OK', traceId: 'visual-batch', results }) });
    }
    const operationMatch = pathname.match(/\/operations\/([A-Z]+-\d+)$/);
    if (operationMatch) {
      const input = request.postDataJSON?.() || {};
      return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(operationEnvelope(operationMatch[1], input, activeRoute)) });
    }
    if (pathname.endsWith('/onboarding/applications') && request.method() === 'GET') {
      return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(onboardingList()) });
    }
    return route.fulfill({ status: 404, headers: jsonHeaders, body: JSON.stringify({ code: 'VISUAL_ROUTE_NOT_STUBBED', message: pathname }) });
  });
}

export { appCatalog, operationEnvelope, schemaSample };
