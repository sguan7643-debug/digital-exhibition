import { getOperation } from './operation-registry.js';

const collectionOperationIds = new Set([
  'WB-001','MSG-002','FAV-002','ANN-002','ANN-005','APP-002','APP-009','PTS-002','PTS-004',
  'TRN-002','CER-002','OAN-002','OAP-002','ADM-003','ADM-004','ADM-005','TAL-001','TAL-002',
  'TAL-003','MAT-002','INT-004','INT-005'
]);
const interactionReadOperationIds = new Set(['OAN-008', 'APP-004', 'MAT-003', 'COM-008', 'COM-010', 'ARC-002']);

const define = (id, route, operationIds, fieldDomains, defaultMode = 'mock') => {
  const readOperationIds = operationIds.filter(operationId => getOperation(operationId)?.readOnly && !interactionReadOperationIds.has(operationId));
  const interactionOperationIds = operationIds.filter(operationId => interactionReadOperationIds.has(operationId));
  const actions = operationIds.filter(operationId => getOperation(operationId)?.access === 'write').map(operationId => Object.freeze({
    actionId: operationId,
    operationId,
    requiredPermission: `operation:${operationId}:execute`,
    confirmationRequired: true,
    idempotencyRequired: true,
    versionConditionRequired: true,
    isolatedTestRecordRequired: true,
    auditContractRequired: true,
    requestHashRequired: true,
    remoteEnabled: false
  }));
  return Object.freeze({
    id, route,
    operationIds: Object.freeze(operationIds), interactionOperationIds: Object.freeze(interactionOperationIds),
    readOperationIds: Object.freeze(readOperationIds),
    actions: Object.freeze(actions),
    emptyOperationIds: Object.freeze(readOperationIds.filter(operationId => collectionOperationIds.has(operationId))),
    fieldDomains: Object.freeze(fieldDomains),
    defaultMode,
    remoteWhen: 'contract-evidence-complete'
  });
};

export const PAGE_INTEGRATION_MATRIX = Object.freeze([
  define('01','/workbench',['COM-001','COM-002','COM-005','WB-001','WB-002'],['identity','menu','dictionary','tasks','application-summary','application-search']),
  define('02','/messages',['MSG-001','MSG-002'],['message','unread-count']),
  define('03','/favorites',['FAV-001','FAV-002','APP-004','FAV-003','FAV-004'],['favorite','resource','canonical-resource-id','app-launch']),
  define('04','/profile',['COM-001','COM-003','COM-004','WB-003','WB-004'],['identity','organization','contact','profile-summary','todo']),
  define('05','/announcements',['ANN-001','ANN-002'],['announcement','read-state']),
  define('06','/announcements/notice-001',['ANN-003','ANN-005','COM-008'],['announcement-detail','attachment','related-resource','file-download']),
  define('07','/apps',['APP-001','APP-002','APP-004'],['application-summary','application-filter','topic-domain','app-launch']),
  define('08','/apps/tool-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','training-relation','material-relation','comment','material-download','file-download']),
  define('09','/apps/haineng-work-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','training-relation','material-relation','comment','material-download','file-download']),
  define('10','/apps/report-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','report-metadata','related-resource','comment','material-download','file-download']),
  define('11','/apps/dashboard-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','dashboard-metadata','related-resource','comment','material-download','file-download']),
  define('12','/apps/dataset-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','dataset-metadata','related-resource','comment','material-download','file-download']),
  define('13','/apps/metric-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','metric-metadata','related-resource','comment','material-download','file-download']),
  define('14','/apps/ai-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','ai-metadata','related-resource','comment','material-download','file-download']),
  define('15','/apps/ead-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','ead-metadata','related-resource','comment','material-download','file-download']),
  define('16','/apps/rpa-001',['APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008'],['application-detail','rpa-metadata','related-resource','comment','material-download','file-download']),
  define('17','/apps/onboarding/status',['APP-010','OAP-008'],['application-request','submission-record']),
  define('18','/points',['PTS-001','PTS-003','PTS-004'],['point-account','point-category','point-rule']),
  define('19','/points/details',['PTS-002'],['point-ledger']),
  define('20','/training',['TRN-001','TRN-002','TRN-003','TRN-004','TRN-005','TRN-006'],['course','registration','learning-entry']),
  define('21','/operations',['OPS-001','OPS-003'],['operation-metric','metric-definition']),
  define('22','/operations/announcements',['OAN-001','OAN-002'],['announcement-admin','publish-state']),
  define('23','/operations/announcements/notice-001/edit',['OAN-003','OAN-008','OAN-004','OAN-005','OAN-006','OAN-007'],['announcement-draft','announcement-preview','attachment','publish-control'],'disabled'),
  define('24','/operations/apps',['OAP-001','OAP-002','OAP-011'],['application-operation','type-form-definition']),
  define('25','/operations/apps/app-001/edit',['OAP-003','OAP-006','OAP-004','OAP-005','OAP-009'],['application-draft','type-form','publish-control'],'disabled'),
  define('26','/admin',['ADM-001','ADM-002','ADM-003','ADM-004','ADM-005','ADM-006','ADM-007','INT-001','INT-003','INT-004','INT-005','ARC-002','COM-010'],['application-type','topic-domain','audit-log','integration-health','archive-detail','export-status'],'disabled'),
  define('27','/certification',['CER-001','CER-002','CER-003','CER-004'],['certification','exam-booking']),
  define('28','/talent/people',['TAL-001','TAL-005'],['talent-person','field-capability']),
  define('29','/talent/projects',['TAL-002','TAL-004'],['talent-project','talent-write'],'disabled'),
  define('30','/talent/progress',['TAL-003','TAL-004'],['talent-progress','talent-write'],'disabled')
]);

export function getPageIntegrationContract(route) {
  return PAGE_INTEGRATION_MATRIX.find(page => page.route === route);
}
