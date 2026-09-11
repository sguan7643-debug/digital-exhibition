import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient, FeishuProxyError } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createFeishuOperationDispatcher } from '../server/feishu-proxy-handler.mjs';
import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteConfigFactory = (await import('../vite.config.js')).default;
const viteConfig = await viteConfigFactory({ mode: 'test', command: 'serve' });
assert.ok(viteConfig.server.fs.deny.includes('**/server/**'));
assert.ok(viteConfig.server.fs.deny.includes('**/tools/**'));
const contract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));

assert.equal(contract.tableCount, 64);
assert.equal(contract.tables.length, 64);
assert.equal(new Set(contract.tables.map(table => table.tableId)).size, 64);
assert.equal(contract.tables.reduce((total, table) => total + table.fields.length, 0), contract.fieldCount);
assert.equal(new Set(contract.tables.flatMap(table => table.fields.map(field => field.fieldId))).size, contract.fieldCount);
assert.equal(contract.byName.get('数字化认证').tableId, 'tbl4YatzzB7DCEi2');
assert.equal(contract.byName.get('数字化认证').views[0].viewId, 'vew1h08FhR');
assert.equal(Object.hasOwn(contract, 'baseId'), false, '服务端结构字典也不得写死 Base token');

const missingCredentials = createFeishuOpenApiClient({ fetchImpl: async () => { throw new Error('不应发起请求'); } });
assert.equal(missingCredentials.credentialsReady, false);
await assert.rejects(() => missingCredentials.listRecords('tbl-safe', { pageSize: 10 }), error => {
  assert.ok(error instanceof FeishuProxyError);
  assert.equal(error.code, 'SERVICE_CREDENTIALS_MISSING');
  assert.equal(error.status, 503);
  return true;
});
assert.doesNotMatch(JSON.stringify(missingCredentials), /appSecret|tenant_access_token|authorization/i);

const approvalFailureClient = createFeishuOpenApiClient({
  appId: 'cli-test', appSecret: 'secret-test', baseToken: 'base-test',
  fetchImpl: async url => String(url).endsWith('/auth/v3/tenant_access_token/internal')
    ? Response.json({ code: 0, tenant_access_token: 'server-only-token', expire: 7200 })
    : Response.json({ code: 99992402, msg: 'field validation failed: approval_name', request_id: 'req-approval-001', data: {} }, { status: 200 })
});
await assert.rejects(
  approvalFailureClient.createApprovalDefinition({ approvalName: 'TEST_审批', description: 'TEST_', approverUserId: 'u_test' }),
  error => {
    assert.equal(error.code, 'FEISHU_APPROVAL_FAILED');
    assert.equal(error.upstreamCode, 99992402);
    assert.equal(error.upstreamMessage, 'field validation failed: approval_name');
    assert.equal(error.upstreamPath, '/approval/v4/approvals?department_id_type=open_department_id&user_id_type=user_id');
    assert.equal(error.upstreamRequestId, 'req-approval-001');
    return true;
  }
);

const approvalDefinitionBodies = [];
const approvalDefinitionClient = createFeishuOpenApiClient({
  appId: 'cli-test', appSecret: 'secret-test', baseToken: 'base-test',
  fetchImpl: async (url, options = {}) => {
    if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) {
      return Response.json({ code: 0, tenant_access_token: 'server-only-token', expire: 7200 });
    }
    if (new URL(url).pathname.endsWith('/approval/v4/approvals')) {
      assert.equal(new URL(url).searchParams.get('department_id_type'), 'open_department_id');
      assert.equal(new URL(url).searchParams.get('user_id_type'), 'user_id');
      approvalDefinitionBodies.push(JSON.parse(options.body));
      return Response.json({ code: 0, data: { approval_code: 'TEST_APPROVAL_CODE' } });
    }
    throw new Error(`unexpected approval definition request: ${url}`);
  }
});
await approvalDefinitionClient.createApprovalDefinition({
  approvalName: 'TEST_数智展厅海能Work应用上架审批',
  description: 'TEST_仅用于数智展厅端到端验收',
  approverUserId: 'u_test'
});
const approvalBody = approvalDefinitionBodies[0];
assert.equal(Object.hasOwn(approvalBody, 'approval_status'), false);
assert.deepEqual(approvalBody.settings, { revert_interval: 0 });
assert.deepEqual(approvalBody.config, {
  can_update_viewer: false,
  can_update_form: false,
  can_update_process: false,
  can_update_revert: false
});
assert.equal(approvalBody.icon, 0);
assert.equal(approvalBody.i18n_resources[0].is_default, true);
assert.equal(approvalBody.approval_name, '@i18n@approval_name');
assert.equal(approvalBody.description, '@i18n@description');
assert.deepEqual(approvalBody.process_manager_ids, []);
assert.equal(approvalBody.node_list[0].id, 'START');
assert.deepEqual(approvalBody.node_list[0].privilege_field, {
  writable: ['application_name', 'application_code', 'application_description'],
  readable: ['application_name', 'application_code', 'application_description']
});
assert.equal(Object.hasOwn(approvalBody.node_list[0], 'node_type'), false);
assert.equal(approvalBody.node_list[1].node_type, 'OR');
assert.deepEqual(approvalBody.node_list[1].approver, [{ type: 'Free' }]);
assert.equal(approvalBody.node_list.at(-1).id, 'END');
assert.deepEqual(approvalBody.node_list.at(-1).privilege_field, {
  writable: [],
  readable: ['application_name', 'application_code', 'application_description']
});
assert.equal(Object.hasOwn(approvalBody.node_list.at(-1), 'node_type'), false);
assert.match(approvalBody.form.form_content, /@i18n@application_name/);
const i18nTextKeys = approvalBody.i18n_resources.flatMap(resource => resource.texts.map(text => text.key)).sort();
assert.deepEqual(i18nTextKeys, ['@i18n@application_code', '@i18n@application_description', '@i18n@application_name', '@i18n@approval_name', '@i18n@approver_node', '@i18n@description'].sort());

const emptyTableClient = createFeishuOpenApiClient({
  appId: 'app-test', appSecret: 'secret-test', baseToken: 'base-test',
  fetchImpl: async url => String(url).endsWith('/auth/v3/tenant_access_token/internal')
    ? Response.json({ code: 0, tenant_access_token: 'server-only-token', expire: 7200 })
    : Response.json({ code: 0, msg: 'success', data: { has_more: false, total: 0 } })
});
assert.deepEqual(await emptyTableClient.listRecords('tblEmpty', { pageSize: 10 }), { items: [], total: 0, hasMore: false, nextPageToken: '' });

const calls = [];
const fakeRowsByTableId = new Map([
  [contract.byName.get('数字化认证').tableId, { record_id: 'rec-cert', fields: { 主键: 'CERT-001', 认证类型: 'RPA', 状态: '有效' } }],
  [contract.byName.get('用户字典').tableId, { record_id: 'rec-user', fields: { 姓名: '张三丰', 岗位: '产品经理' } }],
  [contract.byName.get('公告通知').tableId, { record_id: 'rec-ann', fields: {
    公告ID: 'ANN-001', 公告标题: '系统上线', 分类: '系统公告', 公告正文: '平台能力已完成更新。',
    发布部门ID: 'D-001', 发布人ID: 'U-001', 状态: '已发布', 是否置顶: '是', 发布时间: '2026-09-02 09:30:00'
  } }],
  [contract.byName.get('应用索引').tableId, { record_id: 'rec-app', fields: { 应用名称: '经营分析可视化报表', 应用类型: '可视化报表' } }],
  [contract.byName.get('人才库').tableId, { record_id: 'rec-person', fields: {
    主键: 'TALENT-001', 用户ID: 'U-001', 人才类型: '数字化人才', 人才等级: '高级',
    擅长领域: ['数据治理'], 状态: '在库'
  } }],
  [contract.byName.get('人才项目').tableId, { record_id: 'rec-project', fields: {
    主键: 'PROJECT-001', 项目名称: '数字人才培养', 项目类型: '培训', 负责人ID: 'U-001',
    状态: '进行中', 开始日期: '2026-09-01', 结束日期: '2026-12-31'
  } }],
  [contract.byName.get('项目进度').tableId, { record_id: 'rec-progress', fields: {
    主键: 'PROGRESS-001', 项目ID: 'PROJECT-001', 阶段名称: '实施', 状态: '进行中', 更新时间: '2026-09-02 10:00:00'
  } }],
  [contract.byName.get('素材中心').tableId, { record_id: 'rec-material', fields: { 素材名称: '操作手册', 素材文件: 'PDF' } }]
  ,[contract.byName.get('应用类型配置').tableId, { record_id: 'rec-type', fields: { 类型ID: 'TYPE-REPORT', 类型名称: '可视化报表', 类型编码: 'REPORT', 状态: '启用', 排序: 1 } }]
  ,[contract.byName.get('业务域字典').tableId, { record_id: 'rec-domain', fields: { 业务域ID: 'DOMAIN-OPS', 业务域名称: '生产运营' } }]
  ,[contract.byName.get('场景字典').tableId, { record_id: 'rec-scene', fields: { 场景ID: 'SCENE-OPS', 场景名称: '生产运营' } }]
]);
const fakeFetch = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || 'GET', headers: options.headers, body: options.body });
  if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) {
    return new Response(JSON.stringify({ code: 0, tenant_access_token: 'server-only-token', expire: 7200 }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (String(url).includes('/contact/v3/departments/0/children')) {
    return new Response(JSON.stringify({ code: 0, data: { items: [{
      open_department_id: 'od-dept-001', department_id: 'D-001', name: '经营管理部',
      parent_department_id: '0', member_count: 1, status: { is_deleted: false }
    }], has_more: false, page_token: '' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('/contact/v3/departments/od-dept-001/children')) {
    return new Response(JSON.stringify({ code: 0, data: { items: [], has_more: false, page_token: '' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (String(url).includes('/contact/v3/users/find_by_department')) {
    const departmentId = new URL(String(url)).searchParams.get('department_id');
    const items = departmentId === '0' ? [{
      user_id: 'ou-user-001', employee_no: 'EMP-001', name: '张三丰', department_ids: ['od-dept-001'],
      avatar: { avatar_72: 'https://example.invalid/avatar-safe.png' }, job_title: '产品经理',
      mobile: '13800000000', email: 'private@example.invalid', status: { is_resigned: false, is_exited: false, is_frozen: false }
    }] : [];
    return new Response(JSON.stringify({ code: 0, data: { items, has_more: false, page_token: '' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (String(url).includes('/records')) {
    const tableId = /\/tables\/(tbl[A-Za-z0-9]+)\/records/.exec(String(url))?.[1];
    const item = fakeRowsByTableId.get(tableId);
    if (!item) throw new Error(`测试未声明表：${tableId}`);
    return new Response(JSON.stringify({
      code: 0,
      data: {
        items: [item],
        total: 1,
        has_more: false,
        page_token: ''
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`未声明测试请求：${url}`);
};

const client = createFeishuOpenApiClient({
  appId: 'cli-test', appSecret: 'secret-test', baseToken: 'base-test', fetchImpl: fakeFetch,
  now: () => 1_000_000
});
const certification = contract.byName.get('数字化认证');
const result = await client.listRecords(certification.tableId, {
  viewId: certification.views[0].viewId,
  pageSize: 10,
  fieldNames: certification.fields.map(field => field.name)
});

assert.equal(result.items.length, 1);
assert.equal(result.items[0].record_id, 'rec-cert');
assert.equal(calls.length, 2);
assert.equal(calls[0].method, 'POST');
assert.deepEqual(JSON.parse(calls[0].body), { app_id: 'cli-test', app_secret: 'secret-test' });
assert.match(calls[1].url, /page_size=10/);
assert.match(calls[1].url, /view_id=vew1h08FhR/);
assert.equal(calls[1].headers.Authorization, 'Bearer server-only-token');

await client.listRecords(certification.tableId, { pageSize: 10 });
assert.equal(calls.filter(call => call.url.endsWith('/auth/v3/tenant_access_token/internal')).length, 1, 'token 必须在服务端缓存');

const service = createFeishuReadOnlyService({
  client,
  identifierContract: contract,
  traceIdFactory: () => 'trace-feishu-server-001',
  now: () => new Date('2026-09-02T08:00:00.000Z')
});
fakeRowsByTableId.set(contract.byName.get('应用索引').tableId, {
  record_id: 'rec-app',
  fields: {
    应用ID: 'APP-001', 应用名称: '经营分析可视化报表', 应用类型: 'REPORT', 子类型: '经营分析',
    应用简介: '经营指标展示', 应用关键字: '经营,分析', 状态: 'ONLINE', 使用次数: 1418, 收藏数: 731,
    负责人ID: 'U-001', 开发者ID: 'U-001', 所属部门ID: 'D-001', 开发部门ID: 'D-001',
    所属业务域ID: 'DOMAIN-OPS', 所属场景ID: 'SCENE-OPS', 最近更新日期: '2026-08-31'
  }
});
fakeRowsByTableId.set(contract.byName.get('用户字典').tableId, {
  record_id: 'rec-user', fields: { 用户ID: 'U-001', 姓名: '张三丰', 岗位: '产品经理', 所属部门ID: 'D-001' }
});
fakeRowsByTableId.set(contract.byName.get('部门字典').tableId, {
  record_id: 'rec-department', fields: { 部门ID: 'D-001', 部门名称: '经营管理部' }
});

const facetsEnvelope = await service.execute('APP-001', {});
assert.equal(facetsEnvelope.data.total, 1);
assert.equal(facetsEnvelope.data.types[0].name, '可视化报表');
assert.equal(facetsEnvelope.data.domains[0].name, '生产运营');
assert.equal(facetsEnvelope.data.scenes[0].name, '生产运营');
const envelope = await service.execute('APP-002', { pageSize: 10 });
assert.equal(envelope.code, 'OK');
assert.equal(envelope.traceId, 'trace-feishu-server-001');
assert.equal(envelope.data.items.length, 1);
assert.equal(envelope.data.items[0].id, 'rec-app');
assert.equal(envelope.data.items[0].appId, 'APP-001');
assert.equal(envelope.data.items[0].name, '经营分析可视化报表');
assert.equal(envelope.data.items[0].typeName, '可视化报表');
assert.equal(envelope.data.items[0].domainName, '生产运营');
assert.equal(envelope.data.items[0].sceneNames[0], '生产运营');
assert.equal(envelope.data.items[0].ownerName, '张三丰');
assert.equal(envelope.data.items[0].responsibleOrgName, '经营管理部');
assert.equal(envelope.data.items[0].usageCount, 1418);
assert.equal(envelope.data.items[0].favoriteCount, 731);
assert.equal(envelope.data.total, 1);
assert.equal(envelope.data.pageSize, 10);
assert.equal(envelope.data.page, 1);
assert.equal(envelope.data.hasMore, false);
assert.equal(Object.hasOwn(envelope.data.items[0], 'fields'), false, '代理不得把整行飞书字段原样透传到浏览器');
assert.ok(calls.some(call => call.url.includes(`/tables/${contract.byName.get('应用索引').tableId}/records`)));

const materials = await service.execute('MAT-002', {});
assert.equal(materials.data.pageSize, 10);
assert.equal(materials.data.items[0].name, '操作手册');
assert.equal(materials.data.items[0].permissions.canDownload, false);
assert.equal(materials.data.items[0].primaryFile.downloadUrl, '');
assert.ok(calls.some(call => call.url.includes(`/tables/${contract.byName.get('素材中心').tableId}/records`)));

const organizationTree = await service.execute('COM-003', { includeUsers: true, maxDepth: 5 });
assert.equal(organizationTree.data.items[0].orgId, 'od-dept-001');
assert.equal(organizationTree.data.items[0].orgCode, 'D-001');
assert.equal(organizationTree.data.items[0].orgName, '经营管理部');
assert.deepEqual(organizationTree.data.items[0].pathIds, ['od-dept-001']);
assert.equal(organizationTree.data.items[0].hasChildren, false);
assert.equal(organizationTree.data.userCount, 1);
const contactUsers = await service.execute('COM-004', { page: 1, pageSize: 10 });
assert.deepEqual(contactUsers.data.items[0], {
  userId: 'ou-user-001', employeeNo: 'EMP-001', displayName: '张三丰',
  avatarUrl: 'https://example.invalid/avatar-safe.png', orgId: 'od-dept-001', orgName: '经营管理部',
  departmentId: 'od-dept-001', departmentName: '经营管理部', officeId: '', officeName: '', title: '产品经理',
  mobileMasked: '', emailMasked: '', enabled: true
});
assert.equal(contactUsers.data.sort, 'name,asc');
assert.equal(contactUsers.data.filtersApplied.enabled, true);
assert.doesNotMatch(JSON.stringify(contactUsers), /13800000000|private@example\.invalid/, '通讯录代理不得暴露手机号或邮箱原值');

const talentFacets = await service.execute('TAL-005', { page: 1, pageSize: 10 });
assert.equal(talentFacets.data.types[0].name, '数字化人才');
assert.equal(talentFacets.data.levels[0].name, '高级');
assert.equal(talentFacets.data.departments[0].name, '经营管理部');
const talentPeople = await service.execute('TAL-001', { page: 1, pageSize: 10 });
assert.deepEqual(talentPeople.data.items[0], {
  id: 'rec-person', talentId: 'TALENT-001', userId: 'U-001', name: '张三丰', employeeNo: '',
  type: '数字化人才', level: '高级', specialties: ['数据治理'], status: '在库',
  departmentId: 'D-001', departmentName: '经营管理部'
});
const talentProjects = await service.execute('TAL-002', { page: 1, pageSize: 10 });
assert.deepEqual(talentProjects.data.items[0], {
  id: 'rec-project', projectId: 'PROJECT-001', name: '数字人才培养', type: '培训', ownerId: 'U-001',
  ownerName: '张三丰', status: '进行中', startDate: '2026-09-01', endDate: '2026-12-31'
});
const talentProgress = await service.execute('TAL-003', { page: 1, pageSize: 10 });
assert.deepEqual(talentProgress.data.items[0], {
  id: 'rec-progress', progressId: 'PROGRESS-001', projectId: 'PROJECT-001', projectName: '数字人才培养',
  phaseName: '实施', status: '进行中', updatedAt: '2026-09-02 10:00:00'
});
for (const tableName of ['人才库', '人才项目', '项目进度']) {
  assert.ok(calls.some(call => call.url.includes(`/tables/${contract.byName.get(tableName).tableId}/records`)));
}
assert.equal(Object.hasOwn(talentPeople.data.items[0], 'fields'), false, '人才接口不得透传飞书原始字段');

const announcementFacets = await service.execute('ANN-001', { page: 1, pageSize: 100 });
assert.equal(announcementFacets.data.total, 1);
assert.equal(announcementFacets.data.categories[0].name, '系统公告');
assert.equal(announcementFacets.data.statuses[0].name, '已发布');
assert.equal(announcementFacets.data.readStateAvailable, false, '公告表没有用户已读字段，不得伪造已读状态');
const announcementEnvelope = await service.execute('ANN-002', { page: 1, pageSize: 10, sort: 'published-desc' });
assert.deepEqual(announcementEnvelope.data.items[0], {
  id: 'rec-ann', announcementId: 'ANN-001', title: '系统上线', category: '系统公告',
  summary: '平台能力已完成更新。', status: '已发布', pinned: true, publishedAt: '2026-09-02 09:30:00'
});
assert.equal(announcementEnvelope.data.total, 1);
assert.equal(announcementEnvelope.data.pageSize, 10);
assert.equal(Object.hasOwn(announcementEnvelope.data.items[0], 'publisherId'), false, '列表不得暴露发布人标识');

for (const operation of OPERATION_REGISTRY.filter(item => item.access === 'write')) {
  await assert.rejects(() => service.execute(operation.id, {}), error => {
    assert.equal(error.code, 'WRITE_OPERATION_DISABLED', operation.id);
    assert.equal(error.status, 403, operation.id);
    return true;
  });
}
await assert.rejects(() => service.execute('COM-008', {}), error => {
  assert.equal(error.code, 'USER_AUTH_REQUIRED');
  assert.equal(error.status, 401);
  return true;
});
await assert.rejects(() => service.execute('UNKNOWN-999', {}), error => {
  assert.equal(error.code, 'UNKNOWN_OPERATION');
  assert.equal(error.status, 404);
  return true;
});

const dispatch = createFeishuOperationDispatcher({ service, traceIdFactory: () => 'trace-dispatch-001' });
const routed = await dispatch({
  method: 'POST',
  url: '/api/v1/operations/APP-002',
  headers: { 'content-type': 'application/json' },
  body: { operationId: 'APP-002', input: { page: 1, pageSize: 10 } }
});
assert.equal(routed.status, 200);
assert.equal(routed.body.code, 'OK');
assert.equal(await dispatch({ method: 'GET', url: '/not-a-proxy-route' }), null);
const methodRejected = await dispatch({ method: 'GET', url: '/api/v1/operations/APP-002' });
assert.equal(methodRejected.status, 405);
assert.equal(methodRejected.body.code, 'METHOD_NOT_ALLOWED');
const mismatchRejected = await dispatch({
  method: 'POST', url: '/api/v1/operations/APP-002',
  headers: { 'content-type': 'application/json' },
  body: { operationId: 'APP-005', input: {} }
});
assert.equal(mismatchRejected.status, 400);
assert.equal(mismatchRejected.body.code, 'OPERATION_MISMATCH');
const mediaRejected = await dispatch({
  method: 'POST', url: '/api/v1/operations/APP-002',
  headers: { 'content-type': 'text/plain' },
  body: { operationId: 'APP-002', input: {} }
});
assert.equal(mediaRejected.status, 415);
const injectedRejected = await dispatch({
  method: 'POST', url: '/api/v1/operations/APP-002',
  headers: { 'content-type': 'application/json' },
  body: { operationId: 'APP-002', input: { tableId: 'tbl-attacker-controlled' } }
});
assert.equal(injectedRejected.status, 400);
assert.equal(injectedRejected.body.code, 'INVALID_OPERATION_INPUT');
const pageTypeRejected = await dispatch({
  method: 'POST', url: '/api/v1/operations/APP-002',
  headers: { 'content-type': 'application/json' },
  body: { operationId: 'APP-002', input: { pageSize: '10' } }
});
assert.equal(pageTypeRejected.status, 400);
assert.equal(pageTypeRejected.body.code, 'INVALID_PAGE_SIZE');

console.log('server-side Feishu credentials, 64-table identifier contract, default pagination and read-only gate passed');
