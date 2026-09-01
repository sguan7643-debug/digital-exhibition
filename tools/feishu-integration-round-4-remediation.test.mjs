import assert from 'node:assert/strict';

import { OPERATION_REGISTRY } from '../src/integration/operation-registry.js';
import { createSyntheticOperationContracts } from '../src/integration/operation-contract-schemas.js';
import { createSafeProxyClient } from '../src/integration/safe-proxy-client.js';

const origin = 'http://127.0.0.1:4173';
const operationContracts = createSyntheticOperationContracts(OPERATION_REGISTRY.map(operation => operation.id));
const validBody = { code: 'OK', data: { items: [] } };
const baseOptions = { baseUrl: '/api/v1', origin, operationContracts };

let startParsing;
let resolveBody;
const parsingStarted = new Promise(resolve => { startParsing = resolve; });
const caller = new AbortController();
const cancelDuringBodyClient = createSafeProxyClient({
  ...baseOptions, timeoutMs: 1000,
  fetchImpl: async () => ({
    ok: true, status: 200,
    json: () => new Promise(resolve => { resolveBody = resolve; startParsing(); })
  })
});
const cancelDuringBody = cancelDuringBodyClient.execute('APP-002', {}, { signal: caller.signal });
await parsingStarted;
caller.abort(new DOMException('route changed', 'AbortError'));
resolveBody(validBody);
await assert.rejects(() => cancelDuringBody, error => error.state === 'cancelled' && error.retryable === false && error.status === 200);

let resolveSlowBody;
const timeoutDuringBodyClient = createSafeProxyClient({
  ...baseOptions, timeoutMs: 5,
  fetchImpl: async () => ({ ok: true, status: 200, json: () => new Promise(resolve => { resolveSlowBody = resolve; }) })
});
const timeoutDuringBody = timeoutDuringBodyClient.execute('APP-002', {});
await new Promise(resolve => setTimeout(resolve, 15));
resolveSlowBody(validBody);
await assert.rejects(() => timeoutDuringBody, error => error.state === 'timeout' && error.retryable === true && error.status === 200);

const postBodyCaller = new AbortController();
const cancelAfterBodyClient = createSafeProxyClient({
  ...baseOptions, timeoutMs: 1000,
  fetchImpl: async () => ({
    ok: true, status: 200,
    json: () => new Promise(resolve => {
      resolve(validBody);
      queueMicrotask(() => postBodyCaller.abort(new DOMException('cancel after body', 'AbortError')));
    })
  })
});
await assert.rejects(
  () => cancelAfterBodyClient.execute('APP-002', {}, { signal: postBodyCaller.signal }),
  error => error.state === 'cancelled' && error.retryable === false && error.status === 200
);

for (const [status, state, retryable] of [
  [403, 'permission-denied', false],
  [429, 'rate-limited', true],
  [409, 'conflict', false]
]) {
  for (const json of [
    async () => { throw new SyntaxError('not JSON'); },
    async () => ({ message: 'missing code' })
  ]) {
    const errorClient = createSafeProxyClient({
      ...baseOptions, timeoutMs: 1000,
      fetchImpl: async () => ({ ok: false, status, json })
    });
    await assert.rejects(
      () => errorClient.execute('APP-002', {}),
      error => error.state === state && error.retryable === retryable && error.status === status && typeof error.contractError === 'string'
    );
  }
}

const malformedSuccessClient = createSafeProxyClient({
  ...baseOptions, timeoutMs: 1000,
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('not JSON'); } })
});
await assert.rejects(() => malformedSuccessClient.execute('APP-002', {}), error => error.state === 'schema-drift' && error.retryable === false && error.status === 200);

console.log('Round 4：响应体取消/超时优先级与畸形 HTTP 错误状态合同通过');
