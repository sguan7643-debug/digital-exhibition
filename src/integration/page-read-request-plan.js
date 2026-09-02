const detailAppIds = Object.freeze({
  '/apps/tool-001': 'APP004', '/apps/haineng-work-001': 'APP005', '/apps/report-001': 'APP006',
  '/apps/dashboard-001': 'APP007', '/apps/dataset-001': 'APP008', '/apps/metric-001': 'APP009',
  '/apps/ai-001': 'APP001', '/apps/ead-001': 'APP002', '/apps/rpa-001': 'APP003'
});

const routeSpecificInputs = Object.freeze({
  '/workbench': Object.freeze({
    'COM-001': {}, 'COM-002': { platform: 'WEB' },
    'COM-005': { dictTypes: ['APP_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false },
    'WB-001': { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }
  }),
  '/messages': Object.freeze({ 'MSG-001': {}, 'MSG-002': { page: 1, pageSize: 100 } }),
  '/favorites': Object.freeze({ 'FAV-001': { resourceType: 'APP' }, 'FAV-002': { resourceType: 'APP', page: 1, pageSize: 100 } }),
  '/profile': Object.freeze({ 'COM-001': {}, 'WB-003': { recentMessageLimit: 5, todoLimit: 5 } }),
  '/points': Object.freeze({ 'PTS-001': {}, 'PTS-003': { groupBy: 'SOURCE' }, 'PTS-004': { page: 1, pageSize: 100 } }),
  '/points/details': Object.freeze({ 'PTS-002': { page: 1, pageSize: 100 } }),
  '/announcements/notice-001': Object.freeze({
    'ANN-003': { announcementId: 'AN004', markRead: false },
    'ANN-005': { announcementId: 'AN004', page: 1, pageSize: 100 }
  })
});
const interactionReadOperationIds = new Set(['OAN-008', 'APP-004', 'MAT-003', 'COM-008', 'COM-010']);

function defaultInput(schema = {}) {
  const properties = schema.properties || {};
  return properties.page && properties.pageSize ? { page: 1, pageSize: 100 } : {};
}

function queryIdentifier(searchParams, name) {
  const value = String(searchParams.get(name) || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(value) ? value : '';
}

export function buildPageReadRequestPlan({ route, readOperationIds, operationContracts, search = '' }) {
  const searchParams = new URLSearchParams(search);
  const inputByOperation = { ...(routeSpecificInputs[route] || {}) };
  const appId = detailAppIds[route];
  if (appId) {
    inputByOperation['APP-003'] = { appId, include: 'attachments,trainings,relatedMaterials' };
    inputByOperation['APP-009'] = { appId, page: 1, pageSize: 100, sort: 'sortOrder,asc' };
  }

  const applicationId = queryIdentifier(searchParams, 'applicationId');
  const courseId = queryIdentifier(searchParams, 'courseId');
  const certificationId = queryIdentifier(searchParams, 'certificationId');
  if (applicationId) inputByOperation['APP-010'] = { applicationId, includeHistory: true };
  if (courseId) {
    inputByOperation['TRN-003'] = { courseId };
    inputByOperation['TRN-006'] = { courseId, sourcePage: '/training' };
  }
  if (certificationId) inputByOperation['CER-003'] = { certificationId };

  const operationIds = [];
  const deferredOperationIds = [];
  for (const operationId of readOperationIds) {
    const contract = operationContracts[operationId];
    if (interactionReadOperationIds.has(operationId) && !Object.prototype.hasOwnProperty.call(inputByOperation, operationId)) {
      deferredOperationIds.push(operationId);
      continue;
    }
    const input = inputByOperation[operationId] || defaultInput(contract?.requestSchema);
    const missingRequired = (contract?.requestSchema?.required || []).filter(name => input[name] == null || input[name] === '');
    if (missingRequired.length) {
      deferredOperationIds.push(operationId);
      continue;
    }
    inputByOperation[operationId] = input;
    operationIds.push(operationId);
  }
  return Object.freeze({ operationIds: Object.freeze(operationIds), deferredOperationIds: Object.freeze(deferredOperationIds), inputByOperation: Object.freeze(inputByOperation) });
}

export const DETAIL_APP_IDS = detailAppIds;
