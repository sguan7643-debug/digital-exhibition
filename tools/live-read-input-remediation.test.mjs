import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLiveReadInputResolver } from '../server/feishu-live-read-inputs.mjs';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';

const verifierSource = readFileSync(new URL('./verify-live-read-operations.mjs', import.meta.url), 'utf8');
assert.match(verifierSource, /createFeishuFileAccessService/, '读取验证器必须注入文件访问服务');
assert.match(verifierSource, /createLiveReadInputResolver/, '读取验证器必须使用 operation-specific 输入解析器');
assert.match(verifierSource, /requiredPermission/, '403 结果必须输出所需权限编码');
assert.match(verifierSource, /authorizationUrl/, '403 结果必须提供可直接打开的授权入口');

const tables = new Map([
  ['应用索引', { tableId: 'tbl_app', views: [{ viewId: 'vew_app' }], fields: [{ name: '应用ID' }, { name: '应用类型' }] }],
  ['公告通知', { tableId: 'tbl_ann', views: [{ viewId: 'vew_ann' }], fields: [{ name: '公告ID' }] }],
  ['培训课程', { tableId: 'tbl_course', views: [{ viewId: 'vew_course' }], fields: [{ name: '课程ID' }] }],
  ['认证项目', { tableId: 'tbl_cert', views: [{ viewId: 'vew_cert' }], fields: [{ name: '认证编码' }] }],
  ['素材中心', { tableId: 'tbl_mat', views: [{ viewId: 'vew_mat' }], fields: [{ name: '素材ID' }, { name: '素材文件' }] }],
  ['导出任务', { tableId: 'tbl_exp', views: [{ viewId: 'vew_exp' }], fields: [{ name: '导出任务ID' }] }],
  ['归档任务', { tableId: 'tbl_arc', views: [{ viewId: 'vew_arc' }], fields: [{ name: '归档任务ID' }] }],
  ['多维表连接配置', { tableId: 'tbl_conn', views: [{ viewId: 'vew_conn' }], fields: [{ name: '连接编码' }] }],
  ['应用类型配置', { tableId: 'tbl_type', views: [{ viewId: 'vew_type' }], fields: [{ name: '类型编码' }] }],
  ['附件资料', { tableId: 'tbl_attachment', views: [{ viewId: 'vew_attachment' }], fields: [{ name: '主键' }, { name: '附件' }] }],
  ['使用申请', { tableId: 'tbl_apply', views: [{ viewId: 'vew_apply' }], fields: [{ name: '申请编号' }, { name: '申请人ID' }] }]
]);
const rows = new Map([
  ['tbl_app', [{ record_id: 'app-record', fields: { 应用ID: 'APP-001', 应用类型: 'RPA' } }]],
  ['tbl_ann', [{ record_id: 'ann-record', fields: { 公告ID: 'ANN-001' } }]],
  ['tbl_course', [{ record_id: 'course-record', fields: { 课程ID: 'COURSE-001' } }]],
  ['tbl_cert', [{ record_id: 'cert-record', fields: { 认证编码: 'CERT-001' } }]],
  ['tbl_mat', [{ record_id: 'mat-record', fields: { 素材ID: 'MAT-001', 素材文件: [{ file_token: 'file-token-001' }] } }]],
  ['tbl_exp', [{ record_id: 'exp-record', fields: { 导出任务ID: 'EXPORT-001' } }]],
  ['tbl_arc', [{ record_id: 'arc-record', fields: { 归档任务ID: 'ARCHIVE-001' } }]],
  ['tbl_conn', [{ record_id: 'conn-record', fields: { 连接编码: 'CONNECTION-001' } }]],
  ['tbl_type', [{ record_id: 'type-record', fields: { 类型编码: 'RPA' } }]],
  ['tbl_attachment', [{ record_id: 'attachment-record', fields: { 主键: 'ATTACH-001', 附件: [{ file_token: 'attachment-token-001' }] } }]],
  ['tbl_apply', [{ record_id: 'apply-record', fields: { 申请编号: 'APPLY-001', 申请人ID: 'USER-001' } }]]
]);
const resolver = createLiveReadInputResolver({
  identifierContract: { byName: tables },
  client: { listRecords: async tableId => ({ items: rows.get(tableId) || [] }) },
  identity: { userId: 'USER-001' }
});
assert.deepEqual(await resolver.resolve({ id: 'COM-001' }), {});
assert.deepEqual(await resolver.resolve({ id: 'COM-005' }), { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE'], includeDisabled: false });
assert.deepEqual(await resolver.resolve({ id: 'ADM-007' }), { subjectType: 'USER', subjectId: 'USER-001', resourceType: 'ADMIN', resourceId: 'GLOBAL', permissionCode: 'admin.integrations.view' });
assert.deepEqual(await resolver.resolve({ id: 'APP-003' }), { appId: 'APP-001' });
assert.deepEqual(await resolver.resolve({ id: 'APP-007' }), { appId: 'APP-001', page: 1, pageSize: 20, sort: 'createdAt,desc' });
assert.deepEqual(await resolver.resolve({ id: 'MAT-001' }), {}, 'MAT-001 不得发送 MAT-002 的分页字段');
assert.deepEqual(await resolver.resolve({ id: 'APP-010' }), { applicationId: 'APPLY-001', includeHistory: true }, 'APP-010 必须选择当前 AD 账号的申请');
assert.deepEqual(await resolver.resolve({ id: 'OAP-011' }), { usage: 'DETAIL', schemaVersion: 1, typeCode: 'RPA' }, 'OAP-011 必须从正式应用类型配置解析 typeCode');
assert.deepEqual(await resolver.resolve({ id: 'MAT-003' }).then(input => ({ ...input, clientOccurredAt: 'fixed' })), { materialId: 'MAT-001', fileId: 'file-token-001', purpose: 'TEST_READ', sourcePage: '/live-approval-runner.html', clientOccurredAt: 'fixed' });
const multiMaterialRows = new Map(rows);
multiMaterialRows.set('tbl_mat', [
  { record_id: 'mat-record-empty', fields: { 素材ID: 'MAT-EMPTY', 素材文件: '[附件]' } },
  { record_id: 'mat-record-compatible', fields: { 素材ID: 'MAT-002', 素材文件: [{ file_token: 'file-token-002' }] } }
]);
const multiMaterialResolver = createLiveReadInputResolver({
  identifierContract: { byName: tables },
  client: { listRecords: async tableId => ({ items: tableId === 'tbl_attachment' ? [] : multiMaterialRows.get(tableId) || [] }) },
  identity: { userId: 'USER-001' }
});
assert.deepEqual(await multiMaterialResolver.resolve({ id: 'COM-008' }), { fileId: 'MAT-002', mode: 'DOWNLOAD' }, 'COM-008 必须使用可解析逻辑记录 ID');
assert.deepEqual(await multiMaterialResolver.resolve({ id: 'MAT-003' }).then(input => ({ ...input, clientOccurredAt: 'fixed' })), {
  materialId: 'MAT-002', fileId: 'file-token-002', purpose: 'TEST_READ', sourcePage: '/live-approval-runner.html', clientOccurredAt: 'fixed'
}, 'MAT-003 必须使用同一素材的文件 token，并跳过不兼容首行');
const attachmentOnlyRows = new Map(rows);
attachmentOnlyRows.set('tbl_mat', [{ record_id: 'mat-record-no-file', fields: { 素材ID: 'MAT-NO-FILE', 素材文件: '[附件]' } }]);
const attachmentOnlyResolver = createLiveReadInputResolver({
  identifierContract: { byName: tables },
  client: { listRecords: async tableId => ({ items: attachmentOnlyRows.get(tableId) || [] }) },
  identity: { userId: 'USER-001' }
});
assert.deepEqual(await attachmentOnlyResolver.resolve({ id: 'COM-008' }), { fileId: 'ATTACH-001', mode: 'DOWNLOAD' }, 'COM-008 必须识别现有“附件”字段的 file_token，不上传文件');

const overrideResolver = createLiveReadInputResolver({
  identifierContract: { byName: tables },
  client: { listRecords: async tableId => ({ items: rows.get(tableId) || [] }) },
  identity: { userId: 'USER-001' },
  contextOverrides: {
    applicationId: 'TEST_APPLICATION_OVERRIDE',
    certificationId: 'TEST_CERTIFICATION_OVERRIDE',
    exportId: 'TEST_EXPORT_OVERRIDE',
    appId: 'FORBIDDEN_OVERRIDE'
  }
});
assert.deepEqual(await overrideResolver.resolve({ id: 'APP-010' }), { applicationId: 'TEST_APPLICATION_OVERRIDE', includeHistory: true });
assert.deepEqual(await overrideResolver.resolve({ id: 'CER-003' }), { certificationId: 'TEST_CERTIFICATION_OVERRIDE' });
assert.deepEqual(await overrideResolver.resolve({ id: 'COM-010' }), { exportId: 'TEST_EXPORT_OVERRIDE' });
assert.deepEqual(await overrideResolver.resolve({ id: 'APP-003' }), { appId: 'APP-001' }, '非 allowlist 上下文不得覆盖读取输入');
const placeholderRows = new Map(rows);
placeholderRows.set('tbl_mat', [{ record_id: 'mat-record', fields: { 素材ID: 'MAT-001', 素材文件: '[附件]' } }]);
const placeholderResolver = createLiveReadInputResolver({
  identifierContract: { byName: tables },
  client: { listRecords: async tableId => ({ items: placeholderRows.get(tableId) || [] }) },
  identity: { userId: 'USER-001' }
});
await assert.rejects(() => placeholderResolver.resolve({ id: 'MAT-003' }), error => error.code === 'REQUIRED_INPUT_UNAVAILABLE' && error.requiredInput.includes('fileId'));
await assert.rejects(() => createLiveReadInputResolver({ identifierContract: { byName: new Map([['应用索引', tables.get('应用索引')]]) }, client: { listRecords: async () => ({ items: [] }) } }).resolve({ id: 'APP-003' }), error => error.code === 'REQUIRED_INPUT_UNAVAILABLE' && error.requiredInput.includes('appId'));

const staleProjectionCalls = [];
const staleProjectionResolver = createLiveReadInputResolver({
  identifierContract: { byName: new Map([['应用索引', tables.get('应用索引')]]) },
  client: {
    listRecords: async (_tableId, query) => {
      staleProjectionCalls.push(query.fieldNames);
      if (query.fieldNames.length) throw Object.assign(new Error('字段不存在'), { code: 'FEISHU_RECORDS_FAILED', upstreamCode: 1254045 });
      return { items: rows.get('tbl_app') };
    }
  },
  identity: { userId: 'USER-001' }
});
assert.deepEqual(await staleProjectionResolver.resolve({ id: 'APP-003' }), { appId: 'APP-001' });
assert.equal(staleProjectionCalls.length, 2, '字段契约漂移只允许一次完整行回退');
assert.deepEqual(staleProjectionCalls.at(-1), []);

const allReadOperations = OPERATION_REGISTRY.filter(operation => operation.readOnly);
const resolvedInputs = await Promise.all(allReadOperations.map(operation => resolver.resolve(operation)));
assert.equal(allReadOperations.length, 65, '受控主运行器必须覆盖 65 个只读 operation');
assert.equal(resolvedInputs.length, 65);
assert.ok(resolvedInputs.every(input => input && typeof input === 'object' && !Array.isArray(input)));
console.log('live read operation-specific input contract passed');
