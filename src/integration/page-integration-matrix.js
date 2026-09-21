import { getOperation } from './operation-registry.js';

const collectionOperationIds = new Set([
  'WB-001','MSG-002','FAV-002','ANN-002','ANN-005','APP-002','APP-009','PTS-002','PTS-004',
  'TRN-002','CER-002','OAN-002','OAP-002','ADM-003','ADM-004','ADM-005','TAL-001','TAL-002',
  'TAL-003','MAT-002','INT-004','INT-005'
]);
// These resources require a user-selected business object.  Keeping them as
// interaction reads prevents route entry from issuing incomplete requests.
const interactionReadOperationIds = new Set(['OAN-008', 'APP-004', 'MAT-003', 'COM-008', 'COM-010', 'APP-010', 'OAP-008', 'WB-004']);
const versionRequiredOperationIds = new Set([
  'COM-007','MSG-003','MSG-004','MSG-005','FAV-004','TRN-005','ADM-005',
  'OAN-005','OAN-006','OAN-007','OAP-005','OAP-009','ARC-003'
]);
const appDetailOperationIds = Object.freeze([
  'APP-003','APP-009','APP-007','MAT-001','MAT-002','MAT-003','COM-008',
  'FAV-003','FAV-004','APP-005','APP-006','APP-008'
]);

const define = (id, route, operationIds, fieldDomains, defaultMode = 'mock') => {
  const readOperationIds = operationIds.filter(operationId => getOperation(operationId)?.readOnly && !interactionReadOperationIds.has(operationId));
  const interactionOperationIds = operationIds.filter(operationId => interactionReadOperationIds.has(operationId));
  const actions = operationIds.filter(operationId => getOperation(operationId)?.access === 'write').map(operationId => Object.freeze({
    actionId: operationId,
    operationId,
    requiredPermission: `operation:${operationId}:execute`,
    confirmationRequired: true,
    idempotencyRequired: true,
    versionConditionRequired: versionRequiredOperationIds.has(operationId),
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
  define('01','/workbench',['COM-001','COM-002','COM-005','WB-001','WB-002','COM-011'],['identity','menu','dictionary','tasks','application-summary','application-search','behavior-audit']),
  define('02','/messages',['MSG-001','MSG-002','MSG-003','MSG-004','MSG-005'],['message','unread-count','read-state']),
  define('03','/favorites',['FAV-001','FAV-002','APP-004','FAV-003','FAV-004'],['favorite','resource','canonical-resource-id','app-launch']),
  define('04','/profile',['COM-003','COM-004','WB-003','WB-004'],['identity','organization','contact','profile-summary','todo']),
  define('05','/announcements',['ANN-001','ANN-002'],['announcement','read-state']),
  define('06','/announcements/notice-001',['ANN-003','ANN-005','COM-008','ANN-004'],['announcement-detail','attachment','related-resource','file-download','read-state']),
  define('07','/apps',['APP-001','APP-002','APP-004'],['application-summary','application-filter','topic-domain','app-launch']),
  define('08','/apps/tool-001',[...appDetailOperationIds],['application-detail','training-relation','material-relation','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('09','/apps/haineng-work-001',[...appDetailOperationIds],['application-detail','training-relation','material-relation','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('10','/apps/report-001',[...appDetailOperationIds],['application-detail','report-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('11','/apps/dashboard-001',[...appDetailOperationIds],['application-detail','dashboard-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('12','/apps/dataset-001',[...appDetailOperationIds],['application-detail','dataset-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('13','/apps/metric-001',[...appDetailOperationIds],['application-detail','metric-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('14','/apps/ai-001',[...appDetailOperationIds],['application-detail','ai-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('15','/apps/ead-001',[...appDetailOperationIds],['application-detail','ead-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  define('16','/apps/rpa-001',[...appDetailOperationIds],['application-detail','rpa-metadata','related-resource','comment','material-download','file-download','favorite','application-request','reuse-request']),
  // Approval status is loaded by OnboardingPage through the dedicated
  // instance endpoint.  The legacy operation entries stay declared for
  // governance, but must never be fetched merely by entering this route.
  define('17','/apps/onboarding/status',['APP-010','OAP-008','OAP-010'],['approval-instance-status']),
  define('18','/points',['PTS-001','PTS-003','PTS-004'],['point-account','point-category','point-rule']),
  define('19','/points/details',['PTS-002','PTS-005'],['point-ledger','point-export']),
  define('20','/training',['TRN-001','TRN-002','TRN-003','TRN-004','TRN-005','TRN-006'],['course','registration','learning-entry']),
  define('21','/operations',['OPS-001','OPS-003','OPS-002','OPS-004'],['operation-metric','metric-definition','operation-export','refresh-task']),
  define('22','/operations/announcements',['OAN-001','OAN-002'],['announcement-admin','publish-state']),
  define('23','/operations/announcements/notice-001/edit',['OAN-003','OAN-008','OAN-004','OAN-005','OAN-006','OAN-007','COM-006','COM-007'],['announcement-draft','announcement-preview','attachment','publish-control','file-upload'],'disabled'),
  define('24','/operations/apps',['OAP-001','OAP-002','OAP-011','COM-009'],['application-operation','type-form-definition','application-export']),
  define('25','/operations/apps/app-001/edit',['OAP-003','OAP-006','OAP-004','OAP-005','OAP-007','OAP-009','COM-006','COM-007'],['application-draft','type-form','publish-control','external-submission','file-upload'],'disabled'),
  define('26','/admin',['ADM-001','ADM-002','ADM-003','ADM-004','ADM-005','ADM-006','ADM-007','INT-001','INT-002','INT-003','INT-004','INT-005','ARC-001','ARC-002','ARC-003','COM-010','OAP-010','OAP-012'],['application-type','topic-domain','audit-log','integration-health','archive-detail','archive-control','export-status','permission-grant'],'disabled'),
  define('27','/certification',['CER-001','CER-002','CER-003','CER-004'],['certification','exam-booking']),
  define('28','/talent/people',['TAL-001','TAL-005'],['talent-person','field-capability']),
  define('29','/talent/projects',['TAL-002','TAL-004'],['talent-project','talent-write'],'disabled'),
  define('30','/talent/progress',['TAL-003','TAL-004'],['talent-progress','talent-write'],'disabled'),
  define('31','/materials',['MAT-001'],['material-facet','material-category']),
  define('32','/apps/onboarding/apply',['COM-003','COM-004'],['organization-directory','contact-directory','onboarding-form'])
]);

export function getPageIntegrationContract(route) {
  return PAGE_INTEGRATION_MATRIX.find(page => page.route === route);
}
