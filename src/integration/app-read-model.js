const ROUTE_BY_TYPE = Object.freeze({
  T001: '/apps/ai-001', AI: '/apps/ai-001',
  T002: '/apps/ead-001', EAD: '/apps/ead-001',
  T003: '/apps/rpa-001', RPA: '/apps/rpa-001',
  T004: '/apps/tool-001', TOOL: '/apps/tool-001',
  T005: '/apps/haineng-work-001', HAINENG_WORK: '/apps/haineng-work-001',
  T006: '/apps/report-001', REPORT: '/apps/report-001',
  T007: '/apps/dashboard-001', DASHBOARD: '/apps/dashboard-001',
  T008: '/apps/dataset-001', DATASET: '/apps/dataset-001',
  T009: '/apps/metric-001', METRIC: '/apps/metric-001'
});
const ICON_BY_TYPE = Object.freeze({
  T001: 'app-ai.png', AI: 'app-ai.png',
  T002: 'ead-logo.png', EAD: 'ead-logo.png',
  T003: 'app-rpa.png', RPA: 'app-rpa.png',
  T004: 'tool-logo.png', TOOL: 'tool-logo.png',
  T005: 'app-work.png', HAINENG_WORK: 'app-work.png',
  T006: 'app-report', REPORT: 'app-report',
  T007: 'app-cockpit.png', DASHBOARD: 'app-cockpit.png',
  T008: 'app-dataset.png', DATASET: 'app-dataset.png',
  T009: 'app-metric.png', METRIC: 'app-metric.png'
});

const CATEGORY_BY_TYPE = Object.freeze({
  T001: 'AI', AI: 'AI',
  T002: 'EAD', EAD: 'EAD',
  T003: 'RPA', RPA: 'RPA',
  T004: '其他工具', TOOL: '其他工具',
  T005: '海能work应用', HAINENG_WORK: '海能work应用',
  T006: '报表', REPORT: '报表',
  T007: '可视化', DASHBOARD: '可视化',
  T008: '数据集', DATASET: '数据集',
  T009: '指标', METRIC: '指标'
});

export function resolveApplicationRoute(record = {}) {
  return ROUTE_BY_TYPE[String(record.typeCode || '')] || '';
}

export function resolveApplicationCategoryKey(record = {}) {
  return CATEGORY_BY_TYPE[String(record.typeCode || '').trim().toUpperCase()] || '';
}

function resolveApplicationDetailRoute(record = {}) {
  const route = resolveApplicationRoute(record);
  const appId = String(record.appId || record.id || '').trim();
  return route && /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(appId)
    ? `${route}?appId=${encodeURIComponent(appId)}`
    : route;
}

export function mapRemoteApp(record = {}) {
  const typeCode = String(record.typeCode || '');
  return {
    id: String(record.appId || record.id || ''), appId: String(record.appId || record.id || ''),
    image: ICON_BY_TYPE[typeCode] || 'tool-logo.png', name: String(record.name || ''),
    category: String(record.typeName || record.categoryName || ''),
    categoryKey: resolveApplicationCategoryKey(record),
    type: String(record.typeName || record.categoryName || ''),
    scene: String(record.businessScope || record.domainName || ''), domain: String(record.domainName || ''),
    tag: String(record.tags?.[0] || record.categoryName || record.typeName || ''),
    description: String(record.summary || record.description || ''), usage: Number(record.usageCount || 0),
    favorites: Number(record.favoriteCount || 0), department: String(record.ownerDepartmentName || record.departmentName || ''),
    owner: String(record.ownerName || ''), developerDepartment: String(record.developerDepartmentName || ''),
    developer: String(record.developerName || ''), accessMode: String(record.accessMode || '').toLowerCase() === 'direct' ? 'direct' : 'apply',
    route: resolveApplicationDetailRoute(record)
  };
}

export function projectApplicationCards(records = []) {
  if (!Array.isArray(records)) return [];
  return records.map(mapRemoteApp).filter(card => card.id && card.name && card.route);
}
