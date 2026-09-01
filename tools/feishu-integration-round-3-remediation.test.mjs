import assert from 'node:assert/strict';
import { createRenderer, h, nextTick, ref } from 'vue';

import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { resolveIntegrationRuntime } from '../src/integration/runtime-config.js';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';
import { createDataState, reduceDataState } from '../src/integration/data-state.js';
import { IntegrationLiveRegion } from '../src/integration/live-region.js';

const origin = 'http://127.0.0.1:4173';
const operationContracts = createSyntheticOperationContracts(OPERATION_REGISTRY.map(operation => operation.id));

for (const unsafeBase of [
  '/api/%2525252525252f%2525252525252fevil',
  '/api/%2525252525252e%2525252525252e/escape',
  '/api/%2525253fquery',
  '/api/%25252523hash',
  '/api/%2f..\\escape',
  '/api/./v1'
]) assert.throws(() => resolveIntegrationRuntime({ proxyBase: unsafeBase, origin }), /安全代理|同源/);

const baseOptions = {
  baseUrl: '/api/v1', origin, timeoutMs: 1000, operationContracts
};

const validClient = createSafeProxyClient({
  ...baseOptions,
  fetchImpl: async () => ({
    ok: true, status: 200,
    json: async () => ({ code: 'OK', data: { items: [{ id: 'app-1', label: '演示应用' }] } })
  })
});
assert.deepEqual((await validClient.execute('APP-002', { filters: { category: 'RPA' } })).data.items, [{ id: 'app-1', label: '演示应用' }]);

await assert.rejects(() => validClient.execute('APP-002', { filters: { employeeId: 'uncontracted' } }), /schema|合同|字段/i);

for (const body of [
  {},
  { code: 'OK' },
  { data: { items: [] } },
  { code: 'OK', data: { items: [{ id: 1 }] } },
  { code: 'OK', data: { items: [], employeeId: 'uncontracted' } }
]) {
  const malformedClient = createSafeProxyClient({
    ...baseOptions,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => body })
  });
  await assert.rejects(() => malformedClient.execute('APP-002', {}), error => error.state === 'schema-drift' && error.retryable === false);
}

const malformedJsonClient = createSafeProxyClient({
  ...baseOptions,
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('invalid JSON'); } })
});
await assert.rejects(() => malformedJsonClient.execute('APP-002', {}), error => error.state === 'schema-drift' && error.retryable === false);

for (const [status, expectedState, errorBody] of [
  [403, 'permission-denied', { code: 'FORBIDDEN', message: 'denied' }],
  [429, 'rate-limited', { code: 'RATE_LIMITED', message: 'slow down', retryAfterSeconds: 30 }],
  [409, 'conflict', { code: 'CONFLICT', message: 'version conflict' }]
]) {
  const statusClient = createSafeProxyClient({
    ...baseOptions,
    fetchImpl: async () => ({ ok: false, status, json: async () => errorBody })
  });
  await assert.rejects(() => statusClient.execute('APP-002', {}), error => error.state === expectedState && error.status === status && (status !== 429 || error.retryAfterSeconds === 30));
}

for (const [status, expectedState] of [[403, 'permission-denied'], [429, 'rate-limited'], [409, 'conflict']]) {
  const leakingDiagnosticClient = createSafeProxyClient({
    ...baseOptions,
    fetchImpl: async () => ({ ok: false, status, json: async () => ({ code: 'ERROR', message: 'safe diagnostic', internalDebug: 'must not reach browser' }) })
  });
  await assert.rejects(() => leakingDiagnosticClient.execute('APP-002', {}), error => error.state === expectedState && error.status === status && /合同/.test(error.message));
}

const announcements = [
  ['rate-limited', '请求过于频繁，请稍后再试'],
  ['schema-drift', '数据格式与已批准合同不一致，已停止显示该数据'],
  ['conflict', '数据已变更，请刷新后再处理，勿盲目重试'],
  ['partial-write', '操作仅部分完成，请联系管理员核对后续处理'],
  ['security-error', '安全校验失败，已阻止该请求']
];
for (const [state, expected] of announcements) {
  assert.equal(reduceDataState(createDataState(), { type: 'fail', code: state }).announcement, expected);
}
assert.equal(reduceDataState(createDataState(), { type: 'fail', code: 'rate-limited', retryAfterSeconds: 30 }).announcement, '请求过于频繁，请在 30 秒后再试');

const hostOps = {
  createElement: type => ({ type, props: {}, children: [], text: '' }),
  createText: text => ({ type: '#text', text }), createComment: text => ({ type: '#comment', text }),
  setText: (node, text) => { node.text = text; }, setElementText: (node, text) => { node.text = text; node.children = []; },
  parentNode: node => node.parent || null, nextSibling: () => null,
  insert: (child, parent) => { child.parent = parent; parent.children.push(child); },
  remove: child => { child.parent.children = child.parent.children.filter(node => node !== child); },
  patchProp: (node, key, _old, value) => { node.props[key] = value; },
  insertStaticContent: (content, parent) => { const node = { type: '#static', text: content, parent }; parent.children.push(node); return [node, node]; }
};
const renderer = createRenderer(hostOps);
const textOf = node => [node.text || '', ...(node.children || []).map(textOf)].join('');
for (const [state, expected] of announcements) {
  const root = { type: 'root', children: [] };
  const envelope = ref(reduceDataState(createDataState({ mode: 'remote' }), { type: 'fail', code: state }));
  renderer.createApp({ render: () => h(IntegrationLiveRegion, { envelope: envelope.value }) }).mount(root);
  await nextTick();
  assert.equal(root.children[0].props['aria-live'], 'polite');
  assert.match(textOf(root), new RegExp(expected));
}

console.log('Round 3：递归 schema、深度编码拒绝、HTTP 错误合同与 mounted aria-live 合同通过');
