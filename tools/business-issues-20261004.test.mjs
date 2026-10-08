import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applicationTypePolicy,
  buildContactAutofill,
  buildRejectedApplicationCopy,
  normalizePermissionScope,
  validateEmail,
  validatePhone
} from '../src/integration/onboarding-form-policy.js';
import { resolveApplicationCardAction } from '../src/integration/application-card-policy.js';
import { normalizeAttachmentPresentation } from '../src/integration/attachment-presentation.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

assert.deepEqual(applicationTypePolicy('T003'), { supported: true, applicationCodeRequired: true, reason: '' });
assert.deepEqual(applicationTypePolicy('T005'), { supported: true, applicationCodeRequired: true, reason: '' });
assert.equal(applicationTypePolicy('T001').supported, false);
assert.match(applicationTypePolicy('T001').reason, /真实审批/);

assert.deepEqual(buildContactAutofill({ userId: 'u-1', mobile: '+8613812345678', email: 'u1@example.com' }), {
  contactPhone: '+8613812345678', contactEmail: 'u1@example.com'
});
assert.deepEqual(buildContactAutofill({ userId: 'u-2' }), { contactPhone: '', contactEmail: '' });
assert.equal(validatePhone('+8613812345678'), true);
assert.equal(validatePhone('12345'), false);
assert.equal(validateEmail('u1@example.com'), true);
assert.equal(validateEmail('bad@'), false);

assert.deepEqual(normalizePermissionScope({ scope: 'all', accessDepartment: 'D1', users: 'U1' }), {
  scope: 'all', accessDepartment: '', users: ''
});
assert.deepEqual(normalizePermissionScope({ scope: 'assigned', accessDepartment: 'D1', users: '' }), {
  scope: 'assigned', accessDepartment: 'D1', users: ''
});

const rejected = buildRejectedApplicationCopy({
  applicationId: 'OLD-1', status: 'REJECTED', applicant: 'u-1', rejectionReason: '补充说明',
  applicationName: '旧申请', applicationCode: 'RPA-001', applicationType: 'T003', businessDomain: 'BD003',
  detailFields: {
    department: '信息化部门', phone: '13812345678', email: 'u1@example.com', summary: '摘要',
    scenario: '说明', contact: 'u-2', contactDepartment: '信息化部门', contactPhone: '13912345678',
    contactEmail: 'u2@example.com', accessDepartment: '信息化部门', users: 'u-2', scope: 'assigned',
    detailFields: { RPA所属平台: '平台A' }, attemptId: 'OLD-ATTEMPT', instanceId: 'OLD-INSTANCE'
  },
  icon: { fileId: 'FILE-ICON', fileName: 'logo.png', mimeType: 'image/png', sizeBytes: 12 },
  attachments: [{ fileId: 'FILE-DOC', fileName: '说明.pdf', mimeType: 'application/pdf', sizeBytes: 34 }]
}, 'u-1');
assert.equal(rejected.sourceApplicationId, 'OLD-1');
assert.equal(rejected.form.name, '旧申请');
assert.equal(rejected.form.applicationCode, 'RPA-001');
assert.equal(rejected.form.attemptId, undefined, 'immutable attempt identity must not be copied');
assert.equal(rejected.form.instanceId, undefined, 'approval identity must not be copied');
assert.equal(rejected.files.icon.fileName, 'logo.png');
assert.throws(() => buildRejectedApplicationCopy({ status: 'APPROVED', applicant: 'u-1' }, 'u-1'), /被拒绝/);
assert.throws(() => buildRejectedApplicationCopy({ status: 'REJECTED', applicant: 'u-2' }, 'u-1'), /当前用户/);

assert.deepEqual(resolveApplicationCardAction({ accessGranted: true, launchable: true }, { requestEnabled: true }), {
  kind: 'launch', label: '立即使用', disabled: false, reason: ''
});
assert.equal(resolveApplicationCardAction({ accessGranted: false, launchable: true, accessReason: '未授权' }, { requestEnabled: true }).kind, 'request');
assert.deepEqual(resolveApplicationCardAction({ accessGranted: false, launchable: false, accessReason: '未授权' }, { requestEnabled: false }), {
  kind: 'unavailable', label: '暂不可用', disabled: true, reason: '未授权'
});

assert.deepEqual(normalizeAttachmentPresentation({ fileId: 'FILE-1', fileName: '说明.pdf', mimeType: 'application/pdf', sizeBytes: 2048, uploadedAt: '2026-10-05T01:00:00Z', previewable: true, downloadable: true }), {
  key: 'FILE-1', name: '说明.pdf', type: 'PDF', mimeType: 'application/pdf', sizeBytes: 2048,
  uploadedAt: '2026-10-05T01:00:00Z', previewable: true, downloadable: true
});

const applySource = await read('src/pages/OnboardingApplyPage.vue');
const appSource = await read('src/App.vue');
const statusSource = await read('src/pages/OnboardingPage.vue');
const appsSource = await read('src/pages/AppsPage.vue');
const detailSource = await read('src/components/AppDetailAuthoritativeBody.vue');
const liveDetailSource = await read('src/components/AppDetailLiveSections.vue');
const onboardingService = await read('server/feishu-onboarding-service.mjs');
const approvalService = await read('server/feishu-approval-service.mjs');
const readOnlyService = await read('server/feishu-read-only-service.mjs');
const pageMatrix = await read('src/integration/page-integration-matrix.js');
const globalStyle = await read('src/style.css');
const h5Style = await read('src/h5.css');

assert.match(applySource, /watch\(\(\) => form\.contact/);
assert.match(applySource, /buildContactAutofill/);
assert.match(applySource, /includeContact: true/);
assert.match(applySource, /userId: contact/);
assert.match(appSource, /:operation-executor="executeReadOperation"/);
assert.match(applySource, /applicationCodeRequired/);
assert.match(applySource, /系统不会使用唯一标识自动生成/);
assert.match(applySource, /:disabled="!item\.supported"/);
assert.match(applySource, /normalizePermissionScope/);
assert.match(applySource, /组织内已登录用户均可查看/);
assert.match(applySource, /sourceApplicationId/);
assert.match(applySource, /已从被拒绝的申请复制/);
assert.match(applySource, /!uploadedIconReady && !copiedIconAvailable/, 'copied valid icon must satisfy the browser required state');
assert.match(statusSource, /编辑并重新提交/);
assert.match(statusSource, /detail\.status === 'REJECTED'/);
assert.doesNotMatch(appsSource, /applicationAccessMode\(app\.route\)/);
assert.match(appsSource, /resolveApplicationCardAction/);
assert.match(appsSource, /APP-004/);
assert.match(appsSource, /requestActionEnabled/);
assert.doesNotMatch(appsSource, /props\.testWritesEnabled && typeof props\.actionExecutor/);
assert.match(appSource, /:request-action-enabled="integrationRuntime\.businessWritesEnabled && integrationContract\.actions\.some\(action => action\.operationId === 'APP-005'\)"/);
assert.match(pageMatrix, /define\('07','\/apps',\['APP-001','APP-002','APP-004','APP-005'\]/);
assert.match(detailSource, /normalizeAttachmentPresentation/);
assert.doesNotMatch(detailSource, /\['attachments','附件'\]/, 'attachments must not use the generic raw-object section renderer');
assert.match(detailSource, /class="[^"]*\battachment-items\b[^"]*"/);
assert.match(liveDetailSource, /normalizeAttachmentPresentation/);
assert.match(onboardingService, /sourceApplicationId/);
assert.match(onboardingService, /ONBOARDING_SOURCE_NOT_REJECTED/);
assert.match(onboardingService, /EMAIL_PATTERN/);
assert.match(approvalService, /application\.scope === 'all'/);
assert.match(readOnlyService, /CONTACT_USER_REQUIRED/);
assert.match(readOnlyService, /const \{ mobile: _mobile, email: _email, \.\.\.safeItem \} = item/);
assert.match(globalStyle, /--xlt-readable-muted:\s*#5b6e82/i);
assert.match(h5Style, /safe-area-inset-bottom/);

console.log('DEH-BUSINESS-ISSUES-20261004 behavior contract passed');
