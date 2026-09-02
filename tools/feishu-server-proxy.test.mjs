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

assert.equal(contract.tableCount, 36);
assert.equal(contract.tables.length, 36);
assert.equal(new Set(contract.tables.map(table => table.tableId)).size, 36);
assert.equal(contract.tables.reduce((total, table) => total + table.fields.length, 0), 271);
assert.equal(new Set(contract.tables.flatMap(table => table.fields.map(field => field.fieldId))).size, 271);
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

const calls = [];
const fakeRowsByTableId = new Map([
  [contract.byName.get('数字化认证').tableId, { record_id: 'rec-cert', fields: { 主键: 'CERT-001', 认证类型: 'RPA', 状态: '有效' } }],
  [contract.byName.get('用户字典').tableId, { record_id: 'rec-user', fields: { 姓名: '张三丰', 岗位: '产品经理' } }],
  [contract.byName.get('公告通知').tableId, { record_id: 'rec-ann', fields: { 公告标题: '系统上线', 分类: '系统公告' } }],
  [contract.byName.get('应用索引').tableId, { record_id: 'rec-app', fields: { 应用名称: '经营分析可视化报表', 应用类型: '可视化报表' } }],
  [contract.byName.get('人才项目').tableId, { record_id: 'rec-project', fields: { 项目名称: '数字人才培养', 项目类型: '培训' } }],
  [contract.byName.get('项目进度').tableId, { record_id: 'rec-progress', fields: { 阶段名称: '实施', 状态: '进行中' } }],
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

for (const [operationId, tableName, expectedLabel] of [
  ['COM-004', '用户字典', '张三丰'],
  ['ANN-002', '公告通知', '系统上线'],
  ['TAL-002', '人才项目', '数字人才培养'],
  ['TAL-003', '项目进度', '实施'],
  ['MAT-002', '素材中心', '操作手册']
]) {
  const mapped = await service.execute(operationId, {});
  assert.equal(mapped.data.pageSize, 10);
  assert.equal(mapped.data.items[0].label, expectedLabel);
  assert.ok(calls.some(call => call.url.includes(`/tables/${contract.byName.get(tableName).tableId}/records`)));
}

for (const operation of OPERATION_REGISTRY.filter(item => item.access === 'write')) {
  await assert.rejects(() => service.execute(operation.id, {}), error => {
    assert.equal(error.code, 'WRITE_OPERATION_DISABLED', operation.id);
    assert.equal(error.status, 403, operation.id);
    return true;
  });
}
await assert.rejects(() => service.execute('CER-002', {}), error => {
  assert.equal(error.code, 'READ_OPERATION_NOT_ENABLED');
  assert.equal(error.status, 503);
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

console.log('server-side Feishu credentials, 36-table identifier contract, default pagination and read-only gate passed');
