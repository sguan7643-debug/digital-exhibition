import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PAGE_MATRIX as UI_PAGE_MATRIX } from '../src/fixtures/pages.js';
import {
  FIRST_BATCH_OPERATION_IDS,
  LATER_BATCH_OPERATION_IDS,
  DEFERRED_OPERATION_IDS,
  OPERATION_REGISTRY
} from '../src/integration/operation-registry.js';
import { PAGE_INTEGRATION_MATRIX, getPageIntegrationContract } from '../src/integration/page-integration-matrix.js';
import { resolveIntegrationRuntime } from '../src/integration/runtime-config.js';
import { createSafeProxyClient, normalizeIntegrationError } from '../src/integration/safe-proxy-client.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { createFieldDictionary, mapRecordByFieldId, SchemaDriftError } from '../src/integration/schema-guard.js';
import { createCursorPagination } from '../src/integration/cursor-pagination.js';
import { createDataState, reduceDataState } from '../src/integration/data-state.js';
import { createPageDataSource } from '../src/integration/page-data-source.js';

assert.equal(OPERATION_REGISTRY.length, 101, 'operation registry must contain the frozen 101 operations');
const identifiers = JSON.parse(readFileSync(path.resolve('server/contracts/feishu-base-identifiers.json'), 'utf8'));
const serverReadme = readFileSync(path.resolve('server/README.md'), 'utf8');
assert.equal(identifiers.tableCount, 64); assert.equal(identifiers.fieldCount, 1311);
assert.match(serverReadme, /64 表\/1311 字段/); assert.match(serverReadme, /101 项：65 个只读接口与 36 个仅允许/);
assert.equal(OPERATION_REGISTRY.filter(item=>item.access==='read').length,65); assert.equal(OPERATION_REGISTRY.filter(item=>item.access==='write').length,36);
assert.equal(FIRST_BATCH_OPERATION_IDS.length, 25);
assert.equal(LATER_BATCH_OPERATION_IDS.length, 59);
assert.equal(DEFERRED_OPERATION_IDS.length, 17);
assert.equal(new Set(OPERATION_REGISTRY.map(item => item.id)).size, 101);
assert.equal(new Set([...FIRST_BATCH_OPERATION_IDS, ...LATER_BATCH_OPERATION_IDS, ...DEFERRED_OPERATION_IDS]).size, 101);
assert.ok(OPERATION_REGISTRY.filter(item => item.batch === 'first').every(item => item.readOnly));
assert.ok(OPERATION_REGISTRY.every(item => item.remoteEnabled === false));
assert.ok(OPERATION_REGISTRY.filter(item => item.access === 'write').every(item => item.remoteEnabled === false));

const governedUiMatrix = PAGE_INTEGRATION_MATRIX.filter(page => UI_PAGE_MATRIX.some(uiPage => uiPage.route === page.route));
assert.equal(governedUiMatrix.length, UI_PAGE_MATRIX.length);
assert.deepEqual(governedUiMatrix.map(page => page.route), UI_PAGE_MATRIX.map(page => page.route));
for (const page of governedUiMatrix) {
  assert.ok(page.operationIds.length > 0, `${page.route} must declare operation IDs`);
  assert.ok(page.fieldDomains.length > 0, `${page.route} must declare field domains`);
  assert.ok(page.operationIds.every(id => OPERATION_REGISTRY.some(operation => operation.id === id)));
  assert.ok(['mock', 'disabled'].includes(page.defaultMode));
  assert.equal(page.remoteWhen, 'contract-evidence-complete');
}
assert.deepEqual(getPageIntegrationContract('/workbench').operationIds, ['COM-001', 'COM-002', 'COM-005', 'WB-001', 'WB-002', 'COM-011']);
assert.deepEqual(getPageIntegrationContract('/apps').operationIds, ['APP-001', 'APP-002', 'APP-004']);
assert.deepEqual(getPageIntegrationContract('/apps/report-001').operationIds, ['APP-003', 'APP-009', 'APP-007', 'MAT-001', 'MAT-002', 'MAT-003', 'COM-008', 'FAV-003', 'FAV-004', 'APP-005', 'APP-006', 'APP-008']);

assert.deepEqual(resolveIntegrationRuntime({}), {
  mode: 'mock', proxyBase: '/api/v1', remoteEnabled: false,
  contractEvidenceComplete: false, testWritesEnabled: false, timeoutMs: null, reason: 'remote-disabled-by-default'
});
assert.equal(resolveIntegrationRuntime({ requestedMode: 'remote', remoteEnabled: true, contractEvidenceComplete: false }).mode, 'disabled');
assert.equal(resolveIntegrationRuntime({ requestedMode: 'remote', remoteEnabled: true, contractEvidenceComplete: true, timeoutMs: 8000 }).mode, 'remote');
assert.throws(() => resolveIntegrationRuntime({ proxyBase: 'https://open.feishu.cn/open-apis' }), /安全代理/);

const calls = [];
const foundationContracts = createSyntheticOperationContracts(['APP-002']);
const client = createSafeProxyClient({
  baseUrl: '/api/v1', origin: 'http://127.0.0.1:4173', timeoutMs: 5000,
  operationContracts: foundationContracts,
  fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, headers: new Map(), json: async () => ({ code: 'OK', data: { items: [] }, traceId: init.headers['X-Trace-Id'] }) };
  },
  traceIdFactory: () => 'trace-foundation-001'
});
const proxyResult = await client.execute('APP-002', { filters: { category: 'RPA' }, pageSize: 10 });
assert.equal(calls.length, 1);
assert.equal(calls[0].url, '/api/v1/operations/APP-002');
assert.equal(calls[0].init.headers['X-Trace-Id'], 'trace-foundation-001');
assert.equal(proxyResult.traceId, 'trace-foundation-001');
await assert.rejects(() => client.execute('APP-002', { app_token: 'secret' }), /敏感/);
assert.throws(() => createSafeProxyClient({ baseUrl: 'https://open.feishu.cn/open-apis', origin: 'http://127.0.0.1:4173' }), /安全代理/);
assert.equal(normalizeIntegrationError({ status: 403 }).state, 'permission-denied');
assert.equal(normalizeIntegrationError({ status: 429 }).state, 'rate-limited');
assert.equal(normalizeIntegrationError({ status: 409 }).state, 'conflict');
assert.deepEqual(normalizeIntegrationError({ status: 503, code: 'FEISHU_INITIAL_SYNCING' }), { state: 'initial-syncing', retryable: true });
assert.equal(normalizeIntegrationError({ name: 'TimeoutError' }).state, 'timeout');

const dictionary = createFieldDictionary({
  schemaVersion: 'v1',
  fields: [
    { fieldId: 'fld_app_name', name: '应用名称', type: 'text' },
    { fieldId: 'fld_status', name: '状态', type: 'singleSelect', options: ['正常', '停用'] }
  ]
});
assert.deepEqual(mapRecordByFieldId(
  { 应用名称: '供应商看板', 状态: '正常' }, dictionary,
  [
    { fieldId: 'fld_app_name', name: '应用名称', type: 'text' },
    { fieldId: 'fld_status', name: '状态', type: 'singleSelect', options: ['正常', '停用'] }
  ]
), { fld_app_name: '供应商看板', fld_status: '正常' });
assert.throws(() => mapRecordByFieldId(
  { 应用名称: '供应商看板' }, dictionary,
  [{ fieldId: 'fld_app_name', name: '应用标题', type: 'text' }]
), SchemaDriftError);
assert.throws(() => mapRecordByFieldId(
  { 应用名称: '供应商看板', 状态: '未知选项' }, dictionary,
  [
    { fieldId: 'fld_app_name', name: '应用名称', type: 'text' },
    { fieldId: 'fld_status', name: '状态', type: 'singleSelect', options: ['正常', '停用'] }
  ]
), SchemaDriftError);

const pagination = createCursorPagination();
assert.equal(pagination.snapshot().pageSize, 10);
pagination.acceptPage({ nextPageToken: 'cursor-2', hasMore: true });
assert.equal(pagination.next(), true);
assert.equal(pagination.snapshot().page, 2);
pagination.setFilterSignature('category=RPA');
assert.deepEqual(pagination.snapshot().pageTokens, [null]);
assert.equal(pagination.snapshot().page, 1);
pagination.setPageSize(20);
assert.equal(pagination.snapshot().pageSize, 20);
assert.equal(pagination.snapshot().page, 1);

let state = createDataState({ data: [{ id: 1 }] });
state = reduceDataState(state, { type: 'load' });
assert.equal(state.state, 'loading');
assert.deepEqual(state.data, [{ id: 1 }], 'loading must retain stable data');
state = reduceDataState(state, { type: 'success', data: [] });
assert.equal(state.state, 'empty');
for (const code of ['timeout', 'rate-limited', 'partial', 'data-stale', 'schema-drift', 'conflict', 'partial-write']) {
  assert.equal(reduceDataState(state, { type: 'fail', code }).state, code);
}

let networkCalls = 0;
const source = createPageDataSource({
  route: '/workbench', runtime: resolveIntegrationRuntime({}),
  mockLoader: () => ({ greeting: '本地演示数据' }),
  client: { execute: async () => { networkCalls += 1; } }
});
const mockEnvelope = await source.load();
assert.equal(networkCalls, 0, 'default mock mode must not make a network request');
assert.equal(mockEnvelope.mode, 'mock');
assert.equal(mockEnvelope.state, 'normal');

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.match(appSource, /data-integration-mode/);
assert.match(appSource, /data-integration-operations/);
assert.match(appSource, /integration-source-status/);
assert.doesNotMatch(appSource, /open\.feishu\.cn|app_secret|tenant_access_token/);

console.log('飞书安全代理、101 操作、30 页面矩阵、字段漂移、游标分页与数据状态基础合同通过');
